import { detectSecret, redactContent } from "./secrets.js";

export type ContentType =
  | "code"
  | "json"
  | "url"
  | "error"
  | "table"
  | "sql"
  | "text"
  | "path"
  | "secret"
  | "image"
  | "file-ref"
  | "unknown";

export interface DetectionResult {
  type: ContentType;
  language?: string;
  confidence: number;
  meta?: Record<string, unknown>;
}

// --- Language detection heuristics ---

interface LanguageSignal {
  name: string;
  patterns: RegExp[];
  weight?: number;
}

const LANGUAGE_SIGNALS: LanguageSignal[] = [
  {
    name: "typescript",
    patterns: [
      /:\s*(string|number|boolean|any|void|never|unknown)\b/,
      /interface\s+\w+/,
      /type\s+\w+\s*=/,
      /<\w+>/,
      /as\s+const/,
      /import\s+.*\s+from\s+['"]/,
      /export\s+(interface|type|enum)/,
    ],
  },
  {
    name: "javascript",
    patterns: [
      /const\s+\w+\s*=/,
      /function\s+\w+/,
      /=>\s*[{(]/,
      /require\s*\(/,
      /module\.exports/,
      /import\s+.*\s+from\s+['"]/,
      /console\.\w+\(/,
    ],
  },
  {
    name: "python",
    patterns: [
      /def\s+\w+\s*\(/,
      /from\s+\w+\s+import/,
      /if\s+__name__\s*==\s*['"]__main__['"]/,
      /self\.\w+/,
      /class\s+\w+.*:/,
      /print\s*\(/,
      /#.*coding[:=]\s*(utf|ascii)/,
    ],
  },
  {
    name: "rust",
    patterns: [
      /fn\s+\w+/,
      /let\s+mut\s+/,
      /impl\s+\w+/,
      /pub\s+(fn|struct|enum|mod)/,
      /use\s+\w+::/,
      /println!\s*\(/,
      /->.*\{/,
    ],
  },
  {
    name: "go",
    patterns: [
      /func\s+\w+/,
      /package\s+\w+/,
      /import\s+\(/,
      /fmt\.\w+/,
      /:=\s*/,
      /func\s+\(.*\)\s+\w+/,
    ],
  },
  {
    name: "html",
    patterns: [
      /<html[\s>]/i,
      /<div[\s>]/,
      /<span[\s>]/,
      /<head[\s>]/,
      /<!DOCTYPE/i,
      /<\/\w+>/,
    ],
  },
  {
    name: "css",
    patterns: [
      /\{\s*[\w-]+\s*:/,
      /@media\s/,
      /@import\s/,
      /\.[\w-]+\s*\{/,
      /#[\w-]+\s*\{/,
    ],
  },
  {
    name: "bash",
    patterns: [
      /^#!\s*\//, // shebang
      /\|\s*grep/,
      /\$\(/,
      /if\s+\[/,
      /echo\s+/,
      /fi\s*$/m,
      /\bdo\b.*\bdone\b/s,
    ],
  },
  {
    name: "swift",
    patterns: [
      /func\s+\w+.*->/, // Swift functions with return type
      /var\s+\w+\s*:\s*\w+/,
      /let\s+\w+\s*:\s*\w+/,
      /guard\s+let/,
      /import\s+(Foundation|UIKit|SwiftUI|AppKit)/,
    ],
  },
  {
    name: "java",
    patterns: [
      /public\s+class\s+\w+/,
      /public\s+static\s+void\s+main/,
      /System\.out\./,
      /import\s+java\./,
      /private\s+(final\s+)?\w+\s+\w+/,
    ],
  },
  {
    name: "ruby",
    patterns: [
      /def\s+\w+/,
      /class\s+\w+\s*<\s*\w+/,
      /require\s+['"]/,
      /puts\s+/,
      /end\s*$/m,
      /do\s*\|/,
    ],
  },
  {
    name: "php",
    patterns: [
      /<\?php/,
      /\$\w+\s*=/,
      /function\s+\w+\s*\(/,
      /->\w+\(/,
      /echo\s+/,
    ],
  },
];

function detectLanguage(
  content: string
): { language: string; confidence: number } | null {
  const scores: Array<{ name: string; score: number; total: number }> = [];

  for (const lang of LANGUAGE_SIGNALS) {
    let matched = 0;
    for (const pattern of lang.patterns) {
      if (pattern.test(content)) {
        matched++;
      }
    }
    if (matched > 0) {
      scores.push({
        name: lang.name,
        score: matched,
        total: lang.patterns.length,
      });
    }
  }

  if (scores.length === 0) return null;

  // Sort by match count descending
  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];

  // TypeScript vs JavaScript disambiguation
  if (
    best.name === "javascript" &&
    scores.some((s) => s.name === "typescript" && s.score >= 2)
  ) {
    const tsScore = scores.find((s) => s.name === "typescript")!;
    return {
      language: "typescript",
      confidence: Math.min(0.6 + tsScore.score * 0.1, 0.99),
    };
  }

  // Require at least 2 signal matches for high confidence, 1 for lower
  const confidence =
    best.score >= 3
      ? Math.min(0.7 + best.score * 0.08, 0.99)
      : best.score === 2
        ? 0.7
        : 0.5;

  return { language: best.name, confidence };
}

// --- Type detection pipeline ---

function isFileRef(content: string): boolean {
  return content
    .trim()
    .split("\n")
    .every((line) => line.trim().startsWith("file://"));
}

function isUrl(content: string): boolean {
  const trimmed = content.trim();
  // Single URL or list of URLs
  const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
  return lines.every((line) => /^https?:\/\/\S+$/.test(line));
}

function isJson(content: string): boolean {
  const trimmed = content.trim();
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      JSON.parse(trimmed);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

function isSql(content: string): boolean {
  const trimmed = content.trim();
  const sqlKeywords =
    /^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|WITH|EXPLAIN|TRUNCATE|MERGE|REPLACE)\b/i;
  if (sqlKeywords.test(trimmed)) {
    // Require at least 2 SQL keywords for confidence
    const keywordCount = (
      trimmed.match(
        /\b(SELECT|FROM|WHERE|JOIN|GROUP\s+BY|ORDER\s+BY|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|ALTER|DROP|HAVING|LIMIT|OFFSET|UNION|ON|AND|OR|IN|NOT|NULL|AS|DISTINCT|COUNT|SUM|AVG|MAX|MIN|INDEX|PRIMARY\s+KEY|FOREIGN\s+KEY)\b/gi
      ) || []
    ).length;
    return keywordCount >= 2;
  }
  return false;
}

function isStackTrace(content: string): boolean {
  const patterns = [
    /Error:.*\n\s+at\s/,           // Node.js/JavaScript
    /Traceback \(most recent call/, // Python
    /panic:/,                       // Go/Rust
    /Exception in thread/,          // Java
    /^\s+at\s+\S+\s+\(.+:\d+:\d+\)/m, // Generic file:line:col in stack
    /^\w+Error:/m,                  // Named errors (TypeError, ReferenceError, etc.)
    /error\[\w+\]:/i,              // Rust compiler errors
    /^\s*\d+\s*\|/m,              // Compiler error with line numbers
  ];
  let matchCount = 0;
  for (const pattern of patterns) {
    if (pattern.test(content)) matchCount++;
  }
  return matchCount >= 1;
}

function isTable(content: string): boolean {
  const lines = content.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return false;

  // Markdown table: has | separators and a separator row with ---
  if (
    lines[0].includes("|") &&
    lines.length >= 2 &&
    /^\|?[\s-:|]+\|?$/.test(lines[1])
  ) {
    return true;
  }

  // TSV: consistent tab-separated columns
  const tabCounts = lines.map(
    (line) => (line.match(/\t/g) || []).length
  );
  if (tabCounts[0] > 0 && tabCounts.every((c) => c === tabCounts[0])) {
    return true;
  }

  // CSV: consistent comma-separated with header-like first row
  const commaCounts = lines.map(
    (line) => (line.match(/,/g) || []).length
  );
  if (
    commaCounts[0] > 0 &&
    commaCounts.every((c) => c === commaCounts[0]) &&
    lines.length >= 3
  ) {
    return true;
  }

  return false;
}

function isFilePath(content: string): boolean {
  const trimmed = content.trim();
  const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
  // All lines should be paths
  return (
    lines.length > 0 &&
    lines.length <= 20 &&
    lines.every(
      (line) =>
        /^(\/[\w.@-]+)+\/?$/.test(line) ||    // Unix absolute path
        /^~\/[\w.@/-]*$/.test(line) ||          // Home-relative path
        /^\.\.?\/[\w.@/-]*$/.test(line) ||      // Relative path
        /^[A-Z]:\\[\w.@\\-]*$/.test(line)       // Windows path
    )
  );
}

export function detect(content: string): DetectionResult {
  if (!content || content.length === 0) {
    return { type: "unknown", confidence: 0 };
  }

  const trimmed = content.trim();

  if (trimmed.length === 0) {
    return { type: "unknown", confidence: 0 };
  }

  // 1. Secret detection (highest priority)
  const secretResult = detectSecret(trimmed);
  if (secretResult.isSecret && secretResult.confidence > 0.7) {
    return {
      type: "secret",
      confidence: secretResult.confidence,
      meta: { pattern: secretResult.pattern },
    };
  }

  // 2. File reference detection
  if (isFileRef(trimmed)) {
    return {
      type: "file-ref",
      confidence: 0.99,
      meta: {
        fileCount: trimmed.split("\n").filter(Boolean).length,
      },
    };
  }

  // 3. URL detection
  if (isUrl(trimmed)) {
    const urls = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
    return {
      type: "url",
      confidence: 0.99,
      meta: { urlCount: urls.length },
    };
  }

  // 4. JSON detection
  if (isJson(trimmed)) {
    try {
      const parsed = JSON.parse(trimmed);
      return {
        type: "json",
        confidence: 0.99,
        meta: {
          isArray: Array.isArray(parsed),
          keys: Array.isArray(parsed)
            ? undefined
            : Object.keys(parsed).slice(0, 10),
        },
      };
    } catch {
      // fallthrough
    }
  }

  // 5. SQL detection
  if (isSql(trimmed)) {
    return {
      type: "sql",
      confidence: 0.9,
      meta: {
        lineCount: trimmed.split("\n").length,
      },
    };
  }

  // 6. Stack trace / error detection
  if (isStackTrace(trimmed)) {
    return {
      type: "error",
      confidence: 0.9,
      meta: {
        lineCount: trimmed.split("\n").length,
      },
    };
  }

  // 7. Table detection
  if (isTable(trimmed)) {
    const lines = trimmed.split("\n").filter(Boolean);
    let format = "unknown";
    if (lines[0].includes("|")) format = "markdown";
    else if (lines[0].includes("\t")) format = "tsv";
    else if (lines[0].includes(",")) format = "csv";
    return {
      type: "table",
      confidence: 0.85,
      meta: {
        format,
        rowCount: lines.length,
      },
    };
  }

  // 8. File path detection
  if (isFilePath(trimmed)) {
    return {
      type: "path",
      confidence: 0.9,
      meta: {
        pathCount: trimmed.split("\n").filter(Boolean).length,
      },
    };
  }

  // 9. Code language detection
  const langResult = detectLanguage(trimmed);
  if (langResult && langResult.confidence >= 0.5) {
    return {
      type: "code",
      language: langResult.language,
      confidence: langResult.confidence,
      meta: {
        lineCount: trimmed.split("\n").length,
      },
    };
  }

  // 10. Natural language fallback
  // If content has multiple words and sentences, it's probably text
  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount >= 3) {
    return {
      type: "text",
      confidence: 0.6,
      meta: {
        wordCount,
        lineCount: trimmed.split("\n").length,
      },
    };
  }

  return { type: "unknown", confidence: 0.3 };
}

export { redactContent } from "./secrets.js";
