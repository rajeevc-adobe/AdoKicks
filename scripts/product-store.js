export const CATEGORY_LABELS = {
  training:   'Training Shoes',
  running:    'Running Shoes',
  multisport: 'Multisport Shoes',
  casual:     'Casual Shoes',
  sneakers:   'Sneakers',
};

/** @type {{ id: string, brand: string, title: string, price: number, ... }[] | null} */
let _cache = null;

/**
 * Maps the nested JSON { mens: { training: [...] } } into a flat array.
 * Adds computed fields: gender, category, categoryLabel, imageList.
 */
function mapRaw(json) {
  const all = [];
  ['mens', 'womens'].forEach((gender) => {
    const bucket = json[gender] || {};
    Object.keys(bucket).forEach((category) => {
      (bucket[category] || []).forEach((item) => {
        all.push({
          ...item,
          gender,
          category,
          categoryLabel: CATEGORY_LABELS[category] || category,
          // normalise images array — JSON may have image1, image2 OR images[]
          images: item.images
            || [item.image1, item.image2, item.image3, item.image4].filter(Boolean),
        });
      });
    });
  });
  return all;
}

/**
 * Returns all products. Fetches once, caches forever.
 * @returns {Promise<object[]>}
 */
export async function getProducts() {
  if (_cache) return _cache;
  const res = await fetch('/shoesrc.json');
  if (!res.ok) throw new Error(`Failed to load products: ${res.status}`);
  const json = await res.json();
  _cache = mapRaw(json);
  return _cache;
}

/**
 * Returns a single product by ID, or null.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function getProductById(id) {
  const products = await getProducts();
  return products.find((p) => p.id === id) || null;
}

/**
 * Returns filter metadata for a set of products (used by catalog sidebar).
 * @param {object[]} products
 */
export function buildFiltersMeta(products) {
  const categories = [...new Set(products.map((p) => p.category))].sort();
  const brands     = [...new Set(products.map((p) => p.brand))].sort();
  const prices     = products.map((p) => p.price);
  return {
    categories,
    brands,
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
  };
}

/**
 * Filters a product array by a state object.
 * @param {object[]} products
 * @param {{ categories: Set, brands: Set, maxPrice: number, gender: string, sort: string }} state
 */
export function filterProducts(products, state) {
  let filtered = products.filter((p) => {
    if (state.categories.size && !state.categories.has(p.category)) return false;
    if (state.brands.size && !state.brands.has(p.brand)) return false;
    if (p.price > state.maxPrice) return false;
    if (state.gender && state.gender !== 'all' && p.gender !== state.gender) return false;
    return true;
  });

  if (state.sort === 'low-high')  filtered.sort((a, b) => a.price - b.price);
  else if (state.sort === 'high-low') filtered.sort((a, b) => b.price - a.price);
  else filtered.sort((a, b) => (b.rating * b.reviews) - (a.rating * a.reviews));

  return filtered;
}