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
    checkoutFlowLabel: config['checkout flow label'] || 'Checkout flow',
    formAriaLabel: config['form aria label'] || 'Shipping address form',
    nameLabel: config['name label'] || 'Name',
    nameAriaLabel: config['name aria label'] || 'Full name',
    emailLabel: config['email label'] || 'Email',
    emailAriaLabel: config['email aria label'] || 'Email address',
    phoneLabel: config['phone label'] || 'Phone Number',
    phoneAriaLabel: config['phone aria label'] || 'Phone number',
    address1Label: config['address line 1 label'] || 'Address Line 1',
    address1AriaLabel: config['address line 1 aria label'] || 'Address line 1',
    address2Label: config['address line 2 label'] || 'Address Line 2',
    address2AriaLabel: config['address line 2 aria label'] || 'Address line 2',
    cityLabel: config['city label'] || 'City',
    cityAriaLabel: config['city aria label'] || 'City',
    stateLabel: config['state label'] || 'State',
    stateAriaLabel: config['state aria label'] || 'State',
    zipcodeLabel: config['zipcode label'] || 'Zipcode',
    zipcodeAriaLabel: config['zipcode aria label'] || 'Zipcode',
    submitLabel: config['submit label'] || 'Place Order',
    submitAriaLabel: config['submit aria label'] || 'Place your order',
    summaryAriaLabel: config['summary aria label'] || 'Order summary',
    emptyEyebrow: config['empty eyebrow'] || 'Nothing in your bag',
    emptyTitle: config['empty title'] || 'Your cart is empty',
    emptyText: config['empty text'] || 'Add a pair of shoes before checking out.',
    emptyCtaLabel: config['empty cta label'] || 'Browse featured picks',
    emptyCtaHref: config['empty cta href'] || '/featured',
    summaryEyebrow: config['summary eyebrow'] || 'Order review',
    summaryItemsSuffix: config['summary items suffix'] || 'ready to ship.',
    sizeLabel: config['size label'] || 'Size',
    quantityLabel: config['quantity label'] || 'Qty',
    eachLabel: config['each label'] || 'each',
    subtotalLabel: config['subtotal label'] || 'Subtotal',
    deliveryLabel: config['delivery label'] || 'Delivery',
    deliveryValue: config['delivery value'] || 'Free',
    totalLabel: config['total label'] || 'Total',
    checkoutNote: config['checkout note'] || 'Secure payment processing. Your order confirmation will appear after submission.',
    invalidNameMessage: config['invalid name message'] || 'Enter a valid name.',
    invalidEmailMessage: config['invalid email message'] || 'Enter a valid email address.',
    invalidPhoneMessage: config['invalid phone message'] || 'Enter a valid phone number.',
    missingAddressMessage: config['missing address message'] || 'Address line 1 is required.',
    missingCityStateMessage: config['missing city state message'] || 'City and state are required.',
    invalidZipcodeMessage: config['invalid zipcode message'] || 'Enter a valid zipcode.',
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
    <section class="checkout-layout" aria-label="${sanitize(config.checkoutFlowLabel)}">
      <section class="section-card checkout-panel" aria-label="${sanitize(config.formAriaLabel)}">
        <div class="checkout-section-head">
          <h2>${sanitize(config.panelTitle)}</h2>
          <p>${sanitize(config.panelText)}</p>
        </div>
        <form id="checkout-form" class="checkout-form" novalidate>
          <label for="checkout-name">${sanitize(config.nameLabel)}</label>
          <input id="checkout-name" name="name" type="text" autocomplete="name" required aria-label="${sanitize(config.nameAriaLabel)}">
          <label for="checkout-email">${sanitize(config.emailLabel)}</label>
          <input id="checkout-email" name="email" type="email" autocomplete="email" required aria-label="${sanitize(config.emailAriaLabel)}">
          <label for="checkout-phone">${sanitize(config.phoneLabel)}</label>
          <input id="checkout-phone" name="phone" type="tel" inputmode="numeric" autocomplete="tel" required aria-label="${sanitize(config.phoneAriaLabel)}">
          <label for="checkout-address1">${sanitize(config.address1Label)}</label>
          <input id="checkout-address1" name="address1" type="text" autocomplete="address-line1" required aria-label="${sanitize(config.address1AriaLabel)}">
          <label for="checkout-address2">${sanitize(config.address2Label)}</label>
          <input id="checkout-address2" name="address2" type="text" autocomplete="address-line2" aria-label="${sanitize(config.address2AriaLabel)}">
          <label for="checkout-city">${sanitize(config.cityLabel)}</label>
          <input id="checkout-city" name="city" type="text" autocomplete="address-level2" required aria-label="${sanitize(config.cityAriaLabel)}">
          <label for="checkout-state">${sanitize(config.stateLabel)}</label>
          <input id="checkout-state" name="state" type="text" autocomplete="address-level1" required aria-label="${sanitize(config.stateAriaLabel)}">
          <label for="checkout-zipcode">${sanitize(config.zipcodeLabel)}</label>
          <input id="checkout-zipcode" name="zipcode" type="text" inputmode="numeric" autocomplete="postal-code" required aria-label="${sanitize(config.zipcodeAriaLabel)}">
          <button type="submit" class="btn-primary" aria-label="${sanitize(config.submitAriaLabel)}">${sanitize(config.submitLabel)}</button>
        </form>
      </section>
      <aside id="order-summary" class="order-summary section-card" aria-label="${sanitize(config.summaryAriaLabel)}"></aside>
    </section>
  `;
}

function renderSummary(summary, cart, byId, config) {
  if (!cart.length) {
    summary.innerHTML = `
      <div class="checkout-empty">
        <p class="eyebrow">${sanitize(config.emptyEyebrow)}</p>
        <h2>${sanitize(config.emptyTitle)}</h2>
        <p>${sanitize(config.emptyText)}</p>
        <a class="btn-primary" href="${sanitize(config.emptyCtaHref)}">${sanitize(config.emptyCtaLabel)}</a>
      </div>
    `;
    return;
  }

  const subtotal = cartTotal(cart, byId);
  summary.innerHTML = `
    <div class="checkout-summary-card">
      <div class="checkout-summary-head">
        <p class="eyebrow">${sanitize(config.summaryEyebrow)}</p>
        <p class="eyebrow">${cart.length} item${cart.length === 1 ? '' : 's'} ${sanitize(config.summaryItemsSuffix)}</p>
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
                <p>${sanitize(config.sizeLabel)} ${sanitize(item.size)} - ${sanitize(config.quantityLabel)} ${item.qty}</p>
                <p class="checkout-item-price">${formatCurrency(product.price)} ${sanitize(config.eachLabel)}</p>
              </div>
            </article>
          `;
  }).join('')}
      </div>
      <div class="checkout-pricing">
        <div class="summary-row"><span>${sanitize(config.subtotalLabel)}</span><strong>${formatCurrency(subtotal)}</strong></div>
        <div class="summary-row"><span>${sanitize(config.deliveryLabel)}</span><strong>${sanitize(config.deliveryValue)}</strong></div>
        <div class="summary-row total-row"><span>${sanitize(config.totalLabel)}</span><strong>${formatCurrency(subtotal)}</strong></div>
      </div>
      <p class="checkout-note">${sanitize(config.checkoutNote)}</p>
    </div>
  `;
}

export default async function decorate(block) {
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
  renderSummary(summary, cart, byId, config);

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

    if (!validateName(name)) { toast(config.invalidNameMessage); return; }
    if (!validateEmail(email)) { toast(config.invalidEmailMessage); return; }
    if (!validatePhone(phone)) { toast(config.invalidPhoneMessage); return; }
    if (!address1) { toast(config.missingAddressMessage); return; }
    if (!city || !stateName) { toast(config.missingCityStateMessage); return; }
    if (!validateZip(zipcode)) { toast(config.invalidZipcodeMessage); return; }

    const order = placeOrder(cart, payload, byId);
    window.location.href = `/order-confirmation?orderId=${encodeURIComponent(order.id)}`;
  });
}
