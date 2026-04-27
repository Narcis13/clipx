import { scrapePostContext } from './scrape';
import { postReply } from './inject';

const STATUS_RE = /^https:\/\/(x|twitter)\.com\/[^/]+\/status\/\d+/;
const BTN_ID = 'reply-master-btn';
const BTN_SIZE = 36;

const w = window as unknown as { __replyMasterLoaded?: boolean };
if (!w.__replyMasterLoaded) {
  w.__replyMasterLoaded = true;
  console.log('[reply-master] content script loaded', location.href);

  ensureButton();
  const observer = new MutationObserver(ensureButton);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('scroll', positionButton, true);
  window.addEventListener('resize', positionButton);

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === 'TRIGGER_FROM_POPUP') {
      onGenerate()
        .then(() => sendResponse({ ok: true }))
        .catch((e) => sendResponse({ ok: false, error: String(e) }));
      return true;
    }
    if (msg?.type === 'SCRAPE_POST') {
      try {
        const ctx = scrapePostContext();
        sendResponse({ ok: !!ctx, ctx });
      } catch (e: any) {
        sendResponse({ ok: false, error: String(e?.message ?? e) });
      }
      return;
    }
    if (msg?.type === 'POST_GIVEN_REPLY') {
      const text = String(msg.text ?? '').trim();
      if (!text) {
        sendResponse({ ok: false, error: 'empty reply text' });
        return;
      }
      postReply(text)
        .then(() => sendResponse({ ok: true }))
        .catch((e) => sendResponse({ ok: false, error: String(e?.message ?? e) }));
      return true;
    }
  });
}

function ensureButton() {
  const onStatus = STATUS_RE.test(location.href);
  const existing = document.getElementById(BTN_ID);

  if (!onStatus) {
    existing?.remove();
    return;
  }

  if (!existing) {
    createButton();
  }
  positionButton();
}

function createButton() {
  const b = document.createElement('button');
  b.id = BTN_ID;
  b.type = 'button';
  b.title = 'Reply Master — generate a reply';
  b.setAttribute('aria-label', 'Reply Master');
  b.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style="pointer-events:none">
      <path d="M12 2.5l1.9 5.6 5.6 1.9-5.6 1.9L12 17.5l-1.9-5.6-5.6-1.9 5.6-1.9z" fill="currentColor"/>
      <circle cx="19" cy="5" r="1.4" fill="currentColor"/>
      <circle cx="5.5" cy="18" r="1.1" fill="currentColor"/>
    </svg>
  `;
  Object.assign(b.style, {
    position: 'fixed',
    width: `${BTN_SIZE}px`,
    height: `${BTN_SIZE}px`,
    display: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    border: '0',
    borderRadius: '999px',
    background: 'linear-gradient(135deg, #8e6bff 0%, #5a3ad0 100%)',
    color: '#fff',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(90, 58, 208, 0.45)',
    zIndex: '2147483646',
    transition: 'transform 120ms ease, filter 120ms ease, box-shadow 120ms ease',
    padding: '0',
  });
  b.addEventListener('mouseenter', () => {
    b.style.transform = 'scale(1.07)';
    b.style.filter = 'brightness(1.1)';
    b.style.boxShadow = '0 4px 14px rgba(90, 58, 208, 0.55)';
  });
  b.addEventListener('mouseleave', () => {
    b.style.transform = '';
    b.style.filter = '';
    b.style.boxShadow = '0 2px 8px rgba(90, 58, 208, 0.45)';
  });
  b.addEventListener('click', (e) => {
    console.log('[reply-master] 🪄 click');
    e.preventDefault();
    e.stopPropagation();
    onGenerate().catch((err) => console.error('[reply-master] onGenerate threw', err));
  });
  document.body.appendChild(b);
  console.log('[reply-master] floating button mounted');
}

function positionButton() {
  const b = document.getElementById(BTN_ID) as HTMLElement | null;
  if (!b) return;
  const target = document.querySelector<HTMLElement>('[data-testid="tweetButtonInline"]');
  if (!target) {
    b.style.display = 'none';
    return;
  }
  const r = target.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) {
    b.style.display = 'none';
    return;
  }
  b.style.display = 'inline-flex';
  b.style.top = `${r.top + (r.height - BTN_SIZE) / 2}px`;
  b.style.left = `${r.left - BTN_SIZE - 8}px`;
}

async function onGenerate() {
  const ctx = scrapePostContext();
  if (!ctx) {
    console.error('[reply-master] scrape returned null', location.href);
    alert('Reply Master: nu am putut citi postul.');
    return;
  }
  console.log('[reply-master] payload', ctx);

  try {
    const res = await chrome.runtime.sendMessage({
      type: 'GENERATE_REPLY',
      payload: ctx,
    });
    console.log('[reply-master] response', res);

    if (!res?.ok) {
      console.error('[reply-master] api error', res?.error);
      alert('Reply Master: ' + (res?.error ?? 'API error'));
      return;
    }
    await postReply(res.data.reply);
  } catch (e) {
    console.error('[reply-master] onGenerate failed', e);
    throw e;
  }
}
