import { getCart, getWishlist, getCurrentUser, toast, formatCurrency } from '../../scripts/cart-store.js';

let cartOpen = false;
let searchOpen = false;
let mobileOpen = false;

const CATEGORY_LABELS = {
  training: 'Training Shoes',
  running: 'Running Shoes',
  multisport: 'Multisport Shoes',
  casual: 'Casual Shoes',
  sneakers: 'Sneakers',
};

function sanitize(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function ensureSearchPopup() {
  if (!document.getElementById('search-backdrop')) {
    const bd = document.createElement('div');
    bd.id = 'search-backdrop';
    bd.className = 'search-backdrop hidden';
    bd.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bd);
  }
  if (!document.getElementById('search-pop')) {
    const s = document.createElement('section');
    s.id = 'search-pop';
    s.className = 'search-pop hidden';
    s.setAttribute('role', 'dialog');
    s.setAttribute('aria-label', 'Quick product search');
    s.innerHTML = `<form id="quick-search-form" aria-label="Quick search form">
      <div class="search-pop-head">
        <div><p class="search-pop-kicker">Search</p><h2>Find a product</h2></div>
        <button id="close-search" class="btn-close search-close-btn" type="button" aria-label="Close search popup">✕</button>
      </div>
      <label class="search-input-label" for="quick-search-input">Search shoes</label>
      <div class="search-input-shell">
        <img src="/assests/icons/search-button-svgrepo-com.svg" alt="" aria-hidden="true" class="search-input-icon">
        <input id="quick-search-input" type="search" aria-label="Search product by title, brand, or category" placeholder="Type product name, brand, or category">
      </div>
      <div class="search-pop-actions">
        <button class="btn-primary" type="submit" aria-label="View full search results">Search</button>
      </div>
      <div id="quick-results" class="quick-results" aria-label="Quick search results" role="list"></div>
    </form>`;
    document.body.appendChild(s);
  }
}

function toggleSearchPopup() {
  const panel = document.getElementById('search-pop');
  const backdrop = document.getElementById('search-backdrop');
  if (!panel) return;
  searchOpen = !searchOpen;
  panel.classList.toggle('hidden', !searchOpen);
  backdrop?.classList.toggle('hidden', !searchOpen);
  document.body.classList.toggle('search-open', searchOpen);
  if (searchOpen) document.getElementById('quick-search-input')?.focus();
}

function bindSearchPopup(products) {
  const form = document.getElementById('quick-search-form');
  const input = document.getElementById('quick-search-input');
  const close = document.getElementById('close-search');
  const results = document.getElementById('quick-results');
  const backdrop = document.getElementById('search-backdrop');
  if (!form || !input || !close || !results) return;

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (!q) {
      results.innerHTML = '';
      return;
    }
    const hits = products.filter((p) =>
      `${p.title} ${p.brand} ${p.category}`.toLowerCase().includes(q)
    ).slice(0, 7);
    results.innerHTML = hits.length
      ? hits.map((p) => `<a class="quick-item" href="/product?id=${encodeURIComponent(p.id)}" role="listitem">
          <img src="${sanitize(p.images?.[0] || '/adokicks.png')}" alt="${sanitize(p.title)}">
          <span class="quick-item-copy"><strong>${sanitize(p.title)}</strong><small>${sanitize(p.brand)} • ${sanitize(CATEGORY_LABELS[p.category] || p.category)}</small></span>
          <strong class="quick-item-price">${formatCurrency(p.price)}</strong>
        </a>`).join('')
      : '<p class="search-empty">No matching shoes.</p>';
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) {
      toast('Type something to search');
      return;
    }
    window.location.href = `/search?q=${encodeURIComponent(q)}`;
  });

  close.addEventListener('click', () => {
    searchOpen = false;
    panel?.classList.add('hidden');
    backdrop?.classList.add('hidden');
    document.body.classList.remove('search-open');
  });

  backdrop?.addEventListener('click', () => {
    searchOpen = false;
    document.getElementById('search-pop')?.classList.add('hidden');
    backdrop.classList.add('hidden');
    document.body.classList.remove('search-open');
  });
}

function ensureCartDrawer() {
  if (!document.getElementById('cart-drawer')) {
    const cart = document.createElement('aside');
    cart.id = 'cart-drawer';
    cart.className = 'cart-drawer hidden';
    cart.setAttribute('aria-label', 'Shopping cart sidebar');
    cart.innerHTML = `
      <div class="drawer-head">
        <div class="drawer-head-content"><h2>Your Bag</h2><span id="cart-item-count" class="cart-count-badge">0</span></div>
        <button id="close-cart" class="btn-close" type="button" aria-label="Close cart">✕</button>
      </div>
      <div id="cart-items" class="cart-items" aria-label="Items in cart"></div>
      <div id="cart-footer" class="drawer-foot" aria-label="Cart total and checkout"></div>
    `;
    document.body.appendChild(cart);
  }
}

function toggleCartDrawer(state) {
  const drawer = document.getElementById('cart-drawer');
  if (!drawer) return;
  cartOpen = !cartOpen;
  drawer.classList.toggle('hidden', !cartOpen);
  if (cartOpen) renderCartDrawer(state);
}

function renderCartDrawer(state) {
  const itemsWrap = document.getElementById('cart-items');
  const footer = document.getElementById('cart-footer');
  const countBadge = document.getElementById('cart-item-count');
  if (!itemsWrap || !footer) return;

  const cart = getCart().filter((item) => state.byId[item.productId]);
  const totalItems = cart.reduce((s, i) => s + i.qty, 0);
  if (countBadge) countBadge.textContent = totalItems;

  if (!cart.length) {
    itemsWrap.innerHTML = '<div class="empty-cart"><p>Your bag is empty</p><p class="empty-cart-subtext">Add some stylish kicks to get started!</p></div>';
    footer.innerHTML = `<div class="cart-summary"><p>Subtotal: <strong>${formatCurrency(0)}</strong></p></div><button class="btn-primary" type="button" disabled>Checkout</button>`;
    return;
  }

  itemsWrap.innerHTML = cart.map((item) => {
    const p = state.byId[item.productId];
    return `<article class="cart-item" aria-label="${sanitize(p.title)} in cart">
      <div class="cart-item-image"><img src="${sanitize(p.images?.[0] || '/adokicks.png')}" alt="${sanitize(p.title)}"></div>
      <div class="cart-item-content">
        <div class="cart-item-header">
          <h3>${sanitize(p.title)}</h3>
          <button class="btn-remove" type="button" data-action="cart-remove" data-product-id="${sanitize(item.productId)}" data-size="${sanitize(item.size)}" aria-label="Remove item">✕</button>
        </div>
        <p class="cart-item-meta">Size: <strong>${sanitize(item.size)}</strong></p>
        <div class="cart-item-footer">
          <div class="qty-control">
            <button type="button" data-action="cart-dec" data-product-id="${sanitize(item.productId)}" data-size="${sanitize(item.size)}" aria-label="Decrease">−</button>
            <span class="qty-value">${item.qty}</span>
            <button type="button" data-action="cart-inc" data-product-id="${sanitize(item.productId)}" data-size="${sanitize(item.size)}" aria-label="Increase">+</button>
          </div>
          <div class="cart-item-price">
            <p class="price-unit">${formatCurrency(p.price)} each</p>
            <p class="price-total">${formatCurrency(p.price * item.qty)}</p>
          </div>
        </div>
      </div>
    </article>`;
  }).join('');

  const subtotal = cart.reduce((s, i) => s + state.byId[i.productId].price * i.qty, 0);
  footer.innerHTML = `
    <div class="cart-summary">
      <div class="summary-row"><span>Subtotal:</span><strong>${formatCurrency(subtotal)}</strong></div>
      <div class="summary-row"><span>Items:</span><strong>${totalItems}</strong></div>
    </div>
    <button id="cart-checkout" class="btn-primary btn-checkout" type="button" aria-label="Proceed to checkout">Proceed to Checkout</button>
  `;
  document.getElementById('cart-checkout')?.addEventListener('click', () => {
    if (!getCurrentUser()) {
      window.location.href = '/auth?redirect=checkout&notice=please_login';
      return;
    }
    window.location.href = '/checkout';
  });
}

function updateBadges() {
  const cartCount = getCart().reduce((s, i) => s + i.qty, 0);
  const wishCount = getWishlist().length;
  ['cart-count', 'cart-count-mobile'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = cartCount;
  });
  ['wish-count'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = wishCount;
  });
}

function closeMobile() {
  mobileOpen = false;
  document.body.classList.remove('menu-open');
  document.getElementById('mobile-menu')?.classList.add('hidden');
  document.getElementById('mobile-menu-backdrop')?.classList.add('hidden');
  document.getElementById('mobile-menu-btn')?.setAttribute('aria-expanded', 'false');
}

function toggleMobile() {
  mobileOpen = !mobileOpen;
  document.body.classList.toggle('menu-open', mobileOpen);
  document.getElementById('mobile-menu')?.classList.toggle('hidden', !mobileOpen);
  document.getElementById('mobile-menu-backdrop')?.classList.toggle('hidden', !mobileOpen);
  document.getElementById('mobile-menu-btn')?.setAttribute('aria-expanded', mobileOpen ? 'true' : 'false');
}

function getCurrentPath() {
  const path = window.location.pathname
    .replace(/\/index(?:\.html)?$/i, '/')
    .replace(/\.html$/i, '')
    .replace(/\/$/, '');
  return path || '/';
}

export default async function decorate(block) {
  const navItems = [
    { href: '/', label: 'Home', aria: 'Home page' },
    { href: '/mens', label: 'Mens', aria: 'Men shoes page' },
    { href: '/womens', label: 'Womens', aria: 'Women shoes page' },
    { href: '/featured', label: 'Featured', aria: 'Featured shoes page' },
    { href: '/categories', label: 'Categories', aria: 'Categories page' },
    { href: '/about', label: 'About Us', aria: 'About us page' },
  ];

  const user = getCurrentUser();
  const currentPath = getCurrentPath();
  const navLinkClass = (href) => (href === currentPath ? 'nav-link active' : 'nav-link');
  const mobileLinkClass = (href) => (href === currentPath ? 'mobile-menu-link active' : 'mobile-menu-link');
  const navLinks = navItems
    .map((i) => `<a class="${navLinkClass(i.href)}" href="${i.href}" aria-label="${i.aria}">${i.label}</a>`)
    .join('');
  const mobileLinks = navItems
    .map((i) => `<a class="${mobileLinkClass(i.href)}" href="${i.href}" aria-label="${i.aria}">${i.label}</a>`)
    .join('');

  block.innerHTML = `
    <div class="site-header">
      <nav class="nav-inner" role="navigation" aria-label="Main navigation">
        <div class="nav-mobile-actions">
          <button id="open-search-mobile" class="icon-btn nav-icon-btn nav-mobile-icon" type="button" aria-label="Open product search" title="Search">
            <img src="/assests/icons/search-button-svgrepo-com.svg" alt="" aria-hidden="true" class="nav-icon-svg">
          </button>
          <button id="open-cart-mobile" class="icon-btn nav-icon-btn nav-mobile-icon" type="button" aria-label="Open cart sidebar" title="Cart">
            <img src="/assests/icons/cart-shopping-fast-svgrepo-com.svg" alt="" aria-hidden="true" class="nav-icon-svg">
            <span id="cart-count-mobile" class="icon-count">0</span>
          </button>
          ${user
            ? '<button id="profile-btn-mobile" class="icon-btn nav-icon-btn nav-mobile-icon nav-auth-icon" type="button" aria-label="Profile menu" title="Profile"><img src="/assests/icons/person-svgrepo-com.svg" alt="" aria-hidden="true" class="nav-icon-svg"></button>'
            : '<a href="/auth" class="icon-btn nav-icon-btn nav-mobile-icon nav-auth-icon" aria-label="Sign in" title="Sign in"><img src="/assests/icons/person-svgrepo-com.svg" alt="" aria-hidden="true" class="nav-icon-svg"></a>'}
          <button id="mobile-menu-btn" class="icon-btn nav-icon-btn menu-toggle" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-menu">
            <span class="menu-toggle-lines" aria-hidden="true"><span></span><span></span><span></span></span>
          </button>
        </div>

        <div class="nav-brand">
          <a class="brand-link" href="/" aria-label="Go to home page">
            <span class="logo-link" aria-hidden="true"><img src="/adokicks.png" alt=""></span>
            <span class="brand-copy">
              <span class="brand-name">Adokicks</span>
              <span class="brand-tagline">Premium sneaker studio</span>
            </span>
          </a>
        </div>

        <div class="nav-desktop">
          <div class="nav-links">${navLinks}</div>
          <div class="nav-actions">
            <button id="open-search" class="icon-btn nav-icon-btn" type="button" aria-label="Open product search" title="Search">
              <img src="/assests/icons/search-button-svgrepo-com.svg" alt="" aria-hidden="true" class="nav-icon-svg">
            </button>
            <a href="/wishlist" class="icon-btn nav-icon-btn" aria-label="Open wishlist" title="Wishlist">
              <img src="/assests/icons/heart-alt-svgrepo-com.svg" alt="" aria-hidden="true" class="nav-icon-svg">
              <span id="wish-count" class="icon-count">0</span>
            </a>
            <button id="open-cart" class="icon-btn nav-icon-btn" type="button" aria-label="Open cart sidebar" title="Cart">
              <img src="/assests/icons/cart-shopping-fast-svgrepo-com.svg" alt="" aria-hidden="true" class="nav-icon-svg">
              <span id="cart-count" class="icon-count">0</span>
            </button>
            ${user
              ? `<div class="profile-wrap"><button id="profile-btn" class="profile-avatar" type="button" aria-label="Profile menu">${sanitize(user.name[0].toUpperCase())}</button></div>`
              : '<a href="/auth" class="btn-primary" aria-label="Sign in">Sign In</a>'}
          </div>
        </div>

      </nav>
      <div id="mobile-menu-backdrop" class="mobile-menu-backdrop hidden" aria-hidden="true"></div>
      <aside id="mobile-menu" class="mobile-menu hidden" aria-label="Mobile navigation">
        <div class="mobile-menu-head">
          <div><p class="mobile-menu-kicker">Menu</p><h2>Browse Adokicks</h2></div>
          <button id="mobile-menu-close" class="btn-close" type="button" aria-label="Close menu">✕</button>
        </div>
        <div class="mobile-menu-links">
          ${mobileLinks}
          <a class="mobile-menu-link" href="/wishlist" aria-label="Open wishlist">Wishlist</a>
        </div>
      </aside>
    </div>
  `;

  ensureSearchPopup();
  ensureCartDrawer();

  // Load products
  const products = await import('../../scripts/product-store.js').then((m) => m.getProducts());
  const productState = { byId: Object.fromEntries(products.map((p) => [p.id, p])) };
  bindSearchPopup(products);

  function syncOffset() {
    const h = document.querySelector('.site-header');
    document.documentElement.style.setProperty('--header-offset', `${h ? Math.ceil(h.getBoundingClientRect().height) : 0}px`);
  }
  syncOffset();
  requestAnimationFrame(syncOffset);
  window.addEventListener('resize', syncOffset);

  // Header event listeners
  document.getElementById('open-search')?.addEventListener('click', toggleSearchPopup);
  document.getElementById('open-search-mobile')?.addEventListener('click', toggleSearchPopup);
  document.getElementById('open-cart')?.addEventListener('click', () => toggleCartDrawer(productState));
  document.getElementById('open-cart-mobile')?.addEventListener('click', () => toggleCartDrawer(productState));
  document.getElementById('close-cart')?.addEventListener('click', () => {
    cartOpen = false;
    document.getElementById('cart-drawer')?.classList.add('hidden');
  });

  // Mobile menu handlers
  document.getElementById('mobile-menu-btn')?.addEventListener('click', toggleMobile);
  document.getElementById('mobile-menu-close')?.addEventListener('click', closeMobile);
  document.getElementById('mobile-menu-backdrop')?.addEventListener('click', closeMobile);
  window.addEventListener('resize', () => {
    if (window.innerWidth > 1024) closeMobile();
  });

  // Badge updates
  updateBadges();
  document.addEventListener('adokicks:cart-updated', updateBadges);
  document.addEventListener('adokicks:wishlist-updated', updateBadges);
  document.addEventListener('adokicks:cart-render', () => {
    if (cartOpen) renderCartDrawer(productState);
  });
  document.addEventListener('adokicks:cart-updated', () => {
    if (cartOpen) renderCartDrawer(productState);
  });
}
