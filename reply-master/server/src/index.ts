import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { reply } from './routes/reply';

const app = new Hono();
app.use('*', logger());
app.use('*', cors({ origin: (o) => o ?? '*', allowHeaders: ['Content-Type'] }));
app.get('/health', (c) => c.json({ ok: true }));
app.route('/reply', reply);

export default { port: 8787, fetch: app.fetch };
