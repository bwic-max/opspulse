# Store Yah! changelog

Each update raises the version number. The version is shown at the bottom of the sign-in screen and the Dashboard. To release an update: change `APP_VERSION` and `APP_DATE` at the top of the script in `pages/index.html`, add a line here, and upload the file.

## 1.5.0 (24 Nov 2026)
- New header with a 3-line menu button on the left and the page title. The alert strip is gone from the home screen.
- Slide-out menu drawer with Recent activity, Appearance (Light or Dark mode, remembered on the phone), Admin settings and Sign out.
- Admin settings: business profile, currency symbol, default low-stock threshold (with Apply to all items), CSV export of sales and items, team, photo scan key, and data reset.
- Inventory is now a card grid (2 columns on phones, 3 to 4 on larger screens) showing name and unit, large stock number, status pill, price and one-tap + / - buttons. A button at the top switches to list view and remembers the choice.
- Status label "Healthy" is now "In Stock".

## 1.4.0 (23 Nov 2026)
- Editable sales: tap a sale in the Reports sales log, then Edit sale. Change quantities, remove items or add items. Stock and totals update automatically, and edits that need more stock than available are blocked with a message.
- Edited sales show an "Edited" badge, the edit time, who edited and the original total.
- Item units: each item has a unit type (pcs, pack, box, ml, L, g, kg, bottle, bag or custom) and an optional unit size. Names show as "Cooking Oil (500 ml)" or "Tissue (12 pcs / pack)" across inventory, low-stock alerts, Quick Sale, receipts, reports, Data Entry and photo scan. Stock reads "3 packs".
- Sample data now uses a store with realistic units. Clear items & sales, then Load sample data to see it.

## 1.3.0 (23 Nov 2026)
- App renamed from OpsPulse to Store Yah!
- Refreshing or reopening the app no longer signs you out. You stay signed in on that phone for 30 days, or until you tap Sign out.

## 1.2.1 (23 Nov 2026)
- Photo scan accepts the new Gemini keys that start with AQ. (and older ones starting with AIza).
- Photo scan tries more Gemini models if one is busy or retired.
- Version number now shown in the app.

## 1.2.0 (23 Nov 2026)
- Photo scan now uses a free Google Gemini key instead of an Anthropic key.

## 1.1.0 (23 Nov 2026)
- Added the Photo scan key setting on the Dashboard (Anthropic key).

## 1.0.0 (23 Nov 2026)
- First GitHub Pages release: sales logging, stock view, Data Entry with photo scan and unit cost, admin sales reports, admin and staff roles with PINs, peso currency, installable on phones.
