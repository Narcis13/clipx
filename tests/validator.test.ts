import { describe, test, expect } from "bun:test";
import {
  validateJSON,
  validateURL,
  validateSQL,
  autoValidate,
} from "../src/transforms/validator.js";

describe("Validator", () => {
  // ===================
  // JSON Validation
  // ===================
  describe("validateJSON", () => {
    test("valid simple object", () => {
      const result = validateJSON('{"name": "Alice", "age": 30}');
      expect(result.valid).toBe(true);
      expect(result.type).toBe("json");
      expect(result.errors).toBeUndefined();
    });

    test("valid array", () => {
      const result = validateJSON("[1, 2, 3]");
      expect(result.valid).toBe(true);
    });

    test("valid nested object", () => {
      const result = validateJSON('{"a": {"b": {"c": [1, 2]}}}');
      expect(result.valid).toBe(true);
    });

    test("valid empty object", () => {
      const result = validateJSON("{}");
      expect(result.valid).toBe(true);
    });

    test("invalid - missing quotes on key", () => {
      const result = validateJSON("{name: 'Alice'}");
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    test("invalid - trailing comma", () => {
      const result = validateJSON('{"a": 1,}');
      expect(result.valid).toBe(false);
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    test("invalid - plain text", () => {
      const result = validateJSON("hello world");
      expect(result.valid).toBe(false);
    });

    test("error includes message", () => {
      const result = validateJSON("{bad json}");
      expect(result.valid).toBe(false);
      expect(result.errors![0].message).toBeTruthy();
    });

    test("handles whitespace around valid JSON", () => {
      const result = validateJSON('  \n  {"valid": true}  \n  ');
      expect(result.valid).toBe(true);
    });
  });

  // ===================
  // URL Validation
  // ===================
  describe("validateURL", () => {
    test("valid HTTPS URL", () => {
      const result = validateURL("https://example.com");
      expect(result.valid).toBe(true);
      expect(result.type).toBe("url");
    });

    test("valid HTTP URL with path", () => {
      const result = validateURL("http://localhost:3000/api/health");
      expect(result.valid).toBe(true);
    });

    test("valid multiple URLs", () => {
      const result = validateURL(
        "https://example.com\nhttps://github.com\nhttps://bun.sh"
      );
      expect(result.valid).toBe(true);
    });

    test("invalid URL - no protocol", () => {
      const result = validateURL("not-a-url");
      expect(result.valid).toBe(false);
      expect(result.errors!.length).toBe(1);
      expect(result.errors![0].line).toBe(1);
    });

    test("invalid URL - plain text", () => {
      const result = validateURL("just some text");
      expect(result.valid).toBe(false);
    });

    test("mixed valid and invalid URLs", () => {
      const result = validateURL("https://example.com\nnot-valid\nhttps://bun.sh");
      expect(result.valid).toBe(false);
      expect(result.errors!.length).toBe(1);
      expect(result.errors![0].line).toBe(2);
    });

    test("valid URL with query params", () => {
      const result = validateURL(
        "https://example.com/search?q=test&page=1#results"
      );
      expect(result.valid).toBe(true);
    });

    test("valid file:// URL", () => {
      const result = validateURL("file:///Users/test/doc.pdf");
      expect(result.valid).toBe(true);
    });

    test("skips empty lines", () => {
      const result = validateURL("https://example.com\n\nhttps://bun.sh");
      expect(result.valid).toBe(true);
    });
  });

  // ===================
  // SQL Validation
  // ===================
  describe("validateSQL", () => {
    test("valid SELECT query", () => {
      const result = validateSQL(
        "SELECT name, email FROM users WHERE active = true"
      );
      expect(result.valid).toBe(true);
      expect(result.type).toBe("sql");
    });

    test("valid INSERT statement", () => {
      const result = validateSQL(
        "INSERT INTO users (name) VALUES ('Alice')"
      );
      expect(result.valid).toBe(true);
    });

    test("valid UPDATE statement", () => {
      const result = validateSQL(
        "UPDATE users SET name = 'Bob' WHERE id = 1"
      );
      expect(result.valid).toBe(true);
    });

    test("valid DELETE statement", () => {
      const result = validateSQL("DELETE FROM users WHERE id = 1");
      expect(result.valid).toBe(true);
    });

    test("valid CREATE TABLE", () => {
      const result = validateSQL(
        "CREATE TABLE users (id INT, name VARCHAR(255))"
      );
      expect(result.valid).toBe(true);
    });

    test("invalid - does not start with SQL keyword", () => {
      const result = validateSQL("FETCH ALL FROM users");
      expect(result.valid).toBe(false);
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    test("invalid - SELECT without FROM", () => {
      const result = validateSQL("SELECT 1 + 1");
      expect(result.valid).toBe(false);
      expect(result.errors!.some((e) => e.message.includes("FROM"))).toBe(true);
    });

    test("invalid - INSERT without INTO", () => {
      const result = validateSQL("INSERT users VALUES ('test')");
      expect(result.valid).toBe(false);
      expect(result.errors!.some((e) => e.message.includes("INTO"))).toBe(true);
    });

    test("invalid - UPDATE without SET", () => {
      const result = validateSQL("UPDATE users WHERE id = 1");
      expect(result.valid).toBe(false);
      expect(result.errors!.some((e) => e.message.includes("SET"))).toBe(true);
    });

    test("invalid - unbalanced parentheses (unclosed)", () => {
      const result = validateSQL(
        "SELECT * FROM users WHERE id IN (1, 2, 3"
      );
      expect(result.valid).toBe(false);
      expect(
        result.errors!.some((e) => e.message.includes("unclosed"))
      ).toBe(true);
    });

    test("invalid - unbalanced parentheses (extra close)", () => {
      const result = validateSQL(
        "SELECT * FROM users WHERE id IN (1, 2))"
      );
      expect(result.valid).toBe(false);
      expect(
        result.errors!.some((e) => e.message.includes("closing parenthesis"))
      ).toBe(true);
    });

    test("invalid - unmatched single quote", () => {
      const result = validateSQL(
        "SELECT * FROM users WHERE name = 'Alice"
      );
      expect(result.valid).toBe(false);
      expect(
        result.errors!.some((e) => e.message.includes("quote"))
      ).toBe(true);
    });

    test("valid - complex query with subquery", () => {
      const result = validateSQL(
        "SELECT * FROM users WHERE id IN (SELECT user_id FROM orders WHERE total > 100)"
      );
      expect(result.valid).toBe(true);
    });

    test("valid - case insensitive keywords", () => {
      const result = validateSQL(
        "select name from users where active = true"
      );
      expect(result.valid).toBe(true);
    });
  });

  // ===================
  // autoValidate
  // ===================
  describe("autoValidate", () => {
    test("auto-detects and validates JSON", () => {
      const result = autoValidate('{"key": "value"}');
      expect(result.valid).toBe(true);
      expect(result.type).toBe("json");
    });

    test("auto-detects and validates invalid JSON", () => {
      const result = autoValidate("{bad: json}");
      expect(result.valid).toBe(false);
      expect(result.type).toBe("json");
    });

    test("auto-detects and validates URL", () => {
      const result = autoValidate("https://example.com");
      expect(result.valid).toBe(true);
      expect(result.type).toBe("url");
    });

    test("auto-detects and validates SQL", () => {
      const result = autoValidate(
        "SELECT name FROM users WHERE active = true"
      );
      expect(result.valid).toBe(true);
      expect(result.type).toBe("sql");
    });

    test("returns valid for plain text", () => {
      const result = autoValidate("just some regular text here");
      expect(result.valid).toBe(true);
      expect(result.type).toBe("text");
    });
  });
});
