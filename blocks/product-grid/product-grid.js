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

function productCard(product, showDescription = false) {
  const firstImage = (product.images && product.images[0]) || "adokicks.png";
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
        ${showDescription ? `<p>${product.description}</p>` : ""}
        <div class="price-line card-actions-row">
          <button class="heart-btn ${wishActive?"active":""}" type="button" data-action="wishlist-toggle" data-product-id="${product.id}" aria-label="Toggle wishlist for ${product.title}" title="Wishlist">&#10084;</button>
          <a href="/product?id=${encodeURIComponent(product.id)}" class="btn-secondary" aria-label="Shop ${product.title}">Shop</a>
        </div>
      </div>
    </article>
  `;
}

function renderTrending(block, products, opts) {
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
        ${items.map(p => productCard(p)).join("")}
      </div>
    </div>
  `;
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