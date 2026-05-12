import {
  getCart,
  getWishlist,
  getCurrentUser,
  logout,
  toast,
  formatCurrency,
} from '../../scripts/cart-store.js';
import { loadFragment } from '../fragment/fragment.js';

let cartOpen = false;
let searchOpen = false;
let mobileOpen = false;
let profileOpen = false;
let searchShell = null;
let cartShell = null;

const CATEGORY_LABELS = {
  training: 'Training Shoes',
  running: 'Running Shoes',
  multisport: 'Multisport Shoes',
  casual: 'Casual Shoes',
  sneakers: 'Sneakers',
};

const DEFAULT_NAV = {
  brand: { label: 'Adokicks', href: '/', tagline: 'Premium sneaker studio' },
  navItems: [
    { href: '/', label: 'Home', aria: 'Home page' },
    { href: '/mens', label: 'Mens', aria: 'Men shoes page' },
    { href: '/womens', label: 'Womens', aria: 'Women shoes page' },
    { href: '/featured', label: 'Featured', aria: 'Featured shoes page' },
    { href: '/categories', label: 'Categories', aria: 'Categories page' },
    { href: '/about', label: 'About Us', aria: 'About us page' },
  ],
  tools: {
    search: { label: 'Search', href: '/search' },
    wishlist: { label: 'Wishlist', href: '/wishlist' },
    cart: { label: 'Cart', href: '/checkout' },
    signIn: { label: 'Sign In', href: '/auth' },
    profile: { label: 'Profile', href: '/my-orders' },
    myOrders: { label: 'My Orders', href: '/my-orders' },
    logout: { label: 'Logout', href: '/auth' },
  },
  mobile: {
    openLabel: 'Open menu',
    navigationLabel: 'Mobile navigation',
    kicker: 'Menu',
    title: 'Browse Adokicks',
    closeLabel: 'Close menu',
  },
};

const DEFAULT_SEARCH_SHELL = {
  kicker: 'Search',
  title: 'Find a product',
  closeLabel: 'Close search popup',
  inputLabel: 'Search shoes',
  inputAriaLabel: 'Search product by title, brand, or category',
  placeholder: 'Type product name, brand, or category',
  submitLabel: 'Search',
  submitAriaLabel: 'View full search results',
  emptyText: 'No matching shoes.',
  requiredText: 'Type something to search',
};

const DEFAULT_CART_SHELL = {
  title: 'Your Bag',
  closeLabel: 'Close cart',
  itemsLabel: 'Items in cart',
  footerLabel: 'Cart total and checkout',
  emptyTitle: 'Your bag is empty',
  emptyText: 'Add some stylish kicks to get started!',
  subtotalLabel: 'Subtotal',
  itemsCountLabel: 'Items',
  checkoutLabel: 'Proceed to Checkout',
  checkoutEmptyLabel: 'Checkout',
};

function sanitize(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function camelKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+([a-z0-9])/g, (_, c) => c.toUpperCase());
}

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ');
}

function sectionAfterHeading(root, label) {
  const heading = [...root.querySelectorAll('h1, h2, h3, h4, h5, h6')]
    .find((h) => normalizeKey(h.textContent) === normalizeKey(label));
  if (!heading) return [];
  const nodes = [];
  for (let node = heading.nextElementSibling; node; node = node.nextElementSibling) {
    if (/^H[1-6]$/.test(node.tagName)) break;
    nodes.push(node);
  }
  return nodes;
}

function readLinks(nodes) {
  return nodes.flatMap((node) => [...node.querySelectorAll('a[href]')])
    .map((link) => ({
      href: link.getAttribute('href') || link.href,
      label: link.textContent.trim(),
      aria: `${link.textContent.trim()} page`,
    }))
    .filter((link) => link.href && link.label);
}

function readFragmentConfig(root, defaults) {
  const config = { ...defaults };
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

  root.querySelectorAll('tr').forEach((row) => {
    applyRow([...row.children]);
  });

  root.querySelectorAll(':scope > div, :scope > section').forEach((section) => {
    section.querySelectorAll(':scope > div').forEach((row) => {
      applyRow([...row.children]);
    });
  });

  root.querySelectorAll('div > div').forEach((row) => {
    applyRow([...row.children]);
  });

  root.querySelectorAll('li').forEach((item) => {
    const text = item.textContent.trim();
    const separator = text.indexOf(':');
    if (separator <= 0) return;
    applyPair(text.slice(0, separator), text.slice(separator + 1));
  });

  return config;
}

async function loadShell(path, defaults) {
  try {
    const resp = await fetch(`${path}.plain.html`);
    if (!resp.ok) return { ...defaults };
    const fragment = document.createElement('main');
    fragment.innerHTML = await resp.text();
    return readFragmentConfig(fragment, defaults);
  } catch {
    return { ...defaults };
  }
}

async function loadNavConfig() {
  try {
    const fragment = await loadFragment('/nav');
    if (!fragment) return DEFAULT_NAV;

    const brandNodes = sectionAfterHeading(fragment, 'Brand');
    const brandLink = brandNodes.flatMap((node) => [...node.querySelectorAll('a[href]')])[0];
    const navNodes = sectionAfterHeading(fragment, 'Nav');
    const toolNodes = sectionAfterHeading(fragment, 'Tools');
    const mobileNodes = sectionAfterHeading(fragment, 'Mobile');
    if (!brandNodes.length || !brandLink || !navNodes.length || !toolNodes.length) return DEFAULT_NAV;

    const brandText = brandNodes.map((node) => node.textContent.trim()).filter(Boolean).join(' ');
    const brandLabel = brandLink?.textContent.trim() || DEFAULT_NAV.brand.label;
    const tagline = brandText
      .replace(brandLabel, '')
      .replace(/^[\s-]+/, '')
      .trim() || DEFAULT_NAV.brand.tagline;
    const navItems = readLinks(navNodes);
    const tools = readLinks(toolNodes);
    if (!navItems.length || !tools.length) return DEFAULT_NAV;

    const findTool = (name, fallback) => tools.find((link) => normalizeKey(link.label) === normalizeKey(name)) || fallback;
    const mobileRoot = document.createElement('div');
    mobileNodes.forEach((node) => mobileRoot.append(node.cloneNode(true)));

    return {
      brand: {
        label: brandLabel,
        href: brandLink?.getAttribute('href') || DEFAULT_NAV.brand.href,
        tagline,
      },
      navItems: navItems.length ? navItems : DEFAULT_NAV.navItems,
      tools: {
        search: findTool('Search', DEFAULT_NAV.tools.search),
        wishlist: findTool('Wishlist', DEFAULT_NAV.tools.wishlist),
        cart: findTool('Cart', DEFAULT_NAV.tools.cart),
        signIn: findTool('Sign In', DEFAULT_NAV.tools.signIn),
        profile: findTool('Profile', DEFAULT_NAV.tools.profile),
        myOrders: findTool('My Orders', DEFAULT_NAV.tools.myOrders),
        logout: findTool('Logout', DEFAULT_NAV.tools.logout),
      },
      mobile: mobileNodes.length ? readFragmentConfig(mobileRoot, DEFAULT_NAV.mobile) : DEFAULT_NAV.mobile,
    };
  } catch {
    return DEFAULT_NAV;
  }
}

async function ensureSearchPopup() {
  searchShell = searchShell || await loadShell('/fragments/search-shell', DEFAULT_SEARCH_SHELL);
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
        <div><p class="search-pop-kicker">${sanitize(searchShell.kicker)}</p><h2>${sanitize(searchShell.title)}</h2></div>
        <button id="close-search" class="btn-close search-close-btn" type="button" aria-label="${sanitize(searchShell.closeLabel)}">&times;</button>
      </div>
      <label class="search-input-label" for="quick-search-input">${sanitize(searchShell.inputLabel)}</label>
      <div class="search-input-shell">
        <img src="/assests/icons/search-button-svgrepo-com.svg" alt="" aria-hidden="true" class="search-input-icon">
        <input id="quick-search-input" type="search" aria-label="${sanitize(searchShell.inputAriaLabel)}" placeholder="${sanitize(searchShell.placeholder)}">
      </div>
      <div class="search-pop-actions">
        <button class="btn-primary" type="submit" aria-label="${sanitize(searchShell.submitAriaLabel)}">${sanitize(searchShell.submitLabel)}</button>
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
    const hits = products.filter((p) => `${p.title} ${p.brand} ${p.category}`.toLowerCase().includes(q)).slice(0, 7);
    results.innerHTML = hits.length
      ? hits.map((p) => `<a class="quick-item" href="/product?id=${encodeURIComponent(p.id)}" role="listitem">
          <img src="${sanitize(p.images?.[0] || '/adokicks.png')}" alt="${sanitize(p.title)}">
          <span class="quick-item-copy"><strong>${sanitize(p.title)}</strong><small>${sanitize(p.brand)} &bull; ${sanitize(CATEGORY_LABELS[p.category] || p.category)}</small></span>
          <strong class="quick-item-price">${formatCurrency(p.price)}</strong>
        </a>`).join('')
      : `<p class="search-empty">${sanitize(searchShell?.emptyText || DEFAULT_SEARCH_SHELL.emptyText)}</p>`;
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) {
      toast(searchShell?.requiredText || DEFAULT_SEARCH_SHELL.requiredText);
      return;
    }
    window.location.href = `/search?q=${encodeURIComponent(q)}`;
  });

  close.addEventListener('click', () => {
    searchOpen = false;
    document.getElementById('search-pop')?.classList.add('hidden');
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

async function ensureCartDrawer() {
  cartShell = cartShell || await loadShell('/fragments/cart-shell', DEFAULT_CART_SHELL);
  if (!document.getElementById('cart-drawer')) {
    const cart = document.createElement('aside');
    cart.id = 'cart-drawer';
    cart.className = 'cart-drawer hidden';
    cart.setAttribute('aria-label', 'Shopping cart sidebar');
    cart.innerHTML = `
      <div class="drawer-head">
        <div class="drawer-head-content"><h2>${sanitize(cartShell.title)}</h2><span id="cart-item-count" class="cart-count-badge">0</span></div>
        <button id="close-cart" class="btn-close" type="button" aria-label="${sanitize(cartShell.closeLabel)}">&times;</button>
      </div>
      <div id="cart-items" class="cart-items" aria-label="${sanitize(cartShell.itemsLabel)}"></div>
      <div id="cart-footer" class="drawer-foot" aria-label="${sanitize(cartShell.footerLabel)}"></div>
    `;
    document.body.appendChild(cart);
  }
}

function ensureProfileMenu(tools = DEFAULT_NAV.tools) {
  const user = getCurrentUser();
  const existing = document.getElementById('profile-menu');
  if (!user) {
    existing?.remove();
    return;
  }
  if (existing) return;
  const menu = document.createElement('div');
  menu.id = 'profile-menu';
  menu.className = 'profile-menu hidden';
  menu.innerHTML = `
    <a href="${sanitize(tools.myOrders.href)}" aria-label="${sanitize(tools.myOrders.label)}">${sanitize(tools.myOrders.label)}</a>
    <button id="logout-btn" type="button" aria-label="${sanitize(tools.logout.label)}">${sanitize(tools.logout.label)}</button>
  `;
  document.body.appendChild(menu);
}

function closeProfileMenu() {
  profileOpen = false;
  document.getElementById('profile-menu')?.classList.add('hidden');
}

function toggleProfileMenu() {
  const menu = document.getElementById('profile-menu');
  if (!menu) return;
  closeMobile();
  profileOpen = !profileOpen;
  menu.classList.toggle('hidden', !profileOpen);
}

function closeCartDrawer() {
  cartOpen = false;
  document.getElementById('cart-drawer')?.classList.add('hidden');
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
    itemsWrap.innerHTML = `<div class="empty-cart"><p>${sanitize(cartShell?.emptyTitle || DEFAULT_CART_SHELL.emptyTitle)}</p><p class="empty-cart-subtext">${sanitize(cartShell?.emptyText || DEFAULT_CART_SHELL.emptyText)}</p></div>`;
    footer.innerHTML = `<div class="cart-summary"><p>${sanitize(cartShell?.subtotalLabel || DEFAULT_CART_SHELL.subtotalLabel)}: <strong>${formatCurrency(0)}</strong></p></div><button class="btn-primary" type="button" disabled>${sanitize(cartShell?.checkoutEmptyLabel || DEFAULT_CART_SHELL.checkoutEmptyLabel)}</button>`;
    return;
  }

  itemsWrap.innerHTML = cart.map((item) => {
    const p = state.byId[item.productId];
    return `<article class="cart-item" aria-label="${sanitize(p.title)} in cart">
      <div class="cart-item-image"><img src="${sanitize(p.images?.[0] || '/adokicks.png')}" alt="${sanitize(p.title)}"></div>
      <div class="cart-item-content">
        <div class="cart-item-header">
          <h3>${sanitize(p.title)}</h3>
          <button class="btn-remove" type="button" data-action="cart-remove" data-product-id="${sanitize(item.productId)}" data-size="${sanitize(item.size)}" aria-label="Remove item">&times;</button>
        </div>
        <p class="cart-item-meta">Size: <strong>${sanitize(item.size)}</strong></p>
        <div class="cart-item-footer">
          <div class="qty-control">
            <button type="button" data-action="cart-dec" data-product-id="${sanitize(item.productId)}" data-size="${sanitize(item.size)}" aria-label="Decrease">&minus;</button>
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
      <div class="summary-row"><span>${sanitize(cartShell?.subtotalLabel || DEFAULT_CART_SHELL.subtotalLabel)}:</span><strong>${formatCurrency(subtotal)}</strong></div>
      <div class="summary-row"><span>${sanitize(cartShell?.itemsCountLabel || DEFAULT_CART_SHELL.itemsCountLabel)}:</span><strong>${totalItems}</strong></div>
    </div>
    <button id="cart-checkout" class="btn-primary btn-checkout" type="button" aria-label="${sanitize(cartShell?.checkoutLabel || DEFAULT_CART_SHELL.checkoutLabel)}">${sanitize(cartShell?.checkoutLabel || DEFAULT_CART_SHELL.checkoutLabel)}</button>
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
  const navConfig = await loadNavConfig();
  const user = getCurrentUser();
  const currentPath = getCurrentPath();
  const navLinkClass = (href) => (href === currentPath ? 'nav-link active' : 'nav-link');
  const mobileLinkClass = (href) => (href === currentPath ? 'mobile-menu-link active' : 'mobile-menu-link');
  const navLinks = navConfig.navItems
    .map((i) => `<a class="${navLinkClass(i.href)}" href="${i.href}" aria-label="${sanitize(i.aria)}">${sanitize(i.label)}</a>`)
    .join('');
  const mobileLinks = navConfig.navItems
    .map((i) => `<a class="${mobileLinkClass(i.href)}" href="${i.href}" aria-label="${sanitize(i.aria)}">${sanitize(i.label)}</a>`)
    .join('');

  block.innerHTML = `
    <div class="site-header">
      <nav class="nav-inner" role="navigation" aria-label="Main navigation">
        <div class="nav-mobile-actions">
          <button id="open-search-mobile" class="icon-btn nav-icon-btn nav-mobile-icon" type="button" aria-label="Open product search" title="${sanitize(navConfig.tools.search.label)}">
            <img src="/assests/icons/search-button-svgrepo-com.svg" alt="" aria-hidden="true" class="nav-icon-svg">
          </button>
          <button id="open-cart-mobile" class="icon-btn nav-icon-btn nav-mobile-icon" type="button" aria-label="Open ${sanitize(navConfig.tools.cart.label)}" title="${sanitize(navConfig.tools.cart.label)}">
            <img src="/assests/icons/cart-shopping-fast-svgrepo-com.svg" alt="" aria-hidden="true" class="nav-icon-svg">
            <span id="cart-count-mobile" class="icon-count">0</span>
          </button>
          ${user
    ? `<button id="profile-btn-mobile" class="icon-btn nav-icon-btn nav-mobile-icon nav-auth-icon" type="button" aria-label="${sanitize(navConfig.tools.profile.label)}" title="${sanitize(navConfig.tools.profile.label)}"><img src="/assests/icons/person-svgrepo-com.svg" alt="" aria-hidden="true" class="nav-icon-svg"></button>`
    : `<a href="${sanitize(navConfig.tools.signIn.href)}" class="icon-btn nav-icon-btn nav-mobile-icon nav-auth-icon" aria-label="Sign in" title="${sanitize(navConfig.tools.signIn.label)}"><img src="/assests/icons/person-svgrepo-com.svg" alt="" aria-hidden="true" class="nav-icon-svg"></a>`}
          <button id="mobile-menu-btn" class="icon-btn nav-icon-btn menu-toggle" type="button" aria-label="${sanitize(navConfig.mobile.openLabel)}" aria-expanded="false" aria-controls="mobile-menu">
            <span class="menu-toggle-lines" aria-hidden="true"><span></span><span></span><span></span></span>
          </button>
        </div>

        <div class="nav-brand">
          <a class="brand-link" href="${sanitize(navConfig.brand.href)}" aria-label="Go to home page">
            <span class="logo-link" aria-hidden="true"><img src="/adokicks.png" alt=""></span>
            <span class="brand-copy">
              <span class="brand-name">${sanitize(navConfig.brand.label)}</span>
              <span class="brand-tagline">${sanitize(navConfig.brand.tagline)}</span>
            </span>
          </a>
        </div>

        <div class="nav-desktop">
          <div class="nav-links">${navLinks}</div>
          <div class="nav-actions">
            <button id="open-search" class="icon-btn nav-icon-btn" type="button" aria-label="Open product search" title="${sanitize(navConfig.tools.search.label)}">
              <img src="/assests/icons/search-button-svgrepo-com.svg" alt="" aria-hidden="true" class="nav-icon-svg">
            </button>
            <a href="${sanitize(navConfig.tools.wishlist.href)}" class="icon-btn nav-icon-btn" aria-label="Open wishlist" title="${sanitize(navConfig.tools.wishlist.label)}">
              <img src="/assests/icons/heart-alt-svgrepo-com.svg" alt="" aria-hidden="true" class="nav-icon-svg">
              <span id="wish-count" class="icon-count">0</span>
            </a>
            <button id="open-cart" class="icon-btn nav-icon-btn" type="button" aria-label="Open ${sanitize(navConfig.tools.cart.label)}" title="${sanitize(navConfig.tools.cart.label)}">
              <img src="/assests/icons/cart-shopping-fast-svgrepo-com.svg" alt="" aria-hidden="true" class="nav-icon-svg">
              <span id="cart-count" class="icon-count">0</span>
            </button>
            ${user
    ? `<div class="profile-wrap"><button id="profile-btn" class="profile-avatar" type="button" aria-label="${sanitize(navConfig.tools.profile.label)}">${sanitize(user.name[0].toUpperCase())}</button></div>`
    : `<a href="${sanitize(navConfig.tools.signIn.href)}" class="btn-primary" aria-label="Sign in">${sanitize(navConfig.tools.signIn.label)}</a>`}
          </div>
        </div>
      </nav>
      <div id="mobile-menu-backdrop" class="mobile-menu-backdrop hidden" aria-hidden="true"></div>
      <aside id="mobile-menu" class="mobile-menu hidden" aria-label="${sanitize(navConfig.mobile.navigationLabel)}">
        <div class="mobile-menu-head">
          <div><p class="mobile-menu-kicker">${sanitize(navConfig.mobile.kicker)}</p><h2>${sanitize(navConfig.mobile.title)}</h2></div>
          <button id="mobile-menu-close" class="btn-close" type="button" aria-label="${sanitize(navConfig.mobile.closeLabel)}">&times;</button>
        </div>
        <div class="mobile-menu-links">
          ${mobileLinks}
          <a class="mobile-menu-link" href="${sanitize(navConfig.tools.wishlist.href)}" aria-label="Open wishlist">${sanitize(navConfig.tools.wishlist.label)}</a>
        </div>
      </aside>
    </div>
  `;

  await ensureSearchPopup();
  await ensureCartDrawer();
  ensureProfileMenu(navConfig.tools);

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

  document.getElementById('open-search')?.addEventListener('click', toggleSearchPopup);
  document.getElementById('open-search-mobile')?.addEventListener('click', toggleSearchPopup);
  document.getElementById('open-cart')?.addEventListener('click', () => toggleCartDrawer(productState));
  document.getElementById('open-cart-mobile')?.addEventListener('click', () => toggleCartDrawer(productState));
  document.getElementById('profile-btn')?.addEventListener('click', toggleProfileMenu);
  document.getElementById('profile-btn-mobile')?.addEventListener('click', toggleProfileMenu);
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    logout();
    closeProfileMenu();
    toast('You have been logged out', 'success');
    window.location.href = '/';
  });
  document.getElementById('close-cart')?.addEventListener('click', () => {
    closeCartDrawer();
  });

  document.getElementById('mobile-menu-btn')?.addEventListener('click', toggleMobile);
  document.getElementById('mobile-menu-close')?.addEventListener('click', closeMobile);
  document.getElementById('mobile-menu-backdrop')?.addEventListener('click', closeMobile);
  window.addEventListener('resize', () => {
    if (window.innerWidth > 1024) closeMobile();
  });
  document.addEventListener('click', (event) => {
    const { target } = event;
    if (!(target instanceof Element)) return;
    const profileMenu = document.getElementById('profile-menu');
    const profileBtn = document.getElementById('profile-btn');
    const profileBtnMobile = document.getElementById('profile-btn-mobile');
    const profileTrigger = profileBtn?.contains(target) || profileBtnMobile?.contains(target);
    if (profileOpen && profileMenu && !profileMenu.contains(target) && !profileTrigger) {
      closeProfileMenu();
    }

    const cartDrawer = document.getElementById('cart-drawer');
    const cartBtn = document.getElementById('open-cart');
    const cartBtnMobile = document.getElementById('open-cart-mobile');
    const cartTrigger = cartBtn?.contains(target) || cartBtnMobile?.contains(target);
    if (cartOpen && cartDrawer && !cartDrawer.contains(target) && !cartTrigger) {
      closeCartDrawer();
    }
  });

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
