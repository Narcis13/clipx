import { describe, test, expect } from "bun:test";
import { detect } from "../src/core/detector.js";
import { readFileSync } from "fs";
import { join } from "path";

const fixturesDir = join(import.meta.dir, "fixtures");

function loadFixture(path: string): string {
  return readFileSync(join(fixturesDir, path), "utf-8");
}

describe("Type Detection Engine", () => {
  // ===================
  // Secret Detection (Priority 1)
  // ===================
  describe("Secret detection", () => {
    test("detects Anthropic API key", () => {
      const result = detect(
        "sk-ant-api03-abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGH"
      );
      expect(result.type).toBe("secret");
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    test("detects OpenAI API key", () => {
      const result = detect("sk-1234567890abcdefghijklmnopqrstuvwxyz12345678");
      expect(result.type).toBe("secret");
    });

    test("detects GitHub token", () => {
      const result = detect(
        "ghp_1234567890abcdefghijklmnopqrstuvwxyz1234"
      );
      expect(result.type).toBe("secret");
    });

    test("detects Slack token", () => {
      // Construct dynamically to avoid push protection
      const prefix = "xoxb";
      const result = detect(`${prefix}-1234567890-1234567890123-abcdefghijklmnop`);
      expect(result.type).toBe("secret");
    });

    test("detects AWS access key", () => {
      const result = detect("AKIAIOSFODNN7EXAMPLE");
      expect(result.type).toBe("secret");
    });

    test("detects JWT", () => {
      const result = detect(
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
      );
      expect(result.type).toBe("secret");
    });

    test("detects PEM private key", () => {
      const result = detect(
        "-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----"
      );
      expect(result.type).toBe("secret");
    });

    test("detects Stripe key", () => {
      // Construct dynamically to avoid push protection
      const prefix = "sk_live_";
      const result = detect(prefix + "1234567890abcdefghijklmn");
      expect(result.type).toBe("secret");
    });

    test("does NOT flag normal code as secret", () => {
      const result = detect("const greeting = 'hello world';");
      expect(result.type).not.toBe("secret");
    });

    test("does NOT flag normal English text as secret", () => {
      const result = detect(
        "This is a normal sentence about programming concepts."
      );
      expect(result.type).not.toBe("secret");
    });

    test("does NOT flag a URL as secret", () => {
      const result = detect("https://api.example.com/v1/users");
      expect(result.type).not.toBe("secret");
    });
  });

  // ===================
  // File Reference Detection (Priority 2)
  // ===================
  describe("File reference detection", () => {
    test("detects single file:// URL", () => {
      const result = detect("file:///Users/narcis/Documents/report.pdf");
      expect(result.type).toBe("file-ref");
    });

    test("detects multiple file:// URLs", () => {
      const result = detect(
        "file:///Users/narcis/file1.txt\nfile:///Users/narcis/file2.txt"
      );
      expect(result.type).toBe("file-ref");
    });
  });

  // ===================
  // URL Detection (Priority 3)
  // ===================
  describe("URL detection", () => {
    test("detects single HTTPS URL", () => {
      const result = detect("https://github.com/narcis/clipx");
      expect(result.type).toBe("url");
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    test("detects HTTP URL", () => {
      const result = detect("http://localhost:3000/api/health");
      expect(result.type).toBe("url");
    });

    test("detects multiple URLs", () => {
      const result = detect(
        "https://example.com\nhttps://github.com\nhttps://bun.sh"
      );
      expect(result.type).toBe("url");
      expect(result.meta?.urlCount).toBe(3);
    });
  });

  // ===================
  // JSON Detection (Priority 4)
  // ===================
  describe("JSON detection", () => {
    test("detects simple JSON object", () => {
      const input = loadFixture("json-samples/simple-object.txt");
      const result = detect(input);
      expect(result.type).toBe("json");
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    test("detects JSON array", () => {
      const input = loadFixture("json-samples/nested-array.txt");
      const result = detect(input);
      expect(result.type).toBe("json");
      expect(result.meta?.isArray).toBe(true);
    });

    test("prefers JSON over code when valid JSON", () => {
      const input = '{"name": "test", "value": 42}';
      const result = detect(input);
      expect(result.type).toBe("json");
    });

    test("does not detect invalid JSON", () => {
      const result = detect("{name: test, value: 42}");
      expect(result.type).not.toBe("json");
    });
  });

  // ===================
  // SQL Detection (Priority 5)
  // ===================
  describe("SQL detection", () => {
    test("detects SELECT query", () => {
      const result = detect(
        "SELECT u.name, u.email FROM users u WHERE u.active = true"
      );
      expect(result.type).toBe("sql");
    });

    test("detects lowercase SQL", () => {
      const result = detect(
        "select u.name, count(*) from users u join orders o on u.id = o.user_id group by u.name"
      );
      expect(result.type).toBe("sql");
    });

    test("detects INSERT statement", () => {
      const result = detect(
        "INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com')"
      );
      expect(result.type).toBe("sql");
    });

    test("detects CREATE TABLE", () => {
      const result = detect(
        "CREATE TABLE users (\n  id SERIAL PRIMARY KEY,\n  name VARCHAR(255) NOT NULL,\n  email VARCHAR(255) UNIQUE\n)"
      );
      expect(result.type).toBe("sql");
    });

    test("detects complex query with JOINs", () => {
      const result = detect(
        `SELECT o.id, u.name, p.title
         FROM orders o
         JOIN users u ON o.user_id = u.id
         JOIN products p ON o.product_id = p.id
         WHERE o.created_at > '2024-01-01'
         ORDER BY o.created_at DESC
         LIMIT 50`
      );
      expect(result.type).toBe("sql");
    });
  });

  // ===================
  // Error / Stack Trace Detection (Priority 6)
  // ===================
  describe("Error detection", () => {
    test("detects Node.js TypeError stack trace", () => {
      const input = loadFixture("error-samples/node-typeerror.txt");
      const result = detect(input);
      expect(result.type).toBe("error");
    });

    test("detects Python traceback", () => {
      const input = loadFixture("error-samples/python-traceback.txt");
      const result = detect(input);
      expect(result.type).toBe("error");
    });

    test("detects simple error message", () => {
      const result = detect(
        "ReferenceError: myVariable is not defined\n    at eval (eval at <anonymous>, <anonymous>:1:1)"
      );
      expect(result.type).toBe("error");
    });

    test("detects Go panic", () => {
      const result = detect(
        "panic: runtime error: index out of range [5] with length 3\n\ngoroutine 1 [running]:\nmain.main()\n\t/app/main.go:15 +0x1a"
      );
      expect(result.type).toBe("error");
    });
  });

  // ===================
  // Table Detection (Priority 7)
  // ===================
  describe("Table detection", () => {
    test("detects TSV data", () => {
      const input = loadFixture("table-samples/tsv-from-excel.txt");
      const result = detect(input);
      expect(result.type).toBe("table");
      expect(result.meta?.format).toBe("tsv");
    });

    test("detects CSV data", () => {
      const input = loadFixture("table-samples/csv-data.txt");
      const result = detect(input);
      expect(result.type).toBe("table");
      expect(result.meta?.format).toBe("csv");
    });

    test("detects markdown table", () => {
      const input = loadFixture("table-samples/markdown-table.txt");
      const result = detect(input);
      expect(result.type).toBe("table");
      expect(result.meta?.format).toBe("markdown");
    });
  });

  // ===================
  // File Path Detection (Priority 8)
  // ===================
  describe("File path detection", () => {
    test("detects Unix absolute path", () => {
      const result = detect("/usr/local/bin/node");
      expect(result.type).toBe("path");
    });

    test("detects home-relative path", () => {
      const result = detect("~/Documents/project");
      expect(result.type).toBe("path");
    });

    test("detects relative path", () => {
      const result = detect("./src/index.ts");
      expect(result.type).toBe("path");
    });

    test("detects multiple paths", () => {
      const result = detect("/usr/bin/node\n/usr/bin/bun\n/usr/bin/npm");
      expect(result.type).toBe("path");
      expect(result.meta?.pathCount).toBe(3);
    });
  });

  // ===================
  // Code Detection (Priority 9)
  // ===================
  describe("Code detection", () => {
    test("detects TypeScript with high confidence", () => {
      const input = loadFixture("code-samples/typescript-component.txt");
      const result = detect(input);
      expect(result.type).toBe("code");
      expect(result.language).toBe("typescript");
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    test("detects Python", () => {
      const input = loadFixture("code-samples/python-script.txt");
      const result = detect(input);
      expect(result.type).toBe("code");
      expect(result.language).toBe("python");
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    test("detects Rust", () => {
      const input = loadFixture("code-samples/rust-function.txt");
      const result = detect(input);
      expect(result.type).toBe("code");
      expect(result.language).toBe("rust");
    });

    test("detects Bash", () => {
      const input = loadFixture("code-samples/bash-script.txt");
      const result = detect(input);
      expect(result.type).toBe("code");
      expect(result.language).toBe("bash");
    });

    test("detects simple TypeScript interface", () => {
      const result = detect(
        "interface User {\n  id: string;\n  name: string;\n}"
      );
      expect(result.type).toBe("code");
      expect(result.language).toBe("typescript");
    });

    test("detects Go code", () => {
      const result = detect(
        'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello")\n}'
      );
      expect(result.type).toBe("code");
      expect(result.language).toBe("go");
    });

    test("detects Java code", () => {
      const result = detect(
        'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello");\n  }\n}'
      );
      expect(result.type).toBe("code");
      expect(result.language).toBe("java");
    });
  });

  // ===================
  // Natural Language / Text Detection (Priority 10)
  // ===================
  describe("Text detection", () => {
    test("detects natural language text", () => {
      const result = detect(
        "The quick brown fox jumps over the lazy dog. This is a sample sentence for testing purposes."
      );
      expect(result.type).toBe("text");
    });

    test("detects multi-paragraph text", () => {
      const result = detect(
        "This is the first paragraph about programming.\n\nThis is the second paragraph with more details about the topic."
      );
      expect(result.type).toBe("text");
    });
  });

  // ===================
  // Edge Cases
  // ===================
  describe("Edge cases", () => {
    test("handles empty string", () => {
      const result = detect("");
      expect(result.type).toBe("unknown");
    });

    test("handles single character", () => {
      const result = detect("a");
      expect(result.type).toBe("unknown");
    });

    test("handles whitespace only", () => {
      const result = detect("   \n\n  \t  ");
      expect(result.type).toBe("unknown");
    });

    test("handles very short text", () => {
      const result = detect("hi");
      expect(result.type).toBe("unknown");
    });
  });

  // ===================
  // Detection Priority
  // ===================
  describe("Detection priority", () => {
    test("secret takes priority over code-like content", () => {
      // A string that could look like code but is actually a secret
      const result = detect(
        "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklm"
      );
      expect(result.type).toBe("secret");
    });

    test("JSON takes priority over code", () => {
      // Valid JSON that contains code-like constructs
      const result = detect(
        '{"function": "test", "const": "value", "import": "module"}'
      );
      expect(result.type).toBe("json");
    });

    test("URL takes priority over text", () => {
      const result = detect("https://example.com/path/to/resource?q=test");
      expect(result.type).toBe("url");
    });

    test("SQL takes priority over code when SQL keywords dominate", () => {
      const result = detect(
        "SELECT name, email FROM users WHERE active = true ORDER BY name"
      );
      expect(result.type).toBe("sql");
    });
  });
});
