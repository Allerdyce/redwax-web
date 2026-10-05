# RedWax website

The marketing website for **redwaxapp.com**, based on the approved RedWax design boards. GitHub holds the source; Vercel hosts a password-protected preview while photography and launch details are finished.

## Run locally

Use Node.js 22 or newer:

```sh
npm ci
cp .env.example .env.local
# Fill in SITE_PASSWORD and PREVIEW_SESSION_SECRET in .env.local.
npm run dev
```

Open http://127.0.0.1:4173. The local preview uses the same server-side password gate as hosting. Create a session secret with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.

```sh
npm test
npm run build
```

## Editing

- `src/pages/index.html`: the homepage, workflow, features, future releases, pricing and FAQs.
- `src/pages/support.html`: support guides; marked as planned while the app is in development.
- `src/pages/privacy.html`: pre-release app privacy page.
- `src/partials/`: shared navigation, footer and the supplied vector wordmark.
- `src/styles/`: color tokens, layout rules, component styles and responsive overrides.
- `public/assets/`: the supplied logos and future photography.
- `site.config.json`: domain, coming-soon/release state, publisher and support address.
- `lib/` and `api/site.js`: the server-side preview gate and protected file serving.

The website uses standard HTML, CSS and JavaScript. No frontend framework or third-party runtime dependency is required. It supports system light/dark appearance, keyboard navigation, reduced motion and a working keeper-target demonstration. The app window is a decorative illustration, not an interactive app.

## Vercel

Import `Allerdyce/redwax-web`. Choose the **Other** framework preset, Node.js **22.x**, and keep the build/output settings from `vercel.json`.

Set these server-only environment values for Production and Preview **before deploying**:

| Variable | Value |
| --- | --- |
| `SITE_PASSWORD` | The preview password agreed with the owner |
| `PREVIEW_SESSION_SECRET` | A random secret of at least 32 characters |
| `PREVIEW_GATE` | `on` |

The gate stays closed if secrets are missing. Protected content lives in the function bundle, rather than a publicly accessible static directory. Successful entry creates an HttpOnly, Secure session cookie for seven days. Pages and assets pass through the same gate. The password is never committed or sent in page source.

Add `redwaxapp.com` and `www.redwaxapp.com` in Vercel's project Domains settings. Use the DNS values shown there for this project; redirect `www` to the primary domain. Do not change mail records.

GitHub pushes create new deployments after the Vercel Git connection is enabled. Pull requests receive preview deployments. `npm test` and the build also run through GitHub Actions.

## Opening the site

Keep `PREVIEW_GATE=on` while replacing and reviewing photography. The current `status: "preview"` excludes the site from search and uses coming-soon calls to action.

To show a public coming-soon page, set `status` to `coming-soon`, set `PREVIEW_GATE=off` in Vercel, and redeploy. To launch downloads, complete [the launch notes](docs/LAUNCH.md), set `status` to `released`, provide the real download URL and approve the final privacy page before lifting the gate. Turning the gate off alone does not make a download available.
