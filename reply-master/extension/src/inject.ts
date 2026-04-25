import { waitFor } from './utils/waitFor';

const tag = '[reply-master]';

function editorHasText(editor: HTMLElement, text: string) {
  return (editor.textContent ?? '').includes(text);
}

function tryExecCommand(editor: HTMLElement, text: string) {
  editor.focus();
  document.execCommand('insertText', false, text);
  return editorHasText(editor, text);
}

function tryPaste(editor: HTMLElement, text: string) {
  editor.focus();
  const dt = new DataTransfer();
  dt.setData('text/plain', text);
  editor.dispatchEvent(
    new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })
  );
  return editorHasText(editor, text);
}

function tryBeforeInput(editor: HTMLElement, text: string) {
  editor.focus();
  const dt = new DataTransfer();
  dt.setData('text/plain', text);
  editor.dispatchEvent(
    new InputEvent('beforeinput', {
      inputType: 'insertFromPaste',
      data: text,
      dataTransfer: dt,
      bubbles: true,
      cancelable: true,
    })
  );
  return editorHasText(editor, text);
}

async function insertText(editor: HTMLElement, text: string): Promise<boolean> {
  for (const [name, fn] of [
    ['execCommand', tryExecCommand],
    ['paste', tryPaste],
    ['beforeinput', tryBeforeInput],
  ] as const) {
    if (fn(editor, text)) {
      console.log(`${tag} inserted via ${name}`);
      return true;
    }
    console.warn(`${tag} insert via ${name} failed`);
  }
  return false;
}

export async function postReply(text: string) {
  const editor = await waitFor<HTMLElement>('[data-testid="tweetTextarea_0"]', 4000);
  console.log(`${tag} editor found`);

  const ok = await insertText(editor, text);
  if (!ok) throw new Error('could not insert reply text into the editor');

  const btn = await waitFor<HTMLButtonElement>(
    '[data-testid="tweetButtonInline"]:not([aria-disabled="true"])',
    4000
  );
  console.log(`${tag} reply button enabled, clicking`);
  btn.click();

  try {
    const cancel = await waitFor<HTMLElement>('[data-testid="confirmationSheetCancel"]', 2500);
    cancel.click();
    console.log(`${tag} dismissed premium modal`);
  } catch {
    /* modal didn't appear */
  }
  console.log(`${tag} postReply complete`);
}
