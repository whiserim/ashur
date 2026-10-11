export const APP_ID = 5117630;
export const FEED_URL = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${APP_ID}&count=6&maxlength=0&feeds=steam_community_announcements&format=json&l=english`;
export const COMMUNITY_URL = 'https://steamcommunity.com/games/5117630/partnerevents/?l=english';

export function plainText(value) {
  return String(value ?? '')
    .replace(/\[img[^\]]*\][\s\S]*?\[\/img\]/gi, ' ')
    .replace(/\[(?:previewyoutube|youtube)[^\]]*\][\s\S]*?\[\/(?:previewyoutube|youtube)\]/gi, ' ')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/&(?:nbsp|amp|quot|apos|lt|gt);|&#(?:39|8212);/g, (entity) => ({ '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&apos;': "'", '&#39;': "'", '&lt;': '<', '&gt;': '>', '&#8212;': '. ' })[entity])
    .replace(/\u2014/g, '. ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

export function safeNewsUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || !['store.steampowered.com', 'steamcommunity.com', 'steamstore-a.akamaihd.net'].includes(url.hostname)) {
    throw new Error('Steam announcement has an unexpected destination');
  }
  return url.href;
}

export function normalizeNews(payload, fetchedAt = new Date().toISOString()) {
  if (payload?.appnews?.appid !== APP_ID || !Array.isArray(payload.appnews.newsitems)) throw new Error('Unexpected Steam news response');
  const seen = new Set();
  const items = payload.appnews.newsitems
    .filter((item) => item.appid === APP_ID && item.feedname === 'steam_community_announcements')
    .sort((a, b) => b.date - a.date)
    .filter((item) => {
      if (seen.has(String(item.gid))) return false;
      seen.add(String(item.gid));
      return true;
    })
    .slice(0, 6)
    .map((item) => {
      const title = plainText(item.title);
      if (!title || /[\uac00-\ud7af]/.test(title)) throw new Error('Expected an English Steam announcement');
      if (!Number.isFinite(item.date) || item.date <= 0) throw new Error('Steam announcement has an invalid date');
      const contents = plainText(item.contents)
        .replace(/^Hello[,\s]*(?:Hunters|everyone)[!,\s]*/i, '')
        .replace(/^Thank you for playing the GAMBLE HUNTERS (?:DEMO|demo)\.\s*/i, '');
      const summary = contents.length > 200 ? `${contents.slice(0, 197).replace(/\s+\S*$/, '')}...` : contents;
      return { id: String(item.gid), title, url: safeNewsUrl(item.url), publishedAt: new Date(item.date * 1000).toISOString(), summary, type: item.tags?.includes('patchnotes') ? 'Patch notes' : 'Announcement' };
    });
  if (items.length === 0) throw new Error('Steam returned no official announcements');
  return { appid: APP_ID, language: 'english', source: COMMUNITY_URL, fetchedAt, items };
}

export function validateCache(data) {
  if (data?.appid !== APP_ID || data.language !== 'english' || !Number.isFinite(Date.parse(data.fetchedAt)) || !Array.isArray(data.items) || data.items.length === 0) throw new Error('Invalid cached Steam news');
  for (const item of data.items) {
    safeNewsUrl(item.url);
    if (!item.title || !Number.isFinite(Date.parse(item.publishedAt))) throw new Error('Invalid cached announcement');
  }
  return data;
}
