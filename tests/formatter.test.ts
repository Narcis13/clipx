import { describe, test, expect } from "bun:test";
import { formatJSON, formatSQL, formatCode, autoFormat } from "../src/transforms/formatter.js";

describe("Formatter", () => {
  // ===================
  // JSON Formatting
  // ===================
  describe("formatJSON", () => {
    test("pretty-prints minified JSON object", () => {
      const input = '{"name":"Alice","age":30,"active":true}';
      const result = formatJSON(input);
      expect(result).toBe(JSON.stringify({ name: "Alice", age: 30, active: true }, null, 2));
    });

    test("pretty-prints nested objects", () => {
      const input = '{"user":{"name":"Bob","address":{"city":"NYC","zip":"10001"}},"tags":["a","b"]}';
      const result = formatJSON(input);
      expect(result).toContain('"user": {');
      expect(result).toContain('"address": {');
      expect(result).toContain('"tags": [');
    });

    test("pretty-prints JSON array", () => {
      const input = '[1,2,3,{"key":"value"}]';
      const result = formatJSON(input);
      expect(result).toBe(JSON.stringify([1, 2, 3, { key: "value" }], null, 2));
    });

    test("re-formats already pretty JSON consistently", () => {
      const input = '{\n  "name": "test"\n}';
      const result = formatJSON(input);
      expect(result).toBe('{\n  "name": "test"\n}');
    });

    test("throws on invalid JSON", () => {
      expect(() => formatJSON("{not valid json}")).toThrow();
    });

    test("throws on plain text", () => {
      expect(() => formatJSON("hello world")).toThrow();
    });
  });

  // ===================
  // SQL Formatting
  // ===================
  describe("formatSQL", () => {
    test("formats single-line SELECT into multi-line", () => {
      const input = "select name, email from users where active = true order by name";
      const result = formatSQL(input);
      expect(result).toContain("SELECT");
      expect(result).toContain("\nFROM");
      expect(result).toContain("\nWHERE");
      expect(result).toContain("\nORDER BY");
    });

    test("uppercases SQL keywords", () => {
      const input = "select count(*) from users where id in (1, 2, 3)";
      const result = formatSQL(input);
      expect(result).toContain("SELECT");
      expect(result).toContain("FROM");
      expect(result).toContain("WHERE");
      expect(result).toContain("COUNT");
      expect(result).toContain("IN");
    });

    test("formats JOIN queries", () => {
      const input = "select u.name, o.total from users u join orders o on u.id = o.user_id where o.total > 100";
      const result = formatSQL(input);
      expect(result).toContain("\nJOIN");
      expect(result).toContain("\nON");
      expect(result).toContain("\nWHERE");
    });

    test("formats INSERT statement", () => {
      const input = "insert into users (name, email) values ('Alice', 'alice@example.com')";
      const result = formatSQL(input);
      expect(result).toContain("INSERT INTO");
      expect(result).toContain("\nVALUES");
    });

    test("formats CREATE TABLE", () => {
      const input = "create table users (id serial primary key, name varchar(255) not null)";
      const result = formatSQL(input);
      expect(result).toContain("CREATE TABLE");
      expect(result).toContain("PRIMARY KEY");
      expect(result).toContain("NOT NULL");
    });
  });

  // ===================
  // Code Formatting
  // ===================
  describe("formatCode", () => {
    test("normalizes indentation for braces", () => {
      const input = "function hello() {\nconst x = 1;\nreturn x;\n}";
      const result = formatCode(input);
      expect(result).toBe("function hello() {\n  const x = 1;\n  return x;\n}");
    });

    test("handles nested braces", () => {
      const input = "if (true) {\nif (false) {\nx = 1;\n}\n}";
      const result = formatCode(input);
      expect(result).toContain("  if (false) {");
      expect(result).toContain("    x = 1;");
    });

    test("preserves empty lines", () => {
      const input = "a\n\nb";
      const result = formatCode(input);
      expect(result).toBe("a\n\nb");
    });
  });

  // ===================
  // autoFormat
  // ===================
  describe("autoFormat", () => {
    test("auto-detects and formats JSON", () => {
      const input = '{"key":"value","num":42}';
      const result = autoFormat(input);
      expect(result).toBe(JSON.stringify({ key: "value", num: 42 }, null, 2));
    });

    test("auto-detects and formats SQL", () => {
      const input = "select name from users where active = true";
      const result = autoFormat(input);
      expect(result).toContain("SELECT");
      expect(result).toContain("\nFROM");
      expect(result).toContain("\nWHERE");
    });

    test("returns trimmed text for unknown types", () => {
      const input = "  just some plain text  ";
      const result = autoFormat(input);
      expect(result).toBe("just some plain text");
    });
  });
});
