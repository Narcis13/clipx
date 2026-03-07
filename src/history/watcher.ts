import { getClipboard, type SourceInfo } from "../platform/index.js";
import { detect } from "../core/detector.js";
import { detectSecret } from "../core/secrets.js";
import { addEntry, getLastHash, type AddEntryInput } from "./store.js";
import { loadConfig } from "../config.js";

export interface WatchOptions {
  debounce?: number;
  json?: boolean;
  ignoreSecrets?: boolean;
  callback?: string;
}

function contentHash(content: string): string {
  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(content);
  return hasher.digest("hex");
}

export async function watch(opts: WatchOptions = {}): Promise<void> {
  const config = loadConfig();
  const debounceMs = opts.debounce ?? config.watch.debounce;
  const clipboard = getClipboard();

  // Initialize with current clipboard hash to avoid capturing pre-existing content
  let lastHash: string;
  try {
    const initial = await clipboard.readPlain();
    lastHash = contentHash(initial);
  } catch {
    lastHash = "";
  }

  // Also check db for last known hash
  const dbHash = getLastHash();
  if (dbHash) lastHash = dbHash;

  const abortController = new AbortController();

  const cleanup = () => {
    abortController.abort();
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  if (!opts.json) {
    console.error("Watching clipboard... (Ctrl+C to stop)");
  }

  while (!abortController.signal.aborted) {
    try {
      const content = await clipboard.readPlain();
      const hash = contentHash(content);

      if (hash !== lastHash && content.length > 0) {
        lastHash = hash;

        const detection = detect(content);

        // Skip secrets if --ignore-secrets
        if (opts.ignoreSecrets) {
          const secretCheck = detectSecret(content);
          if (secretCheck.isSecret) continue;
        }

        // Capture source app immediately at change time
        let source: SourceInfo | null = null;
        if (clipboard.readSource) {
          source = await clipboard.readSource();
        }

        // Skip excluded apps
        const config2 = loadConfig();
        if (source?.app && config2.history.excludeApps.includes(source.app)) {
          continue;
        }

        const input: AddEntryInput = {
          content,
          type: detection.type,
          language: detection.language,
          confidence: detection.confidence,
          sourceApp: source?.app,
          sourceBundleId: source?.bundleId,
          sourceUrl: source?.url,
        };

        const entry = addEntry(input);

        if (opts.json) {
          console.log(JSON.stringify(entry));
        } else {
          const preview = content.length > 80
            ? content.slice(0, 80).replace(/\n/g, "\\n") + "..."
            : content.replace(/\n/g, "\\n");
          const lang = detection.language ? `:${detection.language}` : "";
          const src = source?.app ? ` (${source.app})` : "";
          console.log(`[${detection.type}${lang}]${src} ${preview}`);
        }

        // Callback mode: spawn command with entry as stdin
        if (opts.callback) {
          const proc = Bun.spawn(["sh", "-c", opts.callback], {
            stdin: new Response(JSON.stringify(entry)).body,
            stdout: "inherit",
            stderr: "inherit",
          });
          // Don't await - fire and forget
          proc.exited.catch(() => {});
        }
      }
    } catch {
      // Clipboard read error - ignore and retry
    }

    await Bun.sleep(debounceMs);
  }
}
