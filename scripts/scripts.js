/**
 * Adokicks EDS — scripts/scripts.js
 *
 * This is the EDS page-loading orchestrator (boilerplate pattern preserved).
 * All SHARED common code extracted from the original app.js lives here:
 *   - Design tokens sync (--header-offset)
 *   - Global click delegation (wishlist-toggle, cart-inc/dec/remove)
 *   - Keyboard shortcuts (Escape closes overlays)
 *   - syncHeaderOffset helper
 *   - Re-exports of every shared utility blocks need (product-store, cart-store)
 *
 * Block-specific logic stays in each block's own JS file:
 *   blocks/header/header.js     → nav, search overlay, cart drawer, profile menu
 *   blocks/hero/hero.js         → video carousel, slide rotation
 *   blocks/product-grid/...     → catalog filters, trending, search, wishlist grid
 *   blocks/banner/banner.js     → gender banners
 *   blocks/cards/cards.js       → about strip, metrics, values, timeline, categories
 *   blocks/benefits/benefits.js → 4-col benefits strip
 *   blocks/product-detail/...   → PDP gallery, size picker, add-to-cart
 *   blocks/auth/auth.js         → login / signup forms + SHA-256 hashing
 *   blocks/checkout/checkout.js → checkout form + order summary
 *   blocks/order-confirmation/  → countdown + latest order display
 *   blocks/orders-list/...      → order history list + detail view
 */

import {
  buildBlock,
  loadHeader,
  loadFooter,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
} from './aem.js';

// ─── Re-exports ───────────────────────────────────────────────────────────────
// Blocks import loadFragment from here so they don't need to know the path.
export { loadFragment } from '../blocks/fragment/fragment.js';

// Blocks import all store utilities from scripts.js as the single entry point.
// This mirrors the original app.js pattern where everything was one module.
export * from './product-store.js';
export * from './cart-store.js';

// ─── Constants (mirror of original app.js CATEGORY_LABELS + STORAGE_KEYS) ────
// Re-exported via product-store.js and cart-store.js above.
// Kept here as a named constant for inline use in scripts.js itself.
const STORAGE_KEYS = {
  users:       'adokicks_users',
  currentUser: 'adokicks_current_user_phone',
  cart:        'adokicks_cart',
  wishlist:    'adokicks_wishlist',
  orders:      'adokicks_orders',
};

// ─── Utilities used by multiple blocks ───────────────────────────────────────

/**
 * HTML escape — mirrors original sanitize() from app.js.
 * Blocks use this when inserting user-derived strings into innerHTML.
 * @param {*} text
 * @returns {string}
 */
export function sanitize(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Returns a URLSearchParams instance for the current page.
 * Mirrors the original params() helper in app.js.
 * @returns {URLSearchParams}
 */
export function params() {
  return new URLSearchParams(window.location.search);
}

/**
 * SHA-256 hash (async). Used by auth block for password hashing.
 * Mirrors the original sha256() function in app.js exactly.
 * @param {string} input
 * @returns {Promise<string>}
 */
export async function sha256(input) {
  if (!window.crypto || !window.crypto.subtle) {
    return `fallback_${btoa(unescape(encodeURIComponent(input))).replaceAll('=', '')}`;
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const byteArray = Array.from(new Uint8Array(hashBuffer));
  return byteArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ─── Validation helpers (from original app.js) ────────────────────────────────
// Exported so auth and checkout blocks can import them.

/** @param {string} phone */
export function validatePhone(phone) {
  return /^\d{10}$/.test(phone);
}

/** @param {string} name */
export function validateName(name) {
  return /^[A-Za-z][A-Za-z ]{1,49}$/.test(name.trim());
}

/** @param {string} password */
export function validatePassword(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
}

/** @param {string} email */
export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** @param {string} zip */
export function validateZip(zip) {
  return /^\d{5,6}$/.test(zip);
}

// ─── Header offset sync ───────────────────────────────────────────────────────
/**
 * Reads the rendered height of .site-header (the sticky nav) and writes it
 * to --header-offset on <html>. The original app.js called this on load and
 * on every resize. In EDS the header block calls it after it finishes rendering;
 * we also call it here after the lazy phase completes.
 */
export function syncHeaderOffset() {
  const header = document.querySelector('header');
  const offset = header ? Math.ceil(header.getBoundingClientRect().height) : 0;
  document.documentElement.style.setProperty('--header-offset', `${offset}px`);
}

// ─── Global event delegation ──────────────────────────────────────────────────
/**
 * Binds the document-level click handler for actions that can originate from
 * any block (wishlist toggle, cart qty controls, logout).
 *
 * The original app.js had one giant document click listener that handled all
 * data-action attributes. In EDS each block can have its own listeners, but
 * we keep cross-block delegated events here so product cards rendered inside
 * trending, featured, search, and wishlist all work without each block wiring
 * its own listener.
 *
 * Called once from loadPage() after lazy loading completes.
 */
function bindGlobalDelegation() {
  // Lazy-import stores so we don't block the eager phase
  let storeReady = false;
  let cartStore;

  async function ensureStore() {
    if (storeReady) return;
    cartStore = await import('./cart-store.js');
    storeReady = true;
  }

  document.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    // ── Wishlist toggle ──────────────────────────────────────────────────────
    // data-action="wishlist-toggle" data-product-id="..."
    // Used on .heart-btn elements inside product cards across all blocks.
    const wishBtn = target.closest('[data-action="wishlist-toggle"]');
    if (wishBtn instanceof HTMLElement) {
      await ensureStore();
      const productId = wishBtn.dataset.productId || wishBtn.dataset.id;
      if (!productId) return;
      const added = cartStore.toggleWishlist(productId);
      wishBtn.classList.toggle('active', added);
      wishBtn.setAttribute('aria-pressed', String(added));
      cartStore.toast(
        added ? 'Added to wishlist' : 'Removed from wishlist',
        'success',
      );
      // Dispatch so header badge updates immediately
      document.dispatchEvent(new CustomEvent('adokicks:wishlist-updated'));
      return;
    }

    // ── Cart quantity increment ──────────────────────────────────────────────
    // data-action="cart-inc" data-product-id="..." data-size="..."
    const incBtn = target.closest('[data-action="cart-inc"]');
    if (incBtn instanceof HTMLElement) {
      await ensureStore();
      cartStore.updateCartQty(
        incBtn.dataset.productId || '',
        incBtn.dataset.size || '',
        1,
      );
      document.dispatchEvent(new CustomEvent('adokicks:cart-render'));
      return;
    }

    // ── Cart quantity decrement ──────────────────────────────────────────────
    const decBtn = target.closest('[data-action="cart-dec"]');
    if (decBtn instanceof HTMLElement) {
      await ensureStore();
      cartStore.updateCartQty(
        decBtn.dataset.productId || '',
        decBtn.dataset.size || '',
        -1,
      );
      document.dispatchEvent(new CustomEvent('adokicks:cart-render'));
      return;
    }

    // ── Cart item remove ─────────────────────────────────────────────────────
    const removeBtn = target.closest('[data-action="cart-remove"]');
    if (removeBtn instanceof HTMLElement) {
      await ensureStore();
      const cart = cartStore.getCart().filter(
        (entry) => !(
          entry.productId === removeBtn.dataset.productId
          && String(entry.size) === String(removeBtn.dataset.size)
        ),
      );
      cartStore.setCart(cart);
      document.dispatchEvent(new CustomEvent('adokicks:cart-render'));
      return;
    }

    // ── Logout ───────────────────────────────────────────────────────────────
    // data-action="logout" on any button anywhere
    const logoutBtn = target.closest('[data-action="logout"]');
    if (logoutBtn instanceof HTMLElement) {
      await ensureStore();
      cartStore.logout();
      cartStore.toast('You have been logged out', 'success');
      window.location.href = '/';
    }
  });

  // ── Keyboard: Escape closes all overlays ──────────────────────────────────
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    // Signal all open overlays to close. Each block listens for this event.
    document.dispatchEvent(new CustomEvent('adokicks:close-overlays'));
    document.body.classList.remove('menu-open', 'search-open');
  });
}

// ─── buildHeroBlock ───────────────────────────────────────────────────────────
/**
 * Auto-builds a Hero block from a leading h1 + picture pair only when the
 * section does NOT already contain an authored hero block. On Adokicks the
 * home page always authors an explicit hero, so this fires only on pages that
 * have a plain picture-then-heading pattern.
 */
function buildHeroBlock(main) {
  const h1 = main.querySelector('h1');
  const picture = main.querySelector('picture');
  if (
    h1
    && picture
    // eslint-disable-next-line no-bitwise
    && (h1.compareDocumentPosition(picture) & Node.DOCUMENT_POSITION_PRECEDING)
    && !h1.closest('.hero')
    && !picture.closest('.hero')
  ) {
    const section = document.createElement('div');
    section.append(buildBlock('hero', { elems: [picture, h1] }));
    main.prepend(section);
  }
}

// ─── decorateButtons ─────────────────────────────────────────────────────────
/**
 * Converts formatted markdown links to button elements.
 * **bold link** → .button.primary
 * _em link_     → .button.secondary
 * This is the standard boilerplate pattern; kept exactly as-is.
 */
function decorateButtons(main) {
  main.querySelectorAll('p a[href]').forEach((a) => {
    a.title = a.title || a.textContent;
    const p = a.closest('p');
    const text = a.textContent.trim();
    if (a.querySelector('img') || p.textContent.trim() !== text) return;
    try {
      if (new URL(a.href).href === new URL(text, window.location).href) return;
    } catch { /* continue */ }
    const strong = a.closest('strong');
    const em = a.closest('em');
    if (!strong && !em) return;
    p.className = 'button-wrapper';
    a.className = 'button';
    if (strong && em) {
      a.classList.add('accent');
      (strong.contains(em) ? strong : em).replaceWith(a);
    } else if (strong) {
      a.classList.add('primary');
      strong.replaceWith(a);
    } else {
      a.classList.add('secondary');
      em.replaceWith(a);
    }
  });
}

// ─── buildAutoBlocks ─────────────────────────────────────────────────────────
/**
 * Automatically builds synthetic blocks. Handles:
 *   1. Fragment links (/fragments/...) → replaced with fragment content
 *   2. Leading h1 + picture → hero block (if not already authored)
 */
function buildAutoBlocks(main) {
  try {
    const fragments = [...main.querySelectorAll('a[href*="/fragments/"]')]
      .filter((f) => !f.closest('.fragment'));
    if (fragments.length > 0) {
      // eslint-disable-next-line import/no-cycle
      import('../blocks/fragment/fragment.js').then(({ loadFragment }) => {
        fragments.forEach(async (fragment) => {
          try {
            const { pathname } = new URL(fragment.href);
            const frag = await loadFragment(pathname);
            fragment.parentElement.replaceWith(...frag.children);
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Fragment loading failed', error);
          }
        });
      });
    }
    buildHeroBlock(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

// ─── decorateMain ────────────────────────────────────────────────────────────
/**
 * Called during loadEager (before LCP). Applies all structural decoration.
 * Exported so tests or other modules can call it directly if needed.
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
  decorateButtons(main);
}

// ─── Font loading ─────────────────────────────────────────────────────────────
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) {
      sessionStorage.setItem('fonts-loaded', 'true');
    }
  } catch (e) { /* noop */ }
}

// ─── Phase 1: Eager ───────────────────────────────────────────────────────────
/**
 * Runs synchronously before LCP. Decorates main, marks body as visible.
 * Mirrors original app.js init() — the page appears immediately, not after
 * the product data loads.
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }
  try {
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) { /* noop */ }
}

// ─── Phase 2: Lazy ────────────────────────────────────────────────────────────
/**
 * Runs after LCP. Loads header, footer, remaining sections, lazy styles.
 * After everything is ready, syncs --header-offset and binds global events.
 */
async function loadLazy(doc) {
  // Load header and footer (each fetches their DA fragment internally)
  loadHeader(doc.querySelector('header'));

  const main = doc.querySelector('main');
  await loadSections(main);

  // Scroll to hash if present
  const { hash } = window.location;
  const hashEl = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && hashEl) hashEl.scrollIntoView();

  loadFooter(doc.querySelector('footer'));

  // Lazy-load Google Fonts and any below-fold styles
  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();

  // Sync --header-offset after header block has rendered
  // The header block also calls syncHeaderOffset internally, but we call it
  // here as a safety net in case the header renders before this runs.
  requestAnimationFrame(() => {
    syncHeaderOffset();
    window.addEventListener('resize', () => {
      syncHeaderOffset();
    }, { passive: true });
  });

  // Wire cross-block global events
  bindGlobalDelegation();
}

// ─── Phase 3: Delayed ────────────────────────────────────────────────────────
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();