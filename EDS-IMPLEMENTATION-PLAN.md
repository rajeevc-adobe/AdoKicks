# Complete EDS Analysis And Implementation Plan

## Summary

Adokicks now has the old non-EDS site mapped into Edge Delivery Services blocks, but the implementation must stay disciplined around authoring contracts. The project should preserve the same visual result and client-side behavior while moving static shell content into authored pages/fragments and keeping dynamic state in JavaScript.

The main cleanup goals are:

- Header/nav is authored from `/nav`, with a hardcoded fallback only for resilience.
- Search, cart, and filter shell copy comes from `/fragments/search-shell`, `/fragments/cart-shell`, and `/fragments/filter-shell`.
- Page DA uses explicit block variations such as `product-grid(search)`, `banner(men)`, and `cards(timeline)`.
- Product, cart, wishlist, auth, checkout, and orders behavior remains client-side and keeps the current localStorage data shape.
- `DA-AUTHORING-BACKUP.md` remains the before-state backup.

## What Is Properly Implemented

- Core pages are represented as EDS blocks: `product-grid`, `cards`, `auth`, `checkout`, `order-confirmation`, `orders-list`, and `product-detail`.
- Footer already follows the fragment pattern by loading authored `/footer` content.
- Product data is centralized in `shoesrc.json`, matching the old project's client-side data model.
- Cart, wishlist, auth, checkout, and orders logic has been separated from the old single app file.
- Old-site behaviors are preserved: wishlist-to-cart removal, quantity controls, checkout login redirect, order placement, order history, search, filters, profile menu, and responsive nav.

## What Was Not Proper In EDS

- Header/nav was hardcoded in `blocks/header/header.js`.
- Search popup labels, cart drawer labels, and filter panel labels were hardcoded in JS.
- Some DA examples used migration-friendly or backup-style authoring instead of final EDS contracts.
- Some block variations relied on path guessing or text inspection.
- `product-grid` carried category landing-page responsibilities that are better handled by authored cards.
- `scripts/aem.js` should be treated as boilerplate core and not receive project-specific changes.

## Target Architecture

- `/nav` owns static header content: brand, primary nav, and tool links.
- `/footer` owns static footer content: quick links, legal, social, and contact.
- `/fragments/search-shell` owns search dialog/page labels and empty text.
- `/fragments/cart-shell` owns cart drawer labels and empty state.
- `/fragments/filter-shell` owns filter panel, mobile filter, sort, and no-result labels.
- JavaScript owns dynamic behavior: search results, cart items, wishlist state, filter state, auth state, and order state.

## Final Page Contracts

- Home `/`: `hero`, `product-grid`, `banner(men)`, `banner(women)`, `cards(composed)`, `benefits`, metadata.
- Mens/Womens: `product-grid(mens/womens)` with `variation | catalog` and `gender`.
- Categories: `cards(category)` with authored category cards linking to filtered mens/womens catalog pages.
- Featured: `product-grid(featured)` with `limit` and `ids`; desktop stays four products per row.
- About: `cards(about-hero)`, `cards(metrics)`, `cards(values)`, `cards(timeline)`.
- Wishlist: `product-grid(wishlist)` with authored empty state.
- Search: `product-grid(search)` as the final contract; old `Product Grid | Search` is migration fallback only.
- Product: `product-detail`, query-driven by `/product?id=...` when product data is not manually authored.
- Auth/Checkout/Order Confirmation/My Orders: dedicated block contracts.

## Priority Fix List

- Critical:
  - Make header/nav author-driven through `/nav`.
  - Implement `/fragments/search-shell`, `/fragments/cart-shell`, and `/fragments/filter-shell`.
  - Make all final DA files copy-ready and EDS-correct.
  - Explicitly support `banner(men)` and `banner(women)`.
  - Use `product-grid(search)` for final search DA while keeping old search DA fallback.

- Should Fix:
  - Use wishlist authored empty state fields.
  - Guard failed fragment loading.
  - Clean mojibake in touched code paths.
  - Document every final page and fragment DA.

- Later Cleanup:
  - Split `product-grid` internals only if maintainability becomes a real issue.
  - Reduce duplicate CSS after route screenshots confirm visual parity.
  - Add a small smoke-test checklist for each route.

## Test Plan

Run:

`npm run lint`

Verify these routes locally:

- `/`
- `/nav`
- `/footer`
- `/fragments/search-shell`
- `/fragments/cart-shell`
- `/fragments/filter-shell`
- `/mens`
- `/womens`
- `/categories`
- `/featured`
- `/about`
- `/wishlist`
- `/search?q=nike`
- `/product?id=m-ru-001`
- `/auth`
- `/checkout`
- `/order-confirmation`
- `/my-orders`

Behavior checks:

- Header desktop/mobile matches the old project.
- Header active state works for mens and womens.
- Search popup copy comes from fragment and search still works.
- Cart drawer copy comes from fragment and cart controls still work.
- Filter panel copy comes from fragment and filters still work.
- Checkout asks for login when logged out.
- Wishlist-to-cart removal still works.
- Product detail loads by query ID.
- Home renders hero, trending, men banner, women banner, composed cards, and benefits.
- Categories renders authored `cards(category)` cards and routes each card to `/mens?category=...` or `/womens?category=...`.
