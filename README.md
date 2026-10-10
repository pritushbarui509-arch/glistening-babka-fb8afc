# SAIF BHAI VIP

A key-protected website adapted from the supplied HTML dashboard. It preserves the original gold-and-dark styling, draw timer, history analysis, session statistics, profile panel, pattern dialogs, clipboard sharing, and sound controls. The dashboard is served only after a valid access key is checked by a Netlify Function; no credentials are embedded in the website.

## Technologies

The website uses plain HTML, CSS, browser JavaScript, and TypeScript Netlify Functions. Netlify publishes `public/` and bundles the private dashboard with its protected function. Netlify Database stores hashed keys, expiring sessions, and attempt counters. Netlify Identity protects the owner controls. Dependencies are installed from `package.json`; no frontend build command is required.

## Local Preview

From the project root, run `netlify dev --port 8889` and open `http://localhost:8889`. Internet access is needed for Google Fonts and the external draw-history service.

## Data And Access

Visitors enter the shared access key to open the dashboard. Session cookies are HttpOnly and expire after eight hours. The dashboard profile remains informational, not a personal account. Win/loss statistics and analysis exist only for the current browser session and reset on reload.

The owner must first have a Netlify Identity account with the `admin` role. Invite the owner through Netlify's Identity settings and assign that role, then use `/owner.html` to set a strong key of at least 16 characters. Keep the key securely before saving it and share it privately with permitted visitors. The owner panel never retrieves stored keys. Replacing or disabling the key invalidates existing dashboard sessions. Anyone who receives the shared key can use it; this is not individual user authorization.

The supplied browser-side analysis and external history endpoint were retained. Once unlocked, the dashboard initializes while history loads in the background. If the data service or its CORS fallbacks are unavailable, the interface displays a connection status and retries. Historical patterns do not guarantee future results, and the website does not process bets or payments. The external history service itself is not protected by this site's key.

## Deployment

Deploy this repository through Netlify with `public` as the publish directory and no build command. The root URL serves the key-entry page; `/dashboard` is protected server-side. The database migration is included under `netlify/database/migrations/` for deployment. Access stays closed until database setup is complete and the owner has saved a key.
