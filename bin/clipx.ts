#!/usr/bin/env bun

import { Command } from "commander";
import { readClipboard, readClipboardRaw, readClipboardHTML, readClipboardRTF, readClipboardRich, peekClipboard, typeClipboard } from "../src/core/reader.js";
import { writeClipboard } from "../src/core/writer.js";
import { formatOutput } from "../src/utils/output.js";
import { autoFormat, formatJSON, formatSQL, formatCode } from "../src/transforms/formatter.js";
import { autoValidate, validateJSON, validateURL, validateSQL } from "../src/transforms/validator.js";
import * as stack from "../src/history/stack.js";
import { query as historyQuery, closeDb } from "../src/history/store.js";
import { watch as watchClipboard } from "../src/history/watcher.js";
import { transform, type TransformOp } from "../src/ai/transforms.js";
import { getConfig, setConfig, type AIProvider } from "../src/ai/config.js";

const program = new Command();

program
  .name("clipx")
  .description("AI-powered clipboard intelligence for agents & humans")
  .version("0.1.0");

// --- clipx read ---
program
  .command("read")
  .description("Read clipboard contents with type detection")
  .option("--raw", "Read raw text (no type detection)")
  .option("--json", "Output as JSON")
  .option("--html", "Read HTML representation")
  .option("--rtf", "Read RTF representation")
  .option("--rich", "Read all available representations")
  .action(async (opts) => {
    try {
      if (opts.rich) {
        const result = await readClipboardRich();
        console.log(JSON.stringify(result, null, 2));
      } else if (opts.html) {
        const html = await readClipboardHTML();
        if (html) {
          process.stdout.write(html);
        } else {
          console.error("No HTML content on clipboard");
          process.exit(1);
        }
      } else if (opts.rtf) {
        const rtf = await readClipboardRTF();
        if (rtf) {
          process.stdout.write(rtf);
        } else {
          console.error("No RTF content on clipboard");
          process.exit(1);
        }
      } else if (opts.raw) {
        const content = await readClipboardRaw();
        process.stdout.write(content);
      } else {
        const result = await readClipboard();
        const isJson = opts.json !== undefined ? opts.json : true; // Default to JSON for structured output
        console.log(formatOutput(result, isJson));
      }
    } catch (err) {
      console.error(`Error reading clipboard: ${(err as Error).message}`);
      process.exit(1);
    }
  });

// --- clipx write ---
program
  .command("write [content]")
  .description("Write content to clipboard")
  .option("--restore", "Save current clipboard and auto-restore after 30s")
  .option("--file <path>", "Write file contents to clipboard")
  .action(async (content: string | undefined, opts) => {
    try {
      let text: string;

      if (opts.file) {
        const file = Bun.file(opts.file);
        text = await file.text();
      } else if (content) {
        text = content;
      } else {
        // Read from stdin
        text = await Bun.stdin.text();
      }

      await writeClipboard(text, { restore: opts.restore });

      if (opts.restore) {
        console.error(
          "Clipboard written (previous content will be restored in 30s)"
        );
      }
    } catch (err) {
      console.error(`Error writing clipboard: ${(err as Error).message}`);
      process.exit(1);
    }
  });

// --- clipx type ---
program
  .command("type")
  .description("Detect content type of clipboard")
  .option("--json", "Output as JSON")
  .action(async (opts) => {
    try {
      const result = await typeClipboard();
      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        const type = result.language
          ? `${result.type}:${result.language}`
          : result.type;
        console.log(`${type} (confidence: ${result.confidence.toFixed(2)})`);
      }
    } catch (err) {
      console.error(`Error detecting type: ${(err as Error).message}`);
      process.exit(1);
    }
  });

// --- clipx peek ---
program
  .command("peek")
  .description("Quick preview of clipboard contents")
  .option("--json", "Output as JSON")
  .action(async (opts) => {
    try {
      const result = await peekClipboard();
      const isJson = opts.json !== undefined ? opts.json : true;
      console.log(formatOutput(result, isJson));
    } catch (err) {
      console.error(`Error peeking clipboard: ${(err as Error).message}`);
      process.exit(1);
    }
  });

// --- clipx fmt ---
program
  .command("fmt")
  .description("Auto-format clipboard content based on detected type")
  .option("--json", "Force JSON pretty-print")
  .option("--sql", "Force SQL formatting")
  .option("--code", "Auto-detect language and format")
  .option("--write", "Format and write result back to clipboard")
  .action(async (opts) => {
    try {
      const content = await readClipboardRaw();

      let formatted: string;
      if (opts.json) {
        formatted = formatJSON(content);
      } else if (opts.sql) {
        formatted = formatSQL(content);
      } else if (opts.code) {
        formatted = formatCode(content);
      } else {
        formatted = autoFormat(content);
      }

      if (opts.write) {
        await writeClipboard(formatted);
        console.error("Formatted content written back to clipboard");
      }

      process.stdout.write(formatted + "\n");
    } catch (err) {
      console.error(`Error formatting clipboard: ${(err as Error).message}`);
      process.exit(1);
    }
  });

// --- clipx validate ---
program
  .command("validate")
  .description("Validate clipboard content syntax/structure")
  .option("--json", "Validate JSON syntax")
  .option("--url", "Check URL format")
  .option("--sql", "SQL syntax check")
  .action(async (opts) => {
    try {
      const content = await readClipboardRaw();

      let result;
      if (opts.json) {
        result = validateJSON(content);
      } else if (opts.url) {
        result = validateURL(content);
      } else if (opts.sql) {
        result = validateSQL(content);
      } else {
        result = autoValidate(content);
      }

      console.log(JSON.stringify(result, null, 2));
      if (!result.valid) {
        process.exit(1);
      }
    } catch (err) {
      console.error(`Error validating clipboard: ${(err as Error).message}`);
      process.exit(1);
    }
  });

// --- clipx stack ---
const stackCmd = program
  .command("stack")
  .description("Multi-slot clipboard stack for saving/restoring multiple items");

stackCmd
  .command("push")
  .description("Push current clipboard contents to the stack")
  .action(async () => {
    try {
      const item = await stack.push();
      const preview = item.content.length > 80
        ? item.content.slice(0, 80) + "..."
        : item.content;
      console.error(`Pushed: [${item.type}] ${preview}`);
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

stackCmd
  .command("pop")
  .description("Pop top item from stack and write to clipboard")
  .action(async () => {
    try {
      const item = await stack.pop();
      const preview = item.content.length > 80
        ? item.content.slice(0, 80) + "..."
        : item.content;
      console.error(`Popped: [${item.type}] ${preview}`);
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

stackCmd
  .command("list")
  .description("Show all items in the stack")
  .option("--json", "Output as JSON")
  .action((opts) => {
    const items = stack.list();
    if (items.length === 0) {
      console.log("Stack is empty");
      return;
    }
    if (opts.json) {
      console.log(JSON.stringify(items, null, 2));
      return;
    }
    items.forEach((item, i) => {
      const preview = item.content.length > 60
        ? item.content.slice(0, 60).replace(/\n/g, "\\n") + "..."
        : item.content.replace(/\n/g, "\\n");
      const label = i === items.length - 1 ? " (top)" : "";
      console.log(`  ${i}: [${item.type}] ${preview}${label}`);
    });
  });

stackCmd
  .command("pick <index>")
  .description("Copy specific slot to clipboard (without removing)")
  .action(async (indexStr: string) => {
    try {
      const index = parseInt(indexStr, 10);
      if (isNaN(index)) {
        console.error("Error: index must be a number");
        process.exit(1);
      }
      const item = await stack.pick(index);
      const preview = item.content.length > 80
        ? item.content.slice(0, 80) + "..."
        : item.content;
      console.error(`Picked: [${item.type}] ${preview}`);
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

stackCmd
  .command("clear")
  .description("Clear the entire stack")
  .action(() => {
    stack.clear();
    console.error("Stack cleared");
  });

stackCmd
  .command("swap")
  .description("Swap the top two items in the stack")
  .action(async () => {
    try {
      await stack.swap();
      console.error("Swapped top two items");
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

// --- clipx history ---
program
  .command("history")
  .description("Show clipboard history from SQLite store")
  .option("--limit <n>", "Number of entries to show", "20")
  .option("--type <type>", "Filter by content type (e.g. code, json, url)")
  .option("--since <duration>", "Time filter (e.g. 1h, 30m, 2d)")
  .option("--search <query>", "Full-text search in content")
  .option("--json", "Output as JSON")
  .action((opts) => {
    try {
      const entries = historyQuery({
        limit: parseInt(opts.limit, 10),
        type: opts.type,
        since: opts.since,
        search: opts.search,
      });

      if (entries.length === 0) {
        console.log("No history entries found");
        closeDb();
        return;
      }

      if (opts.json) {
        console.log(JSON.stringify(entries, null, 2));
      } else {
        for (const entry of entries) {
          const lang = entry.language ? `:${entry.language}` : "";
          const time = entry.created_at;
          console.log(`  ${entry.id} | ${time} | [${entry.type}${lang}] ${entry.preview}`);
        }
      }
      closeDb();
    } catch (err) {
      console.error(`Error querying history: ${(err as Error).message}`);
      process.exit(1);
    }
  });

// --- clipx watch ---
program
  .command("watch")
  .description("Watch clipboard for changes and save to history")
  .option("--json", "Output structured JSON stream")
  .option("--debounce <ms>", "Debounce interval in ms", "300")
  .option("--ignore-secrets", "Skip entries detected as secrets")
  .option("--callback <cmd>", "Execute command on each change (entry JSON on stdin)")
  .action(async (opts) => {
    try {
      await watchClipboard({
        json: opts.json,
        debounce: parseInt(opts.debounce, 10),
        ignoreSecrets: opts.ignoreSecrets,
        callback: opts.callback,
      });
    } catch (err) {
      console.error(`Error watching clipboard: ${(err as Error).message}`);
      process.exit(1);
    }
  });

// --- clipx ai ---
const aiCmd = program
  .command("ai")
  .description("AI-powered clipboard transforms");

aiCmd
  .command("fix")
  .description("Fix code errors, typos, and syntax issues")
  .option("--write", "Write result back to clipboard")
  .action(async (opts) => {
    try {
      const result = await transform({ op: "fix", write: opts.write });
      process.stdout.write(result + "\n");
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

aiCmd
  .command("explain")
  .description("Explain clipboard content")
  .action(async () => {
    try {
      const result = await transform({ op: "explain" });
      process.stdout.write(result + "\n");
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

aiCmd
  .command("translate")
  .description("Translate clipboard content to a language")
  .requiredOption("--to <lang>", "Target language (e.g. ro, es, fr)")
  .option("--write", "Write result back to clipboard")
  .action(async (opts) => {
    try {
      const result = await transform({ op: "translate", to: opts.to, write: opts.write });
      process.stdout.write(result + "\n");
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

aiCmd
  .command("convert")
  .description("Convert content to another format (SQL->TS, cURL->fetch, etc)")
  .requiredOption("--to <format>", "Target format (e.g. ts, fetch, json)")
  .option("--write", "Write result back to clipboard")
  .action(async (opts) => {
    try {
      const result = await transform({ op: "convert", to: opts.to, write: opts.write });
      process.stdout.write(result + "\n");
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

aiCmd
  .command("summarize")
  .description("Summarize clipboard content")
  .option("--write", "Write result back to clipboard")
  .action(async (opts) => {
    try {
      const result = await transform({ op: "summarize", write: opts.write });
      process.stdout.write(result + "\n");
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

aiCmd
  .command("review")
  .description("Code review of clipboard content")
  .action(async () => {
    try {
      const result = await transform({ op: "review" });
      process.stdout.write(result + "\n");
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

aiCmd
  .command("name")
  .description("Suggest variable/function names for clipboard content")
  .action(async () => {
    try {
      const result = await transform({ op: "name" });
      process.stdout.write(result + "\n");
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

aiCmd
  .command("config")
  .description("Configure AI provider, model, and API key")
  .option("--provider <provider>", "Set provider (openrouter, anthropic, openai)")
  .option("--model <model>", "Set model name")
  .option("--key <key>", "Set API key")
  .option("--keychain", "Store API key in macOS Keychain")
  .option("--show", "Show current configuration")
  .action(async (opts) => {
    try {
      if (opts.show || (!opts.provider && !opts.model && !opts.key)) {
        const config = await getConfig();
        console.log(`Provider: ${config.provider}`);
        console.log(`Model:    ${config.model}`);
        console.log(`API Key:  ${config.apiKey ? "***" + config.apiKey.slice(-4) : "(not set)"}`);
        return;
      }
      await setConfig({
        provider: opts.provider as AIProvider | undefined,
        model: opts.model,
        key: opts.key,
        keychain: opts.keychain,
      });
      console.error("Configuration updated");
      if (opts.provider || opts.model) {
        const config = await getConfig();
        console.log(`Provider: ${config.provider}`);
        console.log(`Model:    ${config.model}`);
      }
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

// --- clipx mcp ---
program
  .command("mcp")
  .description("Start as MCP server (stdio transport)")
  .action(async () => {
    try {
      const { startMcpServer } = await import("../src/mcp/server.js");
      await startMcpServer();
    } catch (err) {
      console.error(`Error starting MCP server: ${(err as Error).message}`);
      process.exit(1);
    }
  });

program.parse();
