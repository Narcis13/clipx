import { Hono } from 'hono';
import type { PostContext, ReplyResponse } from '../types';

export const reply = new Hono();

function buildPrompt(ctx: PostContext): string {
  const comments = (ctx.topComments ?? [])
    .map((c) => `- ${c.author}: ${c.text}`)
    .join('\n');
  return `You are a thoughtful X reply writer. Generate a single reply (max 280 chars) to this post.

Post by ${ctx.author} (${ctx.handle}):
"${ctx.text}"

Top comments so far:
${comments}

Engagement: ${ctx.metrics.likes} likes, ${ctx.metrics.replies} replies, ${ctx.metrics.views} views.

Write a reply that adds genuine value. No hashtags, no emoji spam, no sycophancy. Output ONLY the reply text.`;
}

reply.post('/', async (c) => {
  const ctx = await c.req.json<PostContext>();
  if (!ctx?.author) return c.json({ error: 'author required' }, 400);
  console.log(`[reply] ${ctx.handle ?? ''} ▸ ${(ctx.text ?? '').slice(0, 80)}…`);
  const body: ReplyResponse = { reply: `Good Job ${ctx.author}` };
  return c.json(body);
});

reply.post('/prompt', async (c) => {
  const ctx = await c.req.json<PostContext>();
  if (!ctx?.author) return c.json({ error: 'author required' }, 400);
  const prompt = buildPrompt(ctx);
  console.log(`[reply/prompt] ${ctx.handle ?? ''} ▸ ${prompt.length} chars`);
  return c.json({ prompt });
});
