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

## Catalog Filters

The block supports these filter fields in the authored table:

- `variation` - should be `catalog`
- `title` - page heading shown above the grid
- `gender` - `mens`, `womens`, or omitted for a shared catalog
- `limit` - optional item limit for featured grids

## Important Notes

- The block variation must be authored as `product-grid(mens)` or `product-grid(womens)` in DA.
- Do not use a plain text title row as the only signal for variation.
- The metadata table is for SEO only.
- Product data still comes from `shoesrc.json`.
- For mens/womens pages, the block should render the actual filtered catalog, not static text.
