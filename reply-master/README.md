# Reply Master

Chrome MV3 extension + Bun/Hono local API care injectează un buton 🪄 pe `https://x.com/<handle>/status/<id>`, extrage contextul postului și postează un reply generat (MVP: `Good Job <author>`).

Monorepo Bun cu două workspaces:

```
reply-master/
├── server/     # Hono pe :8787, contract API single source of truth
└── extension/  # MV3 + esbuild, bundle în extension/dist/
```

## Prerechizite

- [Bun](https://bun.com) ≥ 1.3
- Google Chrome (sau Chromium / Edge)

## Cum testezi local

1. **Install** — în rădăcina `reply-master/`:
   ```bash
   bun install
   ```

2. **Terminal A — pornește serverul:**
   ```bash
   bun run dev:server
   # → Hono pe http://localhost:8787
   ```

3. **Smoke test API:**
   ```bash
   curl -X POST localhost:8787/reply \
     -H 'content-type: application/json' \
     -d '{"author":"Dan Shipper"}'
   # → {"reply":"Good Job Dan Shipper"}

   curl localhost:8787/health
   # → {"ok":true}
   ```

4. **Terminal B — buildează extensia:**
   ```bash
   bun run dev:ext      # watch mode
   # sau
   bun run build:ext    # build single-shot
   ```
   Output: `extension/dist/` cu `manifest.json`, `content.js`, `background.js`, `popup.html`, `popup.js`, `icons/`.

5. **Încarcă extensia în Chrome:**
   - `chrome://extensions`
   - Toggle **Developer mode** (dreapta sus)
   - **Load unpacked** → selectează folderul `extension/dist`

6. **Folosește pe X:**
   - Deschide un URL `https://x.com/<oricine>/status/<id>`
   - Vezi butonul 🪄 (mov) lângă butonul Reply
   - Click 🪄 → reply-ul „Good Job …" apare în editor și e postat
   - Dacă apare modalul „Want more people to see your reply?" e dismisat automat („Maybe later")

## Debug

- **Pagina X** → DevTools → Console: log-uri prefixate `[reply-master]` (URL detectat, payload, răspuns, erori).
- **Service worker** → `chrome://extensions` → linkul „service worker" pe Reply Master: log-uri prefixate `[reply-master:bg]`.
- **Server** → Terminal A: log-uri Hono per request.

## Troubleshooting

| Simptom | Cauză probabilă | Fix |
|---|---|---|
| Butonul 🪄 nu apare | `content.js` nu s-a injectat sau selectorul `tweetButtonInline` s-a schimbat | Verifică Console pentru `[reply-master]`; reîncarcă extensia din `chrome://extensions` |
| `HTTP error` în background | Serverul nu rulează sau portul e ocupat | Verifică Terminal A; `lsof -i :8787` |
| Reply-ul nu se inserează | Selectorul Draft.js s-a schimbat sau editor-ul nu e focusat | Verifică `[data-testid="tweetTextarea_0"]` în DOM |
| CORS error | Origin-ul nu e permis în `cors()` | Lasă `origin: (o) => o ?? '*'` pentru dev |
| Modalul Premium nu se închide | `confirmationSheetCancel` poate fi denumit altfel | Mărește timeout-ul în `inject.ts` sau adaugă fallback |

## Arhitectură

- **Contract API** (`server/src/types.ts` ≡ `extension/src/types.ts`):
  - `PostContext` — autor, handle, text, `postedAt`, metrici, `topComments[]`
  - `ReplyResponse` — `{ reply: string }`
- **Server** — `POST /reply` întoarce `{ reply: 'Good Job <author>' }` (MVP). `GET /health`. CORS permisiv.
- **Extension**:
  - `content.ts` — detectează `/status/`, injectează 🪄, scrape → background → injectare reply
  - `background.ts` — proxy către `localhost:8787/reply`
  - `scrape.ts` — `scrapePostContext()` din DOM-ul X
  - `inject.ts` — `postReply(text)` cu `execCommand('insertText')` (Draft.js)
  - `popup.ts` — buton de fallback când 🪄 nu e disponibil

## Roadmap v0.2

Schimbi un singur fișier — `server/src/routes/reply.ts` — ca să cheme un LLM real (Anthropic, etc.). Contractul `PostContext` / `ReplyResponse` rămâne neatins.
