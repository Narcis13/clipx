# Reply Master — Implementation Plan

> Chrome Extension (MV3) + Bun/Hono local API. Plan complet, modular, gata de rulat cu Claude Code. Două proiecte sub un singur monorepo, cu contract API clar între ele.

## Cuprins

1. [Arhitectură de ansamblu](#1-arhitectură-de-ansamblu)
2. [Contractul API (single source of truth)](#2-contractul-api-single-source-of-truth)
3. [Layout final cu fișiere](#3-layout-final-cu-fișiere)
4. [Root workspace](#4-root-workspace)
5. [Server — Bun + Hono](#5-server--bun--hono)
6. [Extension — manifest și build](#6-extension--manifest-și-build)
7. [Extragerea contextului din DOM (scrape.ts)](#7-extragerea-contextului-din-dom-scrapets)
8. [Detectarea paginii și triggering (content.ts)](#8-detectarea-paginii-și-triggering-contentts)
9. [Background service worker](#9-background-service-worker)
10. [Injectarea reply-ului în Draft.js](#10-injectarea-reply-ului-în-draftjs)
11. [Popup](#11-popup)
12. [Utilitare](#12-utilitare)
13. [Cum testezi local (checklist)](#13-cum-testezi-local-checklist)
14. [Prompturi atomice pentru Claude Code](#14-prompturi-atomice-pentru-claude-code)
15. [Roadmap v0.2 → LLM real](#15-roadmap-v02--llm-real)

---

## 1. Arhitectură de ansamblu

```
reply-master/
├── extension/                 # Chrome MV3 extension
│   ├── public/
│   │   ├── manifest.json
│   │   ├── popup.html
│   │   └── icons/
│   ├── src/
│   │   ├── content.ts         # rulează pe x.com/* — extrage context + injectează reply
│   │   ├── background.ts      # service worker — proxy către API local
│   │   ├── popup.ts           # buton "Generate Reply" + status
│   │   ├── scrape.ts          # extragerea PostContext din DOM
│   │   ├── inject.ts          # postare reply în Draft.js + dismiss modal
│   │   ├── types.ts           # copie 1:1 din server/src/types.ts
│   │   └── utils/
│   │       ├── waitFor.ts
│   │       └── locationchange.ts
│   ├── build.ts               # esbuild driver
│   └── tsconfig.json
└── server/                    # Bun + Hono local API
    ├── src/
    │   ├── index.ts           # bootstrap Hono pe :8787
    │   ├── routes/reply.ts    # POST /reply
    │   └── types.ts           # tipuri partajate (PostContext, ReplyResponse)
    ├── package.json
    └── tsconfig.json
```

### Flow end-to-end

1. Userul deschide `https://x.com/<handle>/status/<id>`.
2. Content script detectează URL-ul de tip status, așteaptă încărcarea articolului principal și extrage `PostContext` (autor, text, dată, metrici, primele 10 comentarii).
3. La click pe butonul injectat **🪄 Reply Master** (lângă butonul Reply), background script face `POST http://localhost:8787/reply` cu payload-ul.
4. Hono răspunde cu `{ reply: "Good Job <author>" }` (MVP).
5. Content script focalizează `[data-testid="tweetTextarea_0"]`, scrie textul prin `execCommand('insertText', ...)` (Draft.js de pe X cere event-uri sintetice), apoi face click pe `[data-testid="tweetButtonInline"]`.
6. Dacă apare modalul „Want more people to see your reply?", dă click pe `[data-testid="confirmationSheetCancel"]` („Maybe later").

---

## 2. Contractul API (single source of truth)

Pune-l în `server/src/types.ts` și copiază identic în `extension/src/types.ts`:

```ts
export interface PostComment {
  author: string;        // "Ben Windt"
  handle: string;        // "@ben_windt"
  text: string;
}

export interface PostContext {
  url: string;
  author: string;        // display name
  handle: string;        // "@TTrimoreau"
  text: string;
  postedAt: string;      // ISO 8601 din <time datetime="...">
  metrics: {
    views: number;
    replies: number;
    reposts: number;
    likes: number;
  };
  topComments: PostComment[]; // max 10
}

export interface ReplyResponse {
  reply: string;
}
```

> **Important:** când evoluezi la v0.2 (LLM real), singurul fișier care se schimbă este `server/src/routes/reply.ts`. Contractul rămâne neatins.

---

## 3. Layout final cu fișiere

```
reply-master/
├── package.json                # workspace root (Bun workspaces)
├── tsconfig.base.json
├── README.md
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts
│       ├── routes/reply.ts
│       └── types.ts
└── extension/
    ├── package.json
    ├── tsconfig.json
    ├── build.ts                # esbuild driver
    ├── public/
    │   ├── manifest.json
    │   ├── popup.html
    │   └── icons/{16,48,128}.png
    └── src/
        ├── types.ts            # copie 1:1 din server/src/types.ts
        ├── content.ts
        ├── background.ts
        ├── popup.ts
        ├── scrape.ts
        ├── inject.ts
        └── utils/
            ├── waitFor.ts
            └── locationchange.ts
```

---

## 4. Root workspace

**`package.json`**:

```json
{
  "name": "reply-master",
  "private": true,
  "workspaces": ["server", "extension"],
  "scripts": {
    "dev:server": "bun --cwd server run dev",
    "dev:ext": "bun --cwd extension run dev",
    "build:ext": "bun --cwd extension run build"
  }
}
```

**`tsconfig.base.json`**:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true
  }
}
```

---

## 5. Server — Bun + Hono

**`server/package.json`**:

```json
{
  "name": "reply-master-server",
  "type": "module",
  "scripts": { "dev": "bun --watch src/index.ts" },
  "dependencies": { "hono": "^4.6.0" }
}
```

**`server/src/types.ts`**:

```ts
export interface PostComment {
  author: string;
  handle: string;
  text: string;
}

export interface PostContext {
  url: string;
  author: string;
  handle: string;
  text: string;
  postedAt: string;
  metrics: {
    views: number;
    replies: number;
    reposts: number;
    likes: number;
  };
  topComments: PostComment[];
}

export interface ReplyResponse {
  reply: string;
}
```

**`server/src/routes/reply.ts`**:

```ts
import { Hono } from 'hono';
import type { PostContext, ReplyResponse } from '../types';

export const reply = new Hono();

reply.post('/', async (c) => {
  const ctx = await c.req.json<PostContext>();
  if (!ctx?.author) return c.json({ error: 'author required' }, 400);
  console.log(`[reply] ${ctx.handle} ▸ ${ctx.text.slice(0, 80)}…`);
  const body: ReplyResponse = { reply: `Good Job ${ctx.author}` };
  return c.json(body);
});
```

**`server/src/index.ts`**:

```ts
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
```

Rulare: `cd server && bun install && bun dev`.

---

## 6. Extension — manifest și build

**`extension/package.json`**:

```json
{
  "name": "reply-master-extension",
  "type": "module",
  "scripts": {
    "dev":   "bun run build.ts --watch",
    "build": "bun run build.ts"
  },
  "devDependencies": {
    "esbuild": "^0.23.0",
    "@types/chrome": "^0.0.270"
  }
}
```

**`extension/build.ts`**:

```ts
import { build, context } from 'esbuild';
import { cp, mkdir } from 'node:fs/promises';

const watch = process.argv.includes('--watch');
const outdir = 'dist';

await mkdir(outdir, { recursive: true });
await cp('public', outdir, { recursive: true });

const opts = {
  entryPoints: ['src/content.ts', 'src/background.ts', 'src/popup.ts'],
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
```

**`extension/public/manifest.json`**:

```json
{
  "manifest_version": 3,
  "name": "Reply Master",
  "version": "0.1.0",
  "description": "Auto-generate thoughtful replies on X via local AI",
  "permissions": ["activeTab", "storage", "scripting"],
  "host_permissions": [
    "https://x.com/*",
    "https://twitter.com/*",
    "http://localhost:8787/*"
  ],
  "background": { "service_worker": "background.js" },
  "content_scripts": [{
    "matches": ["https://x.com/*", "https://twitter.com/*"],
    "js": ["content.js"],
    "run_at": "document_idle"
  }],
  "action": {
    "default_popup": "popup.html",
    "default_title": "Reply Master"
  },
  "icons": {
    "16": "icons/16.png",
    "48": "icons/48.png",
    "128": "icons/128.png"
  }
}
```

**`extension/public/popup.html`**:

```html
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font: 13px system-ui; width: 260px; padding: 12px; }
    button { width: 100%; padding: 8px; border: 0; border-radius: 8px; background: #1d9bf0; color: #fff; cursor: pointer; }
    button:disabled { opacity: .5; }
    #status { margin-top: 8px; color: #536471; }
  </style>
</head>
<body>
  <h3 style="margin:0 0 8px">Reply Master</h3>
  <button id="go">Generate &amp; Post Reply</button>
  <div id="status"></div>
  <script src="popup.js"></script>
</body>
</html>
```

**`extension/tsconfig.json`**:

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["chrome"]
  },
  "include": ["src/**/*", "build.ts"]
}
```

---

## 7. Extragerea contextului din DOM (scrape.ts)

Selectorii sunt validați pe pagina X actuală. Articolul principal este primul `article[data-testid="tweet"]` din `<main>`; restul sunt comentarii.

**`extension/src/scrape.ts`**:

```ts
import type { PostContext, PostComment } from './types';

const txt = (el: Element | null) => el?.textContent?.trim() ?? '';

const handleFromHref = (a: HTMLAnchorElement | null) => {
  const seg = a?.getAttribute('href')?.split('/').filter(Boolean)[0];
  return seg ? `@${seg}` : '';
};

function parseMetrics(label: string) {
  const n = (re: RegExp) => {
    const m = label.match(re);
    return m ? Number(m[1].replace(/[,.\s]/g, '')) : 0;
  };
  return {
    replies: n(/([\d.,]+)\s+repl/i),
    reposts: n(/([\d.,]+)\s+repost/i),
    likes:   n(/([\d.,]+)\s+like/i),
    views:   n(/([\d.,]+)\s+view/i),
  };
}

function extractFromArticle(a: HTMLElement): PostComment {
  const userBlock = a.querySelector('[data-testid="User-Name"]');
  const author = txt(userBlock?.querySelector('span') ?? null);
  const handle = handleFromHref(
    userBlock?.querySelector<HTMLAnchorElement>('a[href^="/"]') ?? null
  );
  const text = txt(a.querySelector('[data-testid="tweetText"]'));
  return { author, handle, text };
}

export function scrapePostContext(): PostContext | null {
  const articles = Array.from(
    document.querySelectorAll<HTMLElement>('article[data-testid="tweet"]')
  );
  if (!articles.length) return null;

  const main = articles[0]; // primul = postul principal pe pagina /status/
  const { author, handle } = extractFromArticle(main);
  const text = txt(main.querySelector('[data-testid="tweetText"]'));
  const time = main.querySelector<HTMLTimeElement>('time');
  const group = main.querySelector('[role="group"]')?.getAttribute('aria-label') ?? '';

  const topComments = articles
    .slice(1, 11)
    .map(extractFromArticle)
    .filter(c => c.text || c.author);

  return {
    url: location.href,
    author,
    handle,
    text,
    postedAt: time?.dateTime ?? '',
    metrics: parseMetrics(group),
    topComments,
  };
}
```

> **Notă:** `topComments` se populează corect doar după ce X a randat suficient. Dacă ai mai puțin de 10 articole, fă un mic scroll programatic și reîncearcă o dată — sau lasă utilizatorul să deruleze înainte de click pe 🪄.

---

## 8. Detectarea paginii și triggering (content.ts)

**`extension/src/content.ts`**:

```ts
import { scrapePostContext } from './scrape';
import { postReply } from './inject';
import { installLocationChange } from './utils/locationchange';
import { waitFor } from './utils/waitFor';

const STATUS_RE = /^https:\/\/(x|twitter)\.com\/[^/]+\/status\/\d+/;
const BTN_ID = 'reply-master-btn';

installLocationChange();
window.addEventListener('locationchange', maybeInject);
maybeInject();

// Permite triggering și din popup
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'TRIGGER_FROM_POPUP') {
    onGenerate()
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }
});

async function maybeInject() {
  if (!STATUS_RE.test(location.href)) return;
  try {
    const replyBtn = await waitFor<HTMLElement>('[data-testid="tweetButtonInline"]', 8000);
    if (document.getElementById(BTN_ID)) return;

    const b = document.createElement('button');
    b.id = BTN_ID;
    b.type = 'button';
    b.textContent = '🪄';
    b.title = 'Reply Master';
    Object.assign(b.style, {
      marginRight: '6px',
      padding: '6px 10px',
      border: '0',
      borderRadius: '999px',
      background: '#7856ff',
      color: '#fff',
      cursor: 'pointer',
      fontSize: '14px',
    });
    b.addEventListener('click', onGenerate);
    replyBtn.parentElement?.insertBefore(b, replyBtn);
    console.log('[reply-master] button injected');
  } catch (e) {
    console.warn('[reply-master] inject failed', e);
  }
}

async function onGenerate() {
  const ctx = scrapePostContext();
  if (!ctx) {
    alert('Reply Master: nu am putut citi postul.');
    return;
  }
  console.log('[reply-master] payload', ctx);

  const res = await chrome.runtime.sendMessage({
    type: 'GENERATE_REPLY',
    payload: ctx,
  });
  console.log('[reply-master] response', res);

  if (!res?.ok) {
    alert('Reply Master: ' + (res?.error ?? 'API error'));
    return;
  }
  await postReply(res.data.reply);
}
```

---

## 9. Background service worker

**`extension/src/background.ts`**:

```ts
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== 'GENERATE_REPLY') return;

  (async () => {
    try {
      console.log('[reply-master:bg] POST /reply', msg.payload?.handle);
      const r = await fetch('http://localhost:8787/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg.payload),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      console.log('[reply-master:bg] response', data);
      sendResponse({ ok: true, data });
    } catch (e: any) {
      console.error('[reply-master:bg] error', e);
      sendResponse({ ok: false, error: e?.message ?? String(e) });
    }
  })();

  return true; // keep channel open pentru async
});
```

---

## 10. Injectarea reply-ului în Draft.js

X folosește **Draft.js** — `textarea.value = "..."` nu funcționează. Trebuie `focus()` + `document.execCommand('insertText', ...)` care emite `beforeinput` corect.

**`extension/src/inject.ts`**:

```ts
import { waitFor } from './utils/waitFor';

export async function postReply(text: string) {
  const editor = await waitFor<HTMLElement>('[data-testid="tweetTextarea_0"]', 4000);
  editor.focus();

  // Draft.js ascultă beforeinput / insertText
  document.execCommand('insertText', false, text);

  // așteaptă ca butonul Reply să devină enabled
  const btn = await waitFor<HTMLButtonElement>(
    '[data-testid="tweetButtonInline"]:not([aria-disabled="true"])',
    4000
  );
  btn.click();

  // Dacă apare modal Premium → "Maybe later"
  try {
    const cancel = await waitFor<HTMLElement>(
      '[data-testid="confirmationSheetCancel"]',
      2500
    );
    cancel.click();
  } catch {
    /* modalul n-a apărut, e ok */
  }
}
```

---

## 11. Popup

**`extension/src/popup.ts`**:

```ts
const $ = <T extends HTMLElement>(s: string) => document.querySelector<T>(s)!;

$('#go').addEventListener('click', async () => {
  const status = $('#status');
  status.textContent = 'Working…';

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    status.textContent = 'No active tab';
    return;
  }

  const r = await chrome.tabs
    .sendMessage(tab.id, { type: 'TRIGGER_FROM_POPUP' })
    .catch(() => null);

  status.textContent = r?.ok ? 'Done ✓' : 'Use the 🪄 button on the post.';
});
```

---

## 12. Utilitare

**`extension/src/utils/waitFor.ts`**:

```ts
export function waitFor<T extends Element>(
  selector: string,
  timeout = 5000,
  root: ParentNode = document
): Promise<T> {
  return new Promise((resolve, reject) => {
    const found = root.querySelector<T>(selector);
    if (found) return resolve(found);

    const obs = new MutationObserver(() => {
      const el = root.querySelector<T>(selector);
      if (el) {
        obs.disconnect();
        resolve(el);
      }
    });

    obs.observe(root instanceof Document ? document.body : (root as Node), {
      childList: true,
      subtree: true,
    });

    setTimeout(() => {
      obs.disconnect();
      reject(new Error(`waitFor timeout: ${selector}`));
    }, timeout);
  });
}
```

**`extension/src/utils/locationchange.ts`**:

```ts
// X este un SPA — nu reîncarcă pagina la navigare.
// Patch-uim pushState/replaceState ca să emită un event 'locationchange'.
export function installLocationChange() {
  const fire = () => window.dispatchEvent(new Event('locationchange'));
  for (const k of ['pushState', 'replaceState'] as const) {
    const orig = history[k];
    history[k] = function (...args: any[]) {
      const r = orig.apply(this, args as any);
      fire();
      return r;
    };
  }
  window.addEventListener('popstate', fire);
}
```

---

## 13. Cum testezi local (checklist)

1. `bun install` în root.
2. **Terminal A:** `bun run dev:server` → vezi `Listening on http://localhost:8787`.
3. **Smoke test API:**
   ```bash
   curl -X POST localhost:8787/reply \
     -H 'content-type: application/json' \
     -d '{"author":"Dan Shipper"}'
   # → {"reply":"Good Job Dan Shipper"}
   ```
4. **Terminal B:** `bun run dev:ext` → generează `extension/dist/`.
5. Chrome → `chrome://extensions` → **Developer mode** ON → **Load unpacked** → selectează `extension/dist`.
6. Deschide un URL `https://x.com/<oricine>/status/<id>` → vezi butonul **🪄** lângă Reply.
7. Click pe **🪄** → reply-ul „Good Job …" apare în editor și e postat. Dacă apare modalul Premium, e dismisat automat.
8. **Debug:**
   - DevTools pe pagina X → tab Console pentru `content.js` (logs/erori scrape).
   - `chrome://extensions` → linkul „service worker" pentru `background.js`.

### Troubleshooting

| Simptom | Cauză probabilă | Fix |
|---|---|---|
| Butonul 🪄 nu apare | `content.js` nu s-a injectat sau selectorul `tweetButtonInline` e schimbat | Verifică Console pentru `[reply-master]`; reîncarcă extensia |
| `HTTP error` în background | Serverul nu rulează sau portul e ocupat | Verifică terminal A; `lsof -i :8787` |
| Reply-ul nu se inserează | Selectorul Draft.js s-a schimbat sau editor-ul nu e focusat | Verifică `[data-testid="tweetTextarea_0"]` în DOM |
| CORS error | Origin-ul nu e permis în `cors()` | Lasă `origin: (o) => o ?? '*'` pentru dev |
| Modalul Premium nu se închide | `confirmationSheetCancel` poate fi denumit altfel | Mărește timeout-ul în `inject.ts` sau adaugă fallback |

---

## 14. Prompturi atomice pentru Claude Code

Rulează-le în ordine. Fiecare are criteriul de acceptare după.

### Prompt 1 — Monorepo skeleton

> „Creează monorepo `reply-master` cu Bun workspaces (`server`, `extension`), `tsconfig.base.json` și scripturile root din planul atașat (`dev:server`, `dev:ext`, `build:ext`)."
>
> **Acceptare:** `bun install` rulează fără erori.

### Prompt 2 — Server Hono

> „Creează `server/` cu Hono pe portul 8787, endpoint `POST /reply` care întoarce `{ reply: 'Good Job <author>' }` din JSON-ul primit. Adaugă `GET /health` și CORS permisiv. Folosește `server/src/types.ts` ca single source of truth pentru `PostContext` și `ReplyResponse`."
>
> **Acceptare:** `curl -X POST localhost:8787/reply -d '{"author":"X"}' -H 'content-type: application/json'` întoarce `{"reply":"Good Job X"}`.

### Prompt 3 — Extension scaffold + build

> „Creează `extension/` MV3 cu esbuild driver în `build.ts`, manifest, popup și iconițe placeholder (poți genera PNG-uri 16/48/128 monocolore)."
>
> **Acceptare:** `bun run build:ext` produce `extension/dist/` cu `manifest.json`, `content.js`, `background.js`, `popup.html`, `popup.js`.

### Prompt 4 — Tipuri și utilitare

> „Implementează `src/types.ts` (identic cu `server/src/types.ts`), `src/utils/waitFor.ts`, `src/utils/locationchange.ts` conform planului."
>
> **Acceptare:** `tsc --noEmit` verde.

### Prompt 5 — Scrape

> „Implementează `src/scrape.ts` cu `scrapePostContext()` conform planului."
>
> **Acceptare:** rulând `scrapePostContext()` în consolă pe o pagină `/status/`, întoarce un obiect `PostContext` cu `author`, `text`, `metrics` populate și `topComments.length >= 1`.

### Prompt 6 — Inject

> „Implementează `src/inject.ts` cu `postReply(text)` folosind `execCommand('insertText')` și dismiss pentru `confirmationSheetCancel`."
>
> **Acceptare:** apelat din consolă cu un text scurt, postează reply-ul și dismisează modalul Premium dacă apare.

### Prompt 7 — Content + background end-to-end

> „Implementează `src/content.ts` cu detectare SPA, injectare buton 🪄 și flow-ul scrape → sendMessage → postReply. Implementează `src/background.ts` cu fetch către `localhost:8787`."
>
> **Acceptare:** pe o pagină `/status/`, click pe 🪄 postează „Good Job <author>".

### Prompt 8 — Logging

> „Adaugă logging în `background.ts` și `content.ts` (prefix `[reply-master]`) pentru: URL detectat, payload trimis, răspuns primit, erori."
>
> **Acceptare:** în DevTools văd ciclul complet la fiecare click.

### Prompt 9 — README

> „Adaugă în `README.md` pașii din secțiunea «Cum testezi local» și tabelul de troubleshooting."
>
> **Acceptare:** README-ul rulat de la zero conduce la un MVP funcțional.

### Prompt 10 — Smoke test final

> „Smoke test final: deschide `https://x.com/<handle>/status/<id>`, apasă 🪄, verifică că reply-ul apare publicat."
>
> **Acceptare:** screenshot cu reply-ul în thread.

---

## 15. Roadmap v0.2 → LLM real

Când treci la v0.2, **un singur fișier** se schimbă: `server/src/routes/reply.ts`. Restul rămâne neatins datorită contractului `PostContext` / `ReplyResponse`.

Schiță pentru `reply.ts` cu Claude API:

```ts
import { Hono } from 'hono';
import Anthropic from '@anthropic-ai/sdk';
import type { PostContext, ReplyResponse } from '../types';

const client = new Anthropic(); // citește ANTHROPIC_API_KEY din env

export const reply = new Hono();

reply.post('/', async (c) => {
  const ctx = await c.req.json<PostContext>();

  const prompt = `You are a thoughtful X reply writer. Generate a single reply (max 280 chars) to this post.

Post by ${ctx.author} (${ctx.handle}):
"${ctx.text}"

Top comments so far:
${ctx.topComments.map(c => `- ${c.author}: ${c.text}`).join('\n')}

Engagement: ${ctx.metrics.likes} likes, ${ctx.metrics.replies} replies, ${ctx.metrics.views} views.

Write a reply that adds genuine value. No hashtags, no emoji spam, no sycophancy. Output ONLY the reply text.`;

  const msg = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = msg.content
    .filter(b => b.type === 'text')
    .map(b => (b as any).text)
    .join('')
    .trim();

  const body: ReplyResponse = { reply: text };
  return c.json(body);
});
```

### Idei pentru iterații viitoare

- **Variante multiple** — `ReplyResponse` devine `{ replies: string[] }`, extension afișează un picker.
- **Tone control** — popup cu toggle (`agree`, `pushback`, `joke`, `add-data`); trimis la server în payload.
- **Persona personalizată** — `reply.ts` citește un `~/.reply-master/persona.md` și îl prepended la prompt.
- **History local** — Bun + SQLite pentru a păstra ultimele N reply-uri și a evita repetiția.
- **Streaming** — schimbi `fetch` în background cu `EventSource`/SSE și afișezi textul pe măsură ce vine.
