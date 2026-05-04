# Product Grid Block - DA Authoring Guide

Use this guide for the reusable `product-grid` block on home, mens, womens, featured, wishlist, and catalog pages.

## Block Variations

Use a real EDS block variation, not plain text labels:

- `product-grid` - default trending grid
- `product-grid(catalog)` - full catalog with filters
- `product-grid(mens)` - mens catalog
- `product-grid(womens)` - womens catalog
- `product-grid(featured)` - featured products
- `product-grid(search)` - search results
- `product-grid(wishlist)` - wishlist page
- `product-grid(categories)` - categories landing page

## Mens Page Authoring

Use this structure for the mens page:

```md
| product-grid(mens) |
|---|---|
| variation | catalog |
| title | Men's Shoes |
| gender | mens |

---

| Metadata | |
|---|---|
| title | Adokicks | Men's Shoes |
| description | Shop all men's running, training, casual and lifestyle shoes at Adokicks. Free delivery above Rs 999. |
| og:image | /media/banner/mens.png |
```

## Womens Page Authoring

```md
| product-grid(womens) |
|---|---|
| variation | catalog |
| title | Women's Shoes |
| gender | womens |

---

| Metadata | |
|---|---|
| title | Adokicks | Women's Shoes |
| description | Shop all women's running, training, casual and lifestyle shoes at Adokicks. Free delivery above Rs 999. |
| og:image | /media/banner/womens.png |
```

## Categories Page Authoring

Use this structure for the categories page:

```md
| product-grid(categories) | |
|---|---|
| variation | categories |
| eyebrow | Category atlas |
| title | Choose the edit that matches your pace. |
| subtitle | Browse the core category collections directly, with each tile tuned to feel broad, balanced, and easy to scan. |

---

| Metadata | |
|---|---|
| title | Adokicks | Categories |
| description | Browse Adokicks shoes by category across men's and women's running, training, casual, multisport and sneaker collections. |
| og:image | /media/banner/categories.png |
```

## Featured Page Authoring

```md
| product-grid(featured) | |
|---|---|
| variation | featured |
| title | Featured Premium Picks |
| subtitle | Discover our curated collection of the finest athletic footwear |
| limit | 12 |
| ids | m-tr-001,m-ca-001 |

---

| Metadata | |
|---|---|
| title | Adokicks | Featured |
| description | Featured premium shoe picks from Adokicks. |
| og:image | /media/banner/featured.png |
```

## Wishlist Page Authoring

```md
| product-grid(wishlist) | |
|---|---|
| variation | wishlist |
| eyebrow | Saved picks |
| title | Your Wishlist |
| subtitle | Choose a size and move a saved pair straight into your bag. |
| emptyTitle | Your wishlist is empty |
| emptyText | Browse our collections and hit the heart on any shoe to save it here. |

---

| Metadata | |
|---|---|
| title | Adokicks | Wishlist |
| description | View saved Adokicks shoes and move wishlist items into your shopping bag. |
| og:image | /media/banner/wishlist.png |
```

## Catalog Filters

The block supports these filter fields in the authored table:

- `variation` - should be `catalog`
- `title` - page heading shown above the grid
- `gender` - `mens`, `womens`, or omitted for a shared catalog
- `limit` - optional item limit for featured grids
- `ids` - optional comma-separated product IDs to force into featured grids
- `eyebrow` - optional categories hero eyebrow
- `subtitle` - optional categories hero subtitle

## Important Notes

- The block variation must be authored as `product-grid(mens)` or `product-grid(womens)` in DA.
- Do not use a plain text title row as the only signal for variation.
- The metadata table is for SEO only.
- Product data still comes from `shoesrc.json`.
- For mens/womens pages, the block should render the actual filtered catalog, not static text.
