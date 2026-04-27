const STATUS_RE = /^https:\/\/(x|twitter)\.com\/[^/]+\/status\/\d+/;
const GROK_URL = 'https://x.com/i/grok';
const GROK_URL_RE = /^https:\/\/x\.com\/i\/grok/;
const GROK_INSTRUCTION = '\n\nIMPORTANT: Respond ONLY with the reply text itself — no preamble, no quotes, no commentary, no annotations.';
const PENDING_KEY = 'pendingGrokReply';

const btn = document.getElementById('go') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLDivElement;
const grokToggle = document.getElementById('grok-toggle') as HTMLInputElement;
const previewWrap = document.getElementById('preview-wrap') as HTMLDivElement;
const previewEl = document.getElementById('preview') as HTMLDivElement;
const postBtn = document.getElementById('post') as HTMLButtonElement;
const discardBtn = document.getElementById('discard') as HTMLButtonElement;

const t0 = Date.now();
const ts = () => `+${((Date.now() - t0) / 1000).toFixed(2)}s`;

const setStatus = (msg: string) => {
  statusEl.textContent = msg;
  console.log('[reply-master:popup]', ts(), msg);
};

const phase = (label: string) => {
  console.log('[reply-master:popup]', ts(), '── PHASE:', label);
  setStatus(label);
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

interface PendingReply {
  text: string;
  tabId: number;
  url: string;
  ts: number;
}

async function loadGrokToggle() {
  const { grokReply } = await chrome.storage.local.get('grokReply');
  grokToggle.checked = !!grokReply;
}

grokToggle.addEventListener('change', () => {
  chrome.storage.local.set({ grokReply: grokToggle.checked });
});

async function loadPendingReply(): Promise<PendingReply | null> {
  const { [PENDING_KEY]: pending } = await chrome.storage.local.get(PENDING_KEY);
  if (!pending?.text) return null;
  // expire after 30 minutes
  if (Date.now() - (pending.ts ?? 0) > 30 * 60 * 1000) {
    await chrome.storage.local.remove(PENDING_KEY);
    return null;
  }
  return pending as PendingReply;
}

async function savePendingReply(p: PendingReply) {
  await chrome.storage.local.set({ [PENDING_KEY]: p });
}

async function clearPendingReply() {
  await chrome.storage.local.remove(PENDING_KEY);
}

function showPreview(text: string) {
  previewEl.textContent = text;
  previewWrap.classList.add('visible');
}

function hidePreview() {
  previewEl.textContent = '';
  previewWrap.classList.remove('visible');
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    console.warn('[reply-master:popup] clipboard write failed', e);
  }
}

async function sendToTab<T>(tabId: number, msg: any): Promise<T> {
  try {
    return (await chrome.tabs.sendMessage(tabId, msg)) as T;
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js'],
    });
    return (await chrome.tabs.sendMessage(tabId, msg)) as T;
  }
}

async function findOrCreateGrokTab(): Promise<number> {
  const tabs = await chrome.tabs.query({});
  console.log('[reply-master:popup]', ts(), 'queried tabs:', tabs.length);
  const existing = tabs.find((t) => t.url && GROK_URL_RE.test(t.url) && t.id != null);
  if (existing?.id != null) {
    console.log('[reply-master:popup]', ts(), 'reusing grok tab', existing.id, existing.url);
    return existing.id!;
  }
  console.log('[reply-master:popup]', ts(), 'no grok tab — creating new');
  const created = await chrome.tabs.create({ url: GROK_URL, active: false });
  if (created.id == null) throw new Error('failed to create Grok tab');
  console.log('[reply-master:popup]', ts(), 'created grok tab', created.id);
  setStatus('Loading Grok tab…');
  await waitForTabComplete(created.id, 30_000);
  console.log('[reply-master:popup]', ts(), 'grok tab status=complete');
  setStatus('Grok loaded — waiting for SPA mount…');
  await sleep(1500);
  return created.id;
}

async function ensureGrokScript(tabId: number): Promise<void> {
  try {
    const r = await chrome.tabs.sendMessage(tabId, { type: 'GROK_PING' });
    if (r?.ok) {
      console.log('[reply-master:popup]', ts(), 'grok script already present in tab', tabId);
      return;
    }
  } catch {
    // not loaded yet
  }
  console.log('[reply-master:popup]', ts(), 'injecting grok.js into tab', tabId);
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['grok.js'] });
    console.log('[reply-master:popup]', ts(), 'grok.js injected');
  } catch (e: any) {
    console.error('[reply-master:popup]', ts(), 'grok.js injection failed', e);
    throw new Error('failed to inject grok.js: ' + (e?.message ?? e));
  }
}

function waitForTabComplete(tabId: number, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error('grok tab load timeout'));
    }, timeoutMs);
    const listener = (id: number, info: chrome.tabs.TabChangeInfo) => {
      if (id === tabId && info.status === 'complete') {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabs.get(tabId).then((t) => {
      if (t.status === 'complete') {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    });
  });
}

async function pingGrokTab(tabId: number, timeoutMs = 15_000): Promise<void> {
  const start = Date.now();
  let attempts = 0;
  while (Date.now() - start < timeoutMs) {
    attempts++;
    try {
      const r = await chrome.tabs.sendMessage(tabId, { type: 'GROK_PING' });
      if (r?.ok) {
        console.log('[reply-master:popup]', ts(), 'grok ping ok after', attempts, 'attempts');
        return;
      }
    } catch (e: any) {
      if (attempts === 1 || attempts % 4 === 0) {
        console.log('[reply-master:popup]', ts(), 'grok ping wait, attempt', attempts, '-', e?.message ?? e);
      }
    }
    await sleep(500);
  }
  throw new Error(`Grok content script not ready after ${attempts} pings`);
}

async function getPromptFromServer(ctx: any): Promise<string> {
  const startedAt = Date.now();
  console.log('[reply-master:popup]', ts(), 'POST /reply/prompt', { author: ctx?.author, handle: ctx?.handle });
  const r = await fetch('http://localhost:8787/reply/prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ctx),
  });
  console.log('[reply-master:popup]', ts(), 'server status', r.status, 'in', Date.now() - startedAt, 'ms');
  if (!r.ok) throw new Error(`server HTTP ${r.status}`);
  const data = await r.json();
  if (!data?.prompt) throw new Error('server returned no prompt');
  console.log('[reply-master:popup]', ts(), 'prompt length', data.prompt.length);
  return data.prompt as string;
}

async function runMockFlow(tabId: number) {
  const res = await sendToTab<{ ok: boolean; error?: string }>(tabId, {
    type: 'TRIGGER_FROM_POPUP',
  });
  if (!res?.ok) {
    setStatus('Error: ' + (res?.error ?? 'unknown'));
    return;
  }
  setStatus('Done.');
  window.close();
}

async function runGrokFlow(originalTabId: number, originalUrl: string) {
  phase('1/6 Scraping post…');
  const scraped = await sendToTab<{ ok: boolean; ctx?: any; error?: string }>(originalTabId, {
    type: 'SCRAPE_POST',
  });
  console.log('[reply-master:popup]', ts(), 'scrape result', scraped);
  if (!scraped?.ok || !scraped.ctx) {
    setStatus('Error scraping post: ' + (scraped?.error ?? 'unknown'));
    return;
  }

  phase('2/6 Fetching prompt from server…');
  const basePrompt = await getPromptFromServer(scraped.ctx);
  const prompt = basePrompt + GROK_INSTRUCTION;

  phase('3/6 Opening Grok tab…');
  const grokTabId = await findOrCreateGrokTab();

  phase('4/6 Ensuring Grok script is loaded…');
  await ensureGrokScript(grokTabId);
  await pingGrokTab(grokTabId);

  phase('5/6 Asking Grok (this can take 30-90s)…');
  console.log('[reply-master:popup]', ts(), 'sending GROK_GENERATE to tab', grokTabId);
  const grokStart = Date.now();
  const grokRes = await chrome.tabs.sendMessage(grokTabId, {
    type: 'GROK_GENERATE',
    prompt,
  });
  console.log('[reply-master:popup]', ts(), 'grok responded in', Date.now() - grokStart, 'ms', grokRes);
  if (!grokRes?.ok || !grokRes.reply) {
    setStatus('Grok error: ' + (grokRes?.error ?? 'no reply'));
    return;
  }

  phase('6/6 Storing reply…');
  const reply = String(grokRes.reply).trim();
  await copyToClipboard(reply);
  await savePendingReply({
    text: reply,
    tabId: originalTabId,
    url: originalUrl,
    ts: Date.now(),
  });
  showPreview(reply);
  setStatus('Reply ready (copied to clipboard). Review and click Post Reply.');
}

btn.addEventListener('click', async () => {
  btn.disabled = true;
  hidePreview();
  setStatus('Working…');
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url || !STATUS_RE.test(tab.url)) {
      setStatus('Open an x.com /status/ page first.');
      return;
    }
    if (grokToggle.checked) {
      await runGrokFlow(tab.id, tab.url);
    } else {
      await runMockFlow(tab.id);
    }
  } catch (e: any) {
    console.error('[reply-master:popup] flow error', e);
    setStatus('Error: ' + (e?.message ?? String(e)));
  } finally {
    btn.disabled = false;
  }
});

postBtn.addEventListener('click', async () => {
  postBtn.disabled = true;
  discardBtn.disabled = true;
  try {
    const pending = await loadPendingReply();
    if (!pending) {
      setStatus('No pending reply to post.');
      return;
    }
    setStatus('Posting reply…');
    const res = await sendToTab<{ ok: boolean; error?: string }>(pending.tabId, {
      type: 'POST_GIVEN_REPLY',
      text: pending.text,
    });
    if (!res?.ok) {
      setStatus('Error posting: ' + (res?.error ?? 'unknown'));
      return;
    }
    await clearPendingReply();
    hidePreview();
    setStatus('Posted.');
    setTimeout(() => window.close(), 600);
  } catch (e: any) {
    setStatus('Error: ' + (e?.message ?? String(e)));
  } finally {
    postBtn.disabled = false;
    discardBtn.disabled = false;
  }
});

discardBtn.addEventListener('click', async () => {
  await clearPendingReply();
  hidePreview();
  setStatus('Discarded.');
});

(async function init() {
  await loadGrokToggle();
  const pending = await loadPendingReply();
  if (pending) {
    showPreview(pending.text);
    setStatus('Pending Grok reply (copied to clipboard). Review and click Post Reply.');
  }
})();
