import * as macos from "./macos.js";
import * as linux from "./linux.js";

export interface PlatformClipboard {
  readPlain(): Promise<string>;
  writePlain(content: string): Promise<void>;
  readRichTypes?(): Promise<string[]>;
  readHTML?(): Promise<string | null>;
  readRTF?(): Promise<string | null>;
}

function getPlatform(): string {
  return process.platform;
}

export function getClipboard(): PlatformClipboard {
  const platform = getPlatform();
  switch (platform) {
    case "darwin":
      return macos;
    case "linux":
      return linux;
    default:
      throw new Error(
        `Platform "${platform}" is not yet supported. clipx currently supports macOS and Linux.`
      );
  }
}
