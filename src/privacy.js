import policyEn from './privacy/policy-en.html?raw';
import policyKo from './privacy/policy-ko.html?raw';

// One source for the in-page dialog and the standalone /privacy/ page.
// English is the default; Korean is shown only when the reader picks it.
const policies = { en: policyEn, ko: policyKo };
const defaultLang = 'en';

const languageSwitchMarkup = `
  <div class="privacy-lang" role="group" aria-label="Language">
    <button type="button" data-privacy-lang="en">EN</button>
    <button type="button" data-privacy-lang="ko" lang="ko">한국어</button>
  </div>
`;

const renderPolicy = (root, body, lang) => {
  body.innerHTML = policies[lang];
  body.lang = lang;
  root.querySelectorAll('[data-privacy-lang]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.privacyLang === lang));
  });
};

const setupDialog = () => {
  const triggers = document.querySelectorAll('[data-privacy-open]');
  if (triggers.length === 0) return;

  const dialog = document.createElement('div');
  dialog.className = 'privacy-dialog';
  dialog.id = 'privacy-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'privacy-dialog-title');
  dialog.hidden = true;
  dialog.innerHTML = `
    <div class="privacy-panel">
      <div class="privacy-toolbar">
        <span class="privacy-kicker" id="privacy-dialog-title">Privacy Policy</span>
        ${languageSwitchMarkup}
        <a class="privacy-fullpage" href="./privacy/">Full page</a>
        <button class="lightbox-close privacy-close" type="button" aria-label="Close privacy policy">
          Close ×
        </button>
      </div>
      <div class="privacy-body privacy-document" tabindex="0"></div>
    </div>
  `;
  document.body.append(dialog);

  const panel = dialog.querySelector('.privacy-panel');
  const body = dialog.querySelector('.privacy-body');
  const closeButton = dialog.querySelector('.privacy-close');
  let lang = defaultLang;
  let previousFocus = null;

  const open = () => {
    previousFocus = document.activeElement;
    renderPolicy(dialog, body, lang);
    dialog.hidden = false;
    document.body.classList.add('modal-open');
    body.scrollTop = 0;
    closeButton.focus();
  };

  const close = () => {
    dialog.hidden = true;
    document.body.classList.remove('modal-open');
    if (window.location.hash === '#privacy') {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    previousFocus?.focus();
  };

  triggers.forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      open();
    });
  });

  dialog.querySelectorAll('[data-privacy-lang]').forEach((button) => {
    button.addEventListener('click', () => {
      lang = button.dataset.privacyLang;
      renderPolicy(dialog, body, lang);
      body.scrollTop = 0;
    });
  });

  closeButton.addEventListener('click', close);
  dialog.addEventListener('click', close);
  panel.addEventListener('click', (event) => event.stopPropagation());

  window.addEventListener('keydown', (event) => {
    if (dialog.hidden) return;

    if (event.key === 'Escape') {
      close();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusable = [...panel.querySelectorAll('a[href], button, [tabindex="0"]')];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  if (window.location.hash === '#privacy') {
    open();
  }
};

const setupPage = () => {
  const page = document.querySelector('[data-privacy-page]');
  if (!page) return;

  const switchSlot = page.querySelector('[data-privacy-switch]');
  const body = page.querySelector('[data-privacy-body]');
  switchSlot.innerHTML = languageSwitchMarkup;

  const requested = new URLSearchParams(window.location.search).get('lang');
  let lang = requested === 'ko' ? 'ko' : defaultLang;
  renderPolicy(page, body, lang);

  page.querySelectorAll('[data-privacy-lang]').forEach((button) => {
    button.addEventListener('click', () => {
      lang = button.dataset.privacyLang;
      renderPolicy(page, body, lang);
      const url = new URL(window.location.href);
      if (lang === defaultLang) {
        url.searchParams.delete('lang');
      } else {
        url.searchParams.set('lang', lang);
      }
      history.replaceState(null, '', url);
    });
  });
};

setupDialog();
setupPage();
