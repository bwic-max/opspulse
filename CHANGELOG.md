# Store Yah! changelog

Each update raises the version number. The version is shown at the bottom of the sign-in screen and the Dashboard. To release an update: change `APP_VERSION` and `APP_DATE` at the top of the script in `pages/index.html`, add a line here, and upload the file.

## 1.8.0 (24 Nov 2026)
- Data Entry opens clean. Two large buttons, + Add Stock by Hand and View / Manage Items, expand their sections on tap and collapse again on a second tap or Cancel / Close. The stock confirmation before saving is unchanged.
- Log Sale now starts with a search box. Typing filters items instantly by name, size or unit (for example 500 ml or pack), SKU and category, ignoring capitals.
- Tap a result to add it to the sale. Pack items show + Per Pack and + Per Piece buttons. Results show the selling price and what is left in stock.
- The full item list is hidden until you type or tap Browse All Items. No match shows a friendly message.
- A new In this sale list lets you change quantities or remove lines before saving.

## 1.7.0 (24 Nov 2026)
- Sell by Pack & Piece: new "Sold by Pack & Piece" option when adding or editing an item. Enter pieces per pack, price per pack, price per piece, and starting stock as packs and loose pieces.
- Stock for these items is stored in total pieces, so there are no rounding errors. Inventory cards show it as packs and pieces, for example "9 packs, 17 pcs" with "197 pcs total".
- Low-stock alerts compare total pieces against the reorder point converted from packs.
- Quick Sale: each pack item has a Per Pack / Per Piece selector. One sale can mix both, and selling more than is in stock is blocked with a clear message.
- Confirm Sale and receipts show each line, for example "1 pack (20 pcs) @ 100 = 100" and "3 pcs @ 6 = 18".
- Edit Sale: change the quantity or switch a line between Per Pack and Per Piece. Stock is adjusted by the exact piece difference.
- Data Entry and photo scan can add stock in packs or loose pieces. The + / - buttons on pack cards change stock by one full pack.
- CSV export of items includes pack details. Sample data now includes pack items.

## 1.6.0 (24 Nov 2026)
- The menu drawer now has clean rows only: Recent activity, Admin settings (admins) and the Appearance switch, plus Sign out.
- Recent activity and Admin settings open as their own full screens with a back arrow in the header.
- Confirmation before saving: new sales and edited sales (Confirm Sale), products (Confirm Product Details, with "was" values when editing), Data Entry stock entries, quick + / - stock buttons on inventory cards, and deleting an item.
- Going back from a confirmation keeps what you typed.
- Sample data now loads faster.

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
