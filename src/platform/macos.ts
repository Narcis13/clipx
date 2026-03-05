import { $ } from "bun";

export async function readPlain(): Promise<string> {
  const result = await $`pbpaste`.text();
  return result;
}

export async function writePlain(content: string): Promise<void> {
  const proc = Bun.spawn(["pbcopy"], { stdin: "pipe" });
  proc.stdin.write(content);
  proc.stdin.end();
  await proc.exited;
}

export async function readRichTypes(): Promise<string[]> {
  const script = `
    use framework "AppKit"
    set pb to current application's NSPasteboard's generalPasteboard()
    set types to pb's types() as list
    return types
  `;
  const result = await $`osascript -e ${script}`.text();
  return result
    .split(", ")
    .map((t) => t.trim())
    .filter(Boolean);
}

export async function readHTML(): Promise<string | null> {
  const script = `
    use framework "AppKit"
    set pb to current application's NSPasteboard's generalPasteboard()
    set htmlData to pb's stringForType:"public.html"
    if htmlData is missing value then return ""
    return htmlData as text
  `;
  const result = await $`osascript -e ${script}`.text();
  return result || null;
}
