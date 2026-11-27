# Mr Chef

An installable, local-first web app (PWA) that generates recipes with the AI of your choice
(Mistral, OpenAI or Claude), lets you polish them in a visual editor, then publishes them to
your Monsieur Cuisine account so they show up on your robot (Smart, Compact, Connect, 4.0, Édition Plus).

The technical brief behind the project is in [docs/brief.md](docs/brief.md).

## How it works

- **Local first**: recipes, photos and settings live in IndexedDB; the app works offline
  and queues publications until the network is back.
- **AI**: direct calls from the browser to the provider with your key (encrypted on the device),
  output constrained by a JSON Schema, then automatically fitted to the chosen robot's programs.
- **Monsieur Cuisine**: goes through a Cloudflare relay, either the site's public relay or your own
  (see [docs/cloudflare-relay.md](docs/cloudflare-relay.md)), with the session pasted from the website.
- **Sync states**: *Local*, *Published*, *Out of sync*, derived from a SHA-256 fingerprint of the recipe.
- **French and English**: browser language by default, can be changed in Settings
  (texts in `apps/web/src/i18n`). In English, the default prompt asks for recipes in English.
- **Device transfer**: Settings › Transfer to another device creates an encrypted QR code
  (AI keys, relay, Monsieur Cuisine session, preferences) unlocked by a passphrase shown separately.
- **Install**: on a phone, Mr Chef offers to install itself on the home screen (button on Android,
  instructions on iPhone); once dismissed, the suggestion does not come back for 90 days.

## Layout

```
apps/web               React 19 + Vite PWA (UI, Dexie database, vault, AI, sync, i18n)
apps/relay             Stateless Cloudflare Worker to monsieur-cuisine.com
packages/recipe-schema Zod schema, robot profiles, AI schema and prompts, Monsieur Cuisine mapping
packages/mc-client     Monsieur Cuisine client (through the relay) and session import
```

## Getting started

Requirements: Node 22.12 or later and npm 10 or later (npm workspaces). The install scripts that
are allowed to run (esbuild, workerd, sharp) are listed in `allowScripts` in the root `package.json`,
which avoids the npm 12 warning.

```bash
npm install
npm run dev         # http://localhost:5173
npm run relay:dev   # local relay on http://localhost:8787 (see docs)
```

## Checks

```bash
npm run lint
npm run typecheck
npm test                                        # unit tests (Vitest)
npx -w @mr-chef/web playwright install chromium # once
npm run test:e2e                                # end-to-end tests (Playwright)
npm run build
```

## Deployment

- **App**: the *Déployer sur GitHub Pages* workflow publishes `apps/web/dist` to GitHub Pages on every push
  to the main branch (enable Pages › Source: GitHub Actions). The `PUBLIC_RELAY_URL` repository variable,
  when set, makes the public relay the default in the app.
- **Relay**: the *Déployer le relais* workflow (manual, and on pushes that touch the relay). See the doc.

## Notes

- Recipe times are in minutes and robot program times in seconds, as on Monsieur Cuisine.
- Program ranges come from the Connect swagger; for the Smart and Compact they are taken from the
  Connect until a network capture of those models is available (flagged in the UI).
- A Monsieur Cuisine session lasts as long as the WordPress cookie (its date is read from the cookie and
  shown in Settings); Mr Chef tells you when it needs to be pasted again.
- Data sent to Monsieur Cuisine (units, categories) stays in French whatever the UI language,
  since those are the values the website expects.
