# OpsPulse

Simple daily sales and stock tracking for small businesses.

This repository has two parts:

| Folder | What it is | Where it runs |
|---|---|---|
| `pages/` | Standalone app. Installs on phones. Data stays on each phone. | GitHub Pages (free hosting for static sites) |
| `server/` | Full app with a shared database, staff roles enforced on the server, and photo recognition. | A server or app host that runs Docker or Node 22.13+ |

GitHub Pages can only host static files. It cannot run a database or keep an API key secret. So the shared version cannot run on Pages itself. You can still keep its code in this repository and deploy it to a host straight from GitHub (see Part 2).

## Part 1: Put the standalone app on GitHub Pages

1. Sign in at github.com and click **New repository**. Name it, for example, `opspulse`. Choose **Public** (Pages on private repositories needs a paid GitHub plan, and a public repository shows your code to everyone, so never put passwords or keys in it).
2. Upload this folder's contents. Easiest way: on the new repository page click **uploading an existing file**, then drag in everything from this folder (including the hidden `.github` folder) and click **Commit changes**.
   Or with Git on your computer:
   ```
   git init
   git add .
   git commit -m "OpsPulse"
   git branch -M main
   git remote add origin https://github.com/YOUR-NAME/opspulse.git
   git push -u origin main
   ```
3. In the repository go to **Settings, Pages**, and under **Source** choose **GitHub Actions**.
4. Open the **Actions** tab. The **Deploy to GitHub Pages** run should finish in a minute or two. If it did not start, click it and choose **Run workflow**.
5. Your app is at `https://YOUR-NAME.github.io/opspulse/`.
6. On each phone open that link, then install: Android Chrome has an Install button, and on iPhone use Share, then Add to Home Screen.

Every time you change something in `pages/` and push, the site updates itself.

What you get: sales, stock, reports, roles with PINs, offline use. What you do not get: shared data between phones, and photo recognition (staff pick the item from a list). PINs on this version only keep casual users out, because everything is stored in the phone's browser.

## Part 2: Shared database and photo scan (deploy `server/` from GitHub)

Many app hosts can build straight from a GitHub repository. Pick one that supports Docker and a persistent disk or volume, because the database is a file.

1. Create an account with the host. Choose to create a web service from a GitHub repository and select this repo.
2. Set the root directory to `server` and let it build with the included `Dockerfile`.
3. Add a persistent disk or volume mounted at `/data`. Without it, your data is erased on every restart. Check the host's current plans, since persistent disks are often not on the free tier.
4. Add an environment variable `ANTHROPIC_API_KEY` for photo scanning (optional). Set it in the host's settings, never in the repository.
5. Open the web address the host gives you, and create the owner account on the welcome screen.

Details, backups and security notes are in `server/README.md`.

## Which should I choose?
- One phone, or a trial: use Part 1.
- Several staff sharing the same stock and sales: use Part 2.
