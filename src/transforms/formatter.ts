import { detect } from "../core/detector.js";

export function formatJSON(content: string): string {
  const parsed = JSON.parse(content.trim());
  return JSON.stringify(parsed, null, 2);
}

const SQL_CLAUSE_KEYWORDS = [
  "SELECT",
  "FROM",
  "WHERE",
  "JOIN",
  "LEFT JOIN",
  "RIGHT JOIN",
  "INNER JOIN",
  "OUTER JOIN",
  "CROSS JOIN",
  "FULL JOIN",
  "ON",
  "AND",
  "OR",
  "GROUP BY",
  "ORDER BY",
  "HAVING",
  "LIMIT",
  "OFFSET",
  "UNION",
  "UNION ALL",
  "INSERT INTO",
  "VALUES",
  "UPDATE",
  "SET",
  "DELETE FROM",
  "CREATE TABLE",
  "ALTER TABLE",
  "DROP TABLE",
];

export function formatSQL(content: string): string {
  let sql = content.trim().replace(/\s+/g, " ");

  // Uppercase all SQL keywords
  const allKeywords = [
    ...SQL_CLAUSE_KEYWORDS,
    "AS",
    "IN",
    "NOT",
    "NULL",
    "IS",
    "BETWEEN",
    "LIKE",
    "EXISTS",
    "CASE",
    "WHEN",
    "THEN",
    "ELSE",
    "END",
    "DISTINCT",
    "COUNT",
    "SUM",
    "AVG",
    "MAX",
    "MIN",
    "ASC",
    "DESC",
    "PRIMARY KEY",
    "FOREIGN KEY",
    "NOT NULL",
    "DEFAULT",
    "UNIQUE",
    "INDEX",
    "INTO",
    "TABLE",
    "TRUE",
    "FALSE",
  ];

  // Sort by length descending so multi-word keywords match first
  const sorted = [...allKeywords].sort((a, b) => b.length - a.length);
  for (const kw of sorted) {
    const pattern = new RegExp(`\\b${kw.replace(/\s+/g, "\\s+")}\\b`, "gi");
    sql = sql.replace(pattern, kw);
  }

  // Add newlines before major clause keywords
  for (const kw of SQL_CLAUSE_KEYWORDS) {
    const pattern = new RegExp(`\\s+${kw.replace(/\s+/g, "\\s+")}\\b`, "g");
    sql = sql.replace(pattern, `\n${kw}`);
  }

  return sql;
}

export function formatCode(content: string, _language?: string): string {
  const lines = content.split("\n");
  const formatted: string[] = [];
  let indentLevel = 0;
  const indentStr = "  ";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      formatted.push("");
      continue;
    }

    // Count net brace change to handle lines like "} else {"
    const opens = (trimmed.match(/[{(\[]/g) || []).length;
    const closes = (trimmed.match(/[}\])]/g) || []).length;

    // Decrease indent before printing if line starts with closing brace
    if (/^[}\])]/.test(trimmed)) {
      indentLevel = Math.max(0, indentLevel - closes);
      formatted.push(indentStr.repeat(indentLevel) + trimmed);
      indentLevel += opens;
    } else {
      formatted.push(indentStr.repeat(indentLevel) + trimmed);
      indentLevel = Math.max(0, indentLevel + opens - closes);
    }
  }

  return formatted.join("\n");
}

export function autoFormat(content: string): string {
  const detection = detect(content);

  switch (detection.type) {
    case "json":
      return formatJSON(content);
    case "sql":
      return formatSQL(content);
    case "code":
      return formatCode(content, detection.language);
    default:
      return content.trim();
  }
}
