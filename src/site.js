(() => {
  const galleryImageUrls = import.meta.glob('./assets/shot-*-1440.webp', {
    eager: true,
    import: 'default',
    query: '?url',
  });
  const revealTargets = document.querySelectorAll('[data-reveal]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealTargets.forEach((target) => target.classList.add('is-visible'));
  } else {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14 },
    );
    revealTargets.forEach((target) => observer.observe(target));
  }

  const lightbox = document.querySelector('#screenshot-lightbox');

  if (lightbox) {
    const panel = lightbox.querySelector('.lightbox-panel');
    const closeButton = lightbox.querySelector('.lightbox-close');
    const lightboxImage = document.querySelector('#lightbox-image');
    const lightboxLabel = document.querySelector('#lightbox-label');
    const lightboxTitle = document.querySelector('#lightbox-title');
    let previousFocus = null;

    const closeLightbox = () => {
      lightbox.hidden = true;
      document.body.classList.remove('modal-open');
      lightboxImage.src = '';
      previousFocus?.focus();
    };

    document.querySelectorAll('.gallery-card').forEach((card) => {
      card.addEventListener('click', () => {
        const galleryImageUrl = galleryImageUrls[`./assets/${card.dataset.large}`];
        if (typeof galleryImageUrl !== 'string') {
          throw new Error(`Missing gallery image: ${card.dataset.large}`);
        }

        previousFocus = document.activeElement;
        lightboxImage.src = galleryImageUrl;
        lightboxImage.alt = card.dataset.alt;
        lightboxLabel.textContent = card.dataset.label;
        lightboxTitle.textContent = card.dataset.title;
        lightbox.hidden = false;
        document.body.classList.add('modal-open');
        closeButton.focus();
      });
    });

    closeButton.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', closeLightbox);
    panel.addEventListener('click', (event) => event.stopPropagation());
    window.addEventListener('keydown', (event) => {
      if (lightbox.hidden) return;

      if (event.key === 'Escape') {
        closeLightbox();
      }

      if (event.key === 'Tab') {
        event.preventDefault();
        closeButton.focus();
      }
    });
  }

  const mobileWidget = document.querySelector('[data-mobile-steam-widget]');

  if (mobileWidget) {
    const widgetFrame = mobileWidget.querySelector('.mobile-steam-widget-frame');
    const widgetWidth = 646;
    const widgetHeight = 190;

    const resizeWidget = () => {
      const scale = Math.min(1, mobileWidget.clientWidth / widgetWidth);
      widgetFrame.style.transform = `scale(${scale})`;
      mobileWidget.style.height = `${Math.ceil(widgetHeight * scale)}px`;
    };

    resizeWidget();

    if ('ResizeObserver' in window) {
      const widgetObserver = new ResizeObserver(resizeWidget);
      widgetObserver.observe(mobileWidget);
    } else {
      window.addEventListener('resize', resizeWidget);
    }
  }
})();
