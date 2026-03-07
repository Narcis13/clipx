// ─── Content script: runs in the X.com page context ──────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'scrapeAndScroll') {
    handleScrapeAndScroll(message.rounds, message.keywords)
      .then(result => sendResponse(result))
      .catch(err  => sendResponse({ error: err.message, tweets: [] }));
    // Keep message channel open for async response
    return true;
  }
});
// ─── Main orchestrator ────────────────────────────────────────────────────────
async function handleScrapeAndScroll(rounds, keywords) {
  const allTweets = new Map(); // deduplicate by tweet text hash
  const allRaw    = new Map(); // all tweet texts regardless of filters
  for (let i = 0; i < rounds; i++) {
    // Scrape what's currently visible
    const { matched, raw } = scrapeTweetsFromDOM(keywords);
    matched.forEach(t => {
      const key = t.handle + '::' + t.text.slice(0, 60);
      if (!allTweets.has(key)) allTweets.set(key, t);
    });
    raw.forEach(t => {
      const key = t.slice(0, 80);
      if (!allRaw.has(key)) allRaw.set(key, t);
    });
    // Notify popup of progress (best effort, popup might be closed)
    try {
      chrome.runtime.sendMessage({
        action: 'scrapeProgress',
        round: i + 1,
        total: rounds,
        found: allTweets.size
      });
    } catch (_) { /* popup may be closed */ }
    // Scroll down
    await smoothScroll(600 + Math.random() * 400);
    await sleep(1200 + Math.random() * 800);
  }
  // Rank by engagement score and return top results
  const ranked = rankTweets([...allTweets.values()]);
  return { tweets: ranked, rawTexts: [...allRaw.values()] };
}
// ─── DOM Scraper ──────────────────────────────────────────────────────────────
function scrapeTweetsFromDOM(keywords) {
  const matched = [];
  const raw = []; // all tweet texts seen, no filters applied
  // X renders tweets as <article> elements with data-testid="tweet"
  const articles = document.querySelectorAll('article[data-testid="tweet"]');
  articles.forEach(article => {
    try {
      // Skip ads
      const adBadge = article.querySelector('[data-testid="placementTracking"]');
      if (adBadge) return;
      // ── Text ──
      const tweetTextEl = article.querySelector('[data-testid="tweetText"]');
      if (!tweetTextEl) return;
      const text = tweetTextEl.innerText.trim();
      if (!text || text.length < 10) return;
      // Collect every tweet text for debug view
      raw.push(text);
      // ── Keyword filter ──
      const textLower = text.toLowerCase();
      const hasKeyword = keywords.length === 0 || keywords.some(k => textLower.includes(k.toLowerCase()));
      if (!hasKeyword) return;
      // ── Author ──
      const userNameEl = article.querySelector('[data-testid="User-Name"]');
      let author = '';
      let handle = '';
      if (userNameEl) {
        const spans = userNameEl.querySelectorAll('span');
        author = spans[0]?.innerText?.trim() || '';
        // Handle is usually in an <a> with href starting with /
        const handleLink = userNameEl.querySelector('a[href^="/"]');
        handle = handleLink?.getAttribute('href')?.replace(/^\//, '') || '';
      }
      // Don't skip on missing handle — use author name as fallback
      if (!handle && !author) return;
      if (!handle) handle = author.replace(/\s+/g, '').toLowerCase();
      // ── Engagement metrics ──
      const likes    = parseMetric(article, '[data-testid="like"]');
      const retweets = parseMetric(article, '[data-testid="retweet"]');
      const replies  = parseMetric(article, '[data-testid="reply"]');
      const views    = parseViewCount(article);
      // ── Engagement score (weighted) ──
      // Likes × 3 + RTs × 5 + replies × 2 + views × 0.01
      const score = (likes * 3) + (retweets * 5) + (replies * 2) + (views * 0.01);
      matched.push({ author, handle, text, likes, retweets, replies, views, score });
    } catch (e) {
      // Skip malformed tweet nodes
    }
  });
  return { matched, raw };
}
// ─── Parse engagement numbers (e.g., "1.2K", "43K", "1M") ───────────────────
function parseMetric(article, testId) {
  const el = article.querySelector(testId);
  if (!el) return 0;
  // The count is usually in a child span with aria-label or inner text
  const spans = el.querySelectorAll('span');
  for (const span of spans) {
    const txt = span.innerText?.trim();
    if (txt && /^[\d.,]+[KMB]?$/.test(txt)) {
      return parseHumanNumber(txt);
    }
  }
  // Fallback: aria-label on the button (e.g. "1234 Likes")
  const label = el.getAttribute('aria-label') || '';
  const match = label.match(/^([\d,]+)/);
  if (match) return parseInt(match[1].replace(/,/g, ''), 10) || 0;
  return 0;
}
function parseViewCount(article) {
  // Views are in an <a> or <span> with aria-label like "43K views"
  const all = article.querySelectorAll('span, a');
  for (const el of all) {
    const label = el.getAttribute('aria-label') || '';
    const match = label.match(/^([\d.,]+[KMB]?)\s+views?/i);
    if (match) return parseHumanNumber(match[1]);
    // Sometimes the text itself says "43K views"
    const txt = el.innerText?.trim() || '';
    const m2  = txt.match(/^([\d.,]+[KMB]?)\s+views?/i);
    if (m2) return parseHumanNumber(m2[1]);
  }
  // X also uses [data-testid="app-text-transition-container"] near analytics icon
  const analyticsEls = article.querySelectorAll('[data-testid="app-text-transition-container"]');
  for (const el of analyticsEls) {
    const txt = el.innerText?.trim();
    if (txt) return parseHumanNumber(txt);
  }
  return 0;
}
function parseHumanNumber(str) {
  if (!str) return 0;
  str = str.replace(/,/g, '').trim();
  if (str.endsWith('K')) return Math.round(parseFloat(str) * 1_000);
  if (str.endsWith('M')) return Math.round(parseFloat(str) * 1_000_000);
  if (str.endsWith('B')) return Math.round(parseFloat(str) * 1_000_000_000);
  return parseInt(str, 10) || 0;
}
// ─── Rank tweets by score ─────────────────────────────────────────────────────
function rankTweets(tweets) {
  return tweets
    .sort((a, b) => b.score - a.score)
    .slice(0, 10); // return top 10, popup will use top 2
}
// ─── Smooth scroll helper ─────────────────────────────────────────────────────
async function smoothScroll(pixels) {
  const steps  = 12;
  const delay  = 40;
  const amount = pixels / steps;
  for (let i = 0; i < steps; i++) {
    window.scrollBy({ top: amount, behavior: 'smooth' });
    await sleep(delay);
  }
}
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}