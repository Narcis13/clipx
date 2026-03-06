import { $ } from "bun";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

let _swiftBinaryPath: string | null | undefined;

function getSwiftBinaryPath(): string | null {
  if (_swiftBinaryPath !== undefined) return _swiftBinaryPath;

  const candidates = [
    join(__dirname, "../../bin/clipboard-bridge"),
    join(__dirname, "../../swift/.build/release/clipboard-bridge"),
  ];

  for (const candidate of candidates) {
    try {
      const stat = Bun.file(candidate);
      // Check synchronously if file exists by checking size
      if (stat.size !== undefined) {
        _swiftBinaryPath = candidate;
        return candidate;
      }
    } catch {
      // continue
    }
  }

  _swiftBinaryPath = null;
  return null;
}

async function runSwiftBridge(command: string): Promise<string | null> {
  const binary = getSwiftBinaryPath();
  if (!binary) return null;

  try {
    const proc = Bun.spawn([binary, command], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;
    if (exitCode !== 0) return null;
    return output.trim();
  } catch {
    return null;
  }
}

export function hasSwiftBridge(): boolean {
  return getSwiftBinaryPath() !== null;
}

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
  // Prefer Swift binary
  const swiftResult = await runSwiftBridge("types");
  if (swiftResult) {
    try {
      return JSON.parse(swiftResult) as string[];
    } catch {
      // fall through to osascript
    }
  }

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
  // Prefer Swift binary
  const swiftResult = await runSwiftBridge("html");
  if (swiftResult) return swiftResult;

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

export async function readRTF(): Promise<string | null> {
  // Prefer Swift binary (returns base64-encoded RTF data)
  const swiftResult = await runSwiftBridge("rtf");
  if (swiftResult) {
    try {
      const decoded = Buffer.from(swiftResult, "base64").toString("utf-8");
      return decoded;
    } catch {
      return swiftResult;
    }
  }

  const script = `
    use framework "AppKit"
    set pb to current application's NSPasteboard's generalPasteboard()
    set rtfData to pb's stringForType:"public.rtf"
    if rtfData is missing value then return ""
    return rtfData as text
  `;
  const result = await $`osascript -e ${script}`.text();
  return result || null;
}

export async function readImage(): Promise<string | null> {
  const result = await runSwiftBridge("image");
  return result || null;
}

export async function readFiles(): Promise<string[] | null> {
  const result = await runSwiftBridge("files");
  if (!result) return null;
  try {
    return JSON.parse(result) as string[];
  } catch {
    return null;
  }
}

export async function hasImage(): Promise<boolean> {
  const types = await readRichTypes();
  return types.some(
    (t) => t.includes("public.tiff") || t.includes("public.png") || t.includes("image")
  );
}

export async function hasFiles(): Promise<boolean> {
  const types = await readRichTypes();
  return types.some((t) => t.includes("public.file-url") || t.includes("NSFilenamesPboardType"));
}
