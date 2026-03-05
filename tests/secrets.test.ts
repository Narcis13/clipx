import { describe, test, expect } from "bun:test";
import { detectSecret, shannonEntropy, redactContent } from "../src/core/secrets.js";

describe("Secret Detection", () => {
  describe("Known patterns", () => {
    test("detects sk-ant- Anthropic keys", () => {
      const result = detectSecret("sk-ant-api03-abcdefghijklmnopqrstuvwxyz123456");
      expect(result.isSecret).toBe(true);
      expect(result.pattern).toContain("Anthropic");
    });

    test("detects GitHub personal access tokens", () => {
      const result = detectSecret("ghp_1234567890abcdefghijklmnopqrstuvwxyz1234");
      expect(result.isSecret).toBe(true);
      expect(result.pattern).toContain("GitHub");
    });

    test("detects Slack bot tokens", () => {
      // Construct dynamically to avoid push protection
      const prefix = "xoxb";
      const result = detectSecret(`${prefix}-1234-5678-abcdef`);
      expect(result.isSecret).toBe(true);
      expect(result.pattern).toContain("Slack");
    });

    test("detects AWS access keys", () => {
      const result = detectSecret("AKIAIOSFODNN7EXAMPLE");
      expect(result.isSecret).toBe(true);
      expect(result.pattern).toContain("AWS");
    });

    test("detects JWTs", () => {
      const result = detectSecret("eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc123");
      expect(result.isSecret).toBe(true);
      expect(result.pattern).toContain("JWT");
    });

    test("detects PEM private keys", () => {
      const result = detectSecret("-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAK...");
      expect(result.isSecret).toBe(true);
    });

    test("detects Stripe keys", () => {
      // Construct dynamically to avoid push protection
      const prefix = "sk_live_";
      const result = detectSecret(prefix + "1234567890abcdefghijklmn");
      expect(result.isSecret).toBe(true);
      expect(result.pattern).toContain("Stripe");
    });
  });

  describe("False positives", () => {
    test("does not flag normal words", () => {
      const result = detectSecret("hello world");
      expect(result.isSecret).toBe(false);
    });

    test("does not flag short strings", () => {
      const result = detectSecret("abc123");
      expect(result.isSecret).toBe(false);
    });

    test("does not flag code snippets", () => {
      const result = detectSecret("const x = 42;");
      expect(result.isSecret).toBe(false);
    });

    test("does not flag URLs", () => {
      const result = detectSecret("https://api.example.com/v1/users");
      expect(result.isSecret).toBe(false);
    });

    test("does not flag file paths", () => {
      const result = detectSecret("/usr/local/bin/node");
      expect(result.isSecret).toBe(false);
    });
  });

  describe("Shannon entropy", () => {
    test("low entropy for repeated characters", () => {
      const entropy = shannonEntropy("aaaaaaaaaaaa");
      expect(entropy).toBe(0);
    });

    test("higher entropy for random-looking strings", () => {
      const entropy = shannonEntropy("aB3$kL9#mN2&pQ5!");
      expect(entropy).toBeGreaterThan(3.5);
    });

    test("moderate entropy for English text", () => {
      const entropy = shannonEntropy("hello world");
      expect(entropy).toBeGreaterThan(2);
      expect(entropy).toBeLessThan(4);
    });
  });

  describe("Redaction", () => {
    test("redacts long strings showing prefix and suffix", () => {
      const result = redactContent("sk-ant-api03-abcdefghijklmnopqrstuvwxyz");
      expect(result).toContain("sk-a");
      expect(result).toContain("wxyz");
      expect(result).toContain("REDACTED");
    });

    test("fully redacts short strings", () => {
      const result = redactContent("abc");
      expect(result).toBe("***REDACTED***");
    });
  });
});
