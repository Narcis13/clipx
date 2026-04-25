chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== 'GENERATE_REPLY') return;

  (async () => {
    try {
      console.log('[reply-master:bg] POST /reply', msg.payload?.handle);
      const r = await fetch('http://localhost:8787/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg.payload),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      console.log('[reply-master:bg] response', data);
      sendResponse({ ok: true, data });
    } catch (e: any) {
      console.error('[reply-master:bg] error', e);
      sendResponse({ ok: false, error: e?.message ?? String(e) });
    }
  })();

  return true; // keep channel open for async sendResponse
});
