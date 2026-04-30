export default function decorate(block) {
  if (block.classList.contains('composed'))  { decorateComposed(block);    return; }
  if (block.classList.contains('about-strip')) { decorateAboutStrip(block); return; }
  if (block.classList.contains('metrics'))     { decorateMetrics(block);    return; }
  if (block.classList.contains('values'))      { decorateValues(block);     return; }
  if (block.classList.contains('timeline'))    { decorateTimeline(block);   return; }
  if (block.classList.contains('categories'))  { decorateCategories(block); return; }
  decorateDefault(block);
}

function contentRows(block) {
  return [...block.children].filter((row) => {
    const key = [...row.children][0]?.textContent?.trim().toLowerCase();
    return key !== 'variation' && key !== 'source';
  });
}

function imageMarkup(cell, fallbackAlt = '') {
  const img = cell?.querySelector('img');
  if (!img) return '';
  return `<img src="${img.src}" alt="${img.alt || fallbackAlt}" loading="lazy">`;
}

function imageSrcFromCell(cell) {
  const img = cell?.querySelector('img');
  if (img?.src) return img.src;

  const link = cell?.querySelector('a');
  if (link?.href) return link.href;

  const raw = cell?.textContent?.trim() || '';
  return raw || '';
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
        const img   = cells[0]?.querySelector('img');
        const link  = cells[1]?.querySelector('a');
        const label = link?.textContent?.trim() || cells[1]?.textContent?.trim() || '';
        const href  = link?.href || '#';
        return `
          <a class="simple-card" href="${href}" aria-label="${label}">
            ${img ? `<img src="${img.src}" alt="${img.alt || label}" loading="lazy">` : ''}
            <span class="simple-card-label">${label}</span>
          </a>`;
      }).join('')}
    </div>`;
}

function decorateCategories(block) {
  // Each category = 1 row: [img] | [title link] | [collection] | [category] | [description]
  const rows = contentRows(block);
  block.innerHTML = `
    <div class="categories-grid">
      ${rows.map((row) => {
        const cells = [...row.children];
        const imgMarkup = imageMarkup(cells[0], cells[1]?.textContent?.trim() || '');
        const link  = cells[1]?.querySelector('a');
        const title = link?.textContent?.trim() || cells[1]?.textContent?.trim() || '';
        const href  = link?.href || '#';
        const collection = cells[2]?.textContent?.trim() || '';
        const category   = cells[3]?.textContent?.trim() || '';
        const desc       = cells[4]?.textContent?.trim() || '';
        return `
          <article class="category-card">
            <a href="${href}" class="category-card-img-link" aria-label="${title}">
              ${imgMarkup}
              <span class="category-card-badge">${category}</span>
            </a>
            <div class="category-card-body">
              <p class="category-card-kicker">${collection}</p>
              <h3><a href="${href}">${title}</a></h3>
              ${desc ? `<p class="category-card-desc">${desc}</p>` : ''}
              <a href="${href}" class="button secondary">Explore</a>
            </div>
          </article>`;
      }).join('')}
    </div>`;
}

function decorateAboutStrip(block) {
  const rows = contentRows(block);
  const imgRow   = rows[0];
  const labelRow = rows[1];
  const imgCells   = imgRow   ? [...imgRow.children]   : [];
  const labelCells = labelRow ? [...labelRow.children] : [];
  block.innerHTML = `
    <div class="about-strip-grid">
      ${imgCells.map((cell, i) => {
        const imgMarkup = imageMarkup(cell, labelCells[i]?.textContent?.trim() || '');
        const label   = labelCells[i]?.textContent?.trim() || '';
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
    <div class="metrics-grid">
      ${rows.map((row) => {
        const cells = [...row.children];
        return `
          <article class="metric-card">
            <h2>${cells[0]?.textContent?.trim() || ''}</h2>
            <p class="metric-label">${cells[1]?.textContent?.trim() || ''}</p>
          </article>`;
      }).join('')}
    </div>`;
}

function decorateValues(block) {
  const rows = contentRows(block);
  const titles = rows[0] ? [...rows[0].children] : [];
  const descs  = rows[1] ? [...rows[1].children] : [];
  block.innerHTML = `
    <div class="values-grid">
      ${titles.map((cell, i) => `
        <article class="value-card">
          <h3>${cell.textContent.trim()}</h3>
          <p>${descs[i]?.textContent?.trim() || ''}</p>
        </article>`).join('')}
    </div>`;
}

function decorateTimeline(block) {
  const all = contentRows(block);
  const milestones = [];
  for (let i = 0; i < all.length; i += 2) {
    const cellsA = [...(all[i]?.children || [])];
    const cellsB = [...(all[i + 1]?.children || [])];
    milestones.push({
      year:  cellsA[0]?.textContent?.trim() || '',
      title: cellsA[1]?.textContent?.trim() || '',
      img:   cellsA[2]?.querySelector('img') || null,
      desc:  cellsB[0]?.textContent?.trim() || '',
    });
  }
  block.innerHTML = `
    <div class="timeline-list">
      ${milestones.map(({ year, title, img, desc }, i) => `
        <article class="timeline-step" aria-label="Milestone ${i + 1}">
          <div class="timeline-year">${year}</div>
          <div class="timeline-content">
            ${img ? `<div class="timeline-media"><img src="${img.src}" alt="${title}" loading="lazy" width="96" height="96"></div>` : ''}
            <div class="timeline-copy">
              <h3>${title}</h3>
              <p>${desc}</p>
            </div>
          </div>
        </article>`).join('')}
    </div>`;
}