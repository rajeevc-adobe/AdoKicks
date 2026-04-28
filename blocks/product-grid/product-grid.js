import { getProducts, buildFiltersMeta, filterProducts, CATEGORY_LABELS } from '../../scripts/product-store.js';
import { formatCurrency, isWishlisted, toggleWishlist, toast, getWishlist } from '../../scripts/cart-store.js';

export default async function decorate(block) {
  // Read DA option rows (key | value)
  const opts = readOpts(block);
  const variation = opts.variation
    || (block.classList.contains('catalog')   ? 'catalog'
    :  block.classList.contains('featured')   ? 'featured'
    :  block.classList.contains('search')     ? 'search'
    :  block.classList.contains('wishlist')   ? 'wishlist'
    : 'trending');

  block.innerHTML = `<div class="pg-loading" aria-busy="true"><span class="pg-spinner"></span></div>`;

  try {
    if (variation === 'wishlist') { await renderWishlist(block); return; }
    const products = await getProducts();
    if      (variation === 'catalog')  renderCatalog(block, products, opts);
    else if (variation === 'featured') renderFeatured(block, products, opts);
    else if (variation === 'search')   renderSearch(block, products);
    else                               renderTrending(block, products, opts);
  } catch (err) {
    block.innerHTML = `<p class="pg-error">Unable to load products. Please refresh.</p>`;
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

function productCard(p, showDesc = false) {
  const wished = isWishlisted(p.id);
  return `
    <article class="product-card" role="listitem">
      <a href="/product?id=${encodeURIComponent(p.id)}" aria-label="View ${p.title}">
        <img src="${p.images[0] || ''}" alt="${p.title}" loading="lazy" width="300" height="300">
      </a>
      <div class="product-content">
        <h3><a href="/product?id=${encodeURIComponent(p.id)}">${p.title}</a></h3>
        <p class="brand-cat">${p.brand} · ${p.categoryLabel}</p>
        <div class="price-line">
          <strong>${formatCurrency(p.price)}</strong>
          <span class="old-price">${formatCurrency(p.originalPrice)}</span>
        </div>
        ${showDesc && p.description ? `<p class="product-desc">${p.description}</p>` : ''}
        <div class="card-actions-row">
          <button class="heart-btn${wished ? ' active' : ''}"
            data-action="wishlist" data-id="${p.id}"
            aria-label="${wished ? 'Remove from' : 'Add to'} wishlist"
            aria-pressed="${wished}">&#10084;</button>
          <a href="/product?id=${encodeURIComponent(p.id)}" class="button secondary">Shop</a>
        </div>
      </div>
    </article>`;
}

function renderTrending(block, products, opts) {
  const limit = Number(opts.limit) || 8;
  const sorted = [...products]
    .sort((a, b) => (b.rating * b.reviews) - (a.rating * a.reviews))
    .slice(0, limit);

  block.innerHTML = `
    <div class="section-card trending-wrap">
      <div class="trending-head">
        <div>
          <h2>Trending Now</h2>
          <p>Top picks flying off the shelves right now.</p>
        </div>
        <a href="/categories" class="button secondary">View All</a>
      </div>
      <div class="product-grid" role="list" aria-label="Trending products">
        ${sorted.map((p) => productCard(p)).join('')}
      </div>
    </div>`;
}

function renderFeatured(block, products, opts) {
  const limit = Number(opts.limit) || 12;
  const sorted = [...products].sort((a, b) => b.price - a.price).slice(0, limit);
  block.innerHTML = `
    <div class="product-grid product-grid--featured" role="list" aria-label="Featured products">
      ${sorted.map((p) => productCard(p, true)).join('')}
    </div>`;
}

function renderSearch(block, products) {
  const q = new URLSearchParams(window.location.search).get('q')?.toLowerCase().trim() || '';
  const hits = q ? products.filter((p) =>
    `${p.title} ${p.brand} ${p.category}`.toLowerCase().includes(q)) : [];

  block.innerHTML = `
    <div class="search-page">
      <form class="search-form" role="search" aria-label="Product search">
        <input type="search" name="q" class="search-input" value="${q}"
          placeholder="Search shoes, brands, categories…" aria-label="Search products" autocomplete="off">
        <button type="submit" class="button primary">Search</button>
      </form>
      ${q
        ? `<p class="search-summary" aria-live="polite">
             ${hits.length} result${hits.length !== 1 ? 's' : ''} for "<strong>${q}</strong>"
           </p>
           <div class="product-grid" role="list">
             ${hits.length
               ? hits.map((p) => productCard(p)).join('')
               : '<p class="no-results">No products match your search.</p>'}
           </div>`
        : '<p class="search-prompt">Enter a search term to find shoes.</p>'
      }
    </div>`;

  block.querySelector('.search-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = block.querySelector('[name="q"]')?.value.trim();
    if (val) window.location.search = `?q=${encodeURIComponent(val)}`;
  });
}

async function renderWishlist(block) {
  const wishlist = getWishlist();
  if (!wishlist.length) {
    block.innerHTML = `
      <div class="wishlist-empty">
        <div class="wishlist-empty-icon">♡</div>
        <h2>Your wishlist is empty</h2>
        <p>Browse our collections and hit ♡ on any shoe to save it here.</p>
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

function renderCatalog(block, products, opts) {
  const genderPre    = opts.gender || null;
  const pool         = genderPre ? products.filter((p) => p.gender === genderPre) : products;
  const hasGender    = !genderPre;
  const meta         = buildFiltersMeta(pool);
  const state        = readStateFromURL(meta, hasGender, genderPre);

  block.innerHTML = `
    <div class="catalog-layout">
      <aside class="filter-panel section-card" aria-label="Filter products">
        <div class="filter-panel-head">
          <h3>Filters</h3>
          <button id="clear-filters" class="clear-filters-btn" type="button">Clear all</button>
        </div>
        ${buildSidebarHTML(meta, state, hasGender)}
      </aside>
      <div class="catalog-main">
        <div class="catalog-toolbar">
          <p class="catalog-count" aria-live="polite"></p>
          <select class="sort-select" aria-label="Sort products">
            <option value="default" ${state.sort === 'default'   ? 'selected' : ''}>Best Match</option>
            <option value="low-high" ${state.sort === 'low-high' ? 'selected' : ''}>Price: Low → High</option>
            <option value="high-low" ${state.sort === 'high-low' ? 'selected' : ''}>Price: High → Low</option>
          </select>
        </div>
        <div class="product-grid catalog-grid" role="list" aria-label="Products"></div>
      </div>
    </div>`;

  applyAndRender();

  block.querySelectorAll('.filter-cb').forEach((cb) => {
    cb.addEventListener('change', () => {
      const g = cb.dataset.group;
      if (cb.checked) state[g].add(cb.value); else state[g].delete(cb.value);
      applyAndRender(); syncURL();
    });
  });

  block.querySelector('#price-max-input')?.addEventListener('input', (e) => {
    state.maxPrice = Number(e.target.value);
    const disp = block.querySelector('#price-display');
    if (disp) disp.textContent = `Up to ${formatCurrency(state.maxPrice)}`;
    applyAndRender(); syncURL();
  });

  block.querySelector('.sort-select')?.addEventListener('change', (e) => {
    state.sort = e.target.value; applyAndRender(); syncURL();
  });

  block.querySelector('#clear-filters')?.addEventListener('click', () => {
    block.querySelectorAll('.filter-cb').forEach((cb) => { cb.checked = false; });
    state.categories = new Set(); state.brands = new Set();
    state.maxPrice = meta.maxPrice; state.sort = 'default';
    block.querySelector('#price-max-input').value = meta.maxPrice;
    block.querySelector('.sort-select').value = 'default';
    block.querySelector('#price-display').textContent = `Up to ${formatCurrency(meta.maxPrice)}`;
    applyAndRender(); syncURL();
  });

  function applyAndRender() {
    const filtered = filterProducts(pool, state);
    const grid = block.querySelector('.catalog-grid');
    const countEl = block.querySelector('.catalog-count');
    if (countEl) countEl.textContent = `${filtered.length} product${filtered.length !== 1 ? 's' : ''}`;
    if (grid) {
      grid.innerHTML = filtered.length
        ? filtered.map((p) => productCard(p)).join('')
        : `<p class="no-results">No products match your filters.
             <button class="link-btn" id="reset-btn-inline">Reset filters</button></p>`;
      grid.querySelector('#reset-btn-inline')?.addEventListener('click', () => {
        block.querySelector('#clear-filters')?.click();
      });
    }
  }

  function syncURL() {
    const url = new URL(window.location);
    state.categories.size ? url.searchParams.set('category', [...state.categories].join(',')) : url.searchParams.delete('category');
    state.brands.size ? url.searchParams.set('brand', [...state.brands].join(',')) : url.searchParams.delete('brand');
    state.sort !== 'default' ? url.searchParams.set('sort', state.sort) : url.searchParams.delete('sort');
    window.history.replaceState({}, '', url);
  }
}

function readStateFromURL(meta, hasGender, genderPre) {
  const q = new URLSearchParams(window.location.search);
  return {
    categories: new Set((q.get('category') || '').split(',').filter((v) => meta.categories.includes(v))),
    brands:     new Set((q.get('brand') || '').split(',').filter((v) => meta.brands.includes(v))),
    gender:     hasGender && ['mens', 'womens'].includes(q.get('gender')) ? q.get('gender') : (genderPre || 'all'),
    minPrice:   0,
    maxPrice:   meta.maxPrice,
    sort:       ['low-high', 'high-low'].includes(q.get('sort')) ? q.get('sort') : 'default',
  };
}

function buildSidebarHTML(meta, state, hasGender) {
  const cbGroup = (title, group, items, labelFn = (v) => v) => `
    <div class="filter-group">
      <h4 class="filter-group-title">${title}</h4>
      ${items.map((v) => `
        <label class="filter-label">
          <input type="checkbox" class="filter-cb" data-group="${group}" value="${v}"
            ${state[group].has(String(v)) ? 'checked' : ''}>
          <span>${labelFn(v)}</span>
        </label>`).join('')}
    </div>`;

  return `
    ${hasGender ? `
      <div class="filter-group">
        <h4 class="filter-group-title">Gender</h4>
        ${['all', 'mens', 'womens'].map((g) => `
          <label class="filter-label">
            <input type="radio" name="gender-filter" value="${g}" ${state.gender === g ? 'checked' : ''}>
            <span>${g === 'all' ? 'All' : g.charAt(0).toUpperCase() + g.slice(1)}</span>
          </label>`).join('')}
      </div>` : ''}
    ${cbGroup('Category', 'categories', meta.categories, (v) => CATEGORY_LABELS[v] || v)}
    ${cbGroup('Brand', 'brands', meta.brands)}
    <div class="filter-group">
      <h4 class="filter-group-title">Max Price</h4>
      <p id="price-display" class="price-display">Up to ${formatCurrency(meta.maxPrice)}</p>
      <input type="range" id="price-max-input" class="price-range"
        min="0" max="${meta.maxPrice}" value="${state.maxPrice}" step="100">
    </div>`;
}   