import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { APP_ID, normalizeNews, plainText, safeNewsUrl } from './steam-news-data.mjs';
import { galleryMarkup, newsMarkup, screenshots } from './renewal-markup.mjs';

const item = { gid: '123', title: 'Demo update', appid: APP_ID, feedname: 'steam_community_announcements', date: 1791485806, contents: '[h2]Hello Hunters,[/h2]Thank you for playing the GAMBLE HUNTERS DEMO. [b]A new patch is available.[/b]', url: 'https://steamcommunity.com/games/5117630/announcements/detail/123', tags: ['patchnotes'] };
test('Official news is normalized, deduplicated, and ordered newest first', () => {
  const data = normalizeNews({ appnews: { appid: APP_ID, newsitems: [item, item, { ...item, gid: '124', date: item.date + 60 }, { ...item, gid: '999', feedname: 'external' }] } });
  assert.deepEqual(data.items.map((entry) => entry.id), ['124', '123']);
  assert.equal(data.items[0].summary, 'A new patch is available.');
  assert.equal(data.items[0].type, 'Patch notes');
});
test('Unknown feeds, unsafe URLs, and invalid payloads do not silently succeed', () => {
  assert.throws(() => normalizeNews({ appnews: { appid: 1, newsitems: [] } }));
  assert.throws(() => normalizeNews({ appnews: { appid: APP_ID, newsitems: [] } }));
  assert.throws(() => safeNewsUrl('javascript:alert(1)'));
  assert.throws(() => safeNewsUrl('https://example.com/news'));
});
test('Steam content is plain text and safely escaped for static HTML', () => {
  const data = normalizeNews({ appnews: { appid: APP_ID, newsitems: [{ ...item, title: '<img src=x onerror=alert(1)>Patch & fixes', contents: '<script>alert(1)</script>Safe content' }] } });
  const html = newsMarkup(data);
  assert.ok(html.includes('Patch &amp; fixes'));
  assert.ok(!html.includes('onerror'));
  assert.ok(!html.includes('<script>'));
  assert.ok(!plainText(`A${String.fromCodePoint(0x2014)}B`).includes(String.fromCodePoint(0x2014)));
});
test('All 20 updated screenshots have both optimized sizes and accessible links', () => {
  assert.equal(screenshots.length, 20);
  assert.equal(new Set(screenshots.map(([id]) => id)).size, 20);
  assert.equal((galleryMarkup().match(/data-gallery /g) || []).length, 20);
  for (const [id] of screenshots) for (const size of [640, 1600]) assert.ok(existsSync(new URL(`../src/assets/renewal/screenshot-${id}-${size}.webp`, import.meta.url)));
  for (const [id] of screenshots) assert.ok(existsSync(new URL(`../public/gallery/screenshot-${id}.webp`, import.meta.url)));
});
test('Both entry points share content, preserve Privacy, and exclude Character Preview', () => {
  for (const filename of ['index.html', 'mobile.html']) {
    const html = readFileSync(new URL(`../${filename}`, import.meta.url), 'utf8');
    assert.ok(html.includes('<!-- renewal-home -->'));
    assert.ok(html.includes('./src/privacy.js'));
    assert.ok(!html.includes('character-preview'));
  }
  const home = readFileSync(new URL('../src/home.html', import.meta.url), 'utf8');
  assert.ok(home.includes('Hurry! Before your friends gamble away your share, too.'));
  assert.ok(home.includes('https://x.com/ashur_inc'));
  assert.ok(home.includes('widget/5117630/?l=english'));
  assert.ok(home.includes('data-privacy-open'));
  assert.ok(!/[\uac00-\ud7af\u2014]/.test(home));
});

test('Gallery opens with the requested nine screenshots and numbers match browsing order', () => {
  const requestedOpening = ['009', '011', '001', '004', '012', '005', '013', '003', '010'];
  assert.deepEqual(screenshots.slice(0, 9).map(([id]) => id), requestedOpening);
  const html = galleryMarkup();
  const renderedIds = [...html.matchAll(/href="\.\/gallery\/screenshot-(\d{3})\.webp"/g)].map((match) => match[1]);
  const renderedNumbers = [...html.matchAll(/aria-label="Open screenshot (\d+):/g)].map((match) => Number(match[1]));
  assert.deepEqual(renderedIds, screenshots.map(([id]) => id));
  assert.deepEqual(renderedNumbers, Array.from({ length: 20 }, (_, index) => index + 1));
});

test('All six social icons share one light color and keep accessible link labels', () => {
  const home = readFileSync(new URL('../src/home.html', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/renewal.css', import.meta.url), 'utf8');
  for (const [id, label] of [['steam', 'Steam'], ['discord', 'Discord'], ['youtube', 'YouTube'], ['instagram', 'Instagram'], ['threads', 'Threads'], ['x', 'X']]) {
    assert.ok(home.includes(`aria-label="${label}" title="${label}"><span class="social-icon social-icon--${id}" aria-hidden="true">`));
    assert.ok(css.includes(`.social-icon--${id} { --social-logo: url(`));
  }
  assert.ok(css.includes('background-color: currentColor;'));
  assert.ok(css.includes('color: #f2f5f8;'));
  assert.ok(!css.includes('.socials img'));
});

test('Demo promotion is on the hero artwork and button frames remain stable across interaction', () => {
  const home = readFileSync(new URL('../src/home.html', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/renewal.css', import.meta.url), 'utf8');
  assert.ok(home.includes('<p class="hero-demo-promo"><span>Play the</span> <strong>Free demo</strong></p>'));
  assert.ok(!home.includes('class="demo-status"'));
  assert.ok(!css.includes('--button-hover'));
  assert.ok(!css.includes('.game-button::before'));
  assert.ok(css.includes('border-image: var(--button-sprite)'));
  assert.ok(css.includes('.game-button:hover, .game-button:focus-visible'));
  assert.ok(css.includes('.steam-widget-wrap iframe { color-scheme: light;'));
});

test('Press kit navigation, content, and accessible external links are shared by both layouts', () => {
  const home = readFileSync(new URL('../src/home.html', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/renewal.css', import.meta.url), 'utf8');
  const js = readFileSync(new URL('../src/renewal.js', import.meta.url), 'utf8');
  const navigation = /<a href="#gallery">Gallery<\/a><a href="#press">Press &amp; Creator<\/a><a href="mailto:contact@ashur.team">Contact<\/a>/g;
  assert.equal([...home.matchAll(navigation)].length, 2);
  const press = home.match(/<section class="press-section[\s\S]*?<\/section>/)?.[0];
  assert.ok(press);
  assert.ok(press.includes('id="press" aria-labelledby="press-title"'));
  assert.ok(press.includes('Press &amp;<br /><em>Creators</em>'));
  assert.ok(press.includes('Free to use'));
  assert.ok(press.includes('Logos, screenshots, trailers, and key art are in our press kit.'));
  assert.ok(press.includes('For keys, interviews, or anything else, reach us at <a href="mailto:contact@ashur.team">contact@ashur.team</a>'));
  const kitLinks = [...press.matchAll(/<a\b[^>]+href="https:\/\/drive\.google\.com\/drive\/folders\/15j67SsLW-pSsL-vDdcT-_t-zmZAd41Aq\?usp=drive_link"[^>]*>/g)];
  assert.equal(kitLinks.length, 2);
  for (const [link] of kitLinks) {
    assert.ok(link.includes('target="_blank"'));
    assert.ok(link.includes('rel="noopener noreferrer"'));
  }
  assert.ok(home.indexOf('id="gallery"') < home.indexOf('id="press"'));
  assert.ok(home.indexOf('id="press"') < home.indexOf('id="wishlist"'));
  assert.ok(css.includes('@media (max-width: 1000px)'));
  assert.ok(js.includes("window.matchMedia('(min-width: 1001px)')"));
});
