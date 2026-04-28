import { getProducts } from '../../scripts/product-store.js';
import { getCart, cartTotal, placeOrder, formatCurrency, getCurrentUser, toast } from '../../scripts/cart-store.js';

export default async function decorate(block) {
  const cart = getCart();
  if (!cart.length) {
    block.innerHTML = `<div class="checkout-empty"><h2>Your bag is empty</h2><p>Add some shoes before checking out.</p><a href="/categories" class="button primary">Browse Products</a></div>`;
    return;
  }
  block.innerHTML = `<div class="pg-loading"><span class="pg-spinner"></span></div>`;
  const products = await getProducts();
  const byId = Object.fromEntries(products.map((p) => [p.id, p]));
  const user = getCurrentUser();
  const subtotal = cartTotal(cart, byId);
  const deliveryFee = subtotal >= 999 ? 0 : 99;
  const total = subtotal + deliveryFee;

  block.innerHTML = `
    <div class="checkout-layout">
      <div class="checkout-form-col">
        <form id="checkout-form" class="checkout-form section-card" novalidate>
          <h2>Delivery Details</h2>
          <div class="checkout-fields">
            <div class="form-group"><label for="co-name">Full Name</label><input type="text" id="co-name" name="name" value="${user?.name || ''}" autocomplete="name" required></div>
            <div class="form-group"><label for="co-email">Email Address</label><input type="email" id="co-email" name="email" autocomplete="email" placeholder="you@example.com" required></div>
            <div class="form-group"><label for="co-phone">Phone Number</label><input type="tel" id="co-phone" name="phone" value="${user?.phone || ''}" autocomplete="tel" required maxlength="10" inputmode="numeric"></div>
            <div class="form-group form-group--full"><label for="co-addr1">Address Line 1</label><input type="text" id="co-addr1" name="address1" autocomplete="address-line1" required></div>
            <div class="form-group form-group--full"><label for="co-addr2">Address Line 2 <span style="font-weight:400;color:var(--color-muted)">(optional)</span></label><input type="text" id="co-addr2" name="address2" autocomplete="address-line2"></div>
            <div class="form-group"><label for="co-city">City</label><input type="text" id="co-city" name="city" autocomplete="address-level2" required></div>
            <div class="form-group"><label for="co-state">State</label><input type="text" id="co-state" name="state" autocomplete="address-level1" required></div>
            <div class="form-group"><label for="co-zip">Pincode</label><input type="text" id="co-zip" name="zipcode" autocomplete="postal-code" required pattern="[0-9]{6}" inputmode="numeric" maxlength="6"></div>
          </div>
          <p class="checkout-error" id="checkout-error" role="alert" hidden></p>
          <button type="submit" class="button primary checkout-submit">Place Order · ${formatCurrency(total)}</button>
          <p class="checkout-note">🔒 Secure checkout.</p>
        </form>
      </div>
      <aside class="checkout-summary-col">
        <div class="checkout-summary section-card">
          <h2>Order Summary</h2>
          <div class="summary-items">
            ${cart.map((item) => { const p = byId[item.productId]; if (!p) return ''; return `<div class="summary-item"><img src="${p.images[0]}" alt="${p.title}" width="56" height="56"><div class="summary-item-info"><p class="summary-item-title">${p.title}</p><p class="summary-item-meta">Size UK ${item.size} · Qty ${item.qty}</p></div><p class="summary-item-price">${formatCurrency(p.price * item.qty)}</p></div>`; }).join('')}
          </div>
          <div class="summary-totals">
            <div class="summary-row"><span>Subtotal</span><span>${formatCurrency(subtotal)}</span></div>
            <div class="summary-row"><span>Delivery</span><span>${deliveryFee === 0 ? '<span style="color:var(--color-success);font-weight:700">Free</span>' : formatCurrency(deliveryFee)}</span></div>
            <div class="summary-row summary-total"><strong>Total</strong><strong>${formatCurrency(total)}</strong></div>
          </div>
        </div>
      </aside>
    </div>`;

  document.getElementById('checkout-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    const errEl = document.getElementById('checkout-error');
    if (!/^\d{10}$/.test(data.phone)) { errEl.textContent = 'Enter a valid 10-digit phone number.'; errEl.hidden = false; return; }
    if (!/^\d{6}$/.test(data.zipcode)) { errEl.textContent = 'Enter a valid 6-digit pincode.'; errEl.hidden = false; return; }
    errEl.hidden = true;
    const order = placeOrder(cart, data, byId);
    toast(`Order ${order.id} placed!`, 'success');
    setTimeout(() => { window.location.href = '/order-confirmation'; }, 600);
  });
}