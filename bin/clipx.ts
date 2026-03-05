#!/usr/bin/env bun

import { Command } from "commander";
import { readClipboard, readClipboardRaw, peekClipboard, typeClipboard } from "../src/core/reader.js";
import { writeClipboard } from "../src/core/writer.js";
import { formatOutput } from "../src/utils/output.js";

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
  .action(async (opts) => {
    try {
      if (opts.raw) {
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
