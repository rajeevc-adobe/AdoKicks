import { getProducts } from '../../scripts/product-store.js';
import { formatCurrency } from '../../scripts/cart-store.js';

export default async function decorate(block) {
  const opts = readOpts(block);
  const variation = getCardsVariation(block, opts);
  if (variation) block.classList.add(variation);
  if (variation === 'about-hero') { decorateAboutHero(block, opts); return; }
  if (variation === 'composed') { decorateComposed(block); return; }
  if (variation === 'about-strip') { decorateAboutStrip(block); return; }
  if (variation === 'metrics') { decorateMetrics(block); return; }
  if (variation === 'values') { decorateValues(block, opts); return; }
  if (variation === 'timeline') { decorateTimeline(block); return; }
  if (variation === 'category' || variation === 'categories') { await decorateCategory(block, opts); return; }
  decorateDefault(block);
}

function readOpts(block) {
  const opts = {};
  [...block.querySelectorAll(':scope > div')].forEach((row) => {
    const cells = [...row.children];
    if (cells.length >= 2) {
      opts[cells[0].textContent.trim().toLowerCase()] = cells[1].textContent.trim();
    }
  });
  return opts;
}

function getCardsVariation(block, opts) {
  const knownVariations = ['about-hero', 'about-strip', 'category', 'categories', 'composed', 'metrics', 'timeline', 'values'];
  const authored = (opts.variation || '').toLowerCase();
  if (knownVariations.includes(authored)) return authored;

  const classVariation = knownVariations.find((name) => block.classList.contains(name));
  if (classVariation) return classVariation;

  const variationTexts = [
    ...[...block.classList],
    ...[...block.querySelectorAll(':scope > h1, :scope > h2, :scope > h3, :scope > div > div')]
      .map((element) => element.textContent?.trim() || ''),
  ];
  return variationTexts
    .map((text) => text.match(/^cards\(([^)]+)\)$/i)?.[1]?.toLowerCase())
    .find((variation) => knownVariations.includes(variation)) || null;
}

function contentRows(block) {
  return [...block.children].filter((row) => {
    const key = [...row.children][0]?.textContent?.trim().toLowerCase();
    return key !== 'variation' && key !== 'source' && !key?.startsWith('cards(');
  });
}

function imageMarkup(cell, fallbackAlt = '') {
  const img = cell?.querySelector('img');
  if (img) return `<img src="${img.src}" alt="${img.alt || fallbackAlt}" loading="lazy">`;
  const src = imageSrcFromCell(cell);
  if (!src) return '';
  return `<img src="${src}" alt="${imageAltFromCell(cell, fallbackAlt)}" loading="lazy">`;
}

function imageSrcFromCell(cell) {
  const img = cell?.querySelector('img');
  if (img?.src) return img.src;

  const link = cell?.querySelector('a');
  if (link?.href) return link.getAttribute('href') || link.href;

  const raw = cell?.textContent?.trim() || '';
  if (/^https?:\/\//i.test(raw) || raw.startsWith('/')) return raw;
  return '';
}

function imageAltFromCell(cell, fallbackAlt = '') {
  const img = cell?.querySelector('img');
  if (img?.alt) return img.alt;

  const link = cell?.querySelector('a');
  const linkText = link?.textContent?.trim();
  if (linkText && linkText !== link?.href) return linkText;

  return fallbackAlt;
}

function sanitizeText(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function decorateComposed(block) {
  const rows = contentRows(block);
  const headingCells = rows[0] ? [...rows[0].children] : [];
  const imageCells = rows[1] ? [...rows[1].children] : [];
  const titleCells = rows[2] ? [...rows[2].children] : [];

  const title = headingCells[0]?.textContent?.trim() || 'Composed Originality';
  const description = headingCells[1]?.textContent?.trim() || '';

  const panels = imageCells.slice(0, 3).map((cell, index) => {
    const label = titleCells[index]?.textContent?.trim() || '';
    const link = cell?.querySelector('a');
    const href = link?.href || imageSrcFromCell(cell) || '#';
    const imgSrc = imageSrcFromCell(cell);
    if (!imgSrc) return '';

    return `
      <a class="about-image-panel" href="${href}" aria-label="${label || title}">
        <img src="${imgSrc}" alt="${label || title}" loading="lazy">
        ${label ? `<span>${label}</span>` : ''}
      </a>`;
  }).join('');

  block.innerHTML = `
    <article class="about-strip section-card composed-strip" aria-label="${title}">
      <h2>${title}</h2>
      ${description ? `<p>${description}</p>` : ''}
      <div class="about-strip-grid">
        ${panels}
      </div>
    </article>`;
}

function decorateDefault(block) {
  const rows = contentRows(block);
  block.innerHTML = `
    <div class="cards-grid">
      ${rows.map((row) => {
    const cells = [...row.children];
    const img = cells[0]?.querySelector('img');
    const link = cells[1]?.querySelector('a');
    const label = link?.textContent?.trim() || cells[1]?.textContent?.trim() || '';
    const href = link?.href || '#';
    return `
          <a class="simple-card" href="${href}" aria-label="${label}">
            ${img ? `<img src="${img.src}" alt="${img.alt || label}" loading="lazy">` : ''}
            <span class="simple-card-label">${label}</span>
          </a>`;
  }).join('')}
    </div>`;
}

async function decorateCategory(block, opts = {}) {
  // Each card row: [img] | [title link] | [collection] | [category] | [description]
  const configKeys = new Set(['eyebrow', 'title', 'subtitle']);
  const rows = contentRows(block).filter((row) => {
    const key = [...row.children][0]?.textContent?.trim().toLowerCase();
    return !configKeys.has(key);
  });
  const products = await getProducts().catch(() => []);
  const cards = rows.map((row) => {
    const cells = [...row.children];
    const link = cells[1]?.querySelector('a');
    const title = link?.textContent?.trim() || cells[1]?.textContent?.trim() || '';
    const href = link?.getAttribute('href') || '#';
    const collection = cells[2]?.textContent?.trim() || '';
    const category = cells[3]?.textContent?.trim() || '';
    const categorySlug = href.match(/[?&]category=([^&]+)/)?.[1] || category.toLowerCase().split(' ')[0];
    const genderSlug = href.includes('/womens') ? 'womens' : 'mens';
    const matches = products
      .filter((product) => product.gender === genderSlug && product.category === categorySlug)
      .sort((a, b) => (b.rating || 0) * (b.reviews || 0) - (a.rating || 0) * (a.reviews || 0));
    const heroProduct = matches[0];
    const desc = cells[4]?.textContent?.trim()
      || (matches.length && heroProduct ? `${matches.length} style${matches.length === 1 ? '' : 's'} ready to browse from ${heroProduct.brand}.` : '');
    const img = imageSrcFromCell(cells[0]);
    const alt = imageAltFromCell(cells[0], title);
    const collectionSlug = genderSlug === 'womens' ? 'women' : 'men';
    return {
      alt,
      category,
      collection,
      collectionSlug,
      desc,
      href,
      img,
      price: heroProduct?.price,
      title,
    };
  }).filter((card) => card.title && card.href);

  const eyebrow = opts.eyebrow || 'Category atlas';
  const title = opts.title || 'Choose the edit that matches your pace.';
  const subtitle = opts.subtitle || 'Browse the core category collections directly, with each tile tuned to feel broad, balanced, and easy to scan.';
  const categoryCount = new Set(cards.map((card) => card.category)).size;
  const collectionCount = new Set(cards.map((card) => card.collection)).size;
  block.classList.add('category');
  document.body.dataset.page = 'categories';

  block.innerHTML = `
    <div class="categories-page">
      <section class="page-hero categories-hero" aria-label="Category landing introduction">
        <div class="categories-hero-copy">
          <p class="eyebrow">${sanitizeText(eyebrow)}</p>
          <h1>${sanitizeText(title)}</h1>
          <p class="page-subtitle">${sanitizeText(subtitle)}</p>
        </div>
        <div class="categories-hero-stats" aria-label="Category overview">
          <article class="categories-hero-stat">
            <span class="stat-label">Collections</span>
            <strong>${cards.length}</strong>
          </article>
          <article class="categories-hero-stat">
            <span class="stat-label">Styles</span>
            <strong>${categoryCount}</strong>
          </article>
          <article class="categories-hero-stat">
            <span class="stat-label">Genders</span>
            <strong>${collectionCount}</strong>
          </article>
        </div>
      </section>
      <section class="category-showcase" aria-label="Browse categories by gender">
        <div id="category-grid" class="category-grid" role="list" aria-label="Category destinations">
          ${cards.map((card) => `
            <a class="category-card category-card-${sanitizeText(card.collectionSlug)}"
              href="${sanitizeText(card.href)}"
              role="listitem"
              aria-label="Open ${sanitizeText(card.title)}">
              ${card.img ? `<img src="${sanitizeText(card.img)}" alt="${sanitizeText(card.alt)}" class="category-card-image" loading="lazy">` : ''}
              <div class="category-card-overlay"></div>
              <div class="category-card-content">
                <p class="category-card-kicker">${sanitizeText(card.collection)}</p>
                <h2>${sanitizeText(card.title)}</h2>
                ${card.desc ? `<p class="category-card-copy">${sanitizeText(card.desc)}</p>` : ''}
                <div class="category-card-meta">
                  <span class="category-card-pill">${sanitizeText(card.category)}</span>
                  ${card.price ? `<span class="category-card-pill">From ${sanitizeText(formatCurrency(card.price))}</span>` : '<span class="category-card-pill">Explore</span>'}
                </div>
              </div>
            </a>`).join('')}
        </div>
      </section>
    </div>
  `;
}

function decorateAboutStrip(block) {
  const rows = contentRows(block);
  const imgRow = rows[0];
  const labelRow = rows[1];
  const imgCells = imgRow ? [...imgRow.children] : [];
  const labelCells = labelRow ? [...labelRow.children] : [];
  block.innerHTML = `
    <div class="about-strip-grid">
      ${imgCells.map((cell, i) => {
    const imgMarkup = imageMarkup(cell, labelCells[i]?.textContent?.trim() || '');
    const label = labelCells[i]?.textContent?.trim() || '';
    if (!imgMarkup) return '';
    return `
          <div class="about-image-panel">
            ${imgMarkup}
            ${label ? `<span>${label}</span>` : ''}
          </div>`;
  }).join('')}
    </div>`;
}

function decorateMetrics(block) {
  const rows = contentRows(block);
  block.innerHTML = `
    <section class="about-metric-grid" aria-label="Adokicks brand metrics">
      ${rows.map((row) => {
    const cells = [...row.children];
    return `
          <article class="metric-card">
            <p class="metric-label">${cells[1]?.textContent?.trim() || ''}</p>
            <h2>${cells[0]?.textContent?.trim() || ''}</h2>
          </article>`;
  }).join('')}
    </section>`;
}

function decorateValues(block, opts = {}) {
  const rows = contentRows(block);
  const titles = rows[0] ? [...rows[0].children] : [];
  const descs = rows[1] ? [...rows[1].children] : [];
  const kicker = opts.kicker || 'What we stand for';
  const title = opts.title || 'Three principles behind every release';
  block.innerHTML = `
    <section class="about-values-wrap section-card" aria-label="Adokicks values">
      <p class="about-kicker">${kicker}</p>
      <h2>${title}</h2>
      <div class="about-values-grid">
        ${titles.map((cell, i) => `
          <article class="value-card">
            <h3>${cell.textContent.trim()}</h3>
            <p>${descs[i]?.textContent?.trim() || ''}</p>
          </article>`).join('')}
      </div>
    </section>`;
}

function decorateTimeline(block) {
  const all = contentRows(block);
  const milestones = [];
  for (let i = 0; i < all.length; i += 1) {
    const cellsA = [...(all[i]?.children || [])];
    const year = cellsA[0]?.textContent?.trim() || '';
    const title = cellsA[1]?.textContent?.trim() || '';
    const imageCell = cellsA[2];
    if (!year || !title) continue;

    const nextCells = [...(all[i + 1]?.children || [])];
    const desc = nextCells[0]?.textContent?.trim() || '';
    if (desc && !nextCells[1]?.textContent?.trim()) i += 1;

    milestones.push({
      year,
      title,
      imgSrc: imageSrcFromCell(imageCell),
      imgAlt: imageAltFromCell(imageCell, title),
      desc,
    });
  }
  block.innerHTML = `
    <section class="growth-track section-card" aria-label="Five growth milestones">
      <div class="growth-head">
        <p class="about-kicker">Journey</p>
        <h2>Growth Milestones</h2>
      </div>
      <div class="growth-list">
      ${milestones.map(({
    year, title, imgSrc, imgAlt, desc,
  }, i) => `
        <article class="growth-step" aria-label="Milestone ${i + 1}">
          <div class="growth-year">${year}</div>
          <div class="growth-content">
            ${imgSrc ? `<div class="growth-media"><img src="${imgSrc}" alt="${imgAlt}" loading="lazy"></div>` : ''}
            <div class="growth-copy">
              <h3>${title}</h3>
              <p>${desc}</p>
            </div>
          </div>
        </article>`).join('')}
      </div>
    </section>`;
}

function decorateAboutHero(block, opts) {
  const kicker = opts.kicker || 'Built for motion';
  const title = opts.title || 'Our Story';
  const description = opts.description || 'Adokicks builds performance and street-ready footwear designed for movement, comfort, and originality. We obsess over fit, durability, and everyday confidence in every pair we release.';
  const badgeTitle = opts['badge title'] || 'Performance x Street';
  const badgeText = opts['badge text'] || 'Engineered comfort for every stride.';
  document.body.dataset.page = 'about';

  block.innerHTML = `
    <section class="about-hero section-card" aria-label="About company">
      <p class="about-kicker">${kicker}</p>
      <div class="about-hero-grid">
        <div>
          <h1>${title}</h1>
          <p>${description}</p>
        </div>
        <div class="about-hero-badge" aria-label="Brand statement">
          <strong>${badgeTitle}</strong>
          <span>${badgeText}</span>
        </div>
      </div>
    </section>`;
}
