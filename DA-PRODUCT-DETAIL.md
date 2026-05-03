# Product Detail Page - DA Authoring Guide

## Overview
Use this as the Google Docs / DA markdown contract for the product detail page. The block now reads the authored content first, then falls back to `?id=` product-store data only if no authored product is present.

## Authoring Contract

Author the page with this order:

1. `H1` title
2. A metadata table
3. Product images anywhere in the body
4. A `Sizes` section
5. A `Description` section
6. Optional `Details` / `Delivery` sections

## Required Metadata Table

Use one table with two columns. The parser reads the first column as the key and the second as the value.

| Property | Value |
|---|---|
| Product ID | m-ru-001 |
| Brand | Nike |
| Category | running |
| Gender | mens |
| Price | 4599 |
| Original Price | 6499 |
| Rating | 4.5 |
| Reviews | 328 |
| Stock | In Stock |

## Images

Add 1 to 4 product images anywhere after the metadata.

```md
![Nike shoe front](https://example.com/shoe-front.jpg)
![Nike shoe side](https://example.com/shoe-side.jpg)
![Nike shoe detail](https://example.com/shoe-detail.jpg)
![Nike shoe sole](https://example.com/shoe-sole.jpg)
```

The block uses the first image as the main gallery image and the rest as thumbnails.

## Sizes Section

Use a heading named `Sizes` and either a comma-separated paragraph or a bullet list.

```md
## Sizes

6, 7, 8, 9, 10, 11, 12
```

or

```md
## Sizes

- 6
- 7
- 8
- 9
- 10
```

## Description Section

Use a heading named `Description` and write the product copy below it.

```md
## Description

Revolutionary comfort meets modern design in the Nike Revolution Running Shoe. It uses responsive cushioning and a breathable mesh upper for all-day wear.

Built for daily runs, it stays lightweight while giving stable traction.
```

## Optional Details Section

This is useful for material, fit, and care notes.

| Label | Value |
|---|---|
| Material | Mesh & Synthetic |
| Weight | 285g |
| Fit | True to size |
| Care | Wipe clean with a damp cloth |

## Optional Delivery Section

```md
## Delivery

- Free delivery on orders above Rs 999
- Easy 30-day returns
- Delivery within 3-5 business days
```

## Complete Example

```md
# Nike Revolution Running Shoe

| Property | Value |
|---|---|
| Product ID | m-ru-001 |
| Brand | Nike |
| Category | running |
| Gender | mens |
| Price | 4599 |
| Original Price | 6499 |
| Rating | 4.5 |
| Reviews | 328 |
| Stock | In Stock |

![Nike Revolution Running Shoe front](https://example.com/nike-revolution-1.jpg)
![Nike Revolution Running Shoe side](https://example.com/nike-revolution-2.jpg)
![Nike Revolution Running Shoe detail](https://example.com/nike-revolution-3.jpg)

## Sizes

6, 7, 8, 9, 10, 11, 12

## Description

Revolutionary comfort meets modern design in the Nike Revolution Running Shoe. It uses responsive cushioning and a breathable mesh upper for all-day wear.

Built for daily runs, it stays lightweight while giving stable traction.

## Details

| Label | Value |
|---|---|
| Material | Mesh & Synthetic |
| Weight | 285g |
| Fit | True to size |
| Care | Wipe clean with a damp cloth |

## Delivery

- Free delivery on orders above Rs 999
- Easy 30-day returns
```

## Notes

- Use lowercase `mens` or `womens` for Gender.
- Use lowercase category keys like `running`, `training`, `casual`, `multisport`, `sneakers`.
- Price fields should be plain numbers, without currency symbols.
- If `Original Price` is omitted, the block treats the product as non-discounted.

## Current Route

The page still supports the store fallback route:

```text
/product?id=m-ru-001
```

## Rendered Layout

The block still renders the same old-site structure:

```text
.product-detail-layout
├── .pd-gallery
└── .pd-info
```

## Checklist

- [ ] Title renders from H1
- [ ] Brand/category/gender pull from the table
- [ ] Gallery images appear in the main slider
- [ ] Sizes render as pills
- [ ] Description stays readable on mobile
- [ ] Discount shows only when original price is higher

