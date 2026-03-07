// ─── State ───────────────────────────────────────────────────────────────────
let scrapedTweets = [];
// ─── DOM refs ────────────────────────────────────────────────────────────────
const btnScrape      = document.getElementById('btn-scrape');
const btnGenerate    = document.getElementById('btn-generate');
const btnCopy        = document.getElementById('btn-copy');
const statusEl       = document.getElementById('status');
const foundSection   = document.getElementById('found-section');
const tweetsContainer= document.getElementById('tweets-container');
const outputSection  = document.getElementById('output-section');
const outputText     = document.getElementById('output-text');
const charCount      = document.getElementById('char-count');
const apiKeyInput    = document.getElementById('api-key');
const modelSelect    = document.getElementById('model');
const keywordsInput  = document.getElementById('keywords');
const extraInput     = document.getElementById('extra-instructions');
const scrollRounds   = document.getElementById('scroll-rounds');
const debugSection   = document.getElementById('debug-section');
const debugToggle    = document.getElementById('debug-toggle');
const debugBody      = document.getElementById('debug-body');
const debugRaw       = document.getElementById('debug-raw');
// ─── Persist settings ────────────────────────────────────────────────────────
chrome.storage.local.get(['apiKey', 'model', 'keywords', 'extraInstructions'], (data) => {
  if (data.apiKey)           apiKeyInput.value  = data.apiKey;
  if (data.model)            modelSelect.value  = data.model;
  if (data.keywords)         keywordsInput.value = data.keywords;
  if (data.extraInstructions) extraInput.value  = data.extraInstructions;
});
function saveSettings() {
  chrome.storage.local.set({
    apiKey: apiKeyInput.value,
    model:  modelSelect.value,
    keywords: keywordsInput.value,
    extraInstructions: extraInput.value
  });
}
apiKeyInput.addEventListener('change', saveSettings);
modelSelect.addEventListener('change', saveSettings);
keywordsInput.addEventListener('change', saveSettings);
extraInput.addEventListener('change', saveSettings);
// ─── Debug toggle ─────────────────────────────────────────────────────────────
debugToggle.addEventListener('click', () => {
  const open = debugBody.style.display !== 'none';
  debugBody.style.display = open ? 'none' : 'block';
  debugToggle.textContent = (open ? '▶' : '▼') + ' Show raw scraped tweets (debug)';
});
// ─── Helpers ─────────────────────────────────────────────────────────────────
function setStatus(msg, type = '') {
  statusEl.className = 'status-bar ' + type;
  statusEl.innerHTML = type === 'active'
    ? `<span class="spinner"></span>${msg}`
    : msg;
}
function formatNumber(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}
function renderTweets(tweets) {
  tweetsContainer.innerHTML = '';
  if (!tweets.length) {
    tweetsContainer.innerHTML = '<div style="color:#71767b;font-size:12px">No matching tweets found.</div>';
    return;
  }
  tweets.forEach((t, i) => {
    const card = document.createElement('div');
    card.className = 'tweet-card';
    card.innerHTML = `
      <div class="author">#${i + 1} ${t.author} <span style="color:#71767b;font-weight:400">@${t.handle}</span></div>
      <div class="text">${t.text.slice(0, 200)}${t.text.length > 200 ? '…' : ''}</div>
      <div class="stats">
        💬 ${formatNumber(t.replies)} &nbsp;
        🔁 ${formatNumber(t.retweets)} &nbsp;
        ❤️ ${formatNumber(t.likes)} &nbsp;
        👁️ ${formatNumber(t.views)} &nbsp;
        <strong style="color:#1d9bf0">Score: ${formatNumber(t.score)}</strong>
      </div>
    `;
    tweetsContainer.appendChild(card);
  });
  foundSection.style.display = 'block';
}
// ─── SCRAPE ───────────────────────────────────────────────────────────────────
btnScrape.addEventListener('click', async () => {
  const keywords = keywordsInput.value.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
  const rounds   = parseInt(scrollRounds.value, 10);
  btnScrape.disabled   = true;
  btnGenerate.disabled = true;
  outputSection.style.display = 'none';
  foundSection.style.display  = 'none';
  scrapedTweets = [];
  setStatus('Connecting to X tab...', 'active');
  // Get the active X tab
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || (!tab.url.includes('x.com') && !tab.url.includes('twitter.com'))) {
    // Try to find an X tab in the window
    const xTabs = await chrome.tabs.query({ url: ['https://x.com/*', 'https://twitter.com/*'] });
    if (xTabs.length === 0) {
      setStatus('❌ No X.com tab found. Open x.com/home first.', 'error');
      btnScrape.disabled = false;
      return;
    }
    tab = xTabs[0];
  }
  try {
    // Inject content script if needed and start scraping
    setStatus(`Scrolling feed (0/${rounds} rounds)...`, 'active');
    const result = await chrome.tabs.sendMessage(tab.id, {
      action: 'scrapeAndScroll',
      rounds,
      keywords
    });
    if (result.error) throw new Error(result.error);
    scrapedTweets = result.tweets;

    // Always show debug section with raw scraped texts
    const rawTexts = result.rawTexts || [];
    debugSection.style.display = 'block';
    if (rawTexts.length === 0) {
      debugRaw.value = '(no tweet text elements found — X may have changed its DOM)';
    } else {
      debugRaw.value = rawTexts.map((t, i) => `[${i + 1}] ${t}`).join('\n\n---\n\n');
    }

    if (scrapedTweets.length === 0) {
      const msg = rawTexts.length === 0
        ? '❌ No tweets scraped at all — check the debug section below.'
        : `No keyword matches in ${rawTexts.length} scraped tweets. Check debug section to see what was found, then adjust keywords.`;
      setStatus(msg, 'error');
    } else {
      setStatus(`✅ Found ${scrapedTweets.length} matching tweets. Top 2 selected by engagement score.`, 'success');
      renderTweets(scrapedTweets.slice(0, 5));
      btnGenerate.disabled = false;
    }
  } catch (err) {
    console.error(err);
    setStatus(`❌ Error: ${err.message}. Make sure you are on x.com and reload the page.`, 'error');
  }
  btnScrape.disabled = false;
});
// ─── GENERATE ─────────────────────────────────────────────────────────────────
btnGenerate.addEventListener('click', async () => {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    setStatus('❌ Please enter your OpenRouter API key first.', 'error');
    return;
  }
  btnGenerate.disabled = true;
  setStatus('Sending to AI model...', 'active');
  outputSection.style.display = 'none';
  const top2 = scrapedTweets.slice(0, 2);
  const extra = extraInput.value.trim();
  const model = modelSelect.value;
  const prompt = buildPrompt(top2, extra);
  try {
    const generated = await callOpenRouter(apiKey, model, prompt);
    outputText.textContent = generated;
    const len = generated.length;
    charCount.textContent = `${len} / 280`;
    charCount.className = 'char-count' + (len > 280 ? ' over' : '');
    outputSection.style.display = 'block';
    setStatus('✅ Tweet generated! Copy and post it on X.', 'success');
  } catch (err) {
    console.error(err);
    setStatus(`❌ AI Error: ${err.message}`, 'error');
  }
  btnGenerate.disabled = false;
});
// ─── COPY ─────────────────────────────────────────────────────────────────────
btnCopy.addEventListener('click', () => {
  const text = outputText.textContent;
  navigator.clipboard.writeText(text).then(() => {
    btnCopy.textContent = '✅ Copied!';
    setTimeout(() => { btnCopy.textContent = '📋 Copy to clipboard'; }, 2000);
  });
});
// ─── Prompt builder ───────────────────────────────────────────────────────────
function buildPrompt(tweets, extraInstructions) {
  const tweetBlocks = tweets.map((t, i) => `
TWEET ${i + 1}:
Author: ${t.author} (@${t.handle})
Text: ${t.text}
Engagement: ${t.replies} replies, ${t.retweets} retweets, ${t.likes} likes, ${t.views} views
Engagement Score: ${t.score}
  `.trim()).join('\\n\\n---\\n\\n');
  return `You are an expert Twitter/X content strategist specializing in the AI, software development, build-in-public, indie hacker, and startup growth niche.
I will give you 2 high-engagement tweets from that niche. Your task is to:
1. Analyze the writing style, tone, structure, hook, emotional appeal, and format of each tweet
2. Identify what made them perform well (curiosity gap, social proof, relatability, concrete results, etc.)
3. Combine and remix their core style and messaging patterns into ONE original new tweet
4. The new tweet must feel authentic, not like a copy — use a fresh angle, new insight, or a different example
5. Match the energy: short punchy lines, minimal punctuation flourishes, real-talk tone typical of tech Twitter
6. Keep it under 280 characters if possible (single tweet), or format as a short thread opener if the style demands it
${extraInstructions ? `ADDITIONAL INSTRUCTIONS FROM USER:\\n${extraInstructions}\\n` : ''}
HERE ARE THE SOURCE TWEETS:
---
${tweetBlocks}
---
OUTPUT RULES:
- Output ONLY the tweet text. No explanations, no labels, no quotes around it.
- Do not say "Here is your tweet:" or anything similar
- Do not add hashtags unless the source tweets use them heavily
- Do not use emojis unless the source tweets use them
- Make it feel like it came from a real person building/shipping things, not a marketing bot`;
}
// ─── OpenRouter API call ──────────────────────────────────────────────────────
async function callOpenRouter(apiKey, model, prompt) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://x.com',
      'X-Title': 'X Tweet Repurposer Extension'
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 300,
      temperature: 0.85,
      top_p: 0.95
    })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${response.status}`);
  }
  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Empty response from model');
  return text;
}