import { readClipboard, readClipboardRaw } from "../core/reader.js";
import { writeClipboard } from "../core/writer.js";
import { getConfig } from "./config.js";
import { complete, type ChatMessage } from "./provider.js";

export type TransformOp =
  | "fix"
  | "explain"
  | "translate"
  | "convert"
  | "summarize"
  | "review"
  | "name";

const SYSTEM_PROMPTS: Record<TransformOp, string> = {
  fix: `You are a code and text fixer. Fix any errors, typos, syntax issues, or bugs in the provided content. Return ONLY the corrected content with no explanation or markdown wrapping. If the content is code, preserve the original language and style.`,

  explain: `You are a technical explainer. Explain the provided content clearly and concisely. Cover what it does, how it works, and any notable details. Use plain language. Format your response in markdown.`,

  translate: `You are a translator. Translate the provided content to the target language specified by the user. Preserve formatting, code blocks, and technical terms. Return ONLY the translated content.`,

  convert: `You are a code converter. Convert the provided content to the target format specified by the user. Common conversions: SQL to TypeScript types, cURL to fetch, JSON to TypeScript interface, YAML to JSON, etc. Return ONLY the converted code with no explanation or markdown wrapping.`,

  summarize: `You are a summarizer. Provide a clear, concise summary of the provided content. For code, describe what it does. For text, extract key points. Keep summaries under 5 sentences unless the content is very long.`,

  review: `You are a code reviewer. Review the provided code for:
- Bugs and potential issues
- Performance concerns
- Security vulnerabilities
- Style and best practices
- Readability improvements
Be specific and constructive. Format your response in markdown with sections.`,

  name: `You are a naming assistant. Given the provided code or description, suggest clear, descriptive variable/function/class names. Return a short list of suggestions (3-5) with brief reasoning for each. Format as a simple list.`,
};

export interface TransformOptions {
  op: TransformOp;
  to?: string; // target language/format for translate/convert
  write?: boolean; // write result back to clipboard
}

export async function transform(opts: TransformOptions): Promise<string> {
  const config = await getConfig();

  if (!config.apiKey) {
    throw new Error(
      `No API key found for ${config.provider}. Set it via:\n` +
        `  export ${config.provider === "openrouter" ? "OPENROUTER_API_KEY" : config.provider === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY"}=...\n` +
        `  clipx ai config --key <key>\n` +
        `  clipx ai config --key <key> --keychain`
    );
  }

  const clipResult = await readClipboard();
  const rawContent = await readClipboardRaw();

  const typeInfo = clipResult.language
    ? `${clipResult.type}:${clipResult.language}`
    : clipResult.type;

  let systemPrompt = SYSTEM_PROMPTS[opts.op];

  if (opts.op === "translate" && opts.to) {
    systemPrompt += `\n\nTarget language: ${opts.to}`;
  }
  if (opts.op === "convert" && opts.to) {
    systemPrompt += `\n\nTarget format/language: ${opts.to}`;
  }

  const userMessage = `Content type detected: ${typeInfo}\n\n${rawContent}`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  const result = await complete(
    config.provider,
    config.apiKey,
    config.model,
    messages
  );

  if (opts.write) {
    await writeClipboard(result.content);
  }

  return result.content;
}
