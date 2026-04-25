import { Hono } from 'hono';
import type { PostContext, ReplyResponse } from '../types';

export const reply = new Hono();

reply.post('/', async (c) => {
  const ctx = await c.req.json<PostContext>();
  if (!ctx?.author) return c.json({ error: 'author required' }, 400);
  console.log(`[reply] ${ctx.handle ?? ''} ▸ ${(ctx.text ?? '').slice(0, 80)}…`);
  const body: ReplyResponse = { reply: `Good Job ${ctx.author}` };
  return c.json(body);
});
