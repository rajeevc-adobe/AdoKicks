import { getProducts, CATEGORY_LABELS } from '../../scripts/product-store.js';
import {
  formatCurrency, isWishlisted, toggleWishlist, toast, getWishlist,
} from '../../scripts/cart-store.js';
import { fetchPlaceholders } from '../../scripts/placeholders.js';

const DEFAULT_SEARCH_SHELL = {
  inputLabel: 'Search products',
  placeholder: 'Search shoes, brands, categories...',
  submitLabel: 'Search',
  emptyText: 'No products match your search.',
  pageEmptyText: 'No products found for this query.',
  promptText: 'Enter a search term to find shoes.',
};

const DEFAULT_FILTER_SHELL = {
  filterToggleLabel: 'Toggle filters',
  sortLabel: 'Sort by price',
  sortMenuLabel: 'Sort products by price',
  lowHighLabel: 'Low to High',
  highLowLabel: 'High to Low',
  title: 'Filter & Sort',
  resetLabel: 'Reset',
  closeLabel: 'Close',
  priceLabel: 'Price Range',
  minAmountLabel: 'Minimum amount',
  maxAmountLabel: 'Maximum amount',
  genderLabel: 'Gender',
  categoryLabel: 'Categories',
  sizeLabel: 'Sizes',
  brandLabel: 'Brands',
  allLabel: 'All',
  allCategoriesLabel: 'All Categories',
  allSizesLabel: 'All Sizes',
  allBrandsLabel: 'All Brands',
  mensLabel: 'Mens',
  womensLabel: 'Womens',
  mobileKicker: 'Refine results',
  mobileTitle: 'Filters',
  noResultsText: 'No products match your filters.',
  panelAriaLabel: 'Filter products',
  desktopFormAriaLabel: 'Product filters',
  productSectionAriaLabel: 'Products',
  productResultsAriaLabel: 'Products results',
  mobileFormAriaLabel: 'Product filters for smaller screens',
  minPriceSliderLabel: 'Minimum price slider',
  maxPriceSliderLabel: 'Maximum price slider',
  trainingCategoryLabel: 'Training Shoes',
  runningCategoryLabel: 'Running Shoes',
  multisportCategoryLabel: 'Multisport Shoes',
  casualCategoryLabel: 'Casual Shoes',
  sneakersCategoryLabel: 'Sneakers',
};

const PRICE_STEP = 1;
const PRICE_MIN_GAP = 1;
const PRICE_NEAR_GAP = 1000;

const FILTER_PLACEHOLDER_KEYS = {
  filterShellFilterToggleLabel: 'filterToggleLabel',
  filterShellSortLabel: 'sortLabel',
  filterShellSortMenuLabel: 'sortMenuLabel',
  filterShellLowHighLabel: 'lowHighLabel',
  filterShellHighLowLabel: 'highLowLabel',
  filterShellTitle: 'title',
  filterShellResetLabel: 'resetLabel',
  filterShellCloseLabel: 'closeLabel',
  filterShellPriceLabel: 'priceLabel',
  filterShellMinAmountLabel: 'minAmountLabel',
  filterShellMaxAmountLabel: 'maxAmountLabel',
  filterShellGenderLabel: 'genderLabel',
  filterShellCategoryLabel: 'categoryLabel',
  filterShellSizeLabel: 'sizeLabel',
  filterShellBrandLabel: 'brandLabel',
  filterShellAllLabel: 'allLabel',
  filterShellAllCategoriesLabel: 'allCategoriesLabel',
  filterShellAllSizesLabel: 'allSizesLabel',
  filterShellAllBrandsLabel: 'allBrandsLabel',
  filterShellMensLabel: 'mensLabel',
  filterShellWomensLabel: 'womensLabel',
  filterShellMobileKicker: 'mobileKicker',
  filterShellMobileTitle: 'mobileTitle',
  filterShellNoResultsText: 'noResultsText',
  filterShellPanelAriaLabel: 'panelAriaLabel',
  filterShellDesktopFormAriaLabel: 'desktopFormAriaLabel',
  filterShellProductSectionAriaLabel: 'productSectionAriaLabel',
  filterShellProductResultsAriaLabel: 'productResultsAriaLabel',
  filterShellMobileFormAriaLabel: 'mobileFormAriaLabel',
  filterShellMinPriceSliderLabel: 'minPriceSliderLabel',
  filterShellMaxPriceSliderLabel: 'maxPriceSliderLabel',
  filterShellTrainingCategoryLabel: 'trainingCategoryLabel',
  filterShellRunningCategoryLabel: 'runningCategoryLabel',
  filterShellMultisportCategoryLabel: 'multisportCategoryLabel',
  filterShellCasualCategoryLabel: 'casualCategoryLabel',
  filterShellSneakersCategoryLabel: 'sneakersCategoryLabel',
};

export default async function decorate(block) {
  // Read DA option rows (key | value)
  const opts = readOpts(block);
  const variationClass = getBlockVariationClass(block);
  const blockGender = getBlockGender(block);
  const inferredGender = (opts.gender || blockGender || '').toLowerCase() || null;
  const variation = (opts.variation || '').toLowerCase()
    || variationClass
    || (blockGender ? 'catalog' : 'trending');

  block.innerHTML = '<div class="pg-loading" aria-busy="true"><span class="pg-spinner"></span></div>';

  try {
    if (variation === 'wishlist') { await renderWishlist(block, opts); return; }
    const products = await getProducts();
    if (variation === 'catalog') {
      const filterShell = await loadFilterShellConfig(DEFAULT_FILTER_SHELL);
      renderCatalog(block, products, { ...opts, gender: inferredGender }, filterShell);
    } else if (variation === 'featured') renderFeatured(block, products, opts);
    else if (variation === 'search') {
      const searchShell = await loadShellConfig('/fragments/search-shell', DEFAULT_SEARCH_SHELL);
      renderSearch(block, products, searchShell);
    } else renderTrending(block, products, opts);
  } catch (err) {
    block.innerHTML = '<p class="pg-error">Unable to load products. Please refresh.</p>';
    // eslint-disable-next-line no-console
    console.error('[product-grid]', err);
  }

  // Wishlist heart delegation
  block.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="wishlist"]');
    if (!btn) return;
    const added = toggleWishlist(btn.dataset.id);
    btn.classList.toggle('active', added);
    btn.setAttribute('aria-pressed', String(added));
    toast(added ? 'Added to wishlist' : 'Removed from wishlist', 'success');
  });
}

function getBlockVariationClass(block) {
  const knownVariations = ['catalog', 'featured', 'search', 'wishlist', 'trending'];
  return knownVariations.find((name) => block.classList.contains(name)) || null;
}

function camelKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+([a-z0-9])/g, (_, char) => char.toUpperCase());
}

function readShellConfig(fragment, defaults) {
  const config = { ...defaults };
  if (!fragment) return config;
  const applyPair = (label, value) => {
    const key = camelKey(label);
    if (Object.prototype.hasOwnProperty.call(defaults, key)) {
      config[key] = String(value || '').trim();
    }
  };
  const applyRow = (cells) => {
    if (cells.length < 2) return;
    applyPair(cells[0].textContent, cells[1].textContent);
  };

  fragment.querySelectorAll('tr').forEach((row) => {
    applyRow([...row.children]);
  });

  fragment.querySelectorAll(':scope > div, :scope > section').forEach((section) => {
    section.querySelectorAll(':scope > div').forEach((row) => {
      applyRow([...row.children]);
    });
  });

  fragment.querySelectorAll('div > div').forEach((row) => {
    applyRow([...row.children]);
  });

  fragment.querySelectorAll('li').forEach((item) => {
    const text = item.textContent.trim();
    const separator = text.indexOf(':');
    if (separator <= 0) return;
    applyPair(text.slice(0, separator), text.slice(separator + 1));
  });

  return config;
}

async function loadShellConfig(path, defaults) {
  try {
    const resp = await fetch(`${path}.plain.html`);
    if (!resp.ok) return { ...defaults };
    const fragment = document.createElement('main');
    fragment.innerHTML = await resp.text();
    return readShellConfig(fragment, defaults);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(`[product-grid] using fallback shell copy for ${path}`, error);
    return { ...defaults };
  }
}

async function loadFilterShellConfig(defaults = DEFAULT_FILTER_SHELL) {
  try {
    const placeholders = await fetchPlaceholders();
    return Object.entries(FILTER_PLACEHOLDER_KEYS).reduce((config, [placeholderKey, shellKey]) => {
      const value = placeholders[placeholderKey];
      if (typeof value === 'string' && value.trim()) {
        config[shellKey] = value.trim();
      }
      return config;
    }, { ...defaults });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('[product-grid] using fallback filter placeholder copy', error);
    return { ...defaults };
  }
}

function getBlockGender(block) {
  if (block.classList.contains('men') || block.classList.contains('mens')) return 'mens';
  if (block.classList.contains('women') || block.classList.contains('womens')) return 'womens';
  return null;
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

function sanitizeText(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function productCard(product, showDescription = false) {
  const firstImage = (product.images && product.images[0]) || 'adokicks.png';
  const wishActive = isWishlisted(product.id);
  return `
    <article class="product-card" role="listitem" aria-label="${product.title} product card">
      <a href="/product?id=${encodeURIComponent(product.id)}" aria-label="View ${product.title} details">
        <img src="${firstImage}" alt="${product.title} shoe image" loading="lazy">
      </a>
      <div class="product-content">
        <h3><a href="/product?id=${encodeURIComponent(product.id)}">${product.title}</a></h3>
        <p>${product.brand} | ${CATEGORY_LABELS[product.category] || product.category}</p>
        <p class="price-line"><strong>${formatCurrency(product.price)}</strong> <span class="old-price">${formatCurrency(product.originalPrice)}</span></p>
        ${showDescription ? `<p>${product.description}</p>` : ''}
        <div class="price-line card-actions-row">
          <button class="heart-btn ${wishActive ? 'active' : ''}" type="button" data-action="wishlist-toggle" data-product-id="${product.id}" aria-label="Toggle wishlist for ${product.title}" title="Wishlist">&#10084;</button>
          <a href="/product?id=${encodeURIComponent(product.id)}" class="btn-secondary" aria-label="Shop ${product.title}">Shop</a>
        </div>
      </div>
    </article>
  `;
}

function renderTrending(block, products) {
  // Extract heading and subtitle from first row of authored content
  const firstRow = block.querySelector(':scope > div');
  const heading = firstRow?.querySelector('h2')?.textContent.trim() || 'Trending Now';
  const subtitle = firstRow?.querySelector('p')?.textContent.trim() || 'Top picks flying off the shelves right now.';

  const source = [...products].sort((a, b) => (b.rating || 0) * (b.reviews || 0) - (a.rating || 0) * (a.reviews || 0));
  const width = window.innerWidth || 1200;
  const cols = width <= 480 ? 1 : width <= 680 ? 2 : width <= 1024 ? 3 : width <= 1600 ? 4 : 6;
  const rows = width <= 680 ? 6 : 3;
  const items = source.slice(0, Math.min(source.length, cols * rows));

  block.innerHTML = `
    <div class="section-card trending-wrap">
      <div class="trending-head">
        <h2>${heading}</h2>
        <p>${subtitle}</p>
      </div>
      <div class="product-grid trending-grid" role="list" aria-label="Trending products">
        ${items.map((p) => productCard(p)).join('')}
      </div>
    </div>
  `;
}

function renderFeatured(block, products, opts) {
  const limit = Number(opts.limit) || 12;
  const title = opts.title || 'Featured Premium Picks';
  const subtitle = opts.subtitle || 'Discover our curated collection of the finest athletic footwear';
  const featuredIds = (opts.ids || 'm-tr-001,m-ca-001')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  const topByPrice = [...products].sort((a, b) => b.price - a.price).slice(0, Math.max(limit, 10));
  const specificFeatured = products.filter((product) => featuredIds.includes(product.id));
  const sorted = [...topByPrice, ...specificFeatured]
    .filter((product, index, items) => items.findIndex((item) => item.id === product.id) === index)
    .slice(0, limit);

  block.classList.add('featured');

  block.innerHTML = `
    <section class="featured-section" aria-label="Top featured shoes">
      <div class="featured-container">
        <div class="featured-hero">
          <h1 class="featured-title">${sanitizeText(title)}</h1>
          <p class="featured-subtitle">${sanitizeText(subtitle)}</p>
        </div>
        <div class="featured-grid product-grid--featured" role="list" aria-label="Featured shoes">
          ${sorted.map((p) => productCard(p, true)).join('')}
        </div>
      </div>
    </section>`;
}

function renderSearch(block, products, shell = DEFAULT_SEARCH_SHELL) {
  const q = new URLSearchParams(window.location.search).get('q')?.toLowerCase().trim() || '';
  const hits = q ? products.filter((p) => `${p.title} ${p.brand} ${p.category}`.toLowerCase().includes(q)) : [];

  block.innerHTML = `
    <div class="search-page">
      <form class="search-form" role="search" aria-label="Product search">
        <input type="search" name="q" class="search-input" value="${sanitizeText(q)}"
          placeholder="${sanitizeText(shell.placeholder)}" aria-label="${sanitizeText(shell.inputLabel)}" autocomplete="off">
        <button type="submit" class="btn-primary">${sanitizeText(shell.submitLabel)}</button>
      </form>
      ${q
    ? `<p class="search-summary" aria-live="polite">
             ${hits.length} result(s) for "<strong>${sanitizeText(q)}</strong>"
           </p>
           <div class="product-grid" role="list">
             ${hits.length
    ? hits.map((p) => productCard(p)).join('')
    : `<p class="no-results">${sanitizeText(shell.pageEmptyText)}</p>`}
           </div>`
    : `<p class="search-prompt">${sanitizeText(shell.promptText)}</p>`
}
    </div>`;

  block.querySelector('.search-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = block.querySelector('[name="q"]')?.value.trim();
    if (val) window.location.search = `?q=${encodeURIComponent(val)}`;
  });
}

// eslint-disable-next-line no-unused-vars
async function renderWishlistLegacy(block) {
  const wishlist = getWishlist();
  if (!wishlist.length) {
    block.innerHTML = `
      <div class="wishlist-empty">
        <div class="wishlist-empty-icon">&#9825;</div>
        <h2>Your wishlist is empty</h2>
        <p>Browse our collections and hit &#9825; on any shoe to save it here.</p>
        <a href="/categories" class="button primary">Start Browsing</a>
      </div>`;
    return;
  }
  const products = await getProducts();
  const items = wishlist.map((id) => products.find((p) => p.id === id)).filter(Boolean);
  block.innerHTML = `
    <div class="product-grid" role="list" aria-label="Your wishlist">
      ${items.map((p) => productCard(p)).join('')}
    </div>`;

  block.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="wishlist"]');
    if (btn) {
      toggleWishlist(btn.dataset.id);
      btn.closest('.product-card')?.remove();
    }
  });
}

async function renderWishlist(block, opts = {}) {
  const wishlist = getWishlist();
  block.classList.add('wishlist');

  if (!wishlist.length) {
    const title = opts.emptytitle || opts.title || 'Your wishlist is empty';
    const text = opts.emptytext || opts.subtitle || 'Browse our collections and hit the heart on any shoe to save it here.';
    const ctaLabel = opts.cta || opts.ctalabel || 'Start Browsing';
    const ctaHref = opts.href || '/categories';
    block.innerHTML = `
      <div class="wishlist-empty">
        <div class="wishlist-empty-icon">&#9825;</div>
        <h2>${sanitizeText(title)}</h2>
        <p>${sanitizeText(text)}</p>
        <a href="${sanitizeText(ctaHref)}" class="button primary">${sanitizeText(ctaLabel)}</a>
      </div>`;
    return;
  }

  const products = await getProducts();
  const items = wishlist.map((id) => products.find((p) => p.id === id)).filter(Boolean);
  block.innerHTML = `
    <section aria-label="Saved wishlist products">
      <h1>${sanitizeText(opts.title || 'Your Wishlist')}</h1>
      <div id="wishlist-grid" class="product-grid" role="list" aria-label="Wishlist items">
        ${items.map((p) => productCard(p)).join('')}
      </div>
    </section>`;

  if (!block.dataset.wishlistBound) {
    block.dataset.wishlistBound = 'true';
    block.addEventListener('click', async (e) => {
      const { target } = e;
      if (!(target instanceof HTMLElement)) return;

      const wishBtn = target.closest('[data-action="wishlist-toggle"]');
      if (wishBtn instanceof HTMLElement) {
        e.preventDefault();
        e.stopPropagation();
        toggleWishlist(wishBtn.dataset.productId);
        toast('Removed from wishlist', 'success');
        await renderWishlist(block, opts);
      }
    });
  }
}

function renderCatalog(block, products, opts, filterShell = DEFAULT_FILTER_SHELL) {
  const genderPre = (opts.gender || (block.classList.contains('mens') ? 'mens' : block.classList.contains('womens') ? 'womens' : null) || '').toLowerCase() || null;
  const pool = genderPre ? products.filter((p) => p.gender === genderPre) : products;
  const includeGender = !genderPre;

  // Create layout structure for renderCatalogPage
  block.innerHTML = `
    <div class="catalog-layout">
      <aside id="filter-panel" class="filter-panel" aria-label="${sanitizeText(filterShell.panelAriaLabel)}"></aside>
      <section id="product-grid-section" aria-label="${sanitizeText(filterShell.productSectionAriaLabel)}">
        <h1>${sanitizeText(opts.title || 'Products')}</h1>
        <div id="product-grid" class="product-grid" role="list" aria-label="${sanitizeText(filterShell.productResultsAriaLabel)}"></div>
      </section>
    </div>
  `;

  // Render the full catalog page with advanced filters
  renderCatalogPage(pool, includeGender, genderPre, filterShell);
}

// ===== Advanced Filter Functions from Reference =====

function buildCatalogFilters(products, includeGender) {
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))].sort();
  const sizes = [...new Set(products.flatMap((p) => p.sizes || []).map((s) => String(s)).filter(Boolean))]
    .sort((a, b) => Number(a) - Number(b));
  const brands = [...new Set(products.map((p) => p.brand).filter(Boolean))].sort();
  const pricesArray = products.map((p) => Number(p.price) || 0);
  const absoluteMinPrice = pricesArray.length ? Math.min(...pricesArray) : 0;
  const absoluteMaxPrice = Math.max(...pricesArray, 0);

  return {
    categories,
    sizes,
    brands,
    absoluteMinPrice,
    absoluteMaxPrice,
    maxPrice: absoluteMaxPrice,
    includeGender,
  };
}

function getCatalogDefaults(filtersMeta, includeGender, forcedGender) {
  const query = new URLSearchParams(window.location.search);
  const categories = new Set();
  const sizes = new Set();
  const brands = new Set();

  (query.get('category') || query.get('categories') || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
    .forEach((v) => {
      if (filtersMeta.categories.includes(v)) categories.add(v);
    });

  (query.get('size') || query.get('sizes') || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
    .forEach((v) => {
      if (filtersMeta.sizes.includes(v)) sizes.add(v);
    });

  (query.get('brand') || query.get('brands') || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
    .forEach((v) => {
      if (filtersMeta.brands.includes(v)) brands.add(v);
    });

  const reqMin = query.get('minPrice');
  const reqMax = query.get('maxPrice');
  const minPriceValue = reqMin ? Number(reqMin) : NaN;
  const maxPriceValue = reqMax ? Number(reqMax) : NaN;
  const minPrice = Number.isFinite(minPriceValue)
    ? Math.max(0, Math.min(minPriceValue, filtersMeta.absoluteMaxPrice))
    : filtersMeta.absoluteMinPrice;
  const maxPriceRaw = Number.isFinite(maxPriceValue)
    ? Math.max(minPrice, Math.min(maxPriceValue, filtersMeta.absoluteMaxPrice))
    : filtersMeta.absoluteMaxPrice;
  const sortParam = (query.get('sort') || '').toLowerCase();
  const sort = ['low-high', 'high-low'].includes(sortParam) ? sortParam : 'default';
  const queryGender = (query.get('gender') || '').toLowerCase();
  const gender = forcedGender || (includeGender && ['mens', 'womens'].includes(queryGender) ? queryGender : 'all');

  return {
    minPrice,
    maxPrice: maxPriceRaw,
    categories,
    sizes,
    brands,
    gender,
    sort,
  };
}

function matchesFilterSelection(product, selected, excludeGroup = '') {
  if (product.price < selected.minPrice || product.price > selected.maxPrice) return false;
  if (excludeGroup !== 'category' && selected.categories.size && !selected.categories.has(product.category)) return false;
  if (excludeGroup !== 'size' && selected.sizes.size && !(product.sizes || []).some((s) => selected.sizes.has(String(s)))) return false;
  if (excludeGroup !== 'brand' && selected.brands.size && !selected.brands.has(product.brand)) return false;
  if (selected.gender && selected.gender !== 'all' && product.gender !== selected.gender) return false;
  return true;
}

function sortedWithSelected(values, selected, sorter = undefined) {
  const merged = [...new Set([...values.filter(Boolean), ...selected])];
  return sorter ? merged.sort(sorter) : merged.sort();
}

function getAvailableFilterMeta(products, selected) {
  const categoryProducts = products.filter((product) => matchesFilterSelection(product, selected, 'category'));
  const sizeProducts = products.filter((product) => matchesFilterSelection(product, selected, 'size'));
  const brandProducts = products.filter((product) => matchesFilterSelection(product, selected, 'brand'));

  return {
    categories: sortedWithSelected(categoryProducts.map((p) => p.category), selected.categories),
    sizes: sortedWithSelected(
      sizeProducts.flatMap((p) => (p.sizes || []).map((s) => String(s))),
      selected.sizes,
      (a, b) => Number(a) - Number(b),
    ),
    brands: sortedWithSelected(brandProducts.map((p) => p.brand), selected.brands),
  };
}

function buildTitleRow(gridSection, shell = DEFAULT_FILTER_SHELL) {
  const heading = gridSection.querySelector('h1');
  if (!heading || gridSection.querySelector('.catalog-title-row')) return;

  const row = document.createElement('div');
  row.className = 'catalog-title-row';

  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'catalog-filter-toggle';
  toggleBtn.type = 'button';
  toggleBtn.className = 'catalog-filter-toggle';
  toggleBtn.setAttribute('aria-label', shell.filterToggleLabel);
  toggleBtn.setAttribute('aria-controls', 'filter-panel');
  toggleBtn.setAttribute('aria-expanded', 'false');
  toggleBtn.innerHTML = '<img src="assests/icons/filter-svgrepo-com.svg" alt="" aria-hidden="true">';

  const titleControls = document.createElement('div');
  titleControls.className = 'catalog-title-controls';

  const sortWrap = document.createElement('div');
  sortWrap.className = 'catalog-sort-wrap';

  const sortBtn = document.createElement('button');
  sortBtn.id = 'catalog-sort-toggle';
  sortBtn.type = 'button';
  sortBtn.className = 'catalog-sort-toggle';
  sortBtn.setAttribute('aria-label', shell.sortLabel);
  sortBtn.setAttribute('aria-expanded', 'false');
  sortBtn.setAttribute('aria-controls', 'catalog-sort-menu');
  sortBtn.innerHTML = `
    <svg viewBox="0 0 24 24" role="img" aria-hidden="true" focusable="false">
      <path d="M4 7h10v2H4V7Zm0 5h7v2H4v-2Zm0 5h4v2H4v-2Zm13-9 3 3h-2v7h-2v-7h-2l3-3Z" fill="currentColor"></path>
    </svg>
  `;

  const sortMenu = document.createElement('div');
  sortMenu.id = 'catalog-sort-menu';
  sortMenu.className = 'catalog-sort-menu hidden';
  sortMenu.setAttribute('role', 'menu');
  sortMenu.setAttribute('aria-label', shell.sortMenuLabel);
  sortMenu.innerHTML = `
    <button type="button" class="catalog-sort-option" data-sort-option="low-high" role="menuitemradio" aria-checked="false">${sanitizeText(shell.lowHighLabel)}</button>
    <button type="button" class="catalog-sort-option" data-sort-option="high-low" role="menuitemradio" aria-checked="false">${sanitizeText(shell.highLowLabel)}</button>
  `;

  sortWrap.appendChild(sortBtn);
  sortWrap.appendChild(sortMenu);
  titleControls.appendChild(sortWrap);
  titleControls.appendChild(toggleBtn);
  heading.parentNode.insertBefore(row, heading);
  row.appendChild(heading);
  row.appendChild(titleControls);
}

function buildMobileDropdownGroup(groupName, label, options, allLabel) {
  const allOptions = [{ value: 'all', label: allLabel }, ...options];
  return `
    <section class="mobile-filter-group" aria-label="${sanitizeText(label)} filter options" data-mobile-filter-group="${groupName}">
      <label class="mobile-filter-label" for="mobile-dropdown-${groupName}">${sanitizeText(label)}</label>
      <button id="mobile-dropdown-${groupName}" type="button" class="mobile-filter-dropdown-trigger"
        data-mobile-filter-trigger="${groupName}" aria-haspopup="listbox" aria-expanded="false"
        aria-controls="mobile-option-list-${groupName}">
        <span class="mobile-filter-dropdown-value" data-mobile-filter-value="${groupName}">${sanitizeText(allLabel)}</span>
      </button>
      <div id="mobile-option-list-${groupName}" class="mobile-filter-dropdown-list hidden"
        role="listbox" aria-label="${sanitizeText(label)} options">
        ${allOptions.map((opt, idx) => `<button type="button"
            class="mobile-filter-option${idx === 0 ? ' is-active' : ''}"
            data-mobile-filter-option="${groupName}"
            data-value="${sanitizeText(opt.value)}"
            data-label="${sanitizeText(opt.label)}"
            aria-pressed="${idx === 0 ? 'true' : 'false'}">${sanitizeText(opt.label)}</button>`).join('')}
      </div>
    </section>
  `;
}

function renderDesktopFilterOptions(name, options, selected, getLabel = (value) => value) {
  return options.map((value) => `
    <label class="filter-chip">
      <input type="checkbox" name="${name}" value="${sanitizeText(value)}"${selected.has(value) ? ' checked' : ''}>
      <span>${sanitizeText(getLabel(value))}</span>
    </label>
  `).join('');
}

function renderPriceRange(filtersMeta, selected, suffix = '', shell = DEFAULT_FILTER_SHELL) {
  const id = suffix ? `-${suffix}` : '';
  const minInputMax = Math.max(0, selected.maxPrice - PRICE_MIN_GAP);
  const maxInputMin = Math.min(filtersMeta.maxPrice, selected.minPrice + PRICE_MIN_GAP);
  return `
    <div class="price-range-stack">
      <div class="price-range-input-row">
        <div class="price-range-control">
          <label for="min-price${id}">${sanitizeText(shell.minAmountLabel)}</label>
          <input id="min-price${id}" type="number" min="0" max="${minInputMax}" step="${PRICE_STEP}" value="${selected.minPrice}" aria-label="${sanitizeText(shell.minAmountLabel)}">
        </div>
        <div class="price-range-control">
          <label for="max-price${id}">${sanitizeText(shell.maxAmountLabel)}</label>
          <input id="max-price${id}" type="number" min="${maxInputMin}" max="${filtersMeta.maxPrice}" step="${PRICE_STEP}" value="${selected.maxPrice}" aria-label="${sanitizeText(shell.maxAmountLabel)}">
        </div>
      </div>
      <div class="price-range-dual" data-price-range>
        <div class="price-range-track" aria-hidden="true"></div>
        <div class="price-range-progress" aria-hidden="true"></div>
        <input id="min-price-slider${id}" class="price-range-slider price-range-slider-min" type="range" min="0" max="${filtersMeta.maxPrice}" step="${PRICE_STEP}" value="${selected.minPrice}" aria-label="${sanitizeText(shell.minPriceSliderLabel)}">
        <input id="max-price-slider${id}" class="price-range-slider price-range-slider-max" type="range" min="0" max="${filtersMeta.maxPrice}" step="${PRICE_STEP}" value="${selected.maxPrice}" aria-label="${sanitizeText(shell.maxPriceSliderLabel)}">
      </div>
      <div class="range-scale"><span>${formatCurrency(0)}</span><span>${formatCurrency(filtersMeta.maxPrice)}</span></div>
    </div>
  `;
}

function ensureFilterBackdrop() {
  let bd = document.getElementById('catalog-filter-backdrop');
  if (!bd) {
    bd = document.createElement('div');
    bd.id = 'catalog-filter-backdrop';
    bd.className = 'filter-panel-backdrop hidden';
    document.body.appendChild(bd);
  }
  return bd;
}

function setFilterPanelVisibility(panel, filterToggleBtn, forceOpen) {
  const shouldOpen = typeof forceOpen === 'boolean'
    ? forceOpen
    : panel.classList.contains('filter-panel-collapsed');
  const isDesktop = window.innerWidth > 1024;
  const backdrop = document.getElementById('catalog-filter-backdrop');

  panel.classList.toggle('filter-panel-collapsed', !shouldOpen);
  filterToggleBtn?.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
  backdrop?.classList.toggle('hidden', !(shouldOpen && !isDesktop));
}

function syncFilterControls(panel, filtersMeta, selected, sortMenu, shell = DEFAULT_FILTER_SHELL) {
  selected.minPrice = Math.max(0, Math.min(selected.minPrice, selected.maxPrice - PRICE_MIN_GAP));
  selected.maxPrice = Math.min(filtersMeta.absoluteMaxPrice, Math.max(selected.maxPrice, selected.minPrice + PRICE_MIN_GAP));

  // Sync number inputs and sliders
  [
    { id: 'min-price', isMin: true },
    { id: 'max-price', isMin: false },
    { id: 'min-price-mobile', isMin: true },
    { id: 'max-price-mobile', isMin: false },
  ].forEach(({ id, isMin }) => {
    const input = document.getElementById(id);
    if (input instanceof HTMLInputElement) {
      input.value = String(isMin ? selected.minPrice : selected.maxPrice);
      input.min = String(isMin ? 0 : selected.minPrice);
      input.max = String(isMin ? selected.maxPrice : filtersMeta.absoluteMaxPrice);
    }
  });

  [
    { id: 'min-price-slider', isMin: true },
    { id: 'max-price-slider', isMin: false },
    { id: 'min-price-slider-mobile', isMin: true },
    { id: 'max-price-slider-mobile', isMin: false },
  ].forEach(({ id, isMin }) => {
    const input = document.getElementById(id);
    if (input instanceof HTMLInputElement) {
      input.value = String(isMin ? selected.minPrice : selected.maxPrice);
      input.min = '0';
      input.max = String(filtersMeta.absoluteMaxPrice);
    }
  });

  // Sync range progress visual
  const maxVal = Math.max(filtersMeta.maxPrice, 1);
  const start = (selected.minPrice / maxVal) * 100;
  const end = (selected.maxPrice / maxVal) * 100;
  panel.querySelectorAll('[data-price-range]').forEach((el) => {
    if (el instanceof HTMLElement) {
      el.style.setProperty('--range-start', `${start}%`);
      el.style.setProperty('--range-end', `${end}%`);
    }
  });

  panel.querySelectorAll('.price-range-slider').forEach((input) => {
    input.classList.toggle('price-range-slider-near', selected.maxPrice - selected.minPrice <= PRICE_NEAR_GAP);
  });

  // Sync desktop checkboxes
  panel.querySelectorAll('input[name="category"]').forEach((el) => {
    if (el instanceof HTMLInputElement) el.checked = selected.categories.has(el.value);
  });
  panel.querySelectorAll('input[name="size"]').forEach((el) => {
    if (el instanceof HTMLInputElement) el.checked = selected.sizes.has(el.value);
  });
  panel.querySelectorAll('input[name="brand"]').forEach((el) => {
    if (el instanceof HTMLInputElement) el.checked = selected.brands.has(el.value);
  });
  panel.querySelectorAll('input[name="gender"]').forEach((el) => {
    if (el instanceof HTMLInputElement) el.checked = el.value === selected.gender;
  });

  // Sync mobile option buttons
  panel.querySelectorAll('[data-mobile-filter-option]').forEach((btn) => {
    if (!(btn instanceof HTMLButtonElement)) return;
    const group = btn.dataset.mobileFilterOption;
    const val = btn.dataset.value || 'all';
    let active = false;
    if (group === 'gender') active = selected.gender === val;
    if (group === 'category') active = val === 'all' ? !selected.categories.size : selected.categories.has(val);
    if (group === 'size') active = val === 'all' ? !selected.sizes.size : selected.sizes.has(val);
    if (group === 'brand') active = val === 'all' ? !selected.brands.size : selected.brands.has(val);
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });

  // Sync mobile dropdown value labels
  panel.querySelectorAll('[data-mobile-filter-value]').forEach((label) => {
    if (!(label instanceof HTMLElement)) return;
    const group = label.dataset.mobileFilterValue;
    const active = panel.querySelector(`[data-mobile-filter-option="${group}"].is-active`);
    if (active instanceof HTMLButtonElement) label.textContent = active.dataset.label || active.textContent || shell.allLabel;
  });

  // Sync sort menu active state
  sortMenu?.querySelectorAll('[data-sort-option]').forEach((opt) => {
    if (!(opt instanceof HTMLButtonElement)) return;
    const active = opt.dataset.sortOption === selected.sort;
    opt.classList.toggle('is-active', active);
    opt.setAttribute('aria-checked', active ? 'true' : 'false');
  });
}

function renderFiltered(products, selected, grid, shell = DEFAULT_FILTER_SHELL) {
  let filtered = products.filter(
    (p) => p.price >= selected.minPrice && p.price <= selected.maxPrice,
  );

  if (selected.categories.size) {
    filtered = filtered.filter((p) => selected.categories.has(p.category));
  }
  if (selected.sizes.size) {
    filtered = filtered.filter((p) => (p.sizes || []).some((s) => selected.sizes.has(String(s))));
  }
  if (selected.brands.size) {
    filtered = filtered.filter((p) => selected.brands.has(p.brand));
  }

  if (selected.sort === 'low-high') {
    filtered = [...filtered].sort((a, b) => a.price - b.price);
  }
  if (selected.sort === 'high-low') {
    filtered = [...filtered].sort((a, b) => b.price - a.price);
  }

  grid.innerHTML = filtered.length
    ? filtered.map((p) => productCard(p)).join('')
    : `<p>${sanitizeText(shell.noResultsText)}</p>`;
}

function renderCatalogPage(products, includeGender = false, forcedGender = null, shell = DEFAULT_FILTER_SHELL) {
  const panel = document.getElementById('filter-panel');
  const grid = document.getElementById('product-grid');
  const gridSection = document.getElementById('product-grid-section');
  if (!panel || !grid || !gridSection) return;

  // 1. Build title row
  buildTitleRow(gridSection, shell);

  // 2. Derive filter meta + defaults from URL params
  const allMeta = buildCatalogFilters(products, includeGender);
  const selected = getCatalogDefaults(allMeta, includeGender, forcedGender);

  // 3. Build mobile dropdown helpers
  const categoryLabels = {
    training: shell.trainingCategoryLabel,
    running: shell.runningCategoryLabel,
    multisport: shell.multisportCategoryLabel,
    casual: shell.casualCategoryLabel,
    sneakers: shell.sneakersCategoryLabel,
  };

  // 4. Inject desktop + mobile filter forms into panel
  panel.innerHTML = `
    <form id="catalog-filter-form" class="filter-desktop-form" aria-label="${sanitizeText(shell.desktopFormAriaLabel)}">
      <div class="filter-panel-head">
        <h2>${sanitizeText(shell.title)}</h2>
        <div class="filter-panel-head-actions">
          <button id="reset-filters" class="btn-outline filter-reset-btn" type="button" data-filter-reset aria-label="${sanitizeText(shell.resetLabel)}">${sanitizeText(shell.resetLabel)}</button>
          <button id="close-filters-desktop" class="btn-outline filter-close-btn" type="button" aria-label="${sanitizeText(shell.closeLabel)}">${sanitizeText(shell.closeLabel)}</button>
        </div>
      </div>
      <div class="filter-group filter-group-range"><h3>${sanitizeText(shell.priceLabel)}</h3>${renderPriceRange(allMeta, selected, '', shell)}</div>
      ${includeGender ? `<div class="filter-group"><h3>${sanitizeText(shell.genderLabel)}</h3><div class="checkbox-list filter-options-inline"><label class="filter-chip"><input type="radio" name="gender" value="all" checked><span>${sanitizeText(shell.allLabel)}</span></label><label class="filter-chip"><input type="radio" name="gender" value="mens"><span>${sanitizeText(shell.mensLabel)}</span></label><label class="filter-chip"><input type="radio" name="gender" value="womens"><span>${sanitizeText(shell.womensLabel)}</span></label></div></div>` : ''}
      <div class="filter-group"><h3>${sanitizeText(shell.categoryLabel)}</h3><div class="checkbox-list filter-options-grid" data-filter-options="category"></div></div>
      <div class="filter-group"><h3>${sanitizeText(shell.sizeLabel)}</h3><div class="checkbox-list filter-options-grid" data-filter-options="size"></div></div>
      <div class="filter-group"><h3>${sanitizeText(shell.brandLabel)}</h3><div class="checkbox-list filter-options-grid" data-filter-options="brand"></div></div>
    </form>

    <form id="catalog-filter-mobile" class="filter-mobile-form" aria-label="${sanitizeText(shell.mobileFormAriaLabel)}">
      <div class="filter-mobile-bar">
        <div><p class="filter-mobile-kicker">${sanitizeText(shell.mobileKicker)}</p><h2>${sanitizeText(shell.mobileTitle)}</h2></div>
        <div class="filter-mobile-actions">
          <button id="reset-filters-mobile" class="btn-outline filter-reset-btn" type="button" data-filter-reset aria-label="${sanitizeText(shell.resetLabel)}">${sanitizeText(shell.resetLabel)}</button>
          <button id="close-filters-mobile" class="btn-outline filter-close-btn" type="button" aria-label="${sanitizeText(shell.closeLabel)}">${sanitizeText(shell.closeLabel)}</button>
        </div>
      </div>
      <div class="filter-group filter-group-range"><h3>${sanitizeText(shell.priceLabel)}</h3>${renderPriceRange(allMeta, selected, 'mobile', shell)}</div>
      <div data-mobile-filter-options="gender"></div>
      <div data-mobile-filter-options="category"></div>
      <div data-mobile-filter-options="size"></div>
      <div data-mobile-filter-options="brand"></div>
    </form>
  `;

  // 5. Wire up backdrop, toggle, sort, close, reset, input/change/click events
  const filterToggleBtn = document.getElementById('catalog-filter-toggle');
  const sortToggleBtn = document.getElementById('catalog-sort-toggle');
  const sortMenu = document.getElementById('catalog-sort-menu');
  const filterBackdrop = ensureFilterBackdrop();

  setFilterPanelVisibility(panel, filterToggleBtn, false);

  filterToggleBtn?.addEventListener('click', () => setFilterPanelVisibility(panel, filterToggleBtn));
  filterBackdrop?.addEventListener('click', () => setFilterPanelVisibility(panel, filterToggleBtn, false));
  document.getElementById('close-filters-desktop')?.addEventListener('click', () => setFilterPanelVisibility(panel, filterToggleBtn, false));
  document.getElementById('close-filters-mobile')?.addEventListener('click', () => setFilterPanelVisibility(panel, filterToggleBtn, false));
  window.addEventListener('resize', () => setFilterPanelVisibility(panel, filterToggleBtn, false), { passive: true });
  document.addEventListener('click', (event) => {
    const { target } = event;
    if (!(target instanceof Element)) return;
    const panelOpen = !panel.classList.contains('filter-panel-collapsed');
    if (!panelOpen) return;
    if (panel.contains(target) || filterToggleBtn?.contains(target) || filterBackdrop?.contains(target)) return;
    setFilterPanelVisibility(panel, filterToggleBtn, false);
  });

  // Sort toggle
  sortToggleBtn?.addEventListener('click', () => {
    const open = sortMenu.classList.contains('hidden');
    sortMenu.classList.toggle('hidden', !open);
    sortToggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  sortMenu?.addEventListener('click', (e) => {
    const btn = e.target;
    if (!(btn instanceof HTMLButtonElement) || !btn.dataset.sortOption) return;
    selected.sort = btn.dataset.sortOption;
    doRender();
    sortMenu.classList.add('hidden');
    sortToggleBtn?.setAttribute('aria-expanded', 'false');
  });
  document.addEventListener('click', (e) => {
    if (!e.target?.closest('.catalog-sort-wrap')) {
      sortMenu?.classList.add('hidden');
      sortToggleBtn?.setAttribute('aria-expanded', 'false');
    }
  });

  // Reset
  panel.querySelectorAll('[data-filter-reset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      selected.minPrice = allMeta.absoluteMinPrice;
      selected.maxPrice = allMeta.absoluteMaxPrice;
      selected.categories.clear();
      selected.sizes.clear();
      selected.brands.clear();
      selected.gender = 'all';
      selected.sort = 'default';
      [document.getElementById('catalog-filter-form'), document.getElementById('catalog-filter-mobile')]
        .forEach((form) => { if (form instanceof HTMLFormElement) form.reset(); });
      doRender();
    });
  });

  // Price input / slider
  panel.addEventListener('input', (e) => {
    const t = e.target;
    if (!(t instanceof HTMLInputElement)) return;
    if (t.type !== 'range') return;
    if (t.id.startsWith('min-price')) {
      selected.minPrice = Math.max(0, Math.min(Number(t.value), selected.maxPrice - PRICE_MIN_GAP));
      t.value = String(selected.minPrice);
      doRender();
    }
    if (t.id.startsWith('max-price')) {
      selected.maxPrice = Math.min(allMeta.absoluteMaxPrice, Math.max(Number(t.value), selected.minPrice + PRICE_MIN_GAP));
      t.value = String(selected.maxPrice);
      doRender();
    }
  });

  // Checkbox change
  panel.addEventListener('change', (e) => {
    const t = e.target;
    if (!(t instanceof HTMLInputElement)) return;
    if (t.type === 'number') {
      const value = t.value.trim() === '' ? NaN : Number(t.value);
      if (t.id.startsWith('min-price')) {
        selected.minPrice = Number.isFinite(value)
          ? Math.max(0, Math.min(value, selected.maxPrice - PRICE_MIN_GAP))
          : 0;
        doRender();
        return;
      }
      if (t.id.startsWith('max-price')) {
        selected.maxPrice = Number.isFinite(value)
          ? Math.min(allMeta.absoluteMaxPrice, Math.max(value, selected.minPrice + PRICE_MIN_GAP))
          : allMeta.absoluteMaxPrice;
        doRender();
        return;
      }
    }
    if (t.name === 'category') {
      if (t.checked) selected.categories.add(t.value);
      else selected.categories.delete(t.value);
    }
    if (t.name === 'size') {
      if (t.checked) selected.sizes.add(t.value);
      else selected.sizes.delete(t.value);
    }
    if (t.name === 'brand') {
      if (t.checked) selected.brands.add(t.value);
      else selected.brands.delete(t.value);
    }
    if (t.name === 'gender') { selected.gender = t.value; }
    doRender();
  });

  // Mobile dropdown clicks
  function closeAllMobileDropdowns() {
    panel.querySelectorAll('.mobile-filter-dropdown-list').forEach((l) => l.classList.add('hidden'));
    panel.querySelectorAll('[data-mobile-filter-trigger]').forEach((btn) => btn.setAttribute('aria-expanded', 'false'));
  }

  panel.addEventListener('click', (e) => {
    const tgt = e.target;
    if (!(tgt instanceof Element)) return;

    const trigger = tgt.closest('[data-mobile-filter-trigger]');
    if (trigger instanceof HTMLButtonElement) {
      const group = trigger.dataset.mobileFilterTrigger;
      const list = panel.querySelector(`#mobile-option-list-${group}`);
      if (!(list instanceof HTMLElement)) return;
      const open = list.classList.contains('hidden');
      closeAllMobileDropdowns();
      list.classList.toggle('hidden', !open);
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      return;
    }

    const optBtn = tgt.closest('[data-mobile-filter-option]');
    if (!(optBtn instanceof HTMLButtonElement)) {
      if (!tgt.closest('.mobile-filter-group')) closeAllMobileDropdowns();
      return;
    }

    const group = optBtn.dataset.mobileFilterOption;
    const val = optBtn.dataset.value || 'all';
    if (group === 'gender') { selected.gender = val; }
    if (group === 'category') { selected.categories.clear(); if (val !== 'all') selected.categories.add(val); }
    if (group === 'size') { selected.sizes.clear(); if (val !== 'all') selected.sizes.add(val); }
    if (group === 'brand') { selected.brands.clear(); if (val !== 'all') selected.brands.add(val); }
    closeAllMobileDropdowns();
    doRender();
  });

  // 6. Render function
  function refreshFilterOptions() {
    const availableMeta = getAvailableFilterMeta(products, selected);
    const categoryOptions = availableMeta.categories.map((c) => ({ value: c, label: categoryLabels[c] || c }));
    const sizeOptions = availableMeta.sizes.map((s) => ({ value: String(s), label: String(s) }));
    const brandOptions = availableMeta.brands.map((b) => ({ value: b, label: b }));

    const categoryWrap = panel.querySelector('[data-filter-options="category"]');
    const sizeWrap = panel.querySelector('[data-filter-options="size"]');
    const brandWrap = panel.querySelector('[data-filter-options="brand"]');
    if (categoryWrap) categoryWrap.innerHTML = renderDesktopFilterOptions('category', availableMeta.categories, selected.categories, (c) => categoryLabels[c] || c);
    if (sizeWrap) sizeWrap.innerHTML = renderDesktopFilterOptions('size', availableMeta.sizes, selected.sizes);
    if (brandWrap) brandWrap.innerHTML = renderDesktopFilterOptions('brand', availableMeta.brands, selected.brands);

    const mobileGenderWrap = panel.querySelector('[data-mobile-filter-options="gender"]');
    const mobileCategoryWrap = panel.querySelector('[data-mobile-filter-options="category"]');
    const mobileSizeWrap = panel.querySelector('[data-mobile-filter-options="size"]');
    const mobileBrandWrap = panel.querySelector('[data-mobile-filter-options="brand"]');
    if (mobileGenderWrap) {
      mobileGenderWrap.innerHTML = includeGender
        ? buildMobileDropdownGroup(
          'gender',
          shell.genderLabel,
          [{ value: 'mens', label: shell.mensLabel }, { value: 'womens', label: shell.womensLabel }],
          shell.allLabel,
        )
        : '';
    }
    if (mobileCategoryWrap) mobileCategoryWrap.innerHTML = buildMobileDropdownGroup('category', shell.categoryLabel, categoryOptions, shell.allCategoriesLabel);
    if (mobileSizeWrap) mobileSizeWrap.innerHTML = buildMobileDropdownGroup('size', shell.sizeLabel, sizeOptions, shell.allSizesLabel);
    if (mobileBrandWrap) mobileBrandWrap.innerHTML = buildMobileDropdownGroup('brand', shell.brandLabel, brandOptions, shell.allBrandsLabel);
  }

  function doRender() {
    refreshFilterOptions();
    syncFilterControls(panel, allMeta, selected, sortMenu, shell);
    renderFiltered(products, selected, grid, shell);
  }

  doRender(); // initial render
}
