import { build, context } from 'esbuild';
import { cp, mkdir } from 'node:fs/promises';

const watch = process.argv.includes('--watch');
const outdir = 'dist';

await mkdir(outdir, { recursive: true });
await cp('public', outdir, { recursive: true });

const opts = {
  entryPoints: ['src/content.ts', 'src/background.ts', 'src/popup.ts', 'src/grok.ts'],
  bundle: true,
  format: 'iife' as const,
  target: 'chrome120',
  outdir,
  sourcemap: true,
  logLevel: 'info' as const,
};

if (watch) {
  const ctx = await context(opts);
  await ctx.watch();
} else {
  await build(opts);
}
