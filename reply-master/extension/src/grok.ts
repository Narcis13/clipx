const GROK_URL_RE = /^https:\/\/x\.com\/i\/grok/;
const tag = '[reply-master:grok]';

const w = window as unknown as { __replyMasterGrokLoaded?: boolean };
if (!w.__replyMasterGrokLoaded && GROK_URL_RE.test(location.href)) {
  w.__replyMasterGrokLoaded = true;
  console.log(tag, 'content script loaded', location.href);

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === 'GROK_PING') {
      sendResponse({ ok: true });
      return;
    }
    if (msg?.type === 'GROK_GENERATE') {
      runGrok(msg.prompt as string)
        .then((reply) => sendResponse({ ok: true, reply }))
        .catch((e) => {
          console.error(tag, 'runGrok failed', e);
          sendResponse({ ok: false, error: String(e?.message ?? e) });
        });
      return true;
    }
  });
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function waitForEditor(timeoutMs = 15_000): Promise<HTMLElement> {
  const start = Date.now();
  let attempts = 0;
  while (Date.now() - start < timeoutMs) {
    attempts++;
    const el = findEditor(attempts === 1);
    if (el) {
      console.log(tag, 'editor found after', attempts, 'attempts in', Date.now() - start, 'ms');
      return el;
    }
    await sleep(250);
  }
  throw new Error(`Grok editor not found after ${attempts} attempts`);
}

function findEditor(verbose: boolean): HTMLElement | null {
  const selectors = [
    'textarea[data-testid="grok-composer"]',
    'div[data-testid="grok-composer"] textarea',
    'div[data-testid="grok-composer"] [contenteditable="true"]',
    'textarea[placeholder*="Grok" i]',
    'textarea[aria-label*="Grok" i]',
    'div[contenteditable="true"][role="textbox"]',
    'textarea',
    '[contenteditable="true"]',
  ];
  for (const sel of selectors) {
    const els = Array.from(document.querySelectorAll<HTMLElement>(sel));
    if (verbose && els.length) {
      console.log(tag, 'selector', sel, 'matched', els.length, els.slice(0, 3));
    }
    const visible = els.find(isVisible);
    if (visible) {
      console.log(tag, 'using editor matched by:', sel);
      return visible;
    }
  }
  return null;
}

function isVisible(el: HTMLElement): boolean {
  if (!el.isConnected) return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 10 && rect.height > 10;
}

function editorHasText(editor: HTMLElement, text: string) {
  const v =
    editor instanceof HTMLTextAreaElement || editor instanceof HTMLInputElement
      ? editor.value
      : (editor.textContent ?? '');
  return v.includes(text);
}

function setNativeValue(el: HTMLTextAreaElement | HTMLInputElement, value: string) {
  const proto = Object.getPrototypeOf(el);
  const desc = Object.getOwnPropertyDescriptor(proto, 'value');
  if (desc?.set) desc.set.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

async function insertPromptText(editor: HTMLElement, text: string): Promise<boolean> {
  editor.focus();
  await sleep(50);

  const tries: Array<[string, () => boolean]> = [];

  if (editor instanceof HTMLTextAreaElement || editor instanceof HTMLInputElement) {
    tries.push(['nativeValueSetter', () => {
      setNativeValue(editor, text);
      return editorHasText(editor, text);
    }]);
  }

  tries.push(['execCommand', () => {
    try {
      document.execCommand('selectAll', false);
      document.execCommand('insertText', false, text);
      return editorHasText(editor, text);
    } catch { return false; }
  }]);
  tries.push(['paste', () => {
    try {
      const dt = new DataTransfer();
      dt.setData('text/plain', text);
      editor.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
      return editorHasText(editor, text);
    } catch { return false; }
  }]);
  tries.push(['beforeinput', () => {
    try {
      const dt = new DataTransfer();
      dt.setData('text/plain', text);
      editor.dispatchEvent(new InputEvent('beforeinput', {
        inputType: 'insertFromPaste',
        data: text,
        dataTransfer: dt,
        bubbles: true,
        cancelable: true,
      }));
      return editorHasText(editor, text);
    } catch { return false; }
  }]);

  for (const [name, fn] of tries) {
    if (fn()) {
      console.log(tag, 'insert ok via', name);
      return true;
    }
    console.warn(tag, 'insert via', name, 'failed');
  }
  return false;
}

function findSendButton(): HTMLButtonElement | null {
  const selectors = [
    'button[data-testid="grok-send"]',
    'button[data-testid*="send" i]',
    'button[aria-label*="Send" i]',
    'button[type="submit"]',
  ];
  for (const sel of selectors) {
    const btns = Array.from(document.querySelectorAll<HTMLButtonElement>(sel));
    if (btns.length) {
      console.log(tag, 'send selector', sel, 'matched', btns.length);
    }
    const enabled = btns.find((b) => isVisible(b) && !b.disabled && b.getAttribute('aria-disabled') !== 'true');
    if (enabled) {
      console.log(tag, 'using send button matched by:', sel);
      return enabled;
    }
  }
  return null;
}

async function submit(editor: HTMLElement) {
  const btn = findSendButton();
  if (btn) {
    console.log(tag, 'clicking send button');
    btn.click();
    return;
  }
  console.log(tag, 'no send button, falling back to Enter key');
  editor.focus();
  const opts: KeyboardEventInit = {
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    which: 13,
    bubbles: true,
    cancelable: true,
  } as KeyboardEventInit;
  editor.dispatchEvent(new KeyboardEvent('keydown', opts));
  editor.dispatchEvent(new KeyboardEvent('keypress', opts));
  editor.dispatchEvent(new KeyboardEvent('keyup', opts));
}

const PROMPT_FINGERPRINTS = [
  'You are a thoughtful X reply writer',
  'Output ONLY the reply text',
  'IMPORTANT: Respond ONLY with the reply text',
  'Top comments so far',
];

function isLikelyChrome(text: string): boolean {
  // strip out X navigation chrome / known UI strings that aren't responses
  const lower = text.toLowerCase();
  const chrome = [
    'home', 'explore', 'notifications', 'bookmarks', 'creator studio',
    'ask anything', 'think harder', 'auto', 'post your reply',
    'trending', 'what\'s happening', 'follow', 'see new posts',
    'search', 'premium', 'profile', 'more',
  ];
  // if more than half of the lines are chrome words, skip
  const lines = lower.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return true;
  const chromeLines = lines.filter((l) => chrome.includes(l));
  return chromeLines.length / lines.length > 0.4;
}

function collectAssistantTexts(): string[] {
  const out = new Set<string>();
  // Walk all visible elements; pick "leaf-ish" ones that hold substantial text
  // and skip anything that is the prompt or page chrome.
  const all = document.querySelectorAll<HTMLElement>('div, p, article, section, span');
  all.forEach((el) => {
    if (!isVisible(el)) return;
    const t = (el.innerText ?? '').trim();
    if (t.length < 20 || t.length > 8000) return;
    if (PROMPT_FINGERPRINTS.some((f) => t.includes(f))) return;
    if (isLikelyChrome(t)) return;
    out.add(t);
  });
  return Array.from(out);
}

function pickResponseFromFresh(fresh: string[]): string | null {
  if (fresh.length === 0) return null;
  // Prefer "leaf-ish" prose: the shortest text that is still substantial and prose-like.
  // Container wrappers tend to bundle response + buttons + suggestions, so the actual
  // response leaf is usually the shorter, denser one.
  const candidates = fresh
    .filter((t) => t.length >= 40 && t.length <= 1500)
    .sort((a, b) => a.length - b.length);
  if (candidates.length) return candidates[0];
  // fall back to longest (ignore noise floor)
  return fresh.slice().sort((a, b) => b.length - a.length)[0];
}

async function waitForGrokReply(prompt: string): Promise<string> {
  const start = Date.now();
  const maxWait = 90_000;
  const stableMs = 2500;

  const baseline = new Set(collectAssistantTexts());
  console.log(tag, 'baseline text bucket size', baseline.size);

  let candidate = '';
  let stableSince = 0;
  let polls = 0;
  let lastFreshLog = 0;

  while (Date.now() - start < maxWait) {
    await sleep(500);
    polls++;

    const texts = collectAssistantTexts();
    const fresh = texts.filter((t) => !baseline.has(t) && !PROMPT_FINGERPRINTS.some((f) => t.includes(f)));

    if (polls % 4 === 0) {
      console.log(
        tag,
        `poll #${polls} t=${Date.now() - start}ms total=${texts.length} fresh=${fresh.length} cand=${candidate.length}ch stable=${stableSince ? Date.now() - stableSince : 0}ms`
      );
    }

    if (fresh.length > 0 && Date.now() - lastFreshLog > 2000) {
      lastFreshLog = Date.now();
      const sorted = fresh.slice().sort((a, b) => a.length - b.length);
      sorted.slice(0, 5).forEach((t, i) => {
        console.log(tag, `fresh[${i}] len=${t.length} :: ${t.replace(/\s+/g, ' ').slice(0, 140)}`);
      });
    }

    const picked = pickResponseFromFresh(fresh);
    if (!picked) {
      stableSince = 0;
      continue;
    }

    if (picked === candidate) {
      if (!stableSince) stableSince = Date.now();
      if (Date.now() - stableSince >= stableMs) {
        console.log(tag, 'reply stabilized after', polls, 'polls,', picked.length, 'chars');
        return picked;
      }
    } else {
      console.log(tag, 'candidate updated len=', picked.length, 'preview:', picked.slice(0, 120));
      candidate = picked;
      stableSince = 0;
    }
  }

  if (candidate) {
    console.warn(tag, 'returning best-effort reply after timeout (', polls, 'polls,', candidate.length, 'chars)');
    return candidate;
  }
  throw new Error(`Grok response timed out after ${polls} polls — no fresh assistant text seen`);
}

async function runGrok(prompt: string): Promise<string> {
  console.log(tag, 'runGrok start, prompt length', prompt?.length, 'url', location.href);
  if (!prompt || typeof prompt !== 'string') throw new Error('empty prompt');

  const editor = await waitForEditor();
  console.log(tag, 'editor', editor.tagName, 'isContentEditable=', editor.isContentEditable);

  const ok = await insertPromptText(editor, prompt);
  if (!ok) throw new Error('could not insert prompt into Grok editor');
  console.log(tag, 'prompt inserted, awaiting submit');

  await sleep(200);
  await submit(editor);
  console.log(tag, 'submit dispatched, waiting for reply');

  const reply = await waitForGrokReply(prompt);
  console.log(tag, 'runGrok done, reply length', reply.length);
  return reply.trim();
}
