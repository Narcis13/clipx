# clipx — Implementation Status & Plan

**Generated:** March 5, 2026
**Compared against:** clipx-prd.md v1.0

---

## Current Implementation: Phase 1 (P0) — COMPLETE

All P0 (Must Ship) features from the PRD are fully implemented and tested.

### Implemented Features

| # | Feature | Status | Files |
|---|---------|--------|-------|
| 1 | `clipx read` — Plain text with type detection | Done | `bin/clipx.ts`, `src/core/reader.ts` |
| 2 | `clipx read --raw` — Raw pbpaste equivalent | Done | `bin/clipx.ts`, `src/core/reader.ts` |
| 3 | `clipx write` + pipe/stdin + `--file` + `--restore` | Done | `bin/clipx.ts`, `src/core/writer.ts` |
| 4 | `clipx type` — Full heuristic type detection engine | Done | `bin/clipx.ts`, `src/core/detector.ts` |
| 5 | `clipx peek` — Quick 200-char preview | Done | `bin/clipx.ts`, `src/core/reader.ts` |
| 6 | `clipx mcp` — MCP server (stdio) with 4 core tools | Done | `src/mcp/server.ts`, `src/mcp/tools.ts`, `src/mcp/handlers.ts` |
| 7 | Secret detection + automatic redaction | Done | `src/core/secrets.ts` |
| 8 | `--json` flag on all commands | Done | `src/utils/output.ts` |

### Type Detection Engine — Fully Implemented

13 content types detected with priority ordering:

1. **Secret** — 10+ known patterns (OpenAI, GitHub, Slack, AWS, JWT, Stripe, PEM keys, etc.) + Shannon entropy analysis
2. **File Reference** — `file://` URLs from Finder
3. **URL** — HTTP/HTTPS, single and multi-line
4. **JSON** — Objects, arrays (via `JSON.parse` validation)
5. **SQL** — SELECT, INSERT, UPDATE, DELETE, CREATE (keyword + structure validation)
6. **Error/Stack Trace** — Node.js, Python, Go, Java, generic compiler errors
7. **Table** — Markdown tables, TSV, CSV with column consistency
8. **File Path** — Unix, Windows, home-relative, relative
9. **Code** — 12 languages: TypeScript, JavaScript, Python, Rust, Go, HTML, CSS, Bash, Swift, Java, Ruby, PHP
10. **Text** — Natural language fallback

### MCP Server — 4 Core Tools

| Tool | Description | Implemented |
|------|-------------|:-----------:|
| `clipboard_read` | Read clipboard with auto type detection | Yes |
| `clipboard_write` | Write to clipboard, optional restore | Yes |
| `clipboard_peek` | Quick preview (200 chars, low token cost) | Yes |
| `clipboard_type` | Detect content type without full read | Yes |

### Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| macOS (plain text) | Done | `pbcopy`/`pbpaste` via `Bun.spawn()` |
| macOS (rich — osascript) | Partial | `readRichTypes()` and `readHTML()` exist in `platform/macos.ts`, not yet wired to CLI flags |
| Linux | Basic | Auto-detects `xclip`/`xsel`/`wl-copy` in `platform/linux.ts` |
| Windows | Not started | — |

### Test Coverage

- **70+ test cases** across `detector.test.ts` and `secrets.test.ts`
- **Fixture files** for code-samples, error-samples, json-samples, table-samples, secret-samples, edge-cases
- Type detection accuracy tested for all 13 content types
- Secret false-positive prevention tests included

### Architecture

```
bin/clipx.ts          → CLI entry point (Commander.js)
src/index.ts          → Library entry point (programmatic API)
src/core/             → Detection, read, write, secrets
src/mcp/              → MCP server, tool definitions, handlers
src/platform/         → macOS/Linux abstraction layer
src/utils/            → Logger, output formatting
tests/                → Unit tests + fixtures
```

**Dependencies (minimal by design):**
- `commander` — CLI framework
- `@modelcontextprotocol/sdk` — MCP server
- `zod` — Schema validation

**Intentionally missing from PRD:**
- `better-sqlite3` — Not added yet (needed for P1 history feature)

---

## Unimplemented Features — Implementation Plan

### P1: Should Ship (Phase 2 — Intelligence)

#### P1-1: `clipx fmt` — Auto-Formatting

**Scope:** Auto-format clipboard content based on detected type.

**Commands:**
```bash
clipx fmt              # Auto-detect and format
clipx fmt --json       # Force JSON pretty-print
clipx fmt --sql        # Force SQL formatting
clipx fmt --code       # Auto-detect language and format
clipx fmt --write      # Format and write result back to clipboard
```

**Implementation plan:**
1. Create `src/transforms/formatter.ts`
   - `formatJSON(content)` — `JSON.stringify(JSON.parse(content), null, 2)`
   - `formatSQL(content)` — Simple keyword-based SQL formatter (uppercase keywords, newlines before clauses)
   - `formatCode(content, language)` — Basic indentation normalization per language
   - `autoFormat(content)` — Run detector, dispatch to appropriate formatter
2. Add `fmt` subcommand in `bin/clipx.ts`
   - Options: `--json`, `--sql`, `--code`, `--write`
   - Default: detect type, apply formatter, print to stdout
   - `--write`: also write formatted content back to clipboard
3. Tests: `tests/formatter.test.ts`
   - JSON formatting (minified -> pretty, nested objects)
   - SQL formatting (single-line -> multi-line)
   - Error handling (invalid input)

**Estimated complexity:** Low — no external deps needed, pure string transforms.

---

#### P1-2: `clipx validate` — Validation

**Scope:** Validate clipboard content syntax/structure.

**Commands:**
```bash
clipx validate         # Auto-validate based on detected type
clipx validate --json  # Validate JSON syntax
clipx validate --url   # Check URL format (and optionally reachability)
clipx validate --sql   # SQL syntax check
```

**Implementation plan:**
1. Create `src/transforms/validator.ts`
   - `validateJSON(content)` — Parse and report errors with line/column
   - `validateURL(content)` — URL constructor validation + optional `fetch` HEAD check
   - `validateSQL(content)` — Basic keyword/syntax validation
   - `autoValidate(content)` — Detect type, dispatch to validator
2. Add `validate` subcommand in `bin/clipx.ts`
   - Options: `--json`, `--url`, `--sql`
   - Output: `{ valid: boolean, errors?: [...], type: string }`
3. Tests: `tests/validator.test.ts`
   - Valid/invalid JSON with error location
   - URL format validation
   - SQL syntax validation

**Estimated complexity:** Low-medium.

---

#### P1-3: `clipx read --html` / `--rtf` / `--rich` — Rich Clipboard Access

**Scope:** Wire existing osascript rich clipboard functions to CLI flags.

**Commands:**
```bash
clipx read --rich      # All available representations
clipx read --html      # HTML representation (from browser copies)
clipx read --rtf       # RTF representation
```

**Implementation plan:**
1. The platform layer (`src/platform/macos.ts`) already has `readRichTypes()` and `readHTML()` via osascript
2. Add `--html`, `--rtf`, `--rich` options to the `read` command in `bin/clipx.ts`
3. Implement `readRTF()` in `src/platform/macos.ts` using osascript (same pattern as `readHTML`)
4. Update `src/core/reader.ts` to support format parameter for rich reads
5. Tests: Integration tests (require macOS clipboard with HTML/RTF data)

**Estimated complexity:** Low — most of the infrastructure exists.

---

#### P1-4: `clipx stack` — Multi-Slot Clipboard Stack

**Scope:** In-memory clipboard stack for saving/restoring multiple items.

**Commands:**
```bash
clipx stack push       # Push current clipboard to stack
clipx stack pop        # Pop top -> clipboard
clipx stack list       # Show all slots
clipx stack pick 3     # Pick specific slot -> clipboard
clipx stack clear      # Clear stack
clipx stack swap       # Swap top two items
```

**Implementation plan:**
1. Create `src/history/stack.ts`
   - In-memory stack with persistence to `~/.local/share/clipx/stack.json`
   - `push()` — Read current clipboard, add to stack array, save to disk
   - `pop()` — Remove top item, write to clipboard, save to disk
   - `list()` — Return all items with index, type detection, preview
   - `pick(index)` — Copy specific item to clipboard (don't remove)
   - `clear()` — Empty the stack file
   - `swap()` — Swap top two items
2. Add `stack` subcommand with sub-subcommands in `bin/clipx.ts`
3. Tests: `tests/stack.test.ts`
   - Push/pop lifecycle
   - Pick by index
   - Persistence (write to file, read back)
   - Edge cases: pop from empty, pick out of bounds

**Estimated complexity:** Medium — needs file persistence and multiple sub-commands.

---

#### P1-5: `clipx history` + `clipx watch` — Clipboard History with SQLite

**Scope:** Background clipboard monitoring with SQLite-backed searchable history.

**Commands:**
```bash
clipx watch                    # Stream clipboard changes to stdout
clipx watch --json             # Structured JSON stream
clipx watch --debounce 500     # Custom debounce interval
clipx watch --ignore-secrets   # Skip secret entries
clipx watch --callback "cmd"   # Execute command on each change

clipx history                  # Show last 20 entries
clipx history --limit 50       # Custom limit
clipx history --type code      # Filter by type
clipx history --since 1h       # Time filter
clipx history --search "stripe"# Full-text search
clipx history --json           # Machine-readable
```

**Implementation plan:**
1. Add `better-sqlite3` dependency (per PRD)
2. Create `src/history/store.ts`
   - SQLite database at `~/.local/share/clipx/history.db`
   - Schema: `id, content, type, language, confidence, length, preview, created_at`
   - `addEntry(content, detection)` — Insert new entry
   - `query({ limit, type, since, search })` — Flexible query builder
   - `prune(maxEntries)` — Trim old entries (default 1000)
3. Create `src/history/watcher.ts`
   - Polling loop (`setInterval`) comparing clipboard content hash
   - Configurable debounce interval (default 300ms)
   - On change: detect type, add to store, emit event
   - Stream mode: output JSON lines to stdout
   - Callback mode: spawn command with entry as stdin
   - `--ignore-secrets` filter: skip entries detected as secrets
4. Add `watch` command in `bin/clipx.ts`
   - Long-running process (handles SIGINT gracefully)
5. Add `history` command in `bin/clipx.ts`
   - Query filters: `--limit`, `--type`, `--since`, `--search`, `--json`
6. Tests:
   - `tests/history.test.ts` — Store operations, query filters, pruning
   - `tests/watcher.test.ts` — Change detection, debounce, secret filtering

**Estimated complexity:** High — new dependency, SQLite schema, long-running process, multiple query parameters.

---

#### P1-6: MCP Tools for Stack and History

**Scope:** Expose stack and history operations as MCP tools.

**New MCP tools:**
- `clipboard_history` — Query clipboard history
- `clipboard_stack_push` — Push to stack
- `clipboard_stack_pop` — Pop from stack

**Implementation plan:**
1. Add tool definitions to `src/mcp/tools.ts`
   - `clipboard_history` — `{ limit?, type?, search? }`
   - `clipboard_stack_push` — No params
   - `clipboard_stack_pop` — No params
2. Add handlers to `src/mcp/handlers.ts`
   - Wire to stack and history modules
3. Update `src/mcp/server.ts` to register new tools
4. Tests: `tests/mcp.test.ts` — Tool call roundtrips for new tools

**Estimated complexity:** Low — follows existing MCP patterns.

**Dependency:** Requires P1-4 (stack) and P1-5 (history) to be completed first.

---

### P2: Can Wait (Phase 3 — AI & Polish)

#### P2-1: `clipx ai *` — AI-Powered Transforms

**Scope:** AI-powered content operations using Anthropic/OpenAI APIs.

**Commands:**
```bash
clipx ai fix           # Fix code errors, typos
clipx ai explain       # Explain clipboard content
clipx ai translate --to ro  # Translate to language
clipx ai convert --to ts    # Convert (SQL -> TS types, cURL -> fetch)
clipx ai summarize     # Summarize long content
clipx ai review        # Code review
clipx ai name          # Suggest variable/function names
clipx ai config        # Set provider, model, API key
```

**Implementation plan:**
1. Create `src/ai/provider.ts`
   - Abstraction over OpenRouter, Anthropic and OpenAI APIs using raw `fetch()` 
   - API key resolution: env var -> OS keychain -> config file
   
2. Create `src/ai/config.ts`
   - Config stored in `~/.config/clipx/config.json`
   - Commands: `--provider`, `--model`, `--key`
   - Keychain integration via `security` CLI on macOS
3. Create `src/ai/transforms.ts`
   - System prompts per operation (fix, explain, translate, convert, summarize, review, name)
   - Clipboard content + type detection as context
   - Output written back to clipboard (optional)
4. Add `ai` subcommand with sub-subcommands in `bin/clipx.ts`
5. Tests: Mock API responses, verify prompt construction

**Estimated complexity:** High — API integration, key management, multiple transform types.

---

#### P2-2: `clipx convert` — Format Conversions

**Scope:** Local (no AI) format conversion between data formats.

**Commands:**
```bash
clipx convert --to csv       # Table -> CSV
clipx convert --to json      # Table/CSV -> JSON
clipx convert --to markdown  # Table -> Markdown table
clipx convert --to base64    # Encode to base64
clipx convert --from base64  # Decode from base64
```

**Implementation plan:**
1. Create `src/transforms/converter.ts`
   - `toCSV(content, detectedType)` — Parse table/TSV/markdown -> CSV
   - `toJSON(content, detectedType)` — Parse table/CSV -> JSON array
   - `toMarkdown(content, detectedType)` — Parse table/CSV -> markdown table
   - `toBase64(content)` — `btoa()` / `Buffer.from().toString('base64')`
   - `fromBase64(content)` — `atob()` / `Buffer.from(content, 'base64').toString()`
2. Add `convert` subcommand in `bin/clipx.ts`
3. Tests: `tests/converter.test.ts` — Round-trip conversions, format-specific edge cases

**Estimated complexity:** Medium — table parsing is the hardest part.

---

#### P2-3: Swift Companion Binary

**Scope:** Native Swift binary for advanced clipboard operations (images, file references).

**Implementation plan:**
1. Create `swift/ClipboardBridge.swift` — per PRD spec (types, html, rtf, image, files)
2. Create `swift/Package.swift` — Swift package manifest
3. Create `swift/build.sh` — Build script producing `clipboard-bridge` binary
4. Update `src/platform/macos.ts` to detect and use Swift binary when available
5. Add `clipx type` support for `image` and enhanced `file-ref` detection
6. Decision needed: ship pre-built binary or require Xcode?

**Estimated complexity:** Medium-high — requires Swift toolchain, binary distribution strategy.

---

#### P2-4: Linux & Windows Platform Support

**Scope:** Full platform parity for Linux and Windows.

**Linux (enhance existing):**
- `src/platform/linux.ts` already handles `xclip`/`xsel`/`wl-copy`
- Needs: rich clipboard support (xclip selection types), testing

**Windows (new):**
1. Create `src/platform/windows.ts`
   - Read: `powershell Get-Clipboard` or `clip.exe` workarounds
   - Write: pipe to `clip.exe`
   - Rich: PowerShell COM objects for HTML/RTF
2. Update `src/platform/index.ts` to detect and dispatch to Windows

**Estimated complexity:** Medium — Windows is the harder part.

---

#### P2-5: Configuration File Support

**Scope:** `~/.config/clipx/config.json` for persistent settings.

**Implementation plan:**
1. Create `src/config.ts`
   - Schema per PRD section 2.9: history, ai, detection, watch settings
   - `loadConfig()` — Read from `~/.config/clipx/config.json` with defaults
   - `saveConfig(key, value)` — Update specific settings
   - Env var overrides for all settings
2. Wire config into: watcher (poll interval), history (max entries, excludes), detector (min confidence, secret redaction), AI (provider, model)
3. Add `clipx config` command for viewing/setting values
4. Tests: Config loading, defaults, overrides

**Estimated complexity:** Low-medium.

---

### Layer 2: Claude Code Skill

#### L2-1: Claude Code Skill File

**Scope:** Markdown skill file teaching Claude when/how to use clipx.

**Implementation plan:**
1. Create `skills/clipboard.md` per PRD section 3.2
   - When to read clipboard (user says "fix this", "look at this", etc.)
   - When to write clipboard (after generating code, short outputs)
   - Command reference
   - Workflow patterns (clipboard-first, multi-source, safe delivery)
   - Security rules (secrets, no logging, no external API without consent)
2. Dual mode: references MCP tools when MCP is available, falls back to CLI

**Estimated complexity:** Low — documentation only, no code.

---

#### L2-2: `clipx setup claude-code`

**Scope:** One-command setup for Claude Code MCP integration.

**Commands:**
```bash
clipx setup claude-code
```

**Implementation plan:**
1. Add `setup` subcommand in `bin/clipx.ts`
   - Detect `~/.claude/mcp.json` existence
   - Add/update `clipboard` server entry
   - Optionally copy skill file to `~/.claude/skills/clipboard.md`
   - Print confirmation and usage instructions
2. Handle edge cases: existing config, permission issues, missing directories

**Estimated complexity:** Low.

---

## Implementation Priority & Dependency Graph

```
Phase 2 (P1) — Recommended Order:
  P1-3: Rich Clipboard  ← Low effort, wiring existing code
  P1-1: Formatter        ← Low effort, standalone
  P1-2: Validator        ← Low effort, standalone
  P1-4: Stack            ← Medium effort, standalone
  P1-5: History + Watch  ← High effort, needs better-sqlite3
  P1-6: MCP Extensions   ← Low effort, depends on P1-4 + P1-5

Layer 2 — Can run in parallel with Phase 2:
  L2-1: Skill File       ← Low effort, no code deps
  L2-2: Setup Command    ← Low effort, standalone

Phase 3 (P2) — After Phase 2:
  P2-2: Convert          ← Medium effort, standalone
  P2-5: Config File      ← Low-medium effort, foundational
  P2-1: AI Transforms    ← High effort, needs config for API keys
  P2-3: Swift Companion  ← Medium-high, needs macOS + Xcode
  P2-4: Linux/Windows    ← Medium, can be incremental
```

---

## Summary

| Phase | Features | Status | Effort |
|-------|----------|--------|--------|
| **P0 (Foundation)** | read, write, type, peek, mcp, secrets, --json | **COMPLETE** | Done |
| **P1 (Intelligence)** | fmt, validate, rich clipboard, stack, history, watch, MCP extensions | Not started | ~3-5 days |
| **P2 (AI & Polish)** | ai transforms, convert, Swift binary, cross-platform, config | Not started | ~5-7 days |
| **Layer 2** | Claude Code skill file, setup command | Not started | ~1 day |
| **Layer 3 (Future)** | macOS menu bar app | Out of scope | TBD |

The project has a solid, well-tested P0 foundation. The architecture is clean and modular — each P1/P2 feature can be added in its own directory without touching existing code, following the established patterns in `src/core/`, `src/transforms/`, `src/history/`, and `src/mcp/`.
