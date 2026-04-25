const STATUS_RE = /^https:\/\/(x|twitter)\.com\/[^/]+\/status\/\d+/;

const btn = document.getElementById('go') as HTMLButtonElement;
const status = document.getElementById('status') as HTMLDivElement;

const setStatus = (msg: string) => {
  status.textContent = msg;
};

btn.addEventListener('click', async () => {
  btn.disabled = true;
  setStatus('Working…');
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url || !STATUS_RE.test(tab.url)) {
      setStatus('Open an x.com /status/ page first.');
      return;
    }
    let res: { ok: boolean; error?: string } | undefined;
    try {
      res = await chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_FROM_POPUP' });
    } catch {
      // Content script not loaded in this tab — inject on demand and retry.
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js'],
      });
      res = await chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_FROM_POPUP' });
    }
    if (!res?.ok) {
      setStatus('Error: ' + (res?.error ?? 'unknown'));
      return;
    }
    setStatus('Done.');
    window.close();
  } catch (e: any) {
    setStatus('Error: ' + (e?.message ?? String(e)));
  } finally {
    btn.disabled = false;
  }
});
