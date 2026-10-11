import { COMMUNITY_URL, escapeHtml, validateCache } from './steam-news-data.mjs';

export const screenshots = [
  ['009', 'Make it your own', 'The wardrobe screen with pirate hats and character customization'],
  ['011', 'Hunt more, earn more', 'The start of another hunt aboard a pirate ship'],
  ['001', 'Casino rush', 'The start of a timed casino round'],
  ['004', 'Jackpot!', 'A slot machine jackpot showering the casino with gold'],
  ['012', 'The big ones bite', 'A battle with a giant Skeleton Fish boss'],
  ['005', 'Spin the wheel', 'The Big Six wheel of fortune in the casino'],
  ['013', 'Against the clock', 'An Elite Shark approaching during a timed hunt'],
  ['003', 'Place your bets', 'A roulette wheel and betting table inside the casino'],
  ['010', 'Hunt together', 'First-person combat against a wave of monsters in space'],
  ['006', 'A lucky roll', 'Gold coins after winning a dice game'],
  ['018', 'Weapon works', 'A weapon shop with a machine gun on display'],
  ['007', 'Upgrade your weapon', 'The weapon upgrade screen comparing the current and next weapon'],
  ['008', 'Find an artifact', 'An artifact with combat bonuses on display in the casino'],
  ['015', 'Pick your next upgrade', 'A dashboard with artifacts and a special-offer machine'],
  ['019', 'Make every shot count', 'First-person shooting as a monster bursts into purple particles'],
  ['016', 'Paid in full', 'A debt payment receipt marked Paid in Full'],
  ['002', 'The casino floor', 'Friends playing beside slot machines on the casino floor'],
  ['017', 'One more round?', 'A wide view of the casino, artifacts, and gaming tables'],
  ['000', 'Welcome aboard', 'A space pirate ship with a glowing casino entrance'],
  ['014', 'Into the unknown', 'A pirate ship sailing toward a purple space portal'],
];

export function galleryMarkup() {
  return `<div class="gallery-grid">${screenshots.map(([id, caption, alt], index) => `
    <a class="gallery-item" href="./gallery/screenshot-${id}.webp" data-gallery data-caption="${escapeHtml(caption)}" aria-label="Open screenshot ${index + 1}: ${escapeHtml(caption)}">
      <img src="./src/assets/renewal/screenshot-${id}-640.webp" alt="${escapeHtml(alt)}" width="640" height="360" loading="lazy" decoding="async" />
      <span class="gallery-zoom" aria-hidden="true">+</span><span class="gallery-item-label"><span>${String(index + 1).padStart(2, '0')}</span>${escapeHtml(caption)}</span>
    </a>`).join('')}\n</div>`;
}

export function newsMarkup(data) {
  const news = validateCache(data);
  const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  const syncFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short' });
  return `<div class="news-grid">${news.items.slice(0, 3).map((item) => `
    <article class="news-card"><div class="news-meta"><span class="news-type">${escapeHtml(item.type)}</span><time datetime="${escapeHtml(item.publishedAt)}">${dateFormat.format(new Date(item.publishedAt))}</time></div><h3><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a></h3><p>${escapeHtml(item.summary)}</p><span class="news-link" aria-hidden="true">Read on Steam <span>↗</span></span></article>`).join('')}</div>
    <p class="news-sync">Official Steam announcements · Last synced <time datetime="${escapeHtml(news.fetchedAt)}">${syncFormat.format(new Date(news.fetchedAt))}</time> · <a href="${COMMUNITY_URL}" target="_blank" rel="noopener noreferrer">View the live feed</a></p>`;
}
