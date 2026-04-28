export default function decorate(block) {
  if (block.classList.contains('static')) {
    decorateStatic(block);
  } else {
    decorateVideo(block);
  }
}

function decorateVideo(block) {
  const rows = [...block.children];
  if (!rows.length) return;

  const videoSrc = rows[0]?.querySelector('a')?.href
    || rows[0]?.querySelector('a')?.textContent?.trim()
    || rows[0]?.textContent?.trim()
    || '';

  const slides = rows.slice(1).reduce((acc, row) => {
    const [c0, c1] = [...row.children];
    const title    = c0?.textContent?.trim();
    const subtitle = c1?.textContent?.trim() || '';
    if (title) acc.push({ title, subtitle });
    return acc;
  }, []);

  block.innerHTML = '';
  const article = document.createElement('article');
  article.className = 'hero';
  article.setAttribute('aria-label', 'Hero carousel');
  article.innerHTML = `
    <video class="hero-video" src="${videoSrc}"
      autoplay muted loop playsinline preload="metadata"
      aria-label="Adokicks featured video" tabindex="-1"></video>
    <div class="hero-content">
      <h1 class="hero-title">${slides[0]?.title || ''}</h1>
      <p class="hero-subtitle">${slides[0]?.subtitle || ''}</p>
      <div class="hero-actions">
        <button class="hero-pause-btn icon-btn" type="button" aria-label="Pause video">
          <span class="pause-icon" aria-hidden="true">&#10074;&#10074;</span>
        </button>
        <a href="/categories" class="button primary">Shop Now</a>
        <a href="/featured" class="button secondary">View Featured</a>
      </div>
    </div>`;
  block.appendChild(article);

  if (slides.length <= 1) return;

  const titleEl    = article.querySelector('.hero-title');
  const subtitleEl = article.querySelector('.hero-subtitle');
  const pauseBtn   = article.querySelector('.hero-pause-btn');
  const pauseIcon  = article.querySelector('.pause-icon');
  const video      = article.querySelector('.hero-video');
  let current = 0;
  let paused  = false;

  [titleEl, subtitleEl].forEach((el) => {
    el.style.transition = 'opacity 0.22s ease, transform 0.22s ease';
  });

  function cycleSlide() {
    current = (current + 1) % slides.length;
    [titleEl, subtitleEl].forEach((el) => {
      el.style.opacity   = '0';
      el.style.transform = 'translateY(8px)';
    });
    setTimeout(() => {
      titleEl.textContent    = slides[current].title;
      subtitleEl.textContent = slides[current].subtitle;
      [titleEl, subtitleEl].forEach((el) => {
        el.style.opacity   = '1';
        el.style.transform = 'translateY(0)';
      });
    }, 220);
  }

  setInterval(() => { if (!paused) cycleSlide(); }, 4200);

  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    if (paused) {
      video.pause();
      pauseIcon.innerHTML = '&#9658;';
      pauseBtn.setAttribute('aria-label', 'Play video');
    } else {
      video.play().catch(() => {});
      pauseIcon.innerHTML = '&#10074;&#10074;';
      pauseBtn.setAttribute('aria-label', 'Pause video');
    }
  });

  new IntersectionObserver(([e]) => {
    if (!e.isIntersecting && !paused) video.pause();
    else if (e.isIntersecting && !paused) video.play().catch(() => {});
  }, { threshold: 0.2 }).observe(article);
}

function decorateStatic(block) {
  const img     = block.querySelector('img, picture');
  const heading = block.querySelector('h1, h2');
  const sub     = [...block.querySelectorAll('p')].find((p) => !p.querySelector('picture, img'));
  const cta     = block.querySelector('a');
  block.innerHTML = `
    <article class="hero hero--static">
      ${img?.tagName === 'PICTURE' ? img.outerHTML : (img ? `<picture><img src="${img.src}" alt="${img.alt || ''}" loading="eager" fetchpriority="high"></picture>` : '')}
      <div class="hero-content">
        ${heading ? `<h1 class="hero-title">${heading.textContent.trim()}</h1>` : ''}
        ${sub     ? `<p class="hero-subtitle">${sub.textContent.trim()}</p>` : ''}
        ${cta     ? `<a href="${cta.href}" class="button primary">${cta.textContent.trim()}</a>` : ''}
      </div>
    </article>`;
}