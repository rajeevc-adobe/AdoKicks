import { getProductById } from '../../scripts/product-store.js';
import { formatCurrency, addToCart, toggleWishlist, isWishlisted, toast } from '../../scripts/cart-store.js';

export default async function decorate(block) {
  const id = new URLSearchParams(window.location.search).get('id') || '';
  block.innerHTML = `<div class="pg-loading"><span class="pg-spinner"></span></div>`;

  try {
    const product = await getProductById(id);
    if (!product) {
      block.innerHTML = `
        <div class="pd-not-found">
          <h2>Product not found</h2>
          <p>The product you're looking for doesn't exist or has been removed.</p>
          <a href="/categories" class="button primary">Browse Products</a>
        </div>`;
      return;
    }

    document.title = `${product.brand} – ${product.title} | Adokicks`;

    let imageIndex = 0;
    let selectedSize = '';

    function render() {
      const wished = isWishlisted(product.id);
      block.innerHTML = `
        <div class="product-detail-layout">
          <section class="pd-gallery" aria-label="Product image gallery">
            <div class="pd-gallery-main">
              <img id="pd-main-img" src="${product.images[imageIndex]}"
                alt="${product.title} image ${imageIndex + 1}" width="560" height="560">
              ${product.images.length > 1 ? `
                <div class="pd-gallery-nav">
                  <button id="pd-prev" class="button secondary" type="button" aria-label="Previous image">←</button>
                  <button id="pd-next" class="button secondary" type="button" aria-label="Next image">→</button>
                </div>` : ''}
            </div>
            ${product.images.length > 1 ? `
              <div class="pd-thumbs" role="list">
                ${product.images.map((src, i) => `
                  <button type="button" class="pd-thumb${i === imageIndex ? ' active' : ''}"
                    data-idx="${i}" aria-label="Image ${i + 1}">
                    <img src="${src}" alt="Thumbnail ${i + 1}" width="72" height="72" loading="lazy">
                  </button>`).join('')}
              </div>` : ''}
          </section>

          <section class="pd-info section-card" aria-label="Product purchase details">
            <div class="pd-info-header">
              <div>
                <p class="pd-brand">${product.brand}</p>
                <h1 class="pd-title">${product.title}</h1>
              </div>
              <button class="heart-btn pd-wish-btn${wished ? ' active' : ''}" id="pd-wishlist"
                type="button" aria-label="${wished ? 'Remove from' : 'Add to'} wishlist">&#10084;</button>
            </div>

            <div class="pd-price-row">
              <strong class="pd-price">${formatCurrency(product.price)}</strong>
              <span class="old-price">${formatCurrency(product.originalPrice)}</span>
              <span class="pd-discount">${Math.round((1 - product.price / product.originalPrice) * 100)}% off</span>
            </div>

            <p class="pd-meta">
              ${product.categoryLabel} ·
              <span class="pd-stars" aria-label="${product.rating} stars">
                ${'★'.repeat(Math.floor(product.rating))}${'☆'.repeat(5 - Math.floor(product.rating))}
              </span>
              <span>(${product.reviews} reviews)</span>
            </p>

            <div class="pd-sizes">
              <h2 class="pd-section-title">Select Size</h2>
              <div class="pd-size-grid" role="group" aria-label="Available sizes">
                ${(product.sizes || []).map((s) => `
                  <button type="button" class="size-pill${String(selectedSize) === String(s) ? ' active' : ''}"
                    data-size="${s}" aria-label="Size ${s}" aria-pressed="${String(selectedSize) === String(s)}">${s}</button>`).join('')}
              </div>
            </div>

            <div class="pd-buy-row">
              <button id="pd-add-cart" class="button primary pd-add-btn" type="button">Add to Bag</button>
            </div>

            <div class="pd-delivery-info">
              <p>✓ Free delivery on orders above Rs 999</p>
              <p>✓ Easy 30-day returns</p>
            </div>

            <h2 class="pd-section-title">Description</h2>
            <p class="pd-description">${product.description}</p>

            <div class="pd-meta-grid">
              <div><span>Brand</span><strong>${product.brand}</strong></div>
              <div><span>Category</span><strong>${product.categoryLabel}</strong></div>
              <div><span>Gender</span><strong>${product.gender.charAt(0).toUpperCase() + product.gender.slice(1)}</strong></div>
              <div><span>Stock</span><strong class="${product.inStock ? 'in-stock' : 'out-stock'}">${product.inStock ? 'In Stock' : 'Out of Stock'}</strong></div>
            </div>
          </section>
        </div>`;

      block.querySelector('#pd-prev')?.addEventListener('click', () => {
        imageIndex = (imageIndex - 1 + product.images.length) % product.images.length; render();
      });
      block.querySelector('#pd-next')?.addEventListener('click', () => {
        imageIndex = (imageIndex + 1) % product.images.length; render();
      });
      block.querySelectorAll('.pd-thumb').forEach((btn) => {
        btn.addEventListener('click', () => { imageIndex = Number(btn.dataset.idx); render(); });
      });
      block.querySelectorAll('.size-pill').forEach((btn) => {
        btn.addEventListener('click', () => {
          selectedSize = btn.dataset.size;
          block.querySelectorAll('.size-pill').forEach((b) => {
            b.classList.toggle('active', b === btn);
            b.setAttribute('aria-pressed', String(b === btn));
          });
        });
      });
      block.querySelector('#pd-add-cart')?.addEventListener('click', () => {
        if (!selectedSize) {
          toast('Please select a size first.', 'error');
          block.querySelector('.pd-sizes')?.classList.add('shake');
          setTimeout(() => block.querySelector('.pd-sizes')?.classList.remove('shake'), 500);
          return;
        }
        const ok = addToCart(product.id, selectedSize, 1);
        if (ok) toast(`${product.title} (UK ${selectedSize}) added to bag`, 'success');
      });
      block.querySelector('#pd-wishlist')?.addEventListener('click', () => {
        const added = toggleWishlist(product.id);
        toast(added ? 'Added to wishlist' : 'Removed from wishlist', 'success');
        render();
      });
    }

    render();
  } catch (err) {
    block.innerHTML = `<p class="pg-error">Unable to load product. Please refresh.</p>`;
    // eslint-disable-next-line no-console
    console.error('[product-detail]', err);
  }
}