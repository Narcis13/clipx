import { waitFor } from './utils/waitFor';

export async function postReply(text: string) {
  const editor = await waitFor<HTMLElement>('[data-testid="tweetTextarea_0"]', 4000);
  editor.focus();

  // Draft.js listens for beforeinput / insertText
  document.execCommand('insertText', false, text);

  // wait for the Reply button to become enabled
  const btn = await waitFor<HTMLButtonElement>(
    '[data-testid="tweetButtonInline"]:not([aria-disabled="true"])',
    4000
  );
  btn.click();

  // If the Premium modal appears -> click "Maybe later"
  try {
    const cancel = await waitFor<HTMLElement>(
      '[data-testid="confirmationSheetCancel"]',
      2500
    );
    cancel.click();
  } catch {
    /* modal didn't appear — that's fine */
  }
}
