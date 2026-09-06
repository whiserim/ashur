const section = document.querySelector('#character-preview');
const status = section.querySelector('[data-preview-status]');
const controls = [...section.querySelectorAll('[data-preview-action]')];
let viewer;
let loading = false;
let visible = false;
let abandoned = false;

function updateVisibility() {
  if (!viewer) return;
  if (visible && !document.hidden) viewer.start();
  else viewer.stop();
}

const observer = new IntersectionObserver(async (entries) => {
  visible = entries[0].isIntersecting;
  updateVisibility();
  if (!visible || loading) return;
  loading = true;
  try {
    const { createViewer } = await import('./captain-viewer.js');
    viewer = await createViewer(section);
    if (abandoned) { viewer.dispose(); return; }
    status.hidden = true;
    controls.forEach((button) => { button.disabled = false; });
    updateVisibility();
  } catch (error) {
    status.textContent = "The crew couldn't come aboard. Reload the page to try again.";
    status.dataset.failed = 'true';
    console.error('Character preview failed:', error);
  }
}, { threshold: 0 });

observer.observe(section.querySelector('[data-preview-stage]'));
document.addEventListener('visibilitychange', updateVisibility);
window.addEventListener('pagehide', (event) => {
  viewer?.stop();
  if (!event.persisted) {
    abandoned = true;
    observer.disconnect();
    viewer?.dispose();
  }
});
window.addEventListener('pageshow', updateVisibility);
if (import.meta.hot) import.meta.hot.dispose(() => {
  abandoned = true;
  observer.disconnect();
  document.removeEventListener('visibilitychange', updateVisibility);
  viewer?.dispose();
});
