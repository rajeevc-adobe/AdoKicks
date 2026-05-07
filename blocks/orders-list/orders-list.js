import { getProducts } from '../../scripts/product-store.js';
import { getOrders, getCurrentUser, formatCurrency } from '../../scripts/cart-store.js';

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
    eyebrow: config.eyebrow || 'Order history',
    title: config.title || 'My Orders',
    subtitle: config.subtitle || 'Track previous purchases, revisit shipping details, and review each item in one place.',
    panelTitle: config['panel title'] || 'Recent orders',
    panelText: config['panel text'] || 'View your complete order history below and open details when needed.',
  };
}

function orderDate(order) {
  return new Date(order.createdAt || order.date || Date.now()).toLocaleString();
}

function normalizeAddress(order) {
  return order.address || order.shipping || {};
}

function itemProduct(item, byId) {
  return byId[item.productId] || {
    title: item.title,
    images: [item.image || '/adokicks.png'],
    price: item.price,
  };
}

function renderShell(block, config) {
  block.innerHTML = `
    <section class="page-hero orders-hero" aria-label="Orders introduction">
      <p class="eyebrow">${sanitize(config.eyebrow)}</p>
      <h1>${sanitize(config.title)}</h1>
      <p class="page-subtitle">${sanitize(config.subtitle)}</p>
    </section>
    <section class="orders-layout" aria-label="User orders">
      <div class="section-card orders-panel">
        <div class="checkout-section-head">
          <h2>${sanitize(config.panelTitle)}</h2>
          <p>${sanitize(config.panelText)}</p>
        </div>
        <div id="orders-list" class="orders-list" aria-label="Orders list"></div>
      </div>
    </section>
    <section id="order-summary-view" class="order-detail section-card" aria-label="Selected order detail"></section>
  `;
}

function renderEmpty(list, detail) {
  list.innerHTML = `
    <div class="orders-empty">
      <p class="eyebrow">No orders yet</p>
      <h2>Your order history is empty</h2>
      <p>Place your first order to start tracking it here.</p>
      <a class="btn-primary" href="/featured">Shop featured</a>
    </div>
  `;
  detail.innerHTML = `
    <div class="orders-empty-detail">
      <p class="eyebrow">Order detail</p>
      <h2>Nothing to show yet</h2>
      <p>Place an order to view detailed summaries here.</p>
    </div>
  `;
}

function renderOrderDetail(order, list, detail, byId) {
  list.querySelectorAll('[data-order-id]').forEach((card) => {
    card.classList.toggle('is-active', card.getAttribute('data-order-id') === order.id);
  });

  const address = normalizeAddress(order);
  detail.innerHTML = `
    <div class="order-detail-card">
      <div class="order-detail-head">
        <div>
          <p class="eyebrow">Selected order</p>
          <h2>Order ${sanitize(order.id)}</h2>
          <p class="page-subtitle">Placed on ${orderDate(order)}</p>
        </div>
        <span class="order-status-pill">Placed</span>
      </div>
      <div class="order-detail-grid">
        <section class="order-block" aria-label="Order items">
          <h3>Items</h3>
          <div class="order-items-list">
            ${(order.items || []).map((item) => {
    const product = itemProduct(item, byId);
    const itemTotal = (item.price || product.price || 0) * item.qty;
    return `
                <article class="order-item-card" aria-label="${sanitize(product.title)} ordered item">
                  <img src="${sanitize(product.images?.[0] || '/adokicks.png')}" alt="${sanitize(product.title)} order image">
                  <div class="order-item-body">
                    <div class="order-item-head">
                      <h4>${sanitize(product.title)}</h4>
                      <strong>${formatCurrency(itemTotal)}</strong>
                    </div>
                    <p>Size ${sanitize(item.size)} - Qty ${item.qty}</p>
                    <p class="order-item-price">${formatCurrency(item.price || product.price || 0)} each</p>
                  </div>
                </article>
              `;
  }).join('')}
          </div>
        </section>
        <aside class="order-block order-address-card" aria-label="Delivery address">
          <h3>Delivery address</h3>
          <p><strong>${sanitize(address.name)}</strong></p>
          <p>${sanitize(address.phone)}</p>
          <p>${sanitize(address.address1)}${address.address2 ? `, ${sanitize(address.address2)}` : ''}</p>
          <p>${sanitize(address.city)}, ${sanitize(address.state)} - ${sanitize(address.zipcode)}</p>
        </aside>
      </div>
      <div class="order-total-bar">
        <div class="summary-row"><span>Subtotal</span><strong>${formatCurrency(order.subtotal || order.total || 0)}</strong></div>
        <div class="summary-row"><span>Total</span><strong>${formatCurrency(order.total || 0)}</strong></div>
      </div>
    </div>
  `;
  detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default async function decorate(block) {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = '/auth?redirect=my-orders&notice=please_login';
    return;
  }

  const config = getConfig(block);
  renderShell(block, config);

  const products = await getProducts();
  const byId = Object.fromEntries(products.map((p) => [p.id, p]));
  const list = block.querySelector('#orders-list');
  const detail = block.querySelector('#order-summary-view');
  const orders = getOrders().filter((order) => !order.userPhone || order.userPhone === user.phone);

  if (!orders.length) {
    renderEmpty(list, detail);
    return;
  }

  list.innerHTML = orders.map((order) => `
    <article class="order-card" data-order-id="${sanitize(order.id)}" aria-label="Order ${sanitize(order.id)} summary card">
      <div class="order-card-head">
        <div>
          <p class="order-card-label">Order ID</p>
          <h3>${sanitize(order.id)}</h3>
        </div>
        <span class="order-status-pill">Placed</span>
      </div>
      <div class="order-card-meta">
        <span>${orderDate(order)}</span>
        <span>${(order.items || []).length} item${(order.items || []).length === 1 ? '' : 's'}</span>
      </div>
      <div class="order-card-foot">
        <p class="order-card-total">${formatCurrency(order.total || 0)}</p>
        <button class="btn-secondary order-view-btn" type="button" data-action="order-view" data-order-id="${sanitize(order.id)}" aria-label="View details for order ${sanitize(order.id)}">View Details</button>
      </div>
    </article>
  `).join('');

  detail.innerHTML = `
    <div class="orders-empty-detail">
      <p class="eyebrow">Order detail</p>
      <h2>Select any order</h2>
      <p>Click <strong>View Details</strong> on any order card to open the complete summary.</p>
    </div>
  `;

  list.querySelectorAll("[data-action='order-view']").forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.getAttribute('data-order-id');
      const order = orders.find((entry) => entry.id === id);
      if (order) renderOrderDetail(order, list, detail, byId);
    });
  });
}
