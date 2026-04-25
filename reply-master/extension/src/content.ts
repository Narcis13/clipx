import { scrapePostContext } from './scrape';
import { postReply } from './inject';
import { installLocationChange } from './utils/locationchange';
import { waitFor } from './utils/waitFor';

const STATUS_RE = /^https:\/\/(x|twitter)\.com\/[^/]+\/status\/\d+/;
const BTN_ID = 'reply-master-btn';

installLocationChange();
window.addEventListener('locationchange', maybeInject);
maybeInject();

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'TRIGGER_FROM_POPUP') {
    onGenerate()
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }
});

async function maybeInject() {
  if (!STATUS_RE.test(location.href)) return;
  console.log('[reply-master] status URL detected', location.href);
  try {
    const replyBtn = await waitFor<HTMLElement>('[data-testid="tweetButtonInline"]', 8000);
    if (document.getElementById(BTN_ID)) return;

    const b = document.createElement('button');
    b.id = BTN_ID;
    b.type = 'button';
    b.textContent = '🪄';
    b.title = 'Reply Master';
    Object.assign(b.style, {
      marginRight: '6px',
      padding: '6px 10px',
      border: '0',
      borderRadius: '999px',
      background: '#7856ff',
      color: '#fff',
      cursor: 'pointer',
      fontSize: '14px',
    });
    b.addEventListener('click', onGenerate);
    replyBtn.parentElement?.insertBefore(b, replyBtn);
    console.log('[reply-master] button injected');
  } catch (e) {
    console.warn('[reply-master] inject failed', e);
  }
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
