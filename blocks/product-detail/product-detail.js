import { params, formatCurrency, sanitize } from '../../scripts/scripts.js';
import { getProductById } from '../../scripts/product-store.js';
import {
  addToCart, toggleWishlist, isWishlisted, toast,
} from '../../scripts/cart-store.js';

const CATEGORY_LABELS = {
  training: 'Training Shoes',
  running: 'Running Shoes',
  casual: 'Casual Shoes',
  multisport: 'Multisport Shoes',
  sneakers: 'Sneakers',
};

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeKey(value) {
  return normalizeText(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function parseNumber(value) {
  const match = normalizeText(value).replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function parseCurrencyValue(value) {
  return parseNumber(value);
}

function parseSizes(value) {
  return normalizeText(value)
    .replace(/^sizes?\s*[:-]?\s*/i, '')
    .split(/[,/;|\n]/)
    .map((size) => size.trim())
    .filter(Boolean);
}

function parseBoolean(value) {
  const text = normalizeKey(value);
  if (/out of stock|sold out|unavailable|no/.test(text)) return false;
  if (/in stock|available|yes|true/.test(text)) return true;
  return true;
}

function readUIConfig(block) {
  const config = {};
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (cells.length < 2) return;
    const key = normalizeKey(cells[0]?.textContent || '');
    const value = normalizeText(cells[1]?.textContent || '');
    if (key && value) config[key] = value;
  });

  return {
    galleryAriaLabel: config['gallery aria label'] || 'Product image gallery',
    galleryControlsAriaLabel: config['gallery controls aria label'] || 'Gallery controls',
    previousImageLabel: config['previous image label'] || 'Prev',
    previousImageAriaLabel: config['previous image aria label'] || 'View previous image',
    nextImageLabel: config['next image label'] || 'Next',
    nextImageAriaLabel: config['next image aria label'] || 'View next image',
    thumbnailsAriaLabel: config['thumbnails aria label'] || 'Image thumbnails',
    thumbnailAriaPrefix: config['thumbnail aria prefix'] || 'Select image',
    purchaseDetailsAriaLabel: config['purchase details aria label'] || 'Product purchase details',
    categoryLabel: config['category label'] || 'Category',
    ratingLabel: config['rating label'] || 'Rating',
    reviewsLabel: config['reviews label'] || 'reviews',
    selectSizeTitle: config['select size title'] || 'Select Size',
    sizeGroupAriaLabel: config['size group aria label'] || 'Available sizes',
    sizeOptionAriaPrefix: config['size option aria prefix'] || 'Select size',
    actionsAriaLabel: config['actions aria label'] || 'Purchase actions',
    addToBagLabel: config['add to bag label'] || 'Add to Bag',
    addToBagAriaLabel: config['add to bag aria label'] || 'Add item to bag',
    wishlistAriaLabel: config['wishlist aria label'] || 'Toggle wishlist',
    wishlistTitle: config['wishlist title'] || 'Wishlist',
    descriptionTitle: config['description title'] || 'Description',
    selectSizeError: config['select size error'] || 'Select a size first.',
    addedToBagSuffix: config['added to bag suffix'] || 'added to bag',
    wishlistAddedMessage: config['wishlist added message'] || 'Added to wishlist',
    wishlistRemovedMessage: config['wishlist removed message'] || 'Removed from wishlist',
    notFoundEyebrow: config['not found eyebrow'] || '404',
    notFoundTitle: config['not found title'] || 'Product not found',
    notFoundText: config['not found text'] || "The product you're looking for doesn't exist or has been removed.",
    notFoundCtaLabel: config['not found cta label'] || 'Browse featured shoes',
    notFoundCtaHref: config['not found cta href'] || '/featured',
  };
}

function getHeadingNodes(block) {
  return [...block.querySelectorAll('h1, h2, h3, h4, h5, h6')];
}

function getSectionNodes(block, label) {
  const headings = getHeadingNodes(block);
  const target = headings.find((heading) => normalizeKey(heading.textContent) === normalizeKey(label));
  if (!target) return [];

  const nodes = [];
  for (let node = target.nextElementSibling; node; node = node.nextElementSibling) {
    if (/^H[1-6]$/.test(node.tagName)) break;
    nodes.push(node);
  }
  return nodes;
}

function extractTablePairs(table) {
  const pairs = {};
  if (!table) return pairs;

  [...table.querySelectorAll('tr')].forEach((row) => {
    const cells = [...row.children].map((cell) => normalizeText(cell.textContent));
    if (cells.length < 2) return;
    const key = normalizeKey(cells[0]);
    if (!key || key === 'field' || key === 'key' || key === 'property') return;
    pairs[key] = cells.slice(1).join(' ').trim();
  });

  return pairs;
}

function extractDescription(block) {
  const sectionNodes = getSectionNodes(block, 'description');
  if (sectionNodes.length) {
    const text = sectionNodes
      .map((node) => normalizeText(node.textContent))
      .filter(Boolean)
      .join('\n\n');
    if (text) return text;
  }

  const firstParagraph = [...block.querySelectorAll('p')].map((p) => normalizeText(p.textContent)).find(Boolean);
  return firstParagraph || '';
}

function extractSizes(block, meta) {
  if (meta.sizes) return parseSizes(meta.sizes);

  const sectionNodes = getSectionNodes(block, 'sizes');
  const sectionText = sectionNodes
    .map((node) => normalizeText(node.textContent))
    .filter(Boolean)
    .join(' ');

  if (sectionText) return parseSizes(sectionText);

  const listItems = [...block.querySelectorAll('li')].map((item) => normalizeText(item.textContent)).filter(Boolean);
  if (listItems.length) return listItems;

  return [];
}

function extractImages(block) {
  const images = [];
  block.querySelectorAll('img').forEach((img) => {
    const src = img.currentSrc || img.src;
    if (!src) return;
    if (src.includes('/icons/') || src.includes('/assests/icons/')) return;
    if (!images.includes(src)) images.push(src);
  });

  if (!images.length) {
    block.querySelectorAll('a[href]').forEach((link) => {
      const href = link.href || '';
      if (/\.(png|jpe?g|webp|gif|avif)(\?|#|$)/i.test(href) && !images.includes(href)) {
        images.push(href);
      }
    });
  }

  return images;
}

function parseDAContent(block) {
  if (!block.children.length) return null;

  const metaTables = [...block.querySelectorAll('table')].map(extractTablePairs);
  const meta = Object.assign({}, ...metaTables);

  // DA may only have metadata (SEO fields) with NO product data
  // Check if this looks like a metadata-only doc (has metadata fields but no product fields)
  const hasProductData = meta.price || meta['sale price'] || meta.brand || meta.category || meta.id || meta['product id'];

  if (!hasProductData) {
    // Only metadata, no product data. Return null so we fall back to ?id= query param
    return null;
  }

  const titleNode = block.querySelector('h1') || block.querySelector('h2') || block.querySelector('h3');
  const title = normalizeText(titleNode?.textContent);

  const product = {
    id: normalizeText(meta['product id'] || meta.id || '').toLowerCase() || '',
    title: title || normalizeText(meta.title || meta.product || ''),
    brand: normalizeText(meta.brand || ''),
    price: parseCurrencyValue(meta.price || meta['sale price'] || meta['current price'] || ''),
    originalPrice: parseCurrencyValue(meta['original price'] || meta.mrp || meta.mrpprice || meta.price || ''),
    description: extractDescription(block),
    images: extractImages(block),
    sizes: extractSizes(block, meta),
    category: normalizeKey(meta.category || ''),
    categoryLabel: '',
    gender: normalizeKey(meta.gender || 'mens'),
    rating: parseNumber(meta.rating || ''),
    reviews: parseNumber(meta.reviews || meta.review || ''),
    inStock: parseBoolean(meta.stock || meta.availability || 'in stock'),
  };

  if (!product.id) product.id = normalizeKey(product.title).replace(/\s+/g, '-');
  if (!product.images.length) product.images = ['/adokicks.png'];
  if (!product.originalPrice) product.originalPrice = product.price;
  if (!product.rating) product.rating = 4.5;
  if (!product.reviews) product.reviews = 0;
  if (!product.brand) product.brand = normalizeText(meta.manufacturer || meta['brand name'] || 'Adokicks');

  const categoryKey = product.category;
  product.categoryLabel = CATEGORY_LABELS[categoryKey] || normalizeText(meta['category label'] || product.category || 'Sneakers');

  return product.title ? product : null;
}

function buildGalleryHTML(images, imageIndex, productTitle, config) {
  const safeImages = images.length ? images : ['/adokicks.png'];
  return `
    <section class="gallery" aria-label="${sanitize(config.galleryAriaLabel)}">
      <div class="gallery-main">
        <img src="${sanitize(safeImages[imageIndex])}" alt="${sanitize(productTitle)} image ${imageIndex + 1}" width="560" height="560">
        <div class="gallery-nav" role="group" aria-label="${sanitize(config.galleryControlsAriaLabel)}">
          <button id="img-prev" class="button secondary" type="button" aria-label="${sanitize(config.previousImageAriaLabel)}">${sanitize(config.previousImageLabel)}</button>
          <button id="img-next" class="button secondary" type="button" aria-label="${sanitize(config.nextImageAriaLabel)}">${sanitize(config.nextImageLabel)}</button>
        </div>
      </div>
      <div class="thumb-row" role="list" aria-label="${sanitize(config.thumbnailsAriaLabel)}">
        ${safeImages.map((img, idx) => `
          <button type="button" data-img-index="${idx}" aria-label="${sanitize(config.thumbnailAriaPrefix)} ${idx + 1}" class="${idx === imageIndex ? 'is-active' : ''}">
            <img src="${sanitize(img)}" alt="${sanitize(productTitle)} thumbnail ${idx + 1}" width="72" height="72" loading="lazy">
          </button>
        `).join('')}
      </div>
    </section>
  `;
}

function buildProductInfoHTML(product, selectedSize, config) {
  return `
    <section class="section-card product-info-card" aria-label="${sanitize(config.purchaseDetailsAriaLabel)}">
      <h1 class="product-title">${sanitize(product.brand)} - ${sanitize(product.title)}</h1>

      <p class="price-line product-price-line">
        <strong>${formatCurrency(product.price)}</strong>
        <span class="old-price">${formatCurrency(product.originalPrice || product.price)}</span>
      </p>

      <p class="product-meta">
        ${sanitize(config.categoryLabel)}: ${sanitize(CATEGORY_LABELS[product.category] || product.categoryLabel || product.category || 'Sneakers')}
        | ${sanitize(config.ratingLabel)}: ${sanitize(product.rating || 0)} (${sanitize(product.reviews || 0)} ${sanitize(config.reviewsLabel)})
      </p>

      <h2 class="product-section-title">${sanitize(config.selectSizeTitle)}</h2>
      <div class="product-size-grid" role="group" aria-label="${sanitize(config.sizeGroupAriaLabel)}">
        ${(product.sizes || []).map((size) => `
          <button type="button" data-size-option="${sanitize(size)}"
            class="product-size-pill ${String(selectedSize) === String(size) ? 'is-active' : ''}"
            aria-label="${sanitize(config.sizeOptionAriaPrefix)} ${sanitize(size)}">${sanitize(size)}</button>
        `).join('')}
      </div>

      <div class="product-buy-row" aria-label="${sanitize(config.actionsAriaLabel)}">
        <button id="product-add-cart" class="button primary product-buy-btn" type="button"
          aria-label="${sanitize(config.addToBagAriaLabel)}">${sanitize(config.addToBagLabel)}</button>
        <button id="product-wishlist"
          class="heart-btn ${isWishlisted(product.id) ? 'active' : ''}"
          type="button" aria-label="${sanitize(config.wishlistAriaLabel)}" title="${sanitize(config.wishlistTitle)}">&#10084;</button>
      </div>

      <h2 class="product-section-title">${sanitize(config.descriptionTitle)}</h2>
      <p class="product-description-text">${sanitize(product.description || '')}</p>
    </section>
  `;
}

function bindGalleryEvents(wrap, images, getIndex, setIndex, rerender) {
  const safeImages = images.length ? images : ['/adokicks.png'];
  wrap.querySelector('#img-prev')?.addEventListener('click', () => {
    setIndex((getIndex() - 1 + safeImages.length) % safeImages.length);
    rerender();
  });

  wrap.querySelector('#img-next')?.addEventListener('click', () => {
    setIndex((getIndex() + 1) % safeImages.length);
    rerender();
  });

  wrap.querySelectorAll('button[data-img-index]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setIndex(Number(btn.getAttribute('data-img-index') || 0));
      rerender();
    });
  });
}

function bindProductInfoEvents(wrap, product, getSelectedSize, setSelectedSize, rerender, config) {
  wrap.querySelectorAll('button[data-size-option]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setSelectedSize(btn.getAttribute('data-size-option') || '');
      wrap.querySelectorAll('button[data-size-option]').forEach((b) => {
        const active = b === btn;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', String(active));
      });
    });
  });

  wrap.querySelector('#product-add-cart')?.addEventListener('click', () => {
    const size = getSelectedSize();
    if (!size) {
      toast(config.selectSizeError, 'error');
      wrap.querySelector('.product-size-grid')?.classList.add('shake');
      setTimeout(() => wrap.querySelector('.product-size-grid')?.classList.remove('shake'), 400);
      return;
    }
    const ok = addToCart(product.id, size, 1);
    if (ok) toast(`${product.title} (UK ${size}) ${config.addedToBagSuffix}`, 'success');
  });

  wrap.querySelector('#product-wishlist')?.addEventListener('click', () => {
    const added = toggleWishlist(product.id);
    toast(added ? config.wishlistAddedMessage : config.wishlistRemovedMessage, 'success');
    rerender();
  });
}

export default async function decorate(block) {
  const id = params().get('id') || '';

  const uiConfig = readUIConfig(block);
  const daProduct = parseDAContent(block);

  block.innerHTML = '<div class="pg-loading"><span class="pg-spinner"></span></div>';

  try {
    let product = daProduct;

    if (!product && id) {
      product = await getProductById(id);
    }

    if (!product) {
      block.innerHTML = `
        <div class="product-not-found">
          <p class="eyebrow">${sanitize(uiConfig.notFoundEyebrow)}</p>
          <h2>${sanitize(uiConfig.notFoundTitle)}</h2>
          <p>${sanitize(uiConfig.notFoundText)}</p>
          <a href="${sanitize(uiConfig.notFoundCtaHref)}" class="button primary">${sanitize(uiConfig.notFoundCtaLabel)}</a>
        </div>`;
      return;
    }

    document.title = `${product.brand} - ${product.title} | Adokicks`;

    let imageIndex = 0;
    let selectedSize = '';

    const images = (product.images || []).length ? product.images : ['/adokicks.png'];

    function renderDetail() {
      block.innerHTML = `
        <div class="product-detail-layout">
          ${buildGalleryHTML(images, imageIndex, product.title, uiConfig)}
          ${buildProductInfoHTML(product, selectedSize, uiConfig)}
        </div>
      `;

      bindGalleryEvents(
        block,
        images,
        () => imageIndex,
        (i) => { imageIndex = i; },
        renderDetail,
        uiConfig,
      );

      bindProductInfoEvents(
        block,
        product,
        () => selectedSize,
        (size) => { selectedSize = size; },
        renderDetail,
      );
    }

    renderDetail();
  } catch (err) {
    block.innerHTML = '<p class="pg-error">Unable to load product. Please refresh.</p>';
    // eslint-disable-next-line no-console
    console.error('[product-detail]', err);
  }
}
