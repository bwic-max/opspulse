# OpsPulse changelog

Each update raises the version number. The version is shown at the bottom of the sign-in screen and the Dashboard. To release an update: change `APP_VERSION` and `APP_DATE` at the top of the script in `pages/index.html`, add a line here, and upload the file.

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
