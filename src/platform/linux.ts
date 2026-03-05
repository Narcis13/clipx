import { $ } from "bun";

async function findClipboardTool(): Promise<"xclip" | "xsel" | "wl-copy"> {
  try {
    await $`which wl-copy`.quiet();
    return "wl-copy";
  } catch {
    // not found
  }
  try {
    await $`which xclip`.quiet();
    return "xclip";
  } catch {
    // not found
  }
  try {
    await $`which xsel`.quiet();
    return "xsel";
  } catch {
    // not found
  }
  throw new Error(
    "No clipboard tool found. Install xclip, xsel, or wl-clipboard."
  );
}

export async function readPlain(): Promise<string> {
  const tool = await findClipboardTool();
  switch (tool) {
    case "wl-copy":
      return await $`wl-paste`.text();
    case "xclip":
      return await $`xclip -selection clipboard -o`.text();
    case "xsel":
      return await $`xsel --clipboard --output`.text();
  }
}

export async function writePlain(content: string): Promise<void> {
  const tool = await findClipboardTool();
  let proc: ReturnType<typeof Bun.spawn>;
  switch (tool) {
    case "wl-copy":
      proc = Bun.spawn(["wl-copy"], { stdin: "pipe" });
      break;
    case "xclip":
      proc = Bun.spawn(["xclip", "-selection", "clipboard"], {
        stdin: "pipe",
      });
      break;
    case "xsel":
      proc = Bun.spawn(["xsel", "--clipboard", "--input"], { stdin: "pipe" });
      break;
  }
  proc.stdin.write(content);
  proc.stdin.end();
  await proc.exited;
}
