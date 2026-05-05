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

  const videoSrcRaw = rows[0]?.querySelector('a')?.href
    || rows[0]?.querySelector('a')?.textContent?.trim()
    || rows[0]?.textContent?.trim()
    || '';
  const videoSrc = videoSrcRaw
    ? videoSrcRaw.trim().replace(/\s+/g, '%20').replace(/\.mov$/, '.mp4')
    : '/carousalvideo.mp4';
  const normalizedVideoSrc = videoSrc.startsWith('/') || videoSrc.startsWith('http')
    ? videoSrc
    : `/${videoSrc}`;

  const slides = rows.slice(1).reduce((acc, row) => {
    const [c0, c1] = [...row.children];
    const title = c0?.textContent?.trim();
    const subtitle = c1?.textContent?.trim() || '';
    if (title) acc.push({ title, subtitle });
    return acc;
  }, []);

  block.innerHTML = '';
  const article = document.createElement('article');
  article.className = 'hero';
  article.setAttribute('aria-label', 'Hero carousel');
  article.innerHTML = `
    <video class="hero-video" src="${normalizedVideoSrc}"
      autoplay muted loop playsinline preload="metadata" poster="/adokicks.png"
      aria-label="Adokicks featured hero video" tabindex="-1"></video>
    <div class="hero-overlay">
      <h1 class="hero-title">${slides[0]?.title || ''}</h1>
      <p class="hero-subtitle">${slides[0]?.subtitle || ''}</p>
      <div class="hero-controls" role="group" aria-label="Hero carousel controls">
        <button class="icon-toggle-btn hero-pause-btn" type="button" aria-label="Pause hero video">
          &#10074;&#10074;
        </button>
      </div>
    </div>`;
  block.appendChild(article);

  const video = article.querySelector('.hero-video');
  if (video) {
    video.addEventListener('error', () => {
      // Fallback: hide video and show background image
      video.style.display = 'none';
      article.style.backgroundImage = 'url(/adokicks.png)';
      article.style.backgroundSize = 'cover';
      article.style.backgroundPosition = 'center';
    });
  }

  if (slides.length <= 1) return;

  const titleEl = article.querySelector('.hero-title');
  const subtitleEl = article.querySelector('.hero-subtitle');
  const pauseBtn = article.querySelector('.hero-pause-btn');
  // const video      = article.querySelector('.hero-video'); // already declared above
  let current = 0;
  let paused = false;

  // [titleEl, subtitleEl].forEach((el) => {
  //   el.style.transition = 'opacity 0.22s ease, transform 0.22s ease';
  // });

  function cycleSlide() {
    current = (current + 1) % slides.length;
    titleEl.textContent = slides[current].title;
    subtitleEl.textContent = slides[current].subtitle;
  }

  setInterval(() => { if (!paused) cycleSlide(); }, 4200);

  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    if (paused) {
      video.pause();
      pauseBtn.innerHTML = '&#9658;';
      pauseBtn.setAttribute('aria-label', 'Play video');
    } else {
      video.play().catch(() => {});
      pauseBtn.innerHTML = '&#10074;&#10074;';
      pauseBtn.setAttribute('aria-label', 'Pause video');
    }
  });

  new IntersectionObserver(([e]) => {
    if (!e.isIntersecting && !paused) video.pause();
    else if (e.isIntersecting && !paused) video.play().catch(() => {});
  }, { threshold: 0.2 }).observe(article);
}

function decorateStatic(block) {
  const img = block.querySelector('img, picture');
  const heading = block.querySelector('h1, h2');
  const sub = [...block.querySelectorAll('p')].find((p) => !p.querySelector('picture, img'));
  const cta = block.querySelector('a');
  block.innerHTML = `
    <article class="hero hero--static">
      ${img?.tagName === 'PICTURE' ? img.outerHTML : (img ? `<picture><img src="${img.src}" alt="${img.alt || ''}" loading="eager" fetchpriority="high"></picture>` : '')}
      <div class="hero-content">
        ${heading ? `<h1 class="hero-title">${heading.textContent.trim()}</h1>` : ''}
        ${sub ? `<p class="hero-subtitle">${sub.textContent.trim()}</p>` : ''}
        ${cta ? `<a href="${cta.href}" class="button primary">${cta.textContent.trim()}</a>` : ''}
      </div>
    </article>`;
}
