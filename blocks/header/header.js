import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';
import { getCart, cartItemCount, getWishlist, getCurrentUser, logout, toast, formatCurrency, updateCartQty, cartTotal } from '../../scripts/cart-store.js';

let cartOpen = false;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function ensureSearchPopup() {
  if (document.getElementById('search-backdrop') && document.getElementById('search-pop')) return;

  const backdrop = document.createElement('div');
  backdrop.id = 'search-backdrop';
  backdrop.className = 'search-backdrop hidden';
  backdrop.setAttribute('aria-hidden', 'true');

  const pop = document.createElement('section');
  pop.id = 'search-pop';
  pop.className = 'search-pop hidden';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', 'Quick product search');
  pop.innerHTML = `<form id="quick-search-form" aria-label="Quick search form">
      <div class="search-pop-head">
        <div>
          <p class="search-pop-kicker">Search</p>
          <h2>Find a product</h2>
        </div>
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

  document.body.appendChild(backdrop);
  document.body.appendChild(pop);
}

let searchOpen = false;
function toggleSearchPopup() {
  const panel = document.getElementById('search-pop');
  const backdrop = document.getElementById('search-backdrop');
  if (!panel || !backdrop) return;

  searchOpen = !searchOpen;
  panel.classList.toggle('hidden', !searchOpen);
  backdrop.classList.toggle('hidden', !searchOpen);
  document.body.classList.toggle('search-open', searchOpen);

  if (searchOpen) {
    document.getElementById('quick-search-input')?.focus();
  }
}

function closeSearchPopup() {
  document.getElementById('search-pop')?.classList.add('hidden');
  document.getElementById('search-backdrop')?.classList.add('hidden');
  document.body.classList.remove('search-open');
}

function bindSearchPopup(products) {
  const CATEGORY_LABELS = {
    training: 'Training Shoes',
    running: 'Running Shoes',
    multisport: 'Multisport Shoes',
    casual: 'Casual Shoes',
    sneakers: 'Sneakers',
  };

  const form = document.getElementById('quick-search-form');
  const input = document.getElementById('quick-search-input');
  const close = document.getElementById('close-search');
  const results = document.getElementById('quick-results');
  const backdrop = document.getElementById('search-backdrop');
  if (!form || !input || !close || !results || !backdrop) return;

  let debounce;
  input.addEventListener('input', () => {
    clearTimeout(debounce);
    const q = input.value.trim().toLowerCase();
    if (!q) {
      results.innerHTML = '';
      return;
    }

    debounce = window.setTimeout(() => {
      const hits = products.filter((product) =>
        `${product.title} ${product.brand} ${product.category}`.toLowerCase().includes(q)
      ).slice(0, 7);

      results.innerHTML = hits.length
        ? hits.map((product) => `
            <a class="quick-item" href="/product?id=${encodeURIComponent(product.id)}" role="listitem">
              <img src="${escapeHtml(product.images?.[0] || '/adokicks.png')}" alt="${escapeHtml(product.title)}">
              <span class="quick-item-copy"><strong>${escapeHtml(product.title)}</strong><small>${escapeHtml(product.brand)} • ${escapeHtml(CATEGORY_LABELS[product.category] || product.category)}</small></span>
              <strong class="quick-item-price">${formatCurrency(product.price)}</strong>
            </a>`).join('')
        : '<p class="search-empty">No matching shoes.</p>';
    }, 150);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const query = input.value.trim();
    if (!query) {
      toast('Type something to search');
      return;
    }
    window.location.href = `/search?q=${encodeURIComponent(query)}`;
    closeSearchPopup();
  });

  close.addEventListener('click', closeSearchPopup);
  backdrop.addEventListener('click', closeSearchPopup);
}

function ensureCartDrawer() {
  if (document.getElementById('cart-drawer')) return;

  const backdrop = document.createElement('div');
  backdrop.id = 'cart-backdrop';
  backdrop.className = 'cart-backdrop hidden';
  backdrop.setAttribute('aria-hidden', 'true');

  const drawer = document.createElement('aside');
  drawer.id = 'cart-drawer';
  drawer.className = 'cart-drawer hidden';
  drawer.setAttribute('aria-label', 'Shopping cart sidebar');
  drawer.innerHTML = `
    <div class="drawer-head">
      <div class="drawer-head-content">
        <h2>Your Bag</h2>
        <span id="cart-item-count" class="cart-count-badge">0</span>
      </div>
      <button id="close-cart" class="btn-close" type="button" aria-label="Close cart">✕</button>
    </div>
    <div id="cart-items" class="cart-items" aria-label="Items in cart"></div>
    <div id="cart-footer" class="drawer-foot" aria-label="Cart total and checkout"></div>
  `;

  document.body.appendChild(backdrop);
  document.body.appendChild(drawer);
}

function toggleCartDrawer(state) {
  const drawer = document.getElementById('cart-drawer');
  if (!drawer) return;
  cartOpen = !cartOpen;
  drawer.classList.toggle('hidden', !cartOpen);
  document.getElementById('cart-backdrop')?.classList.toggle('hidden', !cartOpen);
  document.body.classList.toggle('overlay-open', cartOpen);
  if (cartOpen) renderCartDrawer(state);
}

function closeCart() {
  document.getElementById('cart-backdrop')?.classList.add('hidden');
  document.getElementById('cart-drawer')?.classList.add('hidden');
  document.body.classList.remove('overlay-open');
  cartOpen = false;
}

function renderCartDrawer(state) {
  const items = getCart().filter((item) => state?.byId?.[item.productId]);
  const cartItemsEl = document.getElementById('cart-items');
  const cartFooterEl = document.getElementById('cart-footer');
  const countBadge = document.getElementById('cart-item-count');

  if (!cartItemsEl || !cartFooterEl) return;

  const totalItems = items.reduce((sum, item) => sum + item.qty, 0);
  if (countBadge) countBadge.textContent = String(totalItems);

  if (!items.length) {
    cartItemsEl.innerHTML = `
      <div class="empty-cart">
        <p>Your bag is empty.</p>
        <a href="/categories" class="button primary">Shop Now</a>
      </div>`;
    cartFooterEl.innerHTML = `
      <div class="cart-summary">
        <p>Subtotal: <strong>${formatCurrency(0)}</strong></p>
      </div>
      <button class="btn-primary" type="button" disabled>Checkout</button>`;
    return;
  }

  cartItemsEl.innerHTML = items.map((item) => {
    const product = state.byId[item.productId];
    return `
      <article class="cart-item" data-qty="${item.qty}" aria-label="${escapeHtml(product.title)} in cart">
        <div class="cart-item-image"><img src="${escapeHtml(product.images?.[0] || '/adokicks.png')}" alt="${escapeHtml(product.title)}"></div>
        <div class="cart-item-content">
          <div class="cart-item-header">
            <h3>${escapeHtml(product.title)}</h3>
            <button class="btn-remove" type="button" data-action="cart-remove" data-product-id="${escapeHtml(item.productId)}" data-size="${escapeHtml(item.size)}" aria-label="Remove item">✕</button>
          </div>
          <p class="cart-item-meta">Size: <strong>${escapeHtml(item.size)}</strong></p>
          <div class="cart-item-footer">
            <div class="qty-control">
              <button type="button" data-action="cart-dec" data-product-id="${escapeHtml(item.productId)}" data-size="${escapeHtml(item.size)}" aria-label="Decrease">−</button>
              <span class="qty-value">${item.qty}</span>
              <button type="button" data-action="cart-inc" data-product-id="${escapeHtml(item.productId)}" data-size="${escapeHtml(item.size)}" aria-label="Increase">+</button>
            </div>
            <div class="cart-item-price">
              <p class="price-unit">${formatCurrency(product.price)} each</p>
              <p class="price-total">${formatCurrency(product.price * item.qty)}</p>
            </div>
          </div>
        </div>
      </article>`;
  }).join('');

  const subtotal = items.reduce((sum, item) => sum + state.byId[item.productId].price * item.qty, 0);
  cartFooterEl.innerHTML = `
    <div class="cart-summary">
      <div class="summary-row"><span>Subtotal:</span><strong>${formatCurrency(subtotal)}</strong></div>
      <div class="summary-row"><span>Items:</span><strong>${totalItems}</strong></div>
    </div>
    <button id="cart-checkout" class="btn-primary btn-checkout" type="button" aria-label="Proceed to checkout">Proceed to Checkout</button>`;

  cartItemsEl.querySelectorAll('.qty-control button').forEach((button) => {
    button.addEventListener('click', () => {
      const row = button.closest('.cart-item');
      if (!row) return;
      const action = button.dataset.action;
      updateCartQty(row.dataset.productId, row.dataset.size, action === 'cart-inc' ? 1 : -1);
      renderCartDrawer(state);
    });
  });

  cartItemsEl.querySelectorAll('.btn-remove').forEach((button) => {
    button.addEventListener('click', () => {
      const row = button.closest('.cart-item');
      if (!row) return;
      const qty = Number(row.dataset.qty) || 0;
      updateCartQty(row.dataset.productId, row.dataset.size, qty === 0 ? -1 : -qty);
      renderCartDrawer(state);
    });
  });

  document.getElementById('cart-checkout')?.addEventListener('click', () => {
    if (!getCurrentUser()) {
      window.location.href = '/auth?redirect=checkout&notice=please_login';
      return;
    }
    window.location.href = '/checkout';
  });
}

function updateBadges() {
  const count = cartItemCount();
  const wishCount = getWishlist().length;

  document.querySelectorAll('.cart-count').forEach((el) => {
    el.textContent = String(count);
    el.classList.toggle('hidden', count === 0);
  });
  document.querySelectorAll('.wish-count').forEach((el) => {
    el.textContent = String(wishCount);
    el.classList.toggle('hidden', wishCount === 0);
  });
}

export default async function decorate(block) {
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);
  const sections = [...(fragment?.children || [])];
  const linksSection = sections[1];
  const user = getCurrentUser();
  const currentPath = window.location.pathname;

  const navLinks = linksSection
    ? [...linksSection.querySelectorAll('a')].map((a) => {
        const href = new URL(a.href, window.location.origin).pathname;
        const active = href === currentPath || (href !== '/' && currentPath.startsWith(href));
        return `<a href="${a.href}" class="nav-link${active ? ' active' : ''}" aria-current="${active ? 'page' : 'false'}">${a.textContent}</a>`;
      }).join('')
    : '';

  const mobileLinks = linksSection
    ? [...linksSection.querySelectorAll('a')].map((a) => `<a class="mobile-menu-link" href="${a.href}">${a.textContent}</a>`).join('')
    : '';

  block.innerHTML = `
    <div class="site-header">
      <nav class="nav-inner" role="navigation" aria-label="Main navigation">
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
              <span class="icon-badge">
                <img src="/assests/icons/heart-alt-svgrepo-com.svg" alt="" aria-hidden="true" class="nav-icon-svg">
              <span id="wish-count" class="icon-count wish-count hidden">0</span>
            </span>
          </a>
            <button id="open-cart" class="icon-btn nav-icon-btn" type="button" aria-label="Open cart sidebar" title="Cart">
              <span class="icon-badge">
                <img src="/assests/icons/cart-shopping-fast-svgrepo-com.svg" alt="" aria-hidden="true" class="nav-icon-svg">
                <span id="cart-count" class="icon-count cart-count hidden">0</span>
              </span>
            </button>
            ${user
              ? `<div class="profile-wrap">
                   <button id="profile-btn" class="profile-avatar" type="button" aria-haspopup="true" aria-expanded="false" aria-label="Profile menu">${escapeHtml(user.name?.[0]?.toUpperCase() || 'U')}</button>
                   <div id="profile-menu" class="profile-menu hidden" role="menu">
                     <a href="/my-orders" role="menuitem">My Orders</a>
                     <a href="/wishlist" role="menuitem">Wishlist</a>
                     <button id="logout-btn" type="button" role="menuitem">Sign Out</button>
                   </div>
                 </div>`
              : `<a href="/auth" class="btn-primary" aria-label="Sign in">Sign In</a>`}
          </div>
        </div>

        <div class="nav-mobile-actions" aria-label="Mobile quick actions">
          <button id="mobile-menu-btn" class="icon-btn nav-icon-btn menu-toggle" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-menu">
            <span class="menu-toggle-lines" aria-hidden="true"><span></span><span></span><span></span></span>
          </button>
          <button id="open-search-mobile" class="icon-btn nav-icon-btn nav-mobile-icon" type="button" aria-label="Open product search" title="Search">
            <img src="/assests/icons/search-button-svgrepo-com.svg" alt="" aria-hidden="true" class="nav-icon-svg">
          </button>
          ${user
            ? `<button id="profile-btn-mobile" class="icon-btn nav-icon-btn nav-mobile-icon nav-auth-icon" type="button" aria-label="Open profile menu" title="Profile"><img src="/assests/icons/person-svgrepo-com.svg" alt="" aria-hidden="true" class="nav-icon-svg"></button>`
            : `<a href="/auth" class="icon-btn nav-icon-btn nav-mobile-icon nav-auth-icon" aria-label="Sign in" title="Sign in"><img src="/assests/icons/person-svgrepo-com.svg" alt="" aria-hidden="true" class="nav-icon-svg"></a>`}
          <button id="open-cart-mobile" class="icon-btn nav-icon-btn nav-mobile-icon" type="button" aria-label="Open cart sidebar" title="Cart">
            <span class="icon-badge">
              <img src="/assests/icons/cart-shopping-fast-svgrepo-com.svg" alt="" aria-hidden="true" class="nav-icon-svg">
              <span id="cart-count-mobile" class="icon-count cart-count hidden">0</span>
            </span>
          </button>
        </div>
      </nav>

      <div id="mobile-menu-backdrop" class="mobile-menu-backdrop hidden" aria-hidden="true"></div>
      <aside id="mobile-menu" class="mobile-menu hidden" aria-label="Mobile navigation">
        <div class="mobile-menu-head">
          <div>
            <p class="mobile-menu-kicker">Menu</p>
            <h2>Browse Adokicks</h2>
          </div>
          <button id="mobile-menu-close" class="btn-close" type="button" aria-label="Close menu">✕</button>
        </div>
        <div class="mobile-menu-links">
          ${mobileLinks}
          <a class="mobile-menu-link" href="/wishlist" aria-label="Open wishlist">Wishlist</a>
        </div>
      </aside>
    </div>`;

  ensureSearchPopup();
  ensureCartDrawer();

  const products = await import('../../scripts/product-store.js').then((module) => module.getProducts());
  const productState = { byId: Object.fromEntries(products.map((product) => [product.id, product])) };
  bindSearchPopup(products);

  function syncOffset() {
    const header = document.querySelector('.site-header');
    document.documentElement.style.setProperty('--header-offset', `${header ? Math.ceil(header.getBoundingClientRect().height) : 0}px`);
  }
  syncOffset();
  window.addEventListener('resize', syncOffset);

  document.getElementById('open-search')?.addEventListener('click', toggleSearchPopup);
  document.getElementById('open-search-mobile')?.addEventListener('click', toggleSearchPopup);
  document.getElementById('close-search')?.addEventListener('click', closeSearchPopup);
  document.getElementById('search-backdrop')?.addEventListener('click', closeSearchPopup);

  document.getElementById('open-cart')?.addEventListener('click', () => toggleCartDrawer(productState));
  document.getElementById('open-cart-mobile')?.addEventListener('click', () => toggleCartDrawer(productState));
  document.getElementById('close-cart')?.addEventListener('click', closeCart);
  document.getElementById('cart-backdrop')?.addEventListener('click', closeCart);

  const mobileBtn = block.querySelector('#mobile-menu-btn');
  const mobileMenu = block.querySelector('#mobile-menu');
  const mobileBackdrop = block.querySelector('#mobile-menu-backdrop');
  mobileBtn?.addEventListener('click', () => {
    const isOpen = mobileBtn.getAttribute('aria-expanded') === 'true';
    mobileBtn.setAttribute('aria-expanded', String(!isOpen));
    mobileMenu?.classList.toggle('hidden', isOpen);
    mobileBackdrop?.classList.toggle('hidden', isOpen);
  });

  document.getElementById('mobile-menu-close')?.addEventListener('click', () => {
    mobileBtn?.setAttribute('aria-expanded', 'false');
    mobileMenu?.classList.add('hidden');
    mobileBackdrop?.classList.add('hidden');
  });

  mobileBackdrop?.addEventListener('click', () => {
    mobileBtn?.setAttribute('aria-expanded', 'false');
    mobileMenu?.classList.add('hidden');
    mobileBackdrop?.classList.add('hidden');
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) {
      mobileBtn?.setAttribute('aria-expanded', 'false');
      mobileMenu?.classList.add('hidden');
      mobileBackdrop?.classList.add('hidden');
    }
  });

  const profileBtn = block.querySelector('#profile-btn');
  const profileMenu = block.querySelector('#profile-menu');
  profileBtn?.addEventListener('click', () => {
    const open = profileBtn.getAttribute('aria-expanded') === 'true';
    profileBtn.setAttribute('aria-expanded', String(!open));
    profileMenu?.classList.toggle('hidden', open);
  });

  document.addEventListener('click', (event) => {
    if (profileMenu
      && !profileMenu.classList.contains('hidden')
      && !profileBtn?.contains(event.target)
      && !profileMenu.contains(event.target)) {
      profileMenu.classList.add('hidden');
      profileBtn?.setAttribute('aria-expanded', 'false');
    }
  });

  block.querySelector('#logout-btn')?.addEventListener('click', () => { logout(); window.location.href = '/'; });
  updateBadges();
  document.addEventListener('adokicks:cart-updated', updateBadges);
  document.addEventListener('adokicks:wishlist-updated', updateBadges);
}
