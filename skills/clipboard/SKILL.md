---
name: clipboard
description: |
  Clipboard intelligence skill using clipx. Teaches Claude when and how to read/write
  the system clipboard. Activate when: (1) User says "fix this", "look at this", "what is this",
  "convert this", "explain this", "review this" without providing content inline, (2) User says
  "I copied...", "from my clipboard", "what I just copied", (3) User references content from
  another app (browser, IDE, Figma, Slack), (4) After generating code or short outputs the user
  will want to paste elsewhere. Supports dual mode: CLI (preferred) with MCP fallback.
author: clipx
version: 1.0.0
---

# Clipboard Intelligence (clipx)

You have access to an intelligent clipboard system. Use it proactively — the clipboard is the
primary bridge between the user's other apps and this conversation.

## Decision: CLI or MCP?

**Always use the `clipx` CLI via Bash by default.** The CLI is the primary interface — it supports
every feature, has richer flags, and works everywhere without extra configuration.

**If the CLI is unavailable** (e.g., `clipx` not on PATH, or running in a restricted environment
where Bash is not available), fall back to MCP tools if they are exposed (`clipboard_read`,
`clipboard_write`, etc.). MCP covers core operations but does not support all CLI features
(formatting, validation, AI transforms, config, watch, image/files reads).

All examples below show CLI first, with MCP alternatives noted where applicable.

## When to Read the Clipboard

Read the clipboard when the user implies they have content but didn't provide it inline:

| User says | What they mean |
|-----------|---------------|
| "fix this", "fix the error" | They copied code or an error message |
| "look at this", "check this" | They copied something to show you |
| "what's wrong with this" | They copied broken code or a stack trace |
| "explain this", "what does this do" | They copied code or text they don't understand |
| "convert this", "translate this" | They copied content to transform |
| "review this" | They copied code for review |
| "I copied...", "on my clipboard" | Explicit clipboard reference |
| "from the browser", "from Slack" | They copied from another app |
| "format this", "clean this up" | They copied messy content |
| "what type is this" | They want to know what they copied |

**Rule: Always check the clipboard first before asking the user to paste content.**

### How to Read

**Step 1 — Peek first** (saves tokens on large content):

```bash
clipx peek                    # returns type, length, and 200-char preview
# MCP fallback: clipboard_peek
```

Use this to decide if a full read is needed.

**Step 2 — Full read** (when you need the actual content):

```bash
clipx read                    # content + type detection + metadata (JSON)
clipx read --raw              # plain text, no metadata
# MCP fallback: clipboard_read (format: "auto" | "raw")
```

**Step 3 — Specialized reads** (when type warrants it — CLI only):

```bash
clipx read --html             # HTML representation (browser copies)
clipx read --rtf              # RTF representation
clipx read --image            # base64 PNG (screenshots, copied images)
clipx read --files            # file paths (Finder copies)
clipx read --rich             # all representations at once
# MCP fallback: clipboard_read with format:"html" or format:"rtf" (no image/files/rich via MCP)
```

**Step 4 — Type-only check** (cheapest option, no content returned):

```bash
clipx type --json             # { type, language, confidence, meta }
# MCP fallback: clipboard_type
```

Types: `code`, `json`, `url`, `error`, `table`, `sql`, `text`, `path`, `secret`, `image`,
`file-ref`, `unknown`.

## When to Write the Clipboard

Write to the clipboard when you produce output the user will likely paste elsewhere:

- After generating code (function, component, config, query, etc.)
- After fixing/transforming content that came from the clipboard
- After producing short outputs (< 50 lines) the user wants in another app
- When the user explicitly asks ("copy this", "put it on my clipboard")

**Always show the output in chat AND write to clipboard.** Say: "I've also copied this to your
clipboard."

### How to Write

```bash
echo "content" | clipx write              # pipe content to clipboard
clipx write "short content"               # write inline string
clipx write --file path/to/file           # write file contents
# MCP fallback: clipboard_write with content:"..."
```

**Safe write with auto-restore** (preserves user's previous clipboard):

```bash
echo "content" | clipx write --restore    # auto-restores previous clipboard after 30s
# MCP fallback: clipboard_write with content:"...", restore:true
```

Use `--restore` when writing transient output the user will paste once.

## Content Types and What to Do With Them

When you read the clipboard, the `type` field tells you what the user copied:

| Type | What it is | Suggested action |
|------|-----------|------------------|
| `code` | Source code (language in `language` field) | Fix, explain, review, convert |
| `json` | JSON data | Format, validate, generate types |
| `url` | One or more URLs | Fetch, summarize, extract info |
| `error` | Stack trace or error message | Diagnose, explain, suggest fix |
| `table` | CSV, TSV, or markdown table | Parse, convert, analyze |
| `sql` | SQL query | Explain, optimize, convert, validate |
| `text` | Natural language | Summarize, translate, edit |
| `path` | File path(s) | Read the file(s), operate on them |
| `secret` | API key, token, credential | **DO NOT display. Warn the user.** |
| `image` | Image data on clipboard | Describe what you see (if multimodal) |
| `file-ref` | Files copied from Finder | List paths, operate on the files |
| `unknown` | Unrecognized content | Ask user for context |

## Workflow Patterns

### Pattern 1: Clipboard-First Context

The most common pattern. User asks you to do something, content is on the clipboard.

```
1. User: "fix this"
2. You:   clipx peek
3. You:   See it's code:typescript, 847 chars — worth a full read
4. You:   clipx read
5. You:   Analyze, fix the code
6. You:   echo "...fixed code..." | clipx write
7. You:   Show the fix in chat + "I've also copied the fixed version to your clipboard."
```

### Pattern 2: Multi-Source Assembly

User is working across multiple apps, copying pieces to assemble.

```
1. User:  "I'm going to copy a few things, hold onto them"
2. You:   clipx stack push          — after each copy
3. User:  "OK, now combine them"
4. You:   clipx stack list          — see all saved items
5. You:   Synthesize/combine the pieces
6. You:   echo "...result..." | clipx write
```

### Pattern 3: Safe Output Delivery

When writing output the user will paste once, preserve their previous clipboard.

```
1. You:   Generate some output
2. You:   echo "...output..." | clipx write --restore
3. User:  Pastes in their target app
4. Auto:  Previous clipboard content restores after 30 seconds
```

### Pattern 4: History Lookup

User references something they copied earlier.

```
1. User:  "That URL I copied earlier"
2. You:   clipx history --type url
3. You:   Find and use the relevant entry
```

```bash
clipx history --limit 10 --type code --search "fetch"
clipx history --since 1h              # last hour
clipx history --since 2d              # last 2 days
# MCP fallback: clipboard_history with limit:10, type:"code", search:"fetch"
```

### Pattern 5: Format and Return

User copied messy content, wants it cleaned up.

```
1. User:  "format this" / "clean this up"
2. You:   clipx read
3. You:   See it's JSON/SQL/code
4. You:   clipx fmt --write     → formats in-place on clipboard
5. You:   Show formatted output + "Formatted and updated on your clipboard."
```

Or for validation:
```
CLI:  clipx validate              → auto-detect and validate
CLI:  clipx validate --json       → validate as JSON
CLI:  clipx validate --sql        → validate as SQL
CLI:  clipx validate --url        → validate as URL
```

### Pattern 6: AI Transforms (if configured)

For users with AI provider configured:

```
CLI:  clipx ai fix --write        → fix code errors, write back
CLI:  clipx ai explain            → explain clipboard content
CLI:  clipx ai translate --to es  → translate to Spanish
CLI:  clipx ai convert --to ts    → convert (e.g., SQL to TypeScript)
CLI:  clipx ai summarize          → summarize content
CLI:  clipx ai review             → code review
CLI:  clipx ai name               → suggest variable/function names
```

## Security Rules

These are non-negotiable:

1. **Secrets**: If `clipx type` or `clipboard_type` returns `"secret"`, **DO NOT** read or
   display the content. Tell the user: "Your clipboard appears to contain a secret/credential.
   I won't display it for safety. If you need to work with it, please paste it directly."

2. **No logging**: Never write clipboard contents to log files, temp files, or anywhere persistent
   beyond the conversation. If you need to save content, use `clipx stack push` (in-memory) or
   ask the user.

3. **No external API**: Do not send clipboard contents to any external API or service without
   explicit user confirmation. This includes web searches, fetch calls, or AI provider APIs.
   Exception: the user explicitly asked for an AI transform (`clipx ai *`).

4. **Redaction**: clipx automatically redacts secrets in its output. If you see
   `[REDACTED]` markers, respect them — don't try to reconstruct the original.

5. **Image/file privacy**: When clipboard contains images or file references, describe what
   you see but don't make assumptions about sensitive content (personal photos, documents, etc.).

## CLI Quick Reference (Primary)

```bash
# Reading
clipx read                    # Read with type detection (JSON)
clipx read --raw              # Raw text
clipx read --html             # HTML representation
clipx read --rtf              # RTF representation
clipx read --image            # Base64 PNG image
clipx read --files            # File paths from Finder
clipx read --rich             # All representations
clipx peek                    # Quick 200-char preview
clipx type                    # Detect type only
clipx type --json             # Type as JSON

# Writing
clipx write "content"         # Write string
echo "content" | clipx write  # Write from pipe
clipx write --file path.txt   # Write file contents
clipx write --restore "text"  # Write with auto-restore (30s)

# Formatting & Validation
clipx fmt                     # Auto-format clipboard
clipx fmt --json              # Force JSON format
clipx fmt --sql               # Force SQL format
clipx fmt --code              # Force code format
clipx fmt --write             # Format and write back
clipx validate                # Auto-validate
clipx validate --json         # Validate as JSON
clipx validate --sql          # Validate as SQL

# Stack (multi-slot clipboard)
clipx stack push              # Save current clipboard
clipx stack pop               # Restore top item
clipx stack list              # Show all saved items
clipx stack pick <n>          # Copy slot N to clipboard
clipx stack swap              # Swap top two items
clipx stack clear             # Clear stack

# History
clipx history                 # Show recent history
clipx history --limit 50      # More entries
clipx history --type code     # Filter by type
clipx history --since 1h      # Time filter
clipx history --search "fn"   # Full-text search
clipx history --json          # JSON output

# Watch (background monitoring)
clipx watch                   # Watch for changes
clipx watch --json            # JSON stream
clipx watch --ignore-secrets  # Skip secrets
clipx watch --callback "cmd"  # Run command on change

# AI Transforms
clipx ai fix --write          # Fix errors
clipx ai explain              # Explain content
clipx ai translate --to <lang># Translate
clipx ai convert --to <fmt>   # Convert format
clipx ai summarize --write    # Summarize
clipx ai review               # Code review
clipx ai name                 # Suggest names

# Configuration
clipx config                  # Show all config
clipx config <key>            # Get value
clipx config <key> <value>    # Set value
clipx config --path           # Show config file path
```

## MCP Tools Reference (Fallback)

Only use these if `clipx` CLI is not available. MCP covers core operations but lacks formatting,
validation, AI transforms, config, watch, image/files reads.

To start the MCP server: `clipx mcp` (stdio transport).

| Tool | Parameters | Use |
|------|-----------|-----|
| `clipboard_read` | `format?: "auto"\|"raw"\|"html"\|"rtf"` | Read with type detection |
| `clipboard_write` | `content: string, restore?: boolean` | Write to clipboard |
| `clipboard_peek` | *(none)* | Quick preview (200 chars) |
| `clipboard_type` | *(none)* | Detect type without reading |
| `clipboard_history` | `limit?: number, type?: string, search?: string` | Query history |
| `clipboard_stack_push` | *(none)* | Push current clipboard to stack |
| `clipboard_stack_pop` | *(none)* | Pop and restore from stack |

## Setup

**Skill mode** (recommended) — copy this folder to `~/.claude/skills/clipboard/` for global use,
or `.claude/skills/clipboard/` for project-specific use. The folder must contain `SKILL.md`.

**MCP mode** (optional fallback) — add to `~/.claude/mcp.json`:

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

**Both** — the skill teaches Claude when and why to use clipboard operations, MCP provides
a structured fallback when CLI is unavailable.
