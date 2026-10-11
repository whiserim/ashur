const menuToggle = document.querySelector('.menu-toggle');
const mobileNavigation = document.querySelector('#mobile-navigation');

// The official Steam widget requires at least 320 CSS pixels internally.
const widgetViewport = document.querySelector('.steam-widget-viewport');
const widgetFrame = widgetViewport.querySelector('iframe');
let previousWidgetWidth = -1;
function fitSteamWidget() {
  const width = widgetViewport.clientWidth;
  if (!width || width === previousWidgetWidth) return;
  previousWidgetWidth = width;
  const scale = Math.min(1, width / 320);
  widgetFrame.style.width = `${Math.max(320, width)}px`;
  widgetFrame.style.transform = `scale(${scale})`;
  widgetViewport.style.height = `${Math.ceil(190 * scale)}px`;
}
fitSteamWidget();
if ('ResizeObserver' in window) new ResizeObserver(fitSteamWidget).observe(widgetViewport);
else window.addEventListener('resize', fitSteamWidget);

function closeMenu({ restoreFocus = false } = {}) {
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Open navigation');
  mobileNavigation.classList.remove('is-open');
  if (restoreFocus) menuToggle.focus();
}

menuToggle.addEventListener('click', () => {
  const isOpen = menuToggle.getAttribute('aria-expanded') !== 'true';
  menuToggle.setAttribute('aria-expanded', String(isOpen));
  menuToggle.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
  mobileNavigation.classList.toggle('is-open', isOpen);
});
mobileNavigation.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => closeMenu()));
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') closeMenu({ restoreFocus: true });
});
document.addEventListener('click', (event) => {
  if (!event.target.closest('.site-header')) closeMenu();
});
window.matchMedia('(min-width: 801px)').addEventListener('change', (event) => {
  if (event.matches) closeMenu();
});

const galleryLinks = [...document.querySelectorAll('[data-gallery]')];
const dialog = document.querySelector('#gallery-dialog');
const dialogImage = dialog.querySelector('.lightbox-image');
const dialogCaption = dialog.querySelector('#gallery-caption');
const dialogCount = dialog.querySelector('[data-gallery-count]');
let currentIndex = 0;
let galleryTrigger = null;

function showScreenshot(index) {
  currentIndex = (index + galleryLinks.length) % galleryLinks.length;
  const link = galleryLinks[currentIndex];
  dialogImage.src = link.href;
  dialogImage.alt = link.querySelector('img').alt;
  dialogCaption.textContent = link.dataset.caption;
  dialogCount.textContent = `${currentIndex + 1} / ${galleryLinks.length}`;
}

galleryLinks.forEach((link, index) => {
  link.addEventListener('click', (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || typeof dialog.showModal !== 'function') return;
    event.preventDefault();
    galleryTrigger = link;
    showScreenshot(index);
    dialog.showModal();
    document.body.classList.add('modal-open');
    dialog.querySelector('[data-gallery-close]').focus();
  });
});
dialog.querySelector('[data-gallery-close]').addEventListener('click', () => dialog.close());
dialog.querySelector('[data-gallery-previous]').addEventListener('click', () => showScreenshot(currentIndex - 1));
dialog.querySelector('[data-gallery-next]').addEventListener('click', () => showScreenshot(currentIndex + 1));
dialog.addEventListener('click', (event) => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
});
dialog.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft') { event.preventDefault(); showScreenshot(currentIndex - 1); }
  if (event.key === 'ArrowRight') { event.preventDefault(); showScreenshot(currentIndex + 1); }
});
dialog.addEventListener('close', () => {
  document.body.classList.remove('modal-open');
  dialogImage.removeAttribute('src');
  galleryTrigger?.focus({ preventScroll: true });
});
