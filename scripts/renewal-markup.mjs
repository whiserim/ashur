import { COMMUNITY_URL, escapeHtml, validateCache } from './steam-news-data.mjs';

// Ids match the source files in 2_Screenshot ("GH_Screenshot (57).jpg" becomes "57").
export const screenshots = [
  ['57', 'Deal me in', 'The Captain dealing cards to four hunters at a glowing table'],
  ['67', 'Under the aurora', 'Octopuses inside rings of fish beneath green northern lights'],
  ['46', 'Jackpot Hunters', 'Two hunters playing a row of Jackpot Hunters slot machines'],
  ['27', 'Something big below', 'A giant orca monster baring its teeth in the deep sea'],
  ['51', 'Place your bets', 'The roulette table with a glowing Go chip'],
  ['13', 'The serpent rises', 'A water serpent coiling into a figure eight above the ship'],
  ['38', 'Make it your own', 'The wardrobe screen with a captain hat and accessories'],
  ['31', 'Swarm season', 'A huge school of fish swarming over icy waters'],
  ['52', 'Blackjack night', 'Neon Blackjack tables under the ASHUR sign'],
  ['66', 'Bubble trouble', 'A giant red crab surrounded by bubbles'],
  ['54', 'Upgrade your weapon', 'The weapon upgrade screen comparing the current and next weapon'],
  ['68', 'Tornado incoming', 'An icy tornado tearing across the deck'],
  ['43', 'Welcome to the casino', 'A neon Entrance sign outside the casino'],
  ['48', 'Trapped!', 'A hunter stuck inside a giant bubble next to a red crab'],
  ['42', 'Payment due', 'A payment due notice with a balance of 75,000'],
  ['35', 'Reef run', 'Fish swirling over a colorful coral reef'],
  ['59', 'Duck buff', 'Picking up a rubber duck buff from a sea of ducks'],
  ['14', 'Fireworks and fangs', 'A serpent diving through sparks and fireworks over the deck'],
  ['55', 'Find an artifact', 'Artifact info for the Cat Claw artifact in the casino'],
  ['25', 'Circle of fish', 'Red fish circling hunters trapped in bubbles'],
  ['53', 'The casino floor', 'A wide view of slot machines, Blackjack tables, and the prize wheel'],
  ['37', 'Puffer wall', 'A wall of pufferfish blocking the ship'],
  ['49', 'Many arms', 'Octopuses and a skeleton fish attacking under the aurora'],
  ['71', 'Check the dashboard', 'The dashboard with the payment due, artifacts, and duck buff'],
  ['30', 'Ice gate', 'Fish swimming around a giant ice arch'],
  ['26', 'Deep trouble', 'An orca monster closing in on a hunter trapped in a bubble'],
  ['56', 'Four seats, one pot', 'Four hunters waiting at a Blackjack table'],
  ['6', 'Bones and fins', 'A skeleton fish boss charging under the aurora'],
  ['64', 'Polar party', 'An octopus and a swarm of fish near a polar base'],
  ['39', 'Shark suit', 'The wardrobe screen with a shark costume outfit'],
  ['2', 'Duck deck', 'Hunters on a deck covered in rubber ducks beside the ship wheel'],
  ['36', 'Shipwreck', 'Fish swarming around a sunken pirate ship'],
  ['20', 'Jelly rider', 'A serpent carrying a jellyfish through the deep'],
  ['4', 'The Captain', 'The Captain looming behind a glowing card table'],
  ['5', 'Artifact corner', 'The casino interior with the artifact machine'],
  ['9', 'Crowded skies', 'Octopuses and a sea monster swarming under the aurora'],
  ['23', 'Bubble net', 'Red fish and bubbles filling the deep sea around the ship'],
];

// The first cards of the gallery stay visible; the rest open with the "show all" button.
export const GALLERY_PREVIEW_COUNT = 12;

const shotId = (id) => id.padStart(2, '0');
export const thumbnailPath = (id) => `./src/assets/renewal/shot-${shotId(id)}-640.webp`;
export const fullPath = (id) => `./gallery/shot-${shotId(id)}.webp`;

export function galleryMarkup() {
  return `<div class="gallery-grid" id="gallery-grid">${screenshots.map(([id, caption, alt], index) => `
    <a class="gallery-item" href="${fullPath(id)}" data-gallery data-caption="${escapeHtml(caption)}" aria-label="Open screenshot ${index + 1}: ${escapeHtml(caption)}">
      <img src="${thumbnailPath(id)}" alt="${escapeHtml(alt)}" width="640" height="360" loading="lazy" decoding="async" />
      <span class="gallery-zoom" aria-hidden="true">+</span><span class="gallery-item-label"><span>${String(index + 1).padStart(2, '0')}</span>${escapeHtml(caption)}</span>
    </a>`).join('')}\n</div>
    <div class="gallery-more"><button class="gallery-more-button" type="button" aria-controls="gallery-grid" aria-expanded="false" data-gallery-more>Show all ${screenshots.length} screenshots</button></div>`;
}

// Three drifting rows of screenshots behind the hero. Each row repeats once so the loop is seamless.
export const heroWallRows = [
  ['67', '57', '27', '46', '13', '51'],
  ['31', '66', '43', '52', '35', '14'],
  ['53', '20', '25', '56', '54', '64'],
];

export function heroWallMarkup() {
  return `<div class="hero-wall" aria-hidden="true">${heroWallRows.map((row) => `
      <div class="hero-wall-row">${[...row, ...row].map((id) => `<img src="${thumbnailPath(id)}" alt="" width="640" height="360" decoding="async" fetchpriority="low" />`).join('')}</div>`).join('')}
    </div>`;
}

export function newsMarkup(data) {
  const news = validateCache(data);
  const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  const syncFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short' });
  return `<div class="news-grid">${news.items.slice(0, 3).map((item) => `
    <article class="news-card"><div class="news-meta"><span class="news-type">${escapeHtml(item.type)}</span><time datetime="${escapeHtml(item.publishedAt)}">${dateFormat.format(new Date(item.publishedAt))}</time></div><h3><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a></h3><p>${escapeHtml(item.summary)}</p><span class="news-link" aria-hidden="true">Read on Steam <span>↗</span></span></article>`).join('')}</div>
    <p class="news-sync">Official Steam announcements · Last synced <time datetime="${escapeHtml(news.fetchedAt)}">${syncFormat.format(new Date(news.fetchedAt))}</time> · <a href="${COMMUNITY_URL}" target="_blank" rel="noopener noreferrer">View the live feed</a></p>`;
}
