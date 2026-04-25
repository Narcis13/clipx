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
    likes: n(/([\d.,]+)\s+like/i),
    views: n(/([\d.,]+)\s+view/i),
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

  const main = articles[0]; // first article = main post on a /status/ page
  const { author, handle } = extractFromArticle(main);
  const text = txt(main.querySelector('[data-testid="tweetText"]'));
  const time = main.querySelector<HTMLTimeElement>('time');
  const group = main.querySelector('[role="group"]')?.getAttribute('aria-label') ?? '';

  const topComments = articles
    .slice(1, 11)
    .map(extractFromArticle)
    .filter((c) => c.text || c.author);

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
