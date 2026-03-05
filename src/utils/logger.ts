const isDebug = process.env.CLIPX_DEBUG === "1";

export function debug(...args: unknown[]): void {
  if (isDebug) {
    console.error("[clipx:debug]", ...args);
  }
}

export function warn(...args: unknown[]): void {
  console.error("[clipx:warn]", ...args);
}

export function error(...args: unknown[]): void {
  console.error("[clipx:error]", ...args);
}
