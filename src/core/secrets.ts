export interface SecretDetectionResult {
  isSecret: boolean;
  pattern?: string;
  confidence: number;
}

const SECRET_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /^sk-[a-zA-Z0-9]{20,}$/, name: "OpenAI/Anthropic API key" },
  {
    pattern: /^sk-ant-[a-zA-Z0-9-]{20,}$/,
    name: "Anthropic API key",
  },
  {
    pattern: /^(ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36,}/,
    name: "GitHub token",
  },
  { pattern: /^xox[bpras]-[a-zA-Z0-9-]+/, name: "Slack token" },
  { pattern: /^AKIA[0-9A-Z]{16}$/, name: "AWS access key" },
  { pattern: /^eyJ[a-zA-Z0-9_-]+\.eyJ/, name: "JWT" },
  {
    pattern: /-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----/,
    name: "PEM private key",
  },
  {
    pattern: /^(sk|pk)_(live|test)_[a-zA-Z0-9]{20,}/,
    name: "Stripe key",
  },
  {
    pattern: /^SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}$/,
    name: "SendGrid key",
  },
  {
    pattern: /^[0-9]+:AA[a-zA-Z0-9_-]{33}$/,
    name: "Telegram bot token",
  },
];

export function shannonEntropy(str: string): number {
  const freq = new Map<string, number>();
  for (const ch of str) {
    freq.set(ch, (freq.get(ch) || 0) + 1);
  }
  let entropy = 0;
  const len = str.length;
  for (const count of freq.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

export function detectSecret(content: string): SecretDetectionResult {
  const trimmed = content.trim();

  // Check against known patterns
  for (const { pattern, name } of SECRET_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { isSecret: true, pattern: name, confidence: 0.99 };
    }
  }

  // Multi-line content with PEM key somewhere in it
  if (/-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----/.test(content)) {
    return { isSecret: true, pattern: "PEM private key", confidence: 0.99 };
  }

  // Entropy check for single-line strings that look like tokens
  // Only for strings that are 16+ chars, single-line, no spaces
  if (
    trimmed.length >= 16 &&
    !trimmed.includes(" ") &&
    !trimmed.includes("\n") &&
    trimmed.length <= 256
  ) {
    const entropy = shannonEntropy(trimmed);
    // High entropy + looks like a token (alphanumeric with dashes/underscores)
    if (entropy > 4.5 && /^[a-zA-Z0-9_\-./+=]+$/.test(trimmed)) {
      // Additional check: not a known non-secret pattern (e.g., base64-encoded normal text, file paths)
      if (
        !trimmed.startsWith("/") &&
        !trimmed.startsWith("./") &&
        !trimmed.startsWith("http")
      ) {
        return {
          isSecret: true,
          pattern: "high-entropy string",
          confidence: 0.75,
        };
      }
    }
  }

  return { isSecret: false, confidence: 0 };
}

export function redactContent(content: string): string {
  const trimmed = content.trim();
  if (trimmed.length <= 8) return "***REDACTED***";
  const prefix = trimmed.slice(0, 4);
  const suffix = trimmed.slice(-4);
  return `${prefix}...${suffix} [REDACTED]`;
}
