# OpsPulse: self-hosted version

All phones share one database. Staff sign in with PINs, roles are enforced on the server, and photo recognition works through your own key.

## What you need
1. A small server (VPS) running Linux with Docker installed. Any provider works. A basic plan is enough.
2. A domain or subdomain pointing to the server (for example shop.yourname.com). HTTPS is required so phones can install the app.
3. For photo recognition: an Anthropic API key from console.anthropic.com. Scans are billed to that account. Without a key everything else still works.

## Deploy in 6 steps
1. Copy this folder to the server (for example with `scp -r opspulse user@your-server:~`).
2. On the server: `cd opspulse && cp .env.example .env`
3. Edit `.env`: set DOMAIN, and paste your API key after `ANTHROPIC_API_KEY=`.
4. Make sure ports 80 and 443 are open on the server firewall.
5. Run `docker compose up -d`. The first start takes a minute. HTTPS is set up automatically.
6. Open https://your-domain on your phone. Create the owner account on the welcome screen.

No Docker? Install Node 22.13 or newer, then run `PORT=3000 DATA_DIR=./data ANTHROPIC_API_KEY=... node server.js` behind any HTTPS proxy.

## Install on phones
- Android (Chrome): open the link, tap Install.
- iPhone (Safari): Share, then Add to Home Screen.
Then add staff under Dashboard, Manage team.

## Roles (enforced by the server)
- Admin: everything, including reports, costs and profit, item prices, voiding sales, team, CSV downloads.
- Staff: log sales, see stock (without costs), add stock by hand or photo. A staff phone never receives cost or full sales data.

## Backups (important)
Your data is one file: /data/opspulse.db inside the `opspulse-data` volume.
- Run `./backup.sh` daily with cron, for example `0 2 * * * cd /home/you/opspulse && ./backup.sh`.
- Copy the backups folder off the server regularly.
- Admins can also download sales and items as CSV from the Dashboard.
To restore, stop the app, put a backup file back as /data/opspulse.db, and start it again.

## Updating
Replace the files, then run `docker compose up -d --build`. Data is kept.

## Security notes
- PINs are hashed on the server. After 5 wrong tries, that person is locked out for 5 minutes.
- The sign-in screen lists team names so people can tap their own name. Use real PINs, not 0000.
- Keep your API key only in `.env` on the server. Never share it.
- Keep the server updated and use a strong server password or SSH keys.

## Known limits
- The app needs an internet connection. It opens offline but cannot record sales until you are back online.
- One server, one SQLite database: suited to a single shop or a few branches.
- Sign-ins last 30 days. Removing a person signs them out immediately.
- Photo recognition can mix up similar items, so staff confirm before saving.
