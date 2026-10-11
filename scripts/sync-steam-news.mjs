import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FEED_URL, normalizeNews, validateCache } from './steam-news-data.mjs';

const output = fileURLToPath(new URL('../public/steam-news.json', import.meta.url));
try {
  const response = await fetch(FEED_URL, { signal: AbortSignal.timeout(15000), headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Steam returned HTTP ${response.status}`);
  const news = normalizeNews(await response.json());
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(news, null, 2)}\n`, 'utf8');
  console.log(`Synced ${news.items.length} official Steam announcements at ${news.fetchedAt}`);
} catch (error) {
  if (!process.argv.includes('--allow-cached')) throw error;
  const cached = validateCache(JSON.parse(await readFile(output, 'utf8')));
  console.warn(`Steam sync unavailable: ${error.message}. Using the saved feed from ${cached.fetchedAt}.`);
}
