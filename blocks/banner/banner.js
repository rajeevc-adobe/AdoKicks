export default function decorate(block) {
  const isFull = block.classList.contains('full');
  const rows = [...block.children];
  isFull ? decorateFull(block, rows) : decorateSplit(block, rows);
}

function parsePair(rows, i) {
  const row0 = rows[i];
  const row1 = rows[i + 1];
  const c0 = row0 ? [...row0.children] : [];
  const c1 = row1 ? [...row1.children] : [];
  const picture = c0[0]?.querySelector('picture') || null;
  const img = c0[0]?.querySelector('img') || null;
  return {
    picture: picture?.outerHTML || (img ? `<picture>${img.outerHTML}</picture>` : ''),
    imgAlt:  c0[0]?.querySelector('img')?.alt || '',
    title:   c0[1]?.textContent?.trim() || '',
    sub:     c1[0]?.textContent?.trim() || '',
    ctaHref: c1[1]?.querySelector('a')?.href || '#',
    ctaText: c1[1]?.querySelector('a')?.textContent?.trim() || 'Shop Now',
  };
}

function bannerCard({ picture, imgAlt, title, sub, ctaHref, ctaText }) {
  return `
    <a class="banner-card" href="${ctaHref}" aria-label="${title}">
      ${picture}
      <div class="banner-text">
        <h2>${title}</h2>
        ${sub ? `<p>${sub}</p>` : ''}
        <span class="banner-cta button primary">${ctaText}</span>
      </div>
    </a>`;
}

function decorateSplit(block, rows) {
  const b1 = parsePair(rows, 0);
  const b2 = parsePair(rows, 2);
  block.innerHTML = `
    <div class="banner-split">
      ${bannerCard(b1)}
      ${b2.title ? bannerCard(b2) : ''}
    </div>`;
}

function decorateFull(block, rows) {
  block.innerHTML = `<div class="banner-full">${bannerCard(parsePair(rows, 0))}</div>`;
}