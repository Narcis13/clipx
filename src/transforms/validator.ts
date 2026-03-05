import { detect } from "../core/detector.js";

export interface ValidationResult {
  valid: boolean;
  type: string;
  errors?: ValidationError[];
}

export interface ValidationError {
  message: string;
  line?: number;
  column?: number;
}

export function validateJSON(content: string): ValidationResult {
  const trimmed = content.trim();
  try {
    JSON.parse(trimmed);
    return { valid: true, type: "json" };
  } catch (err) {
    const message = (err as Error).message;
    // Bun/V8 error format: "JSON Parse error: ..." or "Expected ... at position N"
    const posMatch = message.match(/position\s+(\d+)/i);
    let line: number | undefined;
    let column: number | undefined;

    if (posMatch) {
      const pos = parseInt(posMatch[1], 10);
      const before = trimmed.slice(0, pos);
      const lines = before.split("\n");
      line = lines.length;
      column = lines[lines.length - 1].length + 1;
    }

    return {
      valid: false,
      type: "json",
      errors: [{ message, line, column }],
    };
  }
}

export function validateURL(content: string): ValidationResult {
  const lines = content
    .trim()
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const errors: ValidationError[] = [];

  for (let i = 0; i < lines.length; i++) {
    try {
      new URL(lines[i]);
    } catch {
      errors.push({
        message: `Invalid URL: ${lines[i]}`,
        line: i + 1,
      });
    }
  }

  return {
    valid: errors.length === 0,
    type: "url",
    ...(errors.length > 0 ? { errors } : {}),
  };
}

const SQL_REQUIRED_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  {
    pattern: /^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|WITH|EXPLAIN|TRUNCATE|MERGE|REPLACE)\b/i,
    description: "Statement must start with a valid SQL keyword",
  },
];

const SQL_STRUCTURE_CHECKS: Array<{
  applies: RegExp;
  pattern: RegExp;
  description: string;
}> = [
  {
    applies: /^SELECT\b/i,
    pattern: /\bFROM\b/i,
    description: "SELECT statement missing FROM clause",
  },
  {
    applies: /^INSERT\b/i,
    pattern: /\bINTO\b/i,
    description: "INSERT statement missing INTO keyword",
  },
  {
    applies: /^INSERT\b/i,
    pattern: /\bVALUES\b|\bSELECT\b/i,
    description: "INSERT statement missing VALUES or SELECT clause",
  },
  {
    applies: /^UPDATE\b/i,
    pattern: /\bSET\b/i,
    description: "UPDATE statement missing SET clause",
  },
  {
    applies: /^DELETE\b/i,
    pattern: /\bFROM\b/i,
    description: "DELETE statement missing FROM clause",
  },
];

export function validateSQL(content: string): ValidationResult {
  const trimmed = content.trim();
  const errors: ValidationError[] = [];

  // Check starts with valid keyword
  let startsValid = false;
  for (const { pattern, description } of SQL_REQUIRED_PATTERNS) {
    if (pattern.test(trimmed)) {
      startsValid = true;
      break;
    }
    errors.push({ message: description });
  }

  if (!startsValid) {
    return { valid: false, type: "sql", errors };
  }

  // Clear the "must start with" error since it passed
  errors.length = 0;

  // Check structure rules
  for (const { applies, pattern, description } of SQL_STRUCTURE_CHECKS) {
    if (applies.test(trimmed) && !pattern.test(trimmed)) {
      errors.push({ message: description });
    }
  }

  // Check balanced parentheses
  let depth = 0;
  for (let i = 0; i < trimmed.length; i++) {
    if (trimmed[i] === "(") depth++;
    if (trimmed[i] === ")") depth--;
    if (depth < 0) {
      const before = trimmed.slice(0, i);
      const line = before.split("\n").length;
      errors.push({ message: "Unexpected closing parenthesis", line, column: i + 1 });
      break;
    }
  }
  if (depth > 0) {
    errors.push({ message: `${depth} unclosed parenthesis(es)` });
  }

  // Check balanced quotes
  for (const quote of ["'", '"']) {
    const count = (trimmed.match(new RegExp(`(?<!\\\\)${quote === '"' ? '\\"' : "'"}`, "g")) || []).length;
    if (count % 2 !== 0) {
      errors.push({ message: `Unmatched ${quote === "'" ? "single" : "double"} quote` });
    }
  }

  return {
    valid: errors.length === 0,
    type: "sql",
    ...(errors.length > 0 ? { errors } : {}),
  };
}

export function autoValidate(content: string): ValidationResult {
  const detection = detect(content);

  switch (detection.type) {
    case "json":
      return validateJSON(content);
    case "url":
      return validateURL(content);
    case "sql":
      return validateSQL(content);
    default:
      // For unrecognized types, try JSON first (common case), then report as-is
      const trimmed = content.trim();
      if (
        (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
        (trimmed.startsWith("[") && trimmed.endsWith("]"))
      ) {
        return validateJSON(content);
      }
      return { valid: true, type: detection.type };
  }
}
