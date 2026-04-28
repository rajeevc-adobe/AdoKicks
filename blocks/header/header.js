import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';
import { getCart, cartItemCount, getWishlist, getCurrentUser, logout, toast } from '../../scripts/cart-store.js';

const isDesktop = window.matchMedia('(min-width: 900px)');

// ── Overlay builders ───────────────────────────────────────────────────
function buildSearchOverlay() {
  if (document.getElementById('search-pop')) return;
  const backdrop = document.createElement('div');
  backdrop.id = 'search-backdrop';
  backdrop.className = 'search-backdrop hidden';
  const pop = document.createElement('section');
  pop.id = 'search-pop';
  pop.className = 'search-pop hidden';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', 'Search products');
  pop.innerHTML = `
    <div class="search-pop-head">
      <input id="search-input" type="search" placeholder="Search shoes, brands…"
        aria-label="Search products" autocomplete="off" spellcheck="false">
      <button id="close-search" class="btn-close" type="button" aria-label="Close search">✕</button>
    </div>
    <div id="search-results" class="search-results" role="list" aria-live="polite"></div>`;
  document.body.appendChild(backdrop);
  document.body.appendChild(pop);
}

function buildCartDrawer() {
  if (document.getElementById('cart-drawer')) return;
  const backdrop = document.createElement('div');
  backdrop.id = 'cart-backdrop';
  backdrop.className = 'cart-backdrop hidden';
  const drawer = document.createElement('aside');
  drawer.id = 'cart-drawer';
  drawer.className = 'cart-drawer hidden';
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-label', 'Shopping cart');
  drawer.innerHTML = `
    <div class="cart-head">
      <h2>Your Bag</h2>
      <button id="close-cart" class="btn-close" type="button" aria-label="Close cart">✕</button>
    </div>
    <div id="cart-items" class="cart-items" aria-live="polite"></div>
    <div id="cart-footer" class="cart-footer hidden"></div>`;
  document.body.appendChild(backdrop);
  document.body.appendChild(drawer);
}

// ── Badge sync ─────────────────────────────────────────────────────────
function updateBadges() {
  const count = cartItemCount();
  const wishCount = getWishlist().length;
  document.querySelectorAll('.cart-count').forEach((el) => {
    el.textContent = count;
    el.classList.toggle('hidden', count === 0);
  });
  document.querySelectorAll('.wish-count').forEach((el) => {
    el.textContent = wishCount;
    el.classList.toggle('hidden', wishCount === 0);
  });
}

// ── Cart render ────────────────────────────────────────────────────────
async function renderCartContents() {
  const items = getCart();
  const cartItemsEl = document.getElementById('cart-items');
  const cartFooterEl = document.getElementById('cart-footer');
  if (!cartItemsEl) return;

  if (!items.length) {
    cartItemsEl.innerHTML = `
      <div class="cart-empty">
        <p>Your bag is empty.</p>
        <a href="/categories" class="button primary">Shop Now</a>
      </div>`;
    cartFooterEl?.classList.add('hidden');
    return;
  }

  const { getProducts } = await import('../../scripts/product-store.js');
  const { formatCurrency, updateCartQty, cartTotal } = await import('../../scripts/cart-store.js');
  const products = await getProducts();
  const byId = Object.fromEntries(products.map((p) => [p.id, p]));
  const subtotal = cartTotal(items, byId);

  cartItemsEl.innerHTML = items.map((item) => {
    const p = byId[item.productId];
    if (!p) return '';
    return `
      <div class="cart-item" data-product-id="${p.id}" data-size="${item.size}">
        <a href="/product?id=${encodeURIComponent(p.id)}" class="cart-item-img">
          <img src="${p.images[0]}" alt="${p.title}" width="72" height="72" loading="lazy">
        </a>
        <div class="cart-item-info">
          <p class="cart-item-title">${p.title}</p>
          <p class="cart-item-meta">Size ${item.size} · ${formatCurrency(p.price)}</p>
          <div class="cart-qty-row">
            <button class="qty-btn" data-action="dec" aria-label="Decrease quantity">−</button>
            <span class="qty-value">${item.qty}</span>
            <button class="qty-btn" data-action="inc" aria-label="Increase quantity">+</button>
          </div>
        </div>
        <p class="cart-item-total">${formatCurrency(p.price * item.qty)}</p>
      </div>`;
  }).join('');

  cartFooterEl.classList.remove('hidden');
  cartFooterEl.innerHTML = `
    <div class="cart-subtotal">
      <span>Subtotal</span>
      <strong>${formatCurrency(subtotal)}</strong>
    </div>
    <p class="cart-free-shipping ${subtotal >= 999 ? 'qualified' : ''}">
      ${subtotal >= 999 ? '✓ Free delivery applied' : `Add Rs ${999 - subtotal} more for free delivery`}
    </p>
    <a href="/checkout" class="button primary cart-checkout-btn">Proceed to Checkout</a>`;

  cartItemsEl.querySelectorAll('.qty-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const row = btn.closest('.cart-item');
      const { updateCartQty: uCQ } = await import('../../scripts/cart-store.js');
      uCQ(row.dataset.productId, row.dataset.size, btn.dataset.action === 'inc' ? 1 : -1);
      renderCartContents();
    });
  });
}

// ── Open / close helpers ───────────────────────────────────────────────
function openCart() {
  document.getElementById('cart-drawer')?.classList.remove('hidden');
  document.getElementById('cart-backdrop')?.classList.remove('hidden');
  document.body.classList.add('overlay-open');
  renderCartContents();
}
function closeCart() {
  document.getElementById('cart-drawer')?.classList.add('hidden');
  document.getElementById('cart-backdrop')?.classList.add('hidden');
  document.body.classList.remove('overlay-open');
}
function openSearch() {
  document.getElementById('search-pop')?.classList.remove('hidden');
  document.getElementById('search-backdrop')?.classList.remove('hidden');
  setTimeout(() => document.getElementById('search-input')?.focus(), 50);
}
function closeSearch() {
  document.getElementById('search-pop')?.classList.add('hidden');
  document.getElementById('search-backdrop')?.classList.add('hidden');
  const inp = document.getElementById('search-input');
  if (inp) inp.value = '';
  const res = document.getElementById('search-results');
  if (res) res.innerHTML = '';
}

// ── Main decorate ──────────────────────────────────────────────────────
export default async function decorate(block) {
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);

  // The /nav doc renders as sections in a fragment.
  // Section 0 = brand, Section 1 = nav links, Section 2 = tools
  const sections = [...(fragment?.children || [])];
  const brandSection  = sections[0];
  const linksSection  = sections[1];

  const user = getCurrentUser();
  const currentPath = window.location.pathname;

  const navLinks = linksSection
    ? [...linksSection.querySelectorAll('a')].map((a) => {
        const href = new URL(a.href, window.location.origin).pathname;
        const active = href === currentPath || (href !== '/' && currentPath.startsWith(href));
        return `<a href="${a.href}" class="nav-link${active ? ' nav-link--active' : ''}"
          aria-current="${active ? 'page' : 'false'}">${a.textContent}</a>`;
      }).join('')
    : '';

  const mobileLinks = linksSection
    ? [...linksSection.querySelectorAll('a')].map((a) =>
        `<a href="${a.href}" class="mobile-nav-link">${a.textContent}</a>`
      ).join('')
    : '';

  block.innerHTML = `
    <div class="nav-wrapper">
      <div class="nav-inner">
        <a href="/" class="brand-link" aria-label="Adokicks home">
          <img src="/icons/adokicks.png" alt="" class="brand-logo" width="36" height="36" loading="eager">
          <span class="brand-copy">
            <span class="brand-name">Adokicks</span>
            <span class="brand-tagline">Premium sneaker studio</span>
          </span>
        </a>

        <nav class="nav-links-wrap" role="navigation" aria-label="Main navigation">
          ${navLinks}
        </nav>

        <div class="nav-actions">
          <button id="open-search" class="icon-btn" type="button" aria-label="Open search" title="Search">
            <img src="/icons/search-button-svgrepo-com.svg" alt="" class="nav-icon" aria-hidden="true">
          </button>
          <a href="/wishlist" class="icon-btn" aria-label="Wishlist" style="position:relative">
            <img src="/icons/heart-alt-svgrepo-com.svg" alt="" class="nav-icon" aria-hidden="true">
            <span class="wish-count icon-count hidden" aria-live="polite">0</span>
          </a>
          <button id="open-cart" class="icon-btn" type="button" aria-label="Open cart" style="position:relative">
            <img src="/icons/cart-shopping-fast-svgrepo-com.svg" alt="" class="nav-icon" aria-hidden="true">
            <span class="cart-count icon-count hidden" aria-live="polite">0</span>
          </button>
          ${user
            ? `<div class="profile-wrap">
                 <button id="profile-btn" class="profile-avatar" type="button"
                   aria-label="Profile menu" aria-haspopup="true" aria-expanded="false">
                   ${user.name[0].toUpperCase()}
                 </button>
                 <div id="profile-menu" class="profile-menu hidden" role="menu">
                   <a href="/my-orders" role="menuitem">My Orders</a>
                   <a href="/wishlist" role="menuitem">Wishlist</a>
                   <button id="logout-btn" type="button" role="menuitem">Sign Out</button>
                 </div>
               </div>`
            : `<a href="/auth" class="button primary nav-signin" aria-label="Sign in">Sign In</a>`
          }
        </div>

        <button id="mobile-menu-btn" class="icon-btn menu-toggle" type="button"
          aria-label="Open menu" aria-expanded="false" aria-controls="mobile-nav">
          <span class="hamburger" aria-hidden="true"><span></span><span></span><span></span></span>
        </button>
      </div>

      <nav id="mobile-nav" class="mobile-nav hidden" aria-label="Mobile navigation">
        ${mobileLinks}
        <a href="/wishlist" class="mobile-nav-link">Wishlist</a>
        ${user
          ? `<a href="/my-orders" class="mobile-nav-link">My Orders</a>
             <button id="mobile-logout-btn" class="mobile-nav-link mobile-nav-btn" type="button">Sign Out</button>`
          : `<a href="/auth" class="mobile-nav-link mobile-nav-signin">Sign In</a>`
        }
      </nav>
    </div>`;

  // Build overlays (appended to body, not inside block)
  buildSearchOverlay();
  buildCartDrawer();

  // ── Events ─────────────────────────────────────────────────────────
  document.getElementById('open-search')?.addEventListener('click', openSearch);
  document.getElementById('close-search')?.addEventListener('click', closeSearch);
  document.getElementById('search-backdrop')?.addEventListener('click', closeSearch);
  document.getElementById('open-cart')?.addEventListener('click', openCart);
  document.getElementById('close-cart')?.addEventListener('click', closeCart);
  document.getElementById('cart-backdrop')?.addEventListener('click', closeCart);

  // Mobile menu
  const mobileBtn = block.querySelector('#mobile-menu-btn');
  const mobileNav = block.querySelector('#mobile-nav');
  mobileBtn?.addEventListener('click', () => {
    const isOpen = mobileBtn.getAttribute('aria-expanded') === 'true';
    mobileBtn.setAttribute('aria-expanded', String(!isOpen));
    mobileNav?.classList.toggle('hidden', isOpen);
    mobileBtn.querySelector('.hamburger')?.classList.toggle('is-open', !isOpen);
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) {
      mobileNav?.classList.add('hidden');
      mobileBtn?.setAttribute('aria-expanded', 'false');
    }
  });

  // Profile dropdown
  const profileBtn = block.querySelector('#profile-btn');
  const profileMenu = block.querySelector('#profile-menu');
  profileBtn?.addEventListener('click', () => {
    const open = profileBtn.getAttribute('aria-expanded') === 'true';
    profileBtn.setAttribute('aria-expanded', String(!open));
    profileMenu?.classList.toggle('hidden', open);
  });
  document.addEventListener('click', (e) => {
    if (profileMenu && !profileMenu.classList.contains('hidden')
      && !profileBtn?.contains(e.target) && !profileMenu.contains(e.target)) {
      profileMenu.classList.add('hidden');
      profileBtn?.setAttribute('aria-expanded', 'false');
    }
  });

  // Logout
  const handleLogout = () => { logout(); window.location.href = '/'; };
  block.querySelector('#logout-btn')?.addEventListener('click', handleLogout);
  block.querySelector('#mobile-logout-btn')?.addEventListener('click', handleLogout);

  // Search live results
  const searchInput = document.getElementById('search-input');
  let debounce;
  searchInput?.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(async () => {
      const q = searchInput.value.trim().toLowerCase();
      const resultsEl = document.getElementById('search-results');
      if (!resultsEl) return;
      if (!q || q.length < 2) { resultsEl.innerHTML = ''; return; }
      const { getProducts } = await import('../../scripts/product-store.js');
      const { formatCurrency } = await import('../../scripts/cart-store.js');
      const products = await getProducts();
      const hits = products.filter((p) =>
        `${p.title} ${p.brand} ${p.category}`.toLowerCase().includes(q)
      ).slice(0, 7);
      resultsEl.innerHTML = hits.length
        ? hits.map((p) => `
            <a href="/product?id=${encodeURIComponent(p.id)}" class="search-hit" role="listitem">
              <img src="${p.images[0]}" alt="${p.title}" width="48" height="48" loading="lazy">
              <span class="search-hit-info">
                <strong>${p.title}</strong>
                <em>${p.brand} · ${formatCurrency(p.price)}</em>
              </span>
            </a>`).join('')
        : `<p class="search-empty">No results for "<strong>${q}</strong>"</p>`;
    }, 200);
  });
  searchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const v = searchInput.value.trim();
      if (v) { window.location.href = `/search?q=${encodeURIComponent(v)}`; closeSearch(); }
    }
  });

  // Escape closes overlays
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeSearch(); closeCart(); }
  });

  updateBadges();
  document.addEventListener('adokicks:cart-updated', updateBadges);
  document.addEventListener('adokicks:wishlist-updated', updateBadges);
}