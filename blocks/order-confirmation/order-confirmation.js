import { getOrders } from '../../scripts/cart-store.js';

function params() {
  return new URLSearchParams(window.location.search);
}

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
    title: config.title || 'Order Placed Successfully',
    message: config.message || 'You will be redirected to My Orders in',
    cta: config.cta || 'Go Now',
  };
}

export default function decorate(block) {
  const config = getConfig(block);
  const latest = getOrders()[0];
  const orderId = params().get('orderId') || latest?.id || '';

  block.innerHTML = `
    <section class="confirmation" aria-label="Order placed confirmation">
      <div class="checkmark" aria-hidden="true">&#10003;</div>
      <h1>${sanitize(config.title)}</h1>
      <p id="confirmation-order-id">${orderId ? `Order ID: ${sanitize(orderId)}` : 'Order submitted.'}</p>
      <p>${sanitize(config.message)} <span id="redirect-seconds">10</span> seconds.</p>
      <a href="/my-orders" class="btn-secondary" aria-label="Go to my orders now">${sanitize(config.cta)}</a>
    </section>
  `;

  const sec = block.querySelector('#redirect-seconds');
  let countdown = 10;
  sec.textContent = String(countdown);
  const timer = setInterval(() => {
    countdown -= 1;
    sec.textContent = String(countdown);
    if (countdown <= 0) {
      clearInterval(timer);
      window.location.href = '/my-orders';
    }
  }, 1000);
}
