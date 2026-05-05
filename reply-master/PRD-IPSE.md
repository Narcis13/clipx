# PRD — IPSE
### *(working name: Ipse / Stratum / Atlas — alege)*

> **AI co-thinker pentru creștere organică pe X. Nu un scheduler. Nu un ghostwriter. Un substrat epistemic personal care se compune în timp.**

---

## 0. TL;DR strategic

Toate uneltele actuale de "X growth" — Hypefury, SuperX, Tweet Hunter / Taplio, Typefully, Metricool, BrandLed — operează pe același strat orizontal: **schedule + analytics + AI rewriter peste swipe-files**. Diferențiază prin UI și onboarding. Comoditizează vocea exact când publicul e saturat de conținut AI generic.

**Ipse inversează ecuația.** În centrul aplicației nu stă feed-ul. Stă un **graf de identitate** — second-brain à la Karpathy, dar optimizat pentru *public thinking*: pillars, stances, frameworks, anti-pillars, mental models, anecdote, contradicții recunoscute, evoluții declarate. Agentul AI nu generează conținut — *gândește în vocabularul tău*. Fiecare post devine o nouă observație despre ce funcționează, hrănind înapoi graful. Ce iese e fundamental ne-clonabil pentru că e construit *pe tine*.

**Moat-ul nu e softul. E graful pe care utilizatorul îl construiește în soft.** Switching cost = pierderea propriei identități epistemice. La 6 luni de utilizare, costul de plecare e mai mare decât abonamentul anual.

---

## 1. Problema (de ce existăm)

### 1.1 Problema de suprafață
Solopreneurii / creatorii / fondatorii vor să crească organic pe X dar:
- Postează inconsistent
- Nu știu ce funcționează și ce nu
- Pierd ore încercând să "sune bine"
- Se uită la competiție și ajung să sune ca toți ceilalți
- Mâncă timp pe formatare, scheduling, analytics

### 1.2 Problema reală (ce ratează ceilalți)
Generația actuală de tooling AI a creat o **criză de autenticitate**. Algorithmul X (și publicul) începe să penalizeze conținutul care miroase a AI generic. Dar uneltele actuale *împing* exact în direcția generică:
- "Aici sunt 100 de hooks care convertesc" → toți folosesc aceleași 100
- "AI rewrite în vocea ta" → AI nu *are* vocea ta, are media celor 50M de tweets pe care e antrenat
- "Swipe files" → reciclezi gândurile altora cu altă punctuație

Rezultatul: feed-uri identice. Engagement în scădere. Un sentiment crescând că "X e mort" când de fapt e doar saturat de slop.

### 1.3 Insight-ul fondator
**Singura componentă care nu poate fi automatizată e *cine ești și ce crezi*.** Tot restul (formatare, timing, hook engineering, threading) sunt probleme rezolvate. Software-ul corect nu încearcă să rezolve "ce să postezi" cu un LLM — încearcă să **extragă, organizeze, și rafineze ce gândești deja**, apoi să asiste agentul în articularea acelui material în formate care performează pe X.

---

## 2. Cine este utilizatorul

### 2.1 ICP primar
- **Solopreneur tehnic / fondator indie** ($1K-$50K MRR, build-in-public)
- 500 - 15.000 urmăritori
- Postează deja activ dar inconsistent
- Are opinii puternice dar nu le articulează sistematic
- Are blog, newsletter, podcast, sau cod public — **există material de extras**
- Plătește pentru tooling când vede ROI clar (target: $50-150/lună)

### 2.2 ICP secundar
- **Operator / Executive thought leader** (PMM, VPE, founder-CEO mode)
- **Creator nișat** (educator tehnic, analist, eseist)

### 2.3 Anti-ICP (cui spunem NU)
- Agenții care vor să gestioneze 50 de conturi de clienți (e Hypefury / Buffer)
- Marketeri B2C tradiționali (e Metricool / Sprout)
- Conturi cumpărate / engagement farms (incompatibil cu teza)

---

## 3. Peisaj competitiv & poziționare

| Tool | Centrul produsului | Voice handling | Moat |
|------|-------------------|----------------|------|
| Hypefury | Scheduler + auto-DM | Inexistent | Distribuție |
| Tweet Hunter / Taplio | Swipe library + AI rewrite | Stilistic, superficial | Date scrape |
| Typefully | Editor + collaboration | Inexistent | UX |
| Metricool | Analytics multi-platform | Inexistent | Breadth |
| BrandLed | Engagement / replies | Branding handle | Workflow |
| SuperX | AI generation + scheduling | Tone presets | Speed |
| **Ipse** | **Identity graph + agent** | **Substrat epistemic personal evolutiv** | **Graful utilizatorului** |

**Mesajul de poziționare (un rând):**
> *Ipse nu îți scrie tweet-urile. Îți construiește mintea publică, apoi te ajută s-o exprimi.*

**Anti-mesaj:**
> Nu suntem "ChatGPT pentru Twitter". Dacă voiai asta, ai deja ChatGPT.

---

## 4. Arhitectura produsului — Identity Graph

### 4.1 Conceptul
Graful de identitate este o **structură persistentă, versionată, query-abilă** care reprezintă cine ești public. Nu e un "brand voice prompt" de 200 de cuvinte. Nu e o colecție de exemple. E un graf bidirecțional cu noduri tipate și muchii cu semantică.

### 4.2 Taxonomia nodurilor

| Tip nod | Definiție | Exemple |
|---------|-----------|---------|
| **Pillar** | Tema majoră în care construiești autoritate | "AI-native architecture", "Romanian solo SaaS", "Living Code Paradigm" |
| **Stance** | Poziție declarată pe o temă controversată | "Microservicii sunt cargo cult pentru solopreneuri" |
| **Framework** | Model mental / lens prin care interpretezi lumea | "Living Code Paradigm", "BHVR stack", "Ralph Loop" |
| **Belief** | Convingere mai softă, evoluabilă | "Romanian market e underserved în accounting AI" |
| **Anti-pillar** | Ce *nu* ești, ce *nu* discuți, capcane de evitat | "Nu fac content despre crypto trading" |
| **Anecdote** | Poveste personală reutilizabilă | "Cum am pierdut 3 luni rescriind in Go" |
| **Frame** | Tip de open / hook / structură care îți merge | "Confession opener", "Counterintuitive claim + dovadă" |
| **Tension** | Contradicție intelectuală pe care o explorezi | "Vreau organic dar postez pentru algoritm" |
| **Evolution** | Schimbare de opinie declarată public | "Acum 2 ani credeam X. Acum cred Y. Iată de ce" |
| **Reference** | Persoană / lucrare / concept extern pe care îl invoci frecvent | "Karpathy", "Naval", "Living Software" de Beck |
| **Vocabulary** | Termeni proprii / jargon distinctiv | "BHVR", "Ralph Loop", "MirrorClaude" |

### 4.3 Taxonomia muchiilor (semantica grafului)

```
SUPPORTS, CONTRADICTS, EVOLVED_FROM, EXEMPLIFIES,
DERIVES_FROM, ANTAGONIZES, COEXISTS_WITH, REPLACES,
ELABORATES, NARROWS, GENERALIZES
```

Exemplu real:
```
[Pillar: AI-native architecture]
  --SUPPORTS--> [Stance: "Database e contextul, nu storage-ul"]
    --EXEMPLIFIES--> [Anecdote: "Cum am rescris Contzo cu 60 de modele"]
      --DERIVES_FROM--> [Framework: Living Code Paradigm]
        --REFERENCES--> [Reference: Karpathy "Software 3.0"]
```

### 4.4 Voice Fingerprint (subsistem)
Separat de graf, dar integrat: o reprezentare statistică a *cum* scrii.
- **Distribuție de lungime**: tweet mediu, deviație
- **Sintactic tics**: "Adevărul e că...", "Ok deci.", em-dash usage
- **Opening / closing patterns**: cum deschizi, cum închizi
- **Punctuație ritm**: rate de listă, fragment, întrebări
- **Vocabular distinctive**: cuvinte/expresii pe care le folosești de 3x peste mediu
- **Code-switching**: când treci RO ↔ EN, în ce contexte

Voice fingerprint se extrage automat din istoricul X + orice import (blog, MD-uri, transcripts) și se actualizează la fiecare 50 de posturi noi.

### 4.5 Cum se populează graful
**Trei rute, în ordinea importanței:**

1. **Ingest istoric** (one-time, la onboarding)
   - X API: pull all-time tweets + reply-uri
   - Import opțional: Substack / blog markdown / Google Docs / Notion / podcast transcripts
   - Pipeline LLM: extrage candidați de noduri → utilizatorul confirmă/respinge/edit
   - Output: graf seed cu 50-200 noduri în ~30 min de muncă a utilizatorului

2. **Conversație continuă cu agentul** (ongoing)
   - Modul "Ipse Chat": discuții libere cu agentul în care expui idei noi
   - Agentul propune: "Pare un pillar nou. Adăugăm?" / "Asta contrazice stance-ul X. Evoluție?"

3. **Feedback post-publicare** (closed loop)
   - Tweet performant → noduri implicate sunt rated up
   - Tweet slab → ratings down + analiză: era un nod periferic? a contrazis voice fingerprint?

---

## 5. Module funcționale

### 5.1 INGEST — Substrat
- X API v2 ingestion (tweets, replies, QTs, metrics istorice)
- Importers: Markdown, RTF, plain text, Substack export, Notion export, podcast (Whisper transcribe)
- Pipeline de extracție concepte (LLM + human approval queue)

### 5.2 GRAPH STUDIO — UI pentru graful tău
- Canvas vizual interactiv (nu sa fie demo, sa fie editabil zilnic)
- Vedere "centred on node" + vedere "neighborhoods"
- Search semantic (pgvector) peste noduri
- "Dormant pillars" highlight: ce n-ai mai discutat de >30 zile
- "Tension surfaces": contradicții latente neexplorate

### 5.3 AUTHORING AGENT — Co-thinker
**Patru moduri:**

- **Drafting**: pornind de la o idee + context (graf), produce draft inițial
- **Refining**: ia un draft existent (al tău) și îl rafinează *menținând* voice fingerprint
- **Sparring**: devil's advocate — "Iată 3 obiecții la take-ul tău"
- **Synthesizing**: dacă agentul detectează că ai 5 fragmente pe o temă, propune un long-form / thread

**Reguli ne-negociabile:**
- Niciodată generație "din neant" fără să citeze nodurile din graf invocate
- Detectare contradicție: "Asta contrazice stance-ul tău #X. E o evoluție declarată sau un slip?"
- Detectare voice drift: dacă draft-ul deviază >X% de la fingerprint, flag

### 5.4 STRATEGIC BRAIN — Insider playbook X
**Aceasta e partea "Grok-as-insider".** Cunoștințe codificate despre cum funcționează platforma, dar **expuse ca recomandări contextuale, nu reguli rigide**, pentru că algoritmul se schimbă.

Componente:
- **Posting cadence advisor**: bazat pe activitatea audienței *tale* (nu medii globale)
- **First-30-min protocol**: alerte pentru a răspunde rapid la primele engagements (booster algoritmic)
- **Reply targeting**: liste curate de conturi din nișa ta unde reply-urile au ROI mare (proximitate semantică în niche graph)
- **Format selector**: per draft, recomandare single / thread / long-form / image / video, pe baza performance istorice + structură content
- **Hook diagnostician**: ratează scoring vs hook patterns care au mers la *tine* (nu la "creators in general")
- **Algoritmic posture**: avertizări soft când conținutul tău intră în patternuri suspendate (link-out heavy, exces hashtag, etc)

**Important**: toate acestea sunt **derivate empiric din feedback loop**, nu hardcodate. Sistemul învață *ce funcționează la tine*, nu impune un playbook universal.

### 5.5 FEEDBACK LOOP — Bucla evolutivă
**Pentru fiecare post publicat, în 7 zile:**
- Pull metrici: impressions, engagements, replies, bookmarks, profile-clicks, follows-attributed (estimat)
- Atribuire la noduri din graf invocate la draft
- Update rating noduri (Bayesian, nu naiv)
- Update Voice fingerprint dacă există deltas semnificative
- Insights generate: "Posturile care invocă pillar-ul X + frame-ul Y au 3x bookmark rate"

**Rapoarte săptămânale:**
- Ce a mers, ce nu
- Ce noduri au crescut în autoritate
- Ce experimente sugerează agentul săptămâna viitoare

### 5.6 ANALYTICS — Dar diferit
Nu reinventăm un alt dashboard. Analytics aici servesc **graful**, nu vanity metrics:
- "Tema X performează 4x mai bine decât tema Y — re-balansăm posting mix?"
- "Audiența care te urmărește acum e 60% dev, 40% economist — voce te muți spre care?"
- "Bookmark/like ratio crescut = signal că faci content de referință, nu doar reactiv"

---

## 6. Insider playbook X (cunoștințele de domeniu codificate)

Cunoștințe pe care le folosim ca **prior** pentru recomandări (sistemul învață din date personale ce supraviețuiește):

- **Replies > likes > impressions** ca semnal algoritmic de calitate. Bookmark-urile sunt acum signal puternic (s-au făcut publice tocmai pentru asta).
- **Primele 30-60 minute** după publish dictează majoritatea distribuției. A răspunde rapid la primele replies amplifică.
- **Long-form posts (Premium)** au boost de distribuție, dar penalizează dacă nu țin atenția. Threshold-ul de "scroll completion" e variabilă vizibilă în Analytics.
- **Quote posts > Retweets** pentru distribuție proprie. QT adaugă la naratiunea ta, RT diluează.
- **Reply-strategy**: a comenta primul/între primii la conturi mari din nișă (200K-1M) e cea mai sub-prețuită rută de creștere. Sistemul nostru o codifică.
- **Link suppression**: link extern în primul tweet → distribuție tăiată. Soluție: link în reply / bio-redirect.
- **Native video > image > text+image** la viewers per impression (în 2025-2026). Variază pe nișă, deci system-ul testează la tine.
- **Niche graph clustering**: X te plasează într-un cluster semantic. Postări care *consolidează* cluster-ul cresc reach-ul intra-cluster. Postări *off-pillar* îți dilueaza poziția.
- **Community Notes**: orice post cu Note attached pierde majoritate distribuție. Pre-flight check pentru afirmații verificabile.
- **Algoritmic memory**: conturile cu istoric de **deletări frecvente** sau swing wild între topice sunt depriorizate.

Sistemul prezintă acestea **ca ipoteze testabile**, nu legi, și le adaptează la datele tale.

---

## 7. Stack tehnic

### 7.1 Backend (BHVR aliniat)
- **Bun** runtime + **Hono** framework
- **Drizzle ORM** + **PostgreSQL** (with **pgvector** pentru semantic search pe graf)
- **TypeScript** end-to-end
- Graf stocat relațional: tabel `nodes` (typed) + `edges` (typed, weighted, versioned)

### 7.2 Frontend
- **Vite + React + TypeScript**
- Tailwind + shadcn/ui
- React Flow pentru Graph Studio (canvas interactiv)
- TanStack Query pentru sync

### 7.3 AI / Agent layer
- **Claude Agent SDK** (preferred, given prior architecture work)
- Multi-model strategy: Claude pentru reasoning/voice, OpenAI pentru embeddings rapide, Whisper pentru transcripts
- Agent loop separat per user (sandbox) cu state persistent în Postgres
- Tool ecosystem: `query_graph`, `propose_node`, `voice_check`, `metrics_lookup`, `xapi_compose`, `sparring_critique`

### 7.4 X integration
- **X API v2 — Pay-per-use** (model lansat feb 2026, update major aprilie 2026)
- **Owned Reads la $0.001/resursă** — exact ce ne trebuie (tweet-urile, metrici, followers utilizator)
- Read posts externe (pentru reply targeting): $0.005
- Create post: $0.010
- Cap pay-per-use: 2M post reads/lună (Enterprise abia la scara de mii de useri)
- **Bonus structural**: până la 20% cashback în credite xAI (Grok) — folosibil pentru reasoning tasks ieftin
- Polling pentru metrici (suficient la pay-per-use; webhooks rămân pentru tier premium)

### 7.5 Infrastructure
- Hosted: Hetzner / Fly.io (cost-conscious EU deploy)
- Background jobs: BullMQ (Redis)
- Observability: Axiom / Better Stack
- Encryption at rest pentru graf (e IP personal — important)

---

## 8. Schema de date (high-level)

```sql
-- Identity graph core
nodes (id, user_id, type, label, content_md, embedding, weight, status, created_at, updated_at, version)
edges (id, user_id, source_id, target_id, relation_type, weight, declared, created_at)
node_revisions (id, node_id, content_md, changed_by, changed_at)

-- Voice fingerprint
voice_profiles (user_id, fingerprint_jsonb, sample_size, updated_at)

-- X content
tweets (id, user_id, x_id, type, body, thread_parent, posted_at, metrics_jsonb, last_synced_at)
drafts (id, user_id, body, mode, invoked_node_ids[], voice_score, status, created_at)
draft_revisions (id, draft_id, body, agent_feedback, created_at)

-- Feedback loop
post_attributions (id, tweet_id, node_id, weight)
node_performance (node_id, period, impressions, engagements, bookmarks, follows_est, score)

-- Strategic brain
audience_clusters (user_id, cluster_jsonb, computed_at)
posting_windows (user_id, hour_utc, score)
reply_targets (user_id, target_handle, niche_score, last_engaged_at)

-- Agent memory
agent_sessions (user_id, started_at, mode, transcript_jsonb)
```

---

## 9. Arhitectura agentică

### 9.1 Loop-ul principal
```
Observation: ce s-a schimbat (post nou, metrics noi, idee nouă)
  →
Reflection: ce înseamnă pentru graf
  →
Proposal: ce update-uri sugerăm utilizatorului
  →
Action: cu approval, execute (publish, update graf, etc)
  →
Memory: salvează decizia + outcome pentru învățare viitoare
```

### 9.2 Subagenti (specializați)
- **Extractor Agent**: extracție concepte din texte
- **Authoring Agent**: drafting / refining
- **Sparring Agent**: critică adversarială
- **Strategist Agent**: insider playbook + posting decisions
- **Curator Agent**: graph hygiene (dedup, merge, prune)
- **Reflector Agent**: weekly review, surfacing patterns

Toți operează sub un **Orchestrator** care păstrează identitatea utilizatorului ca context primar.

### 9.3 Human-in-the-loop principles
- **Niciodată auto-publish fără confirmare** (poate exista, dar opt-in explicit cu dublu-confirm)
- **Toate node updates sunt propuneri** până la confirmare
- **Voice drift > threshold** = blocking warning
- **Sparring mode** este invocabil oricând, dar agentul nu e adversarial uninvited

---

## 10. Pricing & business model

### 10.1 Realitate cost (post update X API aprilie 2026)

X API e acum **pay-per-use**, iar majoritatea operațiunilor noastre sunt "Owned Reads" la **$0.001/resursă**. Asta schimbă fundamental economia produsului.

**Per utilizator activ Ipse — cost marginal lunar:**

| Operație | Volum estimat | Cost unitar | Total |
|----------|--------------|-------------|-------|
| Ingest istoric (one-time, 5K tweets) | 5.000 reads | $0.001 | $5 (one-time) |
| Sync metrici proprii | ~900/lună | $0.001 | $0.90 |
| Reply targeting (conturi externe) | ~100/lună | $0.005 | $0.50 |
| Posting | ~30/lună | $0.010 | $0.30 |
| LLM tokens (Claude + embeddings) | medie | — | $5-12 |
| Infra share | — | — | $1-2 |
| **Total marginal** | | | **~$8-16/utilizator/lună** |

Plus: **20% cashback în credite xAI** care poate finanța Grok pentru reasoning tasks bulk (extracție concepte, summarization), reducând costul efectiv LLM cu ~$2-4/utilizator.

**Net marginal real: $6-12/utilizator activ/lună.** Margins healthy chiar la entry tier.

### 10.2 Tiering propus (revizuit cu pay-per-use)

| Tier | Preț | Pentru cine |
|------|------|-------------|
| **Spark** (free trial) | $0, 14 zile | Onboarding cu publish real (acum sustenabil) |
| **Seed** | $19/lună | Solo creator, <2K followers, 5 drafts/zi, basic graf |
| **Voice** | $59/lună | Active creator, până la 25K followers, unlimited drafts, Strategic Brain complet |
| **Atlas** | $149/lună | Pro / power user, multi-graph (2 conturi), Sparring + Synthesis, priority models, export graph |
| **Enterprise** | Custom | Echipe, BYOK X API |

**Schimbarea majoră vs draft inițial**: entry tier coboară de la $39 la $19 (acum sustenabil), tier-urile superioare scad cu ~40%. Asta deschide TAM dramatic.

### 10.3 Path către $10K MRR (recalibrat)

- 170 utilizatori × $59 medie = $10K MRR
- Sau 100 × $99 (mix Voice + Atlas)
- Realist în 6-9 luni cu build-in-public strategy + nișa solopreneur tehnic
- Acquisition primary: postezi PE X folosind aplicația, demonstrând rezultatul

**Implicație strategică**: entry barrier mai mic + free trial cu publish real = onboarding conversion mai bun. Putem permite și **referral program** (1 lună gratis per referal cu plată) — economia o suportă acum.

---

## 11. Roadmap pe etape

### Phase 0 — Fondație tehnică (Săpt. 1-3)
- Auth + X OAuth + ingestion de bază
- Schema graf în Postgres
- UI scaffold

### Phase 1 — MVP (Săpt. 4-10) — *"Graph Studio + Drafting Agent"*
- Ingest istoric X
- Extracție concepte → graph seed
- Graph Studio editabil
- Drafting agent simplu (Claude + graph context)
- Voice fingerprint v1
- Manual publish (copy-paste sau handoff)
- **Goal**: 20 design partners

### Phase 2 — Closed loop (Săpt. 11-16) — *"Feedback Loop + Strategic Brain v1"*
- Auto-sync metrics
- Atribuire post → noduri
- Insights săptămânale
- Reply target suggestions
- Posting window analyzer
- **Goal**: primii 50 paying customers

### Phase 3 — Co-thinker complet (Săpt. 17-24) — *"Sparring + Synthesis"*
- Sparring mode
- Tension/Evolution detection
- Long-form synthesizer (din fragmente → thread/long-form)
- Audience cluster analytics
- **Goal**: $5K MRR, NPS >50

### Phase 4 — Compounding (Săpt. 25+)
- API & MCP server (graful tău devine context portabil pt alte tools)
- Multi-graph (separate working/personal voices)
- Voice export (folosește graful în Cursor / ChatGPT etc)
- Agent autonomous mode (opt-in supraveghet)

---

## 12. Riscuri & mitigări

| Risc | Severitate | Mitigare |
|------|-----------|----------|
| Schimbări X API / pricing (s-a întâmplat de 3 ori în 3 ani) | Medium | Abstracție clean a layer-ului X; monitor X Developers pentru schimbări; design pentru cost variabil |
| Cap pay-per-use 2M post reads/lună | Low (la scara MVP) | Devine relevant la 1000+ useri activi; Enterprise tier disponibil; arhitectura noastră e read-light per user |
| Utilizatorii nu vor să facă "muncă" cu graful | Medium | Onboarding asistat de agent, extracție automată, target: graf util în <30 min |
| Concurență (Tweet Hunter copiază "graph") | Medium | Moat-ul nu e feature-ul, e graful *utilizatorului*. Switching cost intrinsec. |
| AI generic conținut — distincție insuficient resimțită | Medium | Marketing centrat pe before/after voice; case studies vizibile |
| Privacy concerns (graful e IP personal) | High | Encryption at rest; export complet anytime; explicit no-training pe date utilizator |
| LLM cost spike (Claude/OpenAI pricing) | Medium | Multi-model strategy; xAI cashback parțial offset; Grok pentru tasks bulk |

---

## 13. Metrici de succes

### 13.1 Product health
- **Graph density**: noduri/utilizator activ (target: >50 la 30 zile)
- **Graph engagement**: % drafts care invocă explicit noduri (target: >70%)
- **Voice fidelity score**: similaritate draft → fingerprint (target: >85% la draft acceptat)

### 13.2 User outcomes
- **Posting consistency**: % utilizatori care postează 5+ ori/săpt prin app (target: >60%)
- **Audience growth**: median follower growth/lună (target: >15% pentru Voice tier)
- **Engagement quality**: bookmark rate, reply rate (vs baseline pre-Ipse)

### 13.3 Business
- MRR, churn (<5% lunar), CAC payback (<6 luni), NPS (>50)

---

## 14. Filosofie de produs (the "why" cultural)

> *Software-ul actual ne tratează creierul ca pe o sursă de input nediferențiat pentru pipeline-uri optimizate. Ipse face opusul: tratează creierul ca **substrat** și optimizează software-ul în jurul lui.*

Trei principii de neclintit:

1. **Graful aparține utilizatorului.** Export complet, oricând, în formate deschise. Nu există vendor lock-in pe IP intelectual.
2. **Agentul niciodată nu pretinde a fi tine.** Tot ce iese e marcat ca *propunere*. Confirmarea umană e default, nu opt-in.
3. **Algoritmul X e adversar, nu prieten.** Nu construim pentru a-l satisface; construim pentru a-l rezista. Creșterea e efect secundar al gândirii bune publicate consistent.

---

## 15. Întrebări deschise (pentru discuție)

1. **Naming**: Ipse / Stratum / Atlas / Codex / Sigil — care?
2. **MCP server-ul**: îl scoatem ca feature paid sau ca free expansion (ecosystem play)?
3. **Multi-language**: launch RO+EN sau EN-only initial?
4. **Public graph option**: opt-in pentru a face graful tău public ca thought leadership artifact?
5. **Dacă lansăm în beta închisă cu first 20 design partners din rețeaua ta, în 3 săptămâni — fezabil?**

---

*End of PRD v0.1 — un document viu, nu un contract.*
