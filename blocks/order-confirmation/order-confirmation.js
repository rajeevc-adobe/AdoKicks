import { getOrders, formatCurrency } from '../../scripts/cart-store.js';

export default function decorate(block) {
  const orders = getOrders();
  const latest = orders[0];
  if (!latest) {
    block.innerHTML = `<div class="oc-wrap"><p>No recent order found.</p><a href="/" class="button primary">Go Home</a></div>`;
    return;
  }
  block.innerHTML = `
    <div class="oc-wrap section-card">
      <div class="oc-check">✓</div>
      <h2>Order Confirmed!</h2>
      <p class="oc-id">Order ID: <strong>${latest.id}</strong></p>
      <p class="oc-note">Redirecting to My Orders in <span id="oc-countdown">10</span>s…</p>
      <div class="oc-items">
        ${(latest.items || []).map((i) => `
          <div class="oc-item">
            <p class="oc-item-title">${i.title}</p>
            <p class="oc-item-meta">Size UK ${i.size} · Qty ${i.qty} · ${formatCurrency(i.price * i.qty)}</p>
          </div>`).join('')}
      </div>
      <div class="oc-total"><span>Total Paid</span><strong>${formatCurrency(latest.total)}</strong></div>
      <a href="/my-orders" class="button primary oc-cta">View My Orders</a>
    </div>`;

  let s = 10;
  const el = document.getElementById('oc-countdown');
  setInterval(() => { s -= 1; if (el) el.textContent = s; if (s <= 0) window.location.href = '/my-orders'; }, 1000);
}