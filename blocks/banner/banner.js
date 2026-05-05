export default function decorate(block) {
  const rows = [...block.children];

  // Determine if this is gender banners or regular banners
  if (block.classList.contains('gender')) {
    decorateGenderBanners(block, rows);
  } else {
    const isFull = block.classList.contains('full');
    if (isFull) decorateFull(block, rows);
    else decorateSplit(block, rows);
  }
}

function getPageContext() {
  // Detect current page from body dataset or URL path
  const page = document.body.dataset.page || '';
  const path = window.location.pathname;

  if (page === 'mens' || path.includes('/mens')) return 'mens';
  if (page === 'womens' || path.includes('/womens')) return 'womens';
  return 'home';
}

function decorateGenderBanners(block, rows) {
  const bannerData = [];

  // Process rows in pairs: each banner is 2 rows
  for (let i = 0; i < rows.length; i += 2) {
    const row1 = rows[i];
    const row2 = rows[i + 1];

    if (!row1 || !row2) continue;

    const row1Cells = [...row1.children];
    const row2Cells = [...row2.children];

    // Row 1: Cell 0 = image, Cell 1 = heading
    const imgElement = row1Cells[0]?.querySelector('img');
    const headingText = row1Cells[1]?.textContent?.trim() || '';

    // Row 2: Cell 0 = subtitle, Cell 1 = link
    const subtitleText = row2Cells[0]?.textContent?.trim() || '';
    const linkElement = row2Cells[1]?.querySelector('a');

    if (imgElement) {
      bannerData.push({
        img: imgElement.src,
        alt: imgElement.alt || '',
        heading: headingText,
        subtitle: subtitleText,
        href: linkElement?.href || '#',
      });
    }
  }

  const pageContext = getPageContext();
  let displayBanners = bannerData.slice(0, 2);

  // Filter banners based on page context
  if (pageContext === 'mens') {
    displayBanners = [bannerData[0]]; // Show only men banner full-width
    block.classList.add('full-width-gender');
  } else if (pageContext === 'womens') {
    displayBanners = [bannerData[1]]; // Show only women banner full-width
    block.classList.add('full-width-gender');
  }
  // else: on home, show both side-by-side

  // Render banners
  const bannerHTML = displayBanners.map((banner, idx) => {
    const bannerClass = idx === 0 ? 'men-banner' : 'women-banner';
    return `
      <a class="gender-banner ${bannerClass}" href="${banner.href}" aria-label="${banner.heading}">
        <img src="${banner.img}" alt="${banner.alt}">
        <div class="banner-text">
          <h2>${banner.heading}</h2>
          <p>${banner.subtitle}</p>
        </div>
      </a>
    `;
  }).join('');

  block.innerHTML = `<div class="banner-row">${bannerHTML}</div>`;
}

function parsePair(rows, i) {
  const row0 = rows[i];
  const row1 = rows[i + 1];
  const c0 = row0 ? [...row0.children] : [];
  const c1 = row1 ? [...row1.children] : [];
  const imageCell = c0[0];
  const imageLink = imageCell?.querySelector('a');
  const image = imageCell?.querySelector('img');
  const imageSrc = image?.src
    || imageLink?.querySelector('img')?.src
    || imageLink?.href
    || imageCell?.textContent?.trim()
    || '';
  const imageAlt = image?.alt
    || imageLink?.querySelector('img')?.alt
    || c0[1]?.textContent?.trim()
    || '';
  return {
    image: imageSrc ? `<img src="${imageSrc}" alt="${imageAlt}">` : '',
    title: c0[1]?.textContent?.trim() || '',
    sub: c1[0]?.textContent?.trim() || '',
    ctaHref: c1[1]?.querySelector('a')?.href || imageLink?.href || '#',
  };
}

function bannerCard({
  image, title, sub, ctaHref,
}, cardClass = '') {
  return `
    <a class="banner-card ${cardClass}" href="${ctaHref}" aria-label="${title}">
      ${image}
      <div class="banner-text">
        <h2>${title}</h2>
        ${sub ? `<p>${sub}</p>` : ''}
      </div>
    </a>`;
}

function decorateSplit(block, rows) {
  const b1 = parsePair(rows, 0);
  const b2 = parsePair(rows, 2);
  block.innerHTML = `
    <div class="banner-split">
      ${bannerCard(b1, 'men-banner')}
      ${b2.title ? bannerCard(b2, 'women-banner') : ''}
    </div>`;
}

function decorateFull(block, rows) {
  block.innerHTML = `<div class="banner-full">${bannerCard(parsePair(rows, 0))}</div>`;
}
