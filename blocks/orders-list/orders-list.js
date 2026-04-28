import { getOrders, getCurrentUser, formatCurrency } from '../../scripts/cart-store.js';

export default function decorate(block) {
  if (!getCurrentUser()) {
    block.innerHTML = `<div class="orders-empty"><p>Please <a href="/auth">sign in</a> to view your orders.</p></div>`;
    return;
  }
  const orders = getOrders();
  if (!orders.length) {
    block.innerHTML = `<div class="orders-empty"><h2>No orders yet</h2><p>You haven't placed any orders yet.</p><a href="/categories" class="button primary">Browse Products</a></div>`;
    return;
  }
  block.innerHTML = `
    <div class="orders-list">
      ${orders.map((order) => `
        <article class="order-card section-card" data-order-id="${order.id}">
          <div class="order-card-head">
            <div>
              <p class="order-id">Order <strong>${order.id}</strong></p>
              <p class="order-date">${new Date(order.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            <div class="order-card-right">
              <span class="order-status order-status--${order.status.toLowerCase()}">${order.status}</span>
              <strong class="order-total">${formatCurrency(order.total)}</strong>
              <button class="order-toggle button secondary" type="button" aria-expanded="false">View Details</button>
            </div>
          </div>
          <div class="order-details hidden">
            <div class="order-items">
              ${(order.items || []).map((i) => `
                <div class="order-item">
                  <p class="order-item-title">${i.title}</p>
                  <p class="order-item-meta">Size UK ${i.size} · Qty ${i.qty} · ${formatCurrency(i.price * i.qty)}</p>
                </div>`).join('')}
            </div>
            ${order.shipping ? `
              <div class="order-shipping">
                <h4>Delivery Address</h4>
                <p>${order.shipping.name}</p>
                <p>${order.shipping.address1}${order.shipping.address2 ? ', ' + order.shipping.address2 : ''}</p>
                <p>${order.shipping.city}, ${order.shipping.state} – ${order.shipping.zipcode}</p>
              </div>` : ''}
          </div>
        </article>`).join('')}
    </div>`;

  block.querySelectorAll('.order-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.order-card');
      const details = card?.querySelector('.order-details');
      const isOpen = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!isOpen));
      details?.classList.toggle('hidden', isOpen);
      btn.textContent = isOpen ? 'View Details' : 'Hide Details';
    });
  });
}