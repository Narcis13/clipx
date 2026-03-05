# clipx — Product Requirements Document

## AI-Powered Clipboard Intelligence for Agents & Humans

**Version:** 1.0
**Author:** Narcis
**Date:** March 2026
**Stack:** Bun.js, TypeScript, Swift (macOS companion)

---

## 1. Vision & Problem Statement

### The Problem

AI coding agents (Claude Code, Cursor, Aider, etc.) live in the terminal. They can't interact with GUI applications — browsers, design tools, IDEs, spreadsheets, Slack. But every single one of those apps supports one common interface: **the clipboard**.

Today's clipboard is dumb. It's a raw text buffer with no type awareness, no history, no intelligence. Developers constantly copy/paste between apps, but no tool understands *what* was copied, *where* it came from, or *what the user probably wants to do with it*.

### The Vision

**clipx** transforms the macOS clipboard from a dumb buffer into a **typed, intelligent, bidirectional communication channel** between the user's GUI world and AI agents' CLI world.

It is the **universal MCP server for every app** — zero integrations needed.

### The Layered Product Strategy

```
Layer 3:  clipx Mac Utility (GUI)        → Future (menu bar app, if traction proves demand)
Layer 2:  Claude Code Skill              → Week 2 (markdown skill file that leverages Layer 1)
Layer 1:  clipx CLI + MCP Server (OSS)   → Week 1 (foundation, ship first)
```

Each layer builds on the one below. Layer 1 is the engine. Layer 2 is the AI integration. Layer 3 is the consumer product.

---

## 2. Layer 1 — clipx CLI (Open Source Foundation)

### 2.1 Overview

A standalone command-line tool, installable via `bun add -g clipx` or `npm install -g clipx`, that provides intelligent clipboard operations. Framework-agnostic, model-agnostic, macOS-first with Linux/Windows extensibility.

### 2.2 Core Principles

- **Zero-config by default** — `clipx read` and `clipx write` should just work out of the box with no setup
- **Type-aware** — Every clipboard read includes automatic content type detection
- **Agent-friendly** — JSON output mode for machine consumption, MCP server mode for agent frameworks
- **Privacy-first** — Secret detection built into the core, redaction by default, no telemetry
- **Composable** — Unix philosophy: pipes, stdin/stdout, works with any tool

### 2.3 CLI Command Specification

#### 2.3.1 Core Operations

```bash
# Read clipboard contents with type detection
clipx read
# Output:
# {
#   "type": "code",
#   "language": "typescript",
#   "confidence": 0.94,
#   "content": "const x: string = ...",
#   "length": 342,
#   "representations": ["public.utf8-plain-text", "public.html"]
# }

# Read raw (plain pbpaste equivalent, for piping)
clipx read --raw

# Read specific representation (rich clipboard access)
clipx read --rich              # All available representations
clipx read --html              # HTML representation (from browser copies)
clipx read --rtf               # RTF representation

# Write to clipboard
clipx write "hello world"
echo "hello" | clipx write     # Pipe support
clipx write --file ./data.json # Write file contents
clipx write --restore          # Save current clipboard before overwriting (auto-restores after 30s or on next read)

# Quick preview (for agents — cheap context check)
clipx peek
# Output: { "type": "json", "length": 4891, "preview": "{\"users\": [{\"id\": 1, ..." }
```

#### 2.3.2 Type Detection

```bash
# Detect content type
clipx type
# Output: code:typescript (confidence: 0.94)

clipx type --json
# Output: { "type": "code", "language": "typescript", "confidence": 0.94, "meta": { "hasErrors": false, "lineCount": 23 } }

# Supported types:
# - code:<language>     (typescript, javascript, python, rust, go, sql, html, css, bash, etc.)
# - json                (valid JSON — objects, arrays)
# - url                 (single URL or list of URLs)
# - error               (stack traces, error messages, compiler errors)
# - table               (TSV, CSV, markdown table, HTML table)
# - sql                 (queries, DDL, DML)
# - text                (natural language — with language detection)
# - path                (file paths, directory paths)
# - secret              (passwords, tokens, API keys — REDACTED by default)
# - image               (image data on clipboard — returns metadata only)
# - file-ref            (file references copied from Finder)
# - unknown             (unclassifiable)
```

#### 2.3.3 Transform Operations (Local, No AI)

```bash
# Auto-format based on detected type
clipx fmt                      # Detect type → apply appropriate formatter
clipx fmt --json               # Force JSON pretty-print
clipx fmt --sql                # Force SQL formatting
clipx fmt --code               # Auto-detect language and format
clipx fmt --write              # Format and write result back to clipboard

# Validate clipboard contents
clipx validate                 # Auto-validate based on type
clipx validate --json          # Validate JSON (syntax + optional schema)
clipx validate --url           # Check URL reachability
clipx validate --sql           # SQL syntax check

# Convert between formats
clipx convert --to csv         # Table → CSV
clipx convert --to json        # Table/CSV → JSON
clipx convert --to markdown    # Table → Markdown table
clipx convert --to base64      # Encode to base64
clipx convert --from base64    # Decode from base64
```

#### 2.3.4 Clipboard History & Stack

```bash
# Clipboard history (requires clipx daemon or watch mode)
clipx history                  # Show last 20 entries
clipx history --limit 50       # Custom limit
clipx history --type code      # Filter by type
clipx history --since 1h       # Time filter
clipx history --json           # Machine-readable output
clipx history --search "stripe" # Full-text search

# Multi-slot clipboard stack
clipx stack push               # Push current clipboard to stack
clipx stack pop                # Pop top → clipboard (and restore)
clipx stack list               # Show all slots
clipx stack pick 3             # Pick specific slot → clipboard
clipx stack clear              # Clear stack
clipx stack swap               # Swap top two items

# Watch mode (monitor clipboard changes)
clipx watch                    # Stream clipboard changes to stdout
clipx watch --json             # Structured JSON stream (for agent piping)
clipx watch --debounce 500     # Debounce interval in ms (default: 300)
clipx watch --ignore-secrets   # Skip entries detected as secrets
clipx watch --callback "cmd"   # Execute command on each change
```

#### 2.3.5 AI-Powered Operations (Optional, BYO Key)

```bash
# AI transforms (requires ANTHROPIC_API_KEY or OPENAI_API_KEY)
clipx ai fix                   # Fix code errors, typos
clipx ai explain               # Explain clipboard content
clipx ai translate --to ro     # Translate to target language
clipx ai convert --to ts       # Convert (e.g., SQL → TypeScript types, cURL → fetch)
clipx ai summarize             # Summarize long content
clipx ai review                # Code review clipboard content
clipx ai name                  # Suggest variable/function names for code

# AI config
clipx ai config --provider anthropic   # Set AI provider
clipx ai config --model claude-sonnet-4-5-20250929  # Set model
clipx ai config --key sk-ant-...       # Set API key (stored in OS keychain)
```

#### 2.3.6 MCP Server Mode

```bash
# Start as MCP server (stdio transport — standard for Claude Code / Claude Desktop)
clipx mcp

# This exposes the following MCP tools:
# - clipboard_read        → Read clipboard with type detection
# - clipboard_write       → Write to clipboard
# - clipboard_peek        → Quick preview (low token cost)
# - clipboard_type        → Detect content type
# - clipboard_history     → Query clipboard history
# - clipboard_stack_push  → Push to stack
# - clipboard_stack_pop   → Pop from stack
# - clipboard_transform   → Format/validate/convert
```

**MCP Server Configuration (for Claude Code):**

```json
// .claude/mcp.json or claude_desktop_config.json
{
  "mcpServers": {
    "clipboard": {
      "command": "clipx",
      "args": ["mcp"]
    }
  }
}
```

### 2.4 Type Detection Engine — Specification

The type detection engine is the core differentiator. It must be fast (< 5ms), accurate (> 90% for common types), and run with zero external dependencies.

#### Detection Priority Order (first match wins):

```
1. Secret detection     → High-entropy strings, known patterns (API keys, tokens, passwords)
2. File reference       → Clipboard contains file:// URLs (Finder copies)
3. Image detection      → Binary data / image UTI present
4. URL                  → Starts with http(s)://, valid URL format
5. JSON                 → Valid JSON (try parse)
6. SQL                  → Keywords: SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP (case-insensitive, with structure)
7. Stack trace / Error  → Known patterns: "Error:", "at line", "Traceback", "panic:", file:line:col patterns
8. Table                → Tab-separated with consistent columns, CSV with header, markdown table syntax
9. File path            → Unix paths (/...), Windows paths (C:\...), ~/ paths
10. Code                → Language detection via heuristics (see below)
11. Natural language     → Default fallback — detect language (en, ro, etc.)
```

#### Code Language Detection Heuristics:

```typescript
// Pattern-based detection (no AST parsing needed)
const LANGUAGE_SIGNALS = {
  typescript: [/:\s*(string|number|boolean|any|void|never)/, /interface\s+\w+/, /import\s+.*\s+from/, /<\w+>/, /as\s+const/],
  javascript: [/const\s+\w+\s*=/, /function\s+\w+/, /=>\s*{/, /require\(/, /module\.exports/],
  python:     [/def\s+\w+\(/, /import\s+\w+/, /from\s+\w+\s+import/, /if\s+__name__/, /self\./],
  rust:       [/fn\s+\w+/, /let\s+mut\s+/, /impl\s+\w+/, /pub\s+fn/, /use\s+\w+::/],
  go:         [/func\s+\w+/, /package\s+\w+/, /import\s+\(/, /fmt\./, /:=\s*/],
  sql:        [/SELECT\s+/i, /FROM\s+/i, /WHERE\s+/i, /JOIN\s+/i, /GROUP\s+BY/i],
  html:       [/<html/i, /<div/, /<span/, /<head/, /<!DOCTYPE/i],
  css:        [/{\s*[\w-]+\s*:/, /@media/, /@import/, /\.[\w-]+\s*{/, /#[\w-]+\s*{/],
  bash:       [/^#!/, /\|\s*grep/, /\$\(/, /if\s+\[/, /echo\s+/],
  swift:      [/func\s+\w+/, /var\s+\w+\s*:/, /let\s+\w+\s*:/, /guard\s+let/, /import\s+Foundation/],
  java:       [/public\s+class/, /public\s+static\s+void/, /System\.out/, /import\s+java\./],
};
```

#### Secret Detection Patterns:

```typescript
const SECRET_PATTERNS = [
  /^sk-[a-zA-Z0-9]{20,}$/,                    // OpenAI / Anthropic keys
  /^(ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36,}/, // GitHub tokens
  /^xox[bpras]-[a-zA-Z0-9-]+/,                // Slack tokens
  /^AKIA[0-9A-Z]{16}$/,                        // AWS access keys
  /^eyJ[a-zA-Z0-9_-]+\.eyJ/,                   // JWTs
  /-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----/, // PEM private keys
  /^[a-f0-9]{64}$/,                            // Generic hex secrets (64 char)
];

// Entropy check for unknown strings
function isHighEntropy(str: string): boolean {
  // Shannon entropy > 4.5 for strings 16+ chars → likely a secret
}
```

### 2.5 Project Structure

```
clipx/
├── package.json
├── tsconfig.json
├── bunfig.toml
├── README.md
├── LICENSE                    # MIT
├── bin/
│   └── clipx.ts              # CLI entry point (Commander.js)
├── src/
│   ├── index.ts               # Library entry point (for programmatic use)
│   ├── core/
│   │   ├── reader.ts          # Clipboard read operations
│   │   ├── writer.ts          # Clipboard write operations (with restore)
│   │   ├── detector.ts        # Type detection engine
│   │   └── secrets.ts         # Secret detection and redaction
│   ├── transforms/
│   │   ├── formatter.ts       # Auto-formatting (prettier integration)
│   │   ├── validator.ts       # Validation (JSON, URL, SQL)
│   │   └── converter.ts       # Format conversion (CSV, JSON, markdown, base64)
│   ├── history/
│   │   ├── store.ts           # SQLite-backed clipboard history
│   │   ├── watcher.ts         # Clipboard change monitor (polling)
│   │   └── stack.ts           # Multi-slot clipboard stack
│   ├── ai/
│   │   ├── provider.ts        # AI provider abstraction (Anthropic, OpenAI)
│   │   ├── transforms.ts      # AI-powered transform commands
│   │   └── config.ts          # API key management (OS keychain)
│   ├── mcp/
│   │   ├── server.ts          # MCP server implementation (stdio)
│   │   ├── tools.ts           # MCP tool definitions
│   │   └── handlers.ts        # MCP tool handlers
│   ├── platform/
│   │   ├── index.ts           # Platform detection and dispatch
│   │   ├── macos.ts           # macOS: pbcopy/pbpaste + osascript bridge
│   │   ├── macos-rich.swift   # Swift companion for rich clipboard access
│   │   ├── linux.ts           # Linux: xclip/xsel/wl-copy
│   │   └── windows.ts         # Windows: clip.exe / PowerShell
│   └── utils/
│       ├── output.ts          # Output formatting (human vs JSON)
│       └── logger.ts          # Logging utility
├── tests/
│   ├── detector.test.ts       # Type detection tests (most critical)
│   ├── reader.test.ts
│   ├── writer.test.ts
│   ├── secrets.test.ts
│   ├── formatter.test.ts
│   ├── history.test.ts
│   ├── mcp.test.ts
│   └── fixtures/              # Test fixtures for each content type
│       ├── code-samples/
│       ├── error-samples/
│       ├── json-samples/
│       ├── table-samples/
│       └── secret-samples/
└── swift/
    ├── ClipboardBridge.swift  # Rich clipboard access binary
    ├── Package.swift
    └── build.sh               # Build script for Swift companion
```

### 2.6 Dependencies

```json
{
  "name": "clipx",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "clipx": "./bin/clipx.ts"
  },
  "dependencies": {
    "commander": "^12.0.0",
    "@modelcontextprotocol/sdk": "^1.0.0",
    "better-sqlite3": "^11.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "bun-types": "latest",
    "@types/better-sqlite3": "^7.6.0"
  }
}
```

**Why these dependencies and nothing else:**

- `commander` — Industry-standard CLI framework, lightweight, great DX
- `@modelcontextprotocol/sdk` — Official MCP SDK for server implementation
- `better-sqlite3` — Clipboard history storage, zero-config, fast
- `zod` — Schema validation for structured outputs and MCP tool inputs

**Intentionally omitted:**

- No `prettier` — Use Bun's native formatting or simple regex-based formatters to keep the package tiny
- No `tree-sitter` — Code detection uses heuristics, not AST parsing (fast, zero native deps)
- No AI SDKs — Use raw `fetch()` to Anthropic/OpenAI APIs (fewer deps, BYO provider)

### 2.7 Platform Layer Specification (macOS First)

#### macOS Plain Text (default, zero deps):

```typescript
// platform/macos.ts
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
```

#### macOS Rich Clipboard (via osascript):

```typescript
// platform/macos.ts (rich operations)
export async function readRichTypes(): Promise<string[]> {
  // Returns available UTI types on clipboard
  const script = `
    use framework "AppKit"
    set pb to current application's NSPasteboard's generalPasteboard()
    set types to pb's types() as list
    return types
  `;
  const result = await $`osascript -e ${script}`.text();
  return result.split(", ");
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
```

#### Swift Companion (for advanced use cases — images, file refs):

```swift
// swift/ClipboardBridge.swift
import AppKit
import Foundation

enum Command: String {
  case types, html, rtf, image, files
}

let args = CommandLine.arguments
guard args.count > 1, let cmd = Command(rawValue: args[1]) else {
  print(#"{"error": "Usage: clipboard-bridge <types|html|rtf|image|files>"}"#)
  exit(1)
}

let pb = NSPasteboard.general

switch cmd {
case .types:
  let types = pb.types?.map { $0.rawValue } ?? []
  let json = try! JSONSerialization.data(withJSONObject: types)
  print(String(data: json, encoding: .utf8)!)

case .html:
  if let html = pb.string(forType: .html) {
    print(html)
  }

case .rtf:
  if let rtf = pb.data(forType: .rtf) {
    print(rtf.base64EncodedString())
  }

case .image:
  if let tiff = pb.data(forType: .tiff) {
    let bitmap = NSBitmapImageRep(data: tiff)!
    let png = bitmap.representation(using: .png, properties: [:])!
    print(png.base64EncodedString())
  }

case .files:
  if let urls = pb.readObjects(forClasses: [NSURL.self]) as? [URL] {
    let paths = urls.map { $0.path }
    let json = try! JSONSerialization.data(withJSONObject: paths)
    print(String(data: json, encoding: .utf8)!)
  }
}
```

### 2.8 MCP Server Specification

The MCP server is the highest-leverage feature in Layer 1. It turns clipx into a tool any MCP-compatible agent can use.

#### Tool Definitions:

```typescript
// mcp/tools.ts
export const TOOLS = [
  {
    name: "clipboard_read",
    description: "Read the current clipboard contents with automatic type detection. Returns the content, detected type (code, json, url, error, table, sql, text, secret, file-ref), language (for code), and confidence score. Use this when the user says 'fix this', 'look at this', 'what is this' without providing content — they likely copied it to clipboard.",
    inputSchema: {
      type: "object",
      properties: {
        format: {
          type: "string",
          enum: ["auto", "raw", "html", "rtf"],
          description: "Which clipboard representation to read. 'auto' returns plain text with type metadata (default). 'html' returns HTML representation if available (useful for tables copied from browsers). 'raw' returns plain text with no metadata.",
          default: "auto"
        }
      }
    }
  },
  {
    name: "clipboard_write",
    description: "Write content to the clipboard. Use after generating code, fixing errors, or producing any output the user will want to paste into another application. Optionally saves the previous clipboard content for restoration.",
    inputSchema: {
      type: "object",
      properties: {
        content: { type: "string", description: "Content to write to clipboard" },
        restore: { type: "boolean", description: "If true, saves current clipboard content and restores it after 30 seconds", default: false }
      },
      required: ["content"]
    }
  },
  {
    name: "clipboard_peek",
    description: "Quick, low-cost preview of clipboard contents. Returns type, length, and first 200 characters. Use this to check what's on the clipboard before deciding whether to do a full read. Costs fewer tokens than clipboard_read.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "clipboard_type",
    description: "Detect the type of content currently on the clipboard without returning the full content. Returns type, language (if code), confidence, and metadata. Use when you need to know what kind of content is on the clipboard to decide your next action.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "clipboard_history",
    description: "Query recent clipboard history. Requires clipx watch to be running in background. Returns recent clipboard entries with timestamps, types, and content previews.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Number of entries to return", default: 10 },
        type: { type: "string", description: "Filter by content type (code, json, url, error, etc.)" },
        search: { type: "string", description: "Full-text search across clipboard history" }
      }
    }
  },
  {
    name: "clipboard_stack_push",
    description: "Push the current clipboard content onto a stack. Useful for saving clipboard state before writing new content, or for accumulating multiple items.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "clipboard_stack_pop",
    description: "Pop the top item from the clipboard stack and write it to the clipboard. Use to restore previously saved clipboard content.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "clipboard_transform",
    description: "Apply a transformation to the current clipboard content and write the result back. Available transforms: 'format' (auto-format code/JSON/SQL), 'validate' (check syntax), 'to-csv', 'to-json', 'to-markdown' (convert tables), 'to-base64', 'from-base64'.",
    inputSchema: {
      type: "object",
      properties: {
        transform: {
          type: "string",
          enum: ["format", "validate", "to-csv", "to-json", "to-markdown", "to-base64", "from-base64"],
          description: "The transformation to apply"
        },
        write_back: { type: "boolean", description: "Write transformed result back to clipboard", default: true }
      },
      required: ["transform"]
    }
  }
];
```

### 2.9 Configuration

```bash
# Config file: ~/.config/clipx/config.json
{
  "history": {
    "enabled": true,
    "maxEntries": 1000,
    "dbPath": "~/.local/share/clipx/history.db",
    "excludeTypes": ["secret"],
    "excludeApps": ["1Password", "Keychain Access"]
  },
  "ai": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-5-20250929",
    "apiKey": null  // If null, reads from ANTHROPIC_API_KEY env var or OS keychain
  },
  "detection": {
    "secretRedaction": true,
    "minConfidence": 0.7
  },
  "watch": {
    "pollInterval": 300,  // ms
    "debounce": 500       // ms
  }
}
```

### 2.10 MVP Scope (Layer 1 — Week 1)

**Must ship (P0):**

1. `clipx read` — Plain text read with type detection
2. `clipx read --raw` — Raw read (pbpaste equivalent)
3. `clipx write` / pipe support — Write to clipboard
4. `clipx type` — Content type detection (full heuristic engine)
5. `clipx peek` — Quick preview
6. `clipx mcp` — MCP server with `clipboard_read`, `clipboard_write`, `clipboard_peek`, `clipboard_type`
7. Secret detection with redaction
8. `--json` flag on all commands for machine-readable output

**Should ship (P1):**

9. `clipx fmt` — Auto-formatting
10. `clipx validate` — Validation
11. `clipx read --html` — Rich clipboard (osascript)
12. `clipx stack` — Multi-slot stack
13. `clipx history` + `clipx watch` — History with SQLite
14. MCP tools for stack and history

**Can wait (P2):**

15. `clipx ai *` — AI transforms
16. `clipx convert` — Format conversions
17. Swift companion binary for images/files
18. Linux/Windows platform support
19. Configuration file support

---

## 3. Layer 2 — Claude Code Skill

### 3.1 Overview

A Claude Code skill file that teaches the agent how and when to use clipx. This is a markdown file placed in the project's `.claude/` directory (or `~/.claude/` for global use).

### 3.2 Skill File

**Location:** `~/.claude/skills/clipboard.md` (global) or `.claude/skills/clipboard.md` (project)

```markdown
# Clipboard Skill (clipx)

## Setup
The `clipx` CLI is available on the system. Use it to interact with the macOS clipboard.

## When to Read Clipboard
- User says "fix this", "look at this", "what's wrong", "check this", "convert this",
  "explain this", "review this" WITHOUT providing code or content inline
- User says "I copied..." or "from my clipboard" or "what I just copied"
- User references content they're working with in another app (browser, IDE, Figma, etc.)

**Always check clipboard first before asking the user to paste content.**

## When to Write Clipboard
- After generating code the user will want to paste somewhere
- After fixing/transforming content that came from clipboard
- When producing short outputs (< 50 lines) the user likely wants in another app

Write to clipboard AND show the output in chat. Say "I've also copied this to your clipboard."

## Commands Reference
- `clipx read` — Read clipboard with type detection (JSON output)
- `clipx read --raw` — Read raw text
- `clipx peek` — Quick preview (use this first to save tokens)
- `clipx type` — Just detect content type
- `clipx write "content"` — Write to clipboard
- `echo "content" | clipx write` — Pipe to clipboard
- `clipx fmt --write` — Format clipboard content in-place
- `clipx stack push` / `clipx stack pop` — Save/restore clipboard

## Workflow Patterns

### Pattern: Clipboard-First Context
1. User asks to fix/explain/convert something without providing content
2. Run `clipx peek` to check what's on clipboard
3. If relevant content found, run `clipx read` for full content
4. Process the content
5. Write result back with `clipx write`

### Pattern: Multi-Source Assembly
1. User is working across multiple apps
2. Use `clipx stack push` to save each clipboard item
3. Use `clipx stack list` to review all collected items
4. Synthesize/combine as needed

### Pattern: Safe Output Delivery
1. Generate output (code, text, etc.)
2. Write to clipboard: `echo "$output" | clipx write --restore`
3. The --restore flag saves previous clipboard content
4. User pastes output, clipboard auto-restores

## Security Rules
- If `clipx type` returns "secret", DO NOT read or display the content
- Never log clipboard contents to files
- If clipboard contains what appears to be credentials, warn the user
- Do not send clipboard contents to any external API without user confirmation
```

### 3.3 MCP Integration (Alternative to Skill File)

Instead of (or in addition to) the skill file, users can add clipx as an MCP server in their Claude Code config:

**`~/.claude/mcp.json`:**
```json
{
  "mcpServers": {
    "clipboard": {
      "command": "clipx",
      "args": ["mcp"],
      "description": "Intelligent clipboard access with type detection"
    }
  }
}
```

This gives Claude Code direct tool access (`clipboard_read`, `clipboard_write`, etc.) which is more reliable than bash command execution because the model uses structured tool calls instead of constructing shell commands.

### 3.4 Skill + MCP Combination

The ideal setup uses BOTH:

- **MCP server** — Gives the agent structured tools for clipboard operations
- **Skill file** — Teaches the agent *when* and *why* to use those tools (behavioral instructions)

The skill file references MCP tools instead of bash commands when MCP is available.

---

## 4. Layer 3 — Mac Utility (Future Vision)

> This layer is documented for strategic context but is NOT in scope for initial development.

### 4.1 Concept

A native macOS menu bar application that wraps clipx in a beautiful GUI with real-time clipboard monitoring, visual history, and one-click AI transforms.

### 4.2 Key Features (Future)

- **Menu bar icon** with dropdown showing typed clipboard history
- **Quick actions** per entry type (Format, Explain, Convert, Fix)
- **Global hotkey** (`⌘⇧V`) for "smart paste" — paste with transformation
- **Session grouping** — auto-groups recent clips by inferred task
- **Source app tracking** — shows which app each clip came from
- **Privacy controls** — per-app exclusion rules, auto-redaction
- **Preferences pane** — configure AI provider, history limits, hotkeys

### 4.3 Tech Stack (Future)

- Swift + SwiftUI for native macOS app
- clipx CLI as the engine (invoked from Swift)
- `NSPasteboard` observer for real-time monitoring
- `NSAccessibility` for source app detection
- `SQLite` (shared with clipx CLI) for history
- `Sparkle` for auto-updates

### 4.4 Business Model (Future)

- **Free tier:** Clipboard history + type detection + basic formatting
- **Pro ($49/year or $8/mo):** AI transforms, session intelligence, unlimited history, priority support
- **BYO-key option:** Users can use their own Anthropic/OpenAI API key for AI features (free)

---

## 5. Testing Strategy

### 5.1 Type Detection (Highest Priority)

The type detection engine must be extensively tested since it's the foundation of all intelligence.

```typescript
// tests/detector.test.ts
describe("Type Detection", () => {
  // Code detection
  test("detects TypeScript with high confidence", () => {
    const input = `interface User {\n  id: string;\n  name: string;\n}`;
    const result = detect(input);
    expect(result.type).toBe("code");
    expect(result.language).toBe("typescript");
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  // Error detection
  test("detects Node.js stack trace", () => {
    const input = `TypeError: Cannot read property 'map' of undefined\n    at Object.<anonymous> (/app/src/index.ts:42:10)`;
    const result = detect(input);
    expect(result.type).toBe("error");
  });

  // Secret detection (critical for safety)
  test("detects Anthropic API key", () => {
    const result = detect("sk-ant-api03-abcdefghijklmnopqrstuvwxyz123456");
    expect(result.type).toBe("secret");
  });

  test("detects GitHub token", () => {
    const result = detect("ghp_1234567890abcdefghijklmnopqrstuvwxyz");
    expect(result.type).toBe("secret");
  });

  test("does NOT flag normal code as secret", () => {
    const result = detect("const greeting = 'hello world';");
    expect(result.type).not.toBe("secret");
  });

  // Ambiguity handling
  test("prefers JSON over code when valid JSON", () => {
    const input = `{"name": "test", "value": 42}`;
    const result = detect(input);
    expect(result.type).toBe("json");
  });

  test("detects SQL correctly even with lowercase", () => {
    const input = `select u.name, count(*) from users u join orders o on u.id = o.user_id group by u.name`;
    const result = detect(input);
    expect(result.type).toBe("sql");
  });
});
```

### 5.2 Fixtures Directory

```
tests/fixtures/
├── code-samples/
│   ├── typescript-component.txt
│   ├── python-script.txt
│   ├── rust-function.txt
│   ├── bash-script.txt
│   └── ambiguous-code.txt         # Could be multiple languages
├── error-samples/
│   ├── node-typeerror.txt
│   ├── python-traceback.txt
│   ├── rust-panic.txt
│   ├── compiler-error.txt
│   └── browser-console-error.txt
├── json-samples/
│   ├── simple-object.txt
│   ├── nested-array.txt
│   ├── api-response.txt
│   └── malformed-json.txt
├── table-samples/
│   ├── tsv-from-excel.txt
│   ├── csv-data.txt
│   ├── markdown-table.txt
│   └── html-table.txt
├── secret-samples/
│   ├── api-keys.txt
│   ├── jwts.txt
│   ├── pem-keys.txt
│   └── false-positives.txt        # Things that look like secrets but aren't
└── edge-cases/
    ├── empty.txt
    ├── single-character.txt
    ├── unicode-heavy.txt
    ├── very-long.txt               # 1MB+ content
    └── binary-as-text.txt          # Binary data that ended up as text
```

### 5.3 Integration Tests

```typescript
// tests/integration/mcp.test.ts
describe("MCP Server", () => {
  test("clipboard_read returns structured type info", async () => {
    // Write known content → call clipboard_read tool → verify structured response
  });

  test("clipboard_write + clipboard_read roundtrip", async () => {
    // Write via tool → read via tool → content matches
  });

  test("clipboard_peek returns truncated preview", async () => {
    // Write long content → peek → verify length < 200 chars
  });

  test("secret content is redacted in clipboard_read", async () => {
    // Write API key → read → verify redaction
  });
});
```

---

## 6. Distribution & Installation

### 6.1 Primary: npm/bun global install

```bash
# Via bun (preferred)
bun add -g clipx

# Via npm
npm install -g clipx

# Via npx (no install)
npx clipx read
bunx clipx read
```

### 6.2 Homebrew (post-launch)

```ruby
# Formula: homebrew-clipx
class Clipx < Formula
  desc "AI-powered clipboard intelligence for agents & humans"
  homepage "https://github.com/narcis/clipx"
  url "https://github.com/narcis/clipx/releases/download/v0.1.0/clipx-0.1.0.tar.gz"
  # ...
end
```

```bash
brew install clipx
```

### 6.3 One-line install script

```bash
curl -fsSL https://clipx.dev/install.sh | bash
```

### 6.4 Claude Code MCP Quick Setup

```bash
# One command to install + configure for Claude Code
clipx setup claude-code
# This:
# 1. Verifies clipx is installed
# 2. Creates/updates ~/.claude/mcp.json with clipboard server
# 3. Optionally installs the skill file to ~/.claude/skills/clipboard.md
# 4. Prints confirmation + usage instructions
```

---

## 7. Development Roadmap

### Phase 1 — Foundation (Week 1)

**Goal:** Ship `clipx` CLI with core operations + MCP server

| Day | Deliverable |
|-----|-------------|
| 1 | Project setup (Bun, TypeScript, Commander). Platform layer for macOS (pbcopy/pbpaste). Basic `read --raw` and `write`. |
| 2 | Type detection engine (full heuristic suite). Secret detection. `clipx read` (with type metadata), `clipx type`, `clipx peek`. |
| 3 | Tests for type detection engine. Fixtures for all content types. Edge case coverage. |
| 4 | MCP server implementation. All P0 tools (`clipboard_read`, `clipboard_write`, `clipboard_peek`, `clipboard_type`). |
| 5 | `--json` flag on all commands. Error handling. README with demo GIFs. Publish to npm. |

### Phase 2 — Intelligence (Week 2)

**Goal:** Ship Claude Code skill + transforms + history

| Day | Deliverable |
|-----|-------------|
| 6 | Claude Code skill file (`clipboard.md`). `clipx setup claude-code` command. |
| 7 | `clipx fmt` (JSON, SQL, code formatting). `clipx validate` (JSON, URL). |
| 8 | Rich clipboard via osascript (`clipx read --html`). |
| 9 | Clipboard history with SQLite. `clipx history`. `clipx watch`. |
| 10 | Clipboard stack (`push`, `pop`, `list`, `pick`). MCP tools for history + stack. |

### Phase 3 — AI & Polish (Week 3)

**Goal:** AI transforms, conversions, polish

| Day | Deliverable |
|-----|-------------|
| 11 | `clipx ai` subcommand (fix, explain, translate, convert). Anthropic API integration. |
| 12 | `clipx convert` (CSV, JSON, markdown, base64). |
| 13 | Swift companion binary for images + file references. |
| 14 | Homebrew formula. Install script. Landing page (clipx.dev). |
| 15 | Demo videos. Blog post. Twitter launch. HN post. |

### Phase 4 — Expansion (Month 2+)

- Linux platform support (xclip/xsel/wl-copy)
- Windows platform support (clip.exe/PowerShell)
- Configuration file support
- Plugin system for custom transforms
- Community-contributed type detectors
- Layer 3 exploration (Mac menu bar app)

---

## 8. Success Metrics

### Week 1 (Launch)

- [ ] `clipx read`, `write`, `type`, `peek` working on macOS
- [ ] MCP server passing integration tests
- [ ] Type detection > 90% accuracy on test fixtures
- [ ] Secret detection catches all common patterns with < 5% false positive rate
- [ ] Published to npm
- [ ] README with installation + usage documentation

### Month 1

- [ ] 100+ GitHub stars
- [ ] 500+ npm downloads
- [ ] 3+ community mentions (Twitter, blog posts, YouTube)
- [ ] 5+ issues/PRs from external contributors
- [ ] Featured in at least 1 "awesome MCP servers" list

### Month 3

- [ ] 1000+ GitHub stars
- [ ] 5000+ npm downloads/month
- [ ] Homebrew formula published
- [ ] Linux support shipped
- [ ] 2+ AI agent frameworks mentioning clipx in docs

---

## 9. Open Questions & Decisions Needed

1. **Package name:** Is `clipx` available on npm? Alternatives: `clpx`, `clipix`, `pbx`, `clipboard-ai`
2. **License:** MIT (maximum adoption) vs Apache 2.0 (patent protection)?
3. **Swift companion:** Ship as pre-built binary (larger package, zero friction) or require Xcode to build (smaller package, developer-only)?
4. **MCP transport:** stdio only (simplest) or also SSE/HTTP (wider compatibility)?
5. **History storage:** SQLite in `~/.local/share/clipx/` or in project `.clipx/` directory?
6. **Clipboard monitoring:** Polling (simple, works everywhere) vs FSEvents/kqueue (efficient, macOS-specific)?
7. **AI provider default:** Anthropic-first or provider-agnostic from day 1?

---

## Appendix A: Competitive Landscape

| Tool | Clipboard History | Type Detection | AI Transforms | MCP Server | CLI | Open Source |
|------|:-:|:-:|:-:|:-:|:-:|:-:|
| **clipx** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Paste (Mac) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Maccy | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Raycast Clipboard | ✅ | ❌ | Partial | ❌ | ❌ | ❌ |
| CopyQ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| pbcopy/pbpaste | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |

**clipx's unique position:** The only tool that combines clipboard intelligence with AI agent integration (MCP). Competitors are either consumer GUI apps (Paste, Maccy) or raw CLI tools (pbcopy). Nothing bridges the gap for AI agents.

---

## Appendix B: Example Agent Interactions

### Scenario 1: "Fix this" (no code provided)

```
User: fix this
Agent: [calls clipboard_peek]
       → { type: "error", length: 342, preview: "TypeError: Cannot read property 'map' of undefined\n    at..." }
Agent: [calls clipboard_read]
       → Full error content with stack trace
Agent: [searches codebase for referenced file/line]
Agent: [fixes the bug, writes fix to clipboard]
       "I found a TypeError in your UserList component. The `users` prop can be undefined.
        Here's the fix — I've copied it to your clipboard:
        ..."
```

### Scenario 2: Copy from browser → generate code

```
User: generate types for this API response
Agent: [calls clipboard_peek]
       → { type: "json", length: 2341, preview: '{"data": {"users": [{"id": "u_123"...' }
Agent: [calls clipboard_read]
       → Full JSON API response
Agent: [generates TypeScript interfaces from JSON structure]
Agent: [calls clipboard_write with generated types]
       "Generated TypeScript types from the API response. Copied to clipboard:
        ..."
```

### Scenario 3: Multi-source assembly

```
User: I'm copying some things from our docs, hold onto them for me
Agent: [calls clipboard_stack_push] — saves current
User: [copies item 1 from browser]
Agent: [calls clipboard_read, then clipboard_stack_push]
User: [copies item 2 from Notion]
Agent: [calls clipboard_read, then clipboard_stack_push]
User: now combine those into a summary
Agent: [calls clipboard_stack to retrieve all items]
Agent: [synthesizes content, writes summary to clipboard]
```
