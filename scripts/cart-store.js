/**
 * scripts/cart-store.js
 * Cart, wishlist, orders and auth — all localStorage-backed.
 * Dispatches CustomEvents so any block can react to state changes.
 */

/* ── Storage keys ───────────────────────────────────────────────────── */
const SK = {
  users:       'adokicks_users',
  currentUser: 'adokicks_current_user_phone',
  cart:        'adokicks_cart',
  wishlist:    'adokicks_wishlist',
  orders:      'adokicks_orders',
};

/* ── Storage helpers ────────────────────────────────────────────────── */
function sGet(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function sSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* noop */ }
}
function sRaw(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

/* ── Auth ───────────────────────────────────────────────────────────── */
export function getUsers()  { return sGet(SK.users, []); }
export function saveUser(u) {
  const users = getUsers();
  const idx = users.findIndex((x) => x.phone === u.phone);
  if (idx >= 0) users[idx] = u; else users.push(u);
  sSet(SK.users, users);
}
export function getCurrentUser() {
  const phone = sRaw(SK.currentUser);
  if (!phone) return null;
  return getUsers().find((u) => u.phone === phone) || null;
}
export function setCurrentUser(phone) { localStorage.setItem(SK.currentUser, phone); }
export function logout() { localStorage.removeItem(SK.currentUser); }

/* ── Per-user storage key ───────────────────────────────────────────── */
function scopedKey(base) {
  const phone = sRaw(SK.currentUser);
  return phone ? `${base}_${phone}` : base;
}

/* ── Cart ───────────────────────────────────────────────────────────── */
export function getCart() { return sGet(scopedKey(SK.cart), []); }

function _setCart(cart) {
  sSet(scopedKey(SK.cart), cart);
  document.dispatchEvent(new CustomEvent('adokicks:cart-updated'));
}

/**
 * Adds a product to the cart.
 * @returns {boolean} true if successful
 */
export function addToCart(productId, size, qty = 1) {
  if (!size) { toast('Please select a size first.', 'error'); return false; }
  const cart = getCart();
  const existing = cart.find((i) => i.productId === productId && String(i.size) === String(size));
  if (existing) { existing.qty += qty; } else { cart.push({ productId, size, qty }); }
  _setCart(cart);
  // remove from wishlist when adding to bag
  const wl = getWishlist();
  if (wl.includes(productId)) setWishlist(wl.filter((id) => id !== productId));
  return true;
}

export function updateCartQty(productId, size, delta) {
  const cart = getCart();
  const item = cart.find((i) => i.productId === productId && String(i.size) === String(size));
  if (!item) return;
  item.qty += delta;
  _setCart(cart.filter((i) => i.qty > 0));
}

export function cartItemCount() {
  return getCart().reduce((s, i) => s + i.qty, 0);
}

/**
 * Calculates subtotal from cart + product byId map.
 * @param {object[]} cart
 * @param {Object.<string, object>} byId
 */
export function cartTotal(cart, byId) {
  return cart.reduce((s, i) => {
    const p = byId[i.productId];
    return p ? s + p.price * i.qty : s;
  }, 0);
}

/* ── Wishlist ───────────────────────────────────────────────────────── */
export function getWishlist() { return sGet(scopedKey(SK.wishlist), []); }

export function setWishlist(list) {
  sSet(scopedKey(SK.wishlist), list);
  document.dispatchEvent(new CustomEvent('adokicks:wishlist-updated'));
}

/**
 * Toggles a product in the wishlist.
 * @returns {boolean} true = added, false = removed
 */
export function toggleWishlist(productId) {
  const wl = getWishlist();
  const inList = wl.includes(productId);
  setWishlist(inList ? wl.filter((id) => id !== productId) : [...wl, productId]);
  return !inList;
}

export function isWishlisted(productId) { return getWishlist().includes(productId); }

/* ── Orders ─────────────────────────────────────────────────────────── */
export function getOrders() { return sGet(SK.orders, []); }

/**
 * Creates an order from cart + shipping form data.
 * Clears the cart afterwards.
 * @param {object[]} cart
 * @param {object} shippingData
 * @param {Object.<string, object>} byId
 * @returns {object} the created order
 */
export function placeOrder(cart, shippingData, byId) {
  const id = `ADO-${Date.now()}`;
  const items = cart.map((entry) => {
    const p = byId[entry.productId];
    return p ? { title: p.title, size: entry.size, qty: entry.qty, price: p.price } : null;
  }).filter(Boolean);
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const total = subtotal >= 999 ? subtotal : subtotal + 99;
  const order = {
    id,
    date: new Date().toISOString(),
    status: 'Confirmed',
    items,
    total,
    shipping: shippingData,
  };
  const orders = getOrders();
  orders.unshift(order);
  sSet(SK.orders, orders);
  _setCart([]);   // clear cart after placing order
  return order;
}

/* ── Legacy data migration (called on login) ──────────────────────── */
export function migrateLegacyData(phone) {
  const scopedCart = sGet(`${SK.cart}_${phone}`, []);
  const guestCart  = sGet(SK.cart, []);
  if (guestCart.length) {
    const merged = [...scopedCart];
    guestCart.forEach((g) => {
      const t = merged.find((e) => e.productId === g.productId && String(e.size) === String(g.size));
      if (t) { t.qty += g.qty; } else { merged.push({ ...g }); }
    });
    sSet(`${SK.cart}_${phone}`, merged);
    localStorage.removeItem(SK.cart);
  }
  const scopedWl = sGet(`${SK.wishlist}_${phone}`, []);
  const guestWl  = sGet(SK.wishlist, []);
  if (guestWl.length) {
    sSet(`${SK.wishlist}_${phone}`, [...new Set([...scopedWl, ...guestWl])]);
    localStorage.removeItem(SK.wishlist);
  }
}

/* ── Formatting ─────────────────────────────────────────────────────── */
export function formatCurrency(value) {
  return `Rs ${Number(value).toLocaleString('en-IN')}`;
}

/* ── Toast ──────────────────────────────────────────────────────────── */
export function toast(message, type = 'error') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    container.setAttribute('aria-live', 'assertive');
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}