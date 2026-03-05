export function formatOutput(data: unknown, json: boolean): string {
  if (json) {
    return JSON.stringify(data, null, 2);
  }

  // Human-readable formatting
  if (typeof data === "string") {
    return data;
  }

  if (typeof data === "object" && data !== null) {
    const obj = data as Record<string, unknown>;

    // Special formatting for type detection results
    if ("type" in obj && "confidence" in obj) {
      const type = obj.language
        ? `${obj.type}:${obj.language}`
        : (obj.type as string);
      const confidence = (obj.confidence as number).toFixed(2);
      let output = `${type} (confidence: ${confidence})`;

      if ("content" in obj) {
        output += `\n\n${obj.content}`;
      }

      if ("preview" in obj) {
        output += `\n\n${obj.preview}`;
      }

      if ("length" in obj) {
        output += `\n\nLength: ${obj.length} characters`;
      }

      return output;
    }

    return JSON.stringify(data, null, 2);
  }

  return String(data);
}
