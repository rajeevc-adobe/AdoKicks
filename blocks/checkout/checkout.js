import { getProducts } from '../../scripts/product-store.js';
import {
  getCart,
  cartTotal,
  placeOrder,
  formatCurrency,
  getCurrentUser,
  toast,
} from '../../scripts/cart-store.js';

function sanitize(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getConfig(block) {
  const config = {};
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (cells.length < 2) return;
    const key = cells[0].textContent.trim().toLowerCase();
    const value = cells[1].textContent.trim();
    if (key) config[key] = value;
  });
  return {
    eyebrow: config.eyebrow || 'Secure checkout',
    title: config.title || 'Checkout',
    subtitle: config.subtitle || 'Review your order, confirm delivery details, and place it in one clean step.',
    panelTitle: config['panel title'] || 'Delivery details',
    panelText: config['panel text'] || "We'll use these details to ship your order and keep you updated.",
  };
}

function validatePhone(phone) {
  return /^\d{10}$/.test(phone);
}

function validateName(name) {
  return /^[A-Za-z][A-Za-z ]{1,49}$/.test(name.trim());
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateZip(zip) {
  return /^\d{5,6}$/.test(zip);
}

function renderShell(block, config) {
  block.innerHTML = `
    <section class="page-hero checkout-hero" aria-label="Checkout introduction">
      <p class="eyebrow">${sanitize(config.eyebrow)}</p>
      <h1>${sanitize(config.title)}</h1>
      <p class="page-subtitle">${sanitize(config.subtitle)}</p>
    </section>
    <section class="checkout-layout" aria-label="Checkout flow">
      <section class="section-card checkout-panel" aria-label="Shipping address form">
        <div class="checkout-section-head">
          <h2>${sanitize(config.panelTitle)}</h2>
          <p>${sanitize(config.panelText)}</p>
        </div>
        <form id="checkout-form" class="checkout-form" novalidate>
          <label for="checkout-name">Name</label>
          <input id="checkout-name" name="name" type="text" autocomplete="name" required aria-label="Full name">
          <label for="checkout-email">Email</label>
          <input id="checkout-email" name="email" type="email" autocomplete="email" required aria-label="Email address">
          <label for="checkout-phone">Phone Number</label>
          <input id="checkout-phone" name="phone" type="tel" inputmode="numeric" autocomplete="tel" required aria-label="Phone number">
          <label for="checkout-address1">Address Line 1</label>
          <input id="checkout-address1" name="address1" type="text" autocomplete="address-line1" required aria-label="Address line 1">
          <label for="checkout-address2">Address Line 2</label>
          <input id="checkout-address2" name="address2" type="text" autocomplete="address-line2" aria-label="Address line 2">
          <label for="checkout-city">City</label>
          <input id="checkout-city" name="city" type="text" autocomplete="address-level2" required aria-label="City">
          <label for="checkout-state">State</label>
          <input id="checkout-state" name="state" type="text" autocomplete="address-level1" required aria-label="State">
          <label for="checkout-zipcode">Zipcode</label>
          <input id="checkout-zipcode" name="zipcode" type="text" inputmode="numeric" autocomplete="postal-code" required aria-label="Zipcode">
          <button type="submit" class="btn-primary" aria-label="Place your order">Place Order</button>
        </form>
      </section>
      <aside id="order-summary" class="order-summary section-card" aria-label="Order summary"></aside>
    </section>
  `;
}

function renderSummary(summary, cart, byId) {
  if (!cart.length) {
    summary.innerHTML = `
      <div class="checkout-empty">
        <p class="eyebrow">Nothing in your bag</p>
        <h2>Your cart is empty</h2>
        <p>Add a pair of shoes before checking out.</p>
        <a class="btn-primary" href="/featured">Browse featured picks</a>
      </div>
    `;
    return;
  }

  const subtotal = cartTotal(cart, byId);
  summary.innerHTML = `
    <div class="checkout-summary-card">
      <div class="checkout-summary-head">
        <p class="eyebrow">Order review</p>
        <p class="eyebrow">${cart.length} item${cart.length === 1 ? '' : 's'} ready to ship.</p>
      </div>
      <div class="checkout-items-list">
        ${cart.map((item) => {
          const product = byId[item.productId];
          if (!product) return '';
          const itemTotal = product.price * item.qty;
          return `
            <article class="checkout-item-card">
              <img src="${sanitize(product.images?.[0] || '/adokicks.png')}" alt="${sanitize(product.title)} thumbnail">
              <div class="checkout-item-body">
                <div class="checkout-item-head">
                  <h3>${sanitize(product.title)}</h3>
                  <strong>${formatCurrency(itemTotal)}</strong>
                </div>
                <p>Size ${sanitize(item.size)} - Qty ${item.qty}</p>
                <p class="checkout-item-price">${formatCurrency(product.price)} each</p>
              </div>
            </article>
          `;
        }).join('')}
      </div>
      <div class="checkout-pricing">
        <div class="summary-row"><span>Subtotal</span><strong>${formatCurrency(subtotal)}</strong></div>
        <div class="summary-row"><span>Delivery</span><strong>Free</strong></div>
        <div class="summary-row total-row"><span>Total</span><strong>${formatCurrency(subtotal)}</strong></div>
      </div>
      <p class="checkout-note">Secure payment processing. Your order confirmation will appear after submission.</p>
    </div>
  `;
}

export default async function decorate(block) {
  document.body.dataset.page = 'checkout';
  const user = getCurrentUser();
  if (!user) {
    window.location.href = '/auth?redirect=checkout&notice=please_login';
    return;
  }

  const config = getConfig(block);
  renderShell(block, config);

  const products = await getProducts();
  const byId = Object.fromEntries(products.map((p) => [p.id, p]));
  const cart = getCart().filter((item) => byId[item.productId]);
  const form = block.querySelector('#checkout-form');
  const summary = block.querySelector('#order-summary');
  const submitButton = form?.querySelector("button[type='submit']");

  block.querySelector('#checkout-name').value = user.name || '';
  block.querySelector('#checkout-phone').value = user.phone || '';
  renderSummary(summary, cart, byId);

  if (!cart.length && submitButton instanceof HTMLButtonElement) {
    submitButton.disabled = true;
  }

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(form).entries());
    const name = String(payload.name || '').trim();
    const email = String(payload.email || '').trim();
    const phone = String(payload.phone || '').trim();
    const address1 = String(payload.address1 || '').trim();
    const city = String(payload.city || '').trim();
    const stateName = String(payload.state || '').trim();
    const zipcode = String(payload.zipcode || '').trim();

    if (!validateName(name)) { toast('Enter a valid name.'); return; }
    if (!validateEmail(email)) { toast('Enter a valid email address.'); return; }
    if (!validatePhone(phone)) { toast('Enter a valid phone number.'); return; }
    if (!address1) { toast('Address line 1 is required.'); return; }
    if (!city || !stateName) { toast('City and state are required.'); return; }
    if (!validateZip(zipcode)) { toast('Enter a valid zipcode.'); return; }

    const order = placeOrder(cart, payload, byId);
    window.location.href = `/order-confirmation?orderId=${encodeURIComponent(order.id)}`;
  });
}
