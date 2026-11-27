# Mr Chef: technical brief

A local-first PWA that writes recipes with the AI of your choice, lets you polish them in a visual
editor, then sends them to your Monsieur Cuisine robot. This document records the stack, the
architecture, how the app reaches the Lidl account, the visual identity and the screens.

- Sources: Monsieur Cuisine `swagger.json` v1.140.2 and a HAR capture of the website (1,101 requests).
  No cookie, code or token value from those files is reproduced here.
- First written on 27 November 2026 (phase 1 brief, validated). This version is updated to match
  the code as built: npm workspaces, public relay, device transfer by QR code, French and English UI,
  install prompt.

## 0. Decisions at a glance

| Area | Choice | Why |
| --- | --- | --- |
| Front end | React 19 + TypeScript + Vite | Widest ecosystem for the editor (drag and drop, accessible dialogs) and offline use. |
| Data | Dexie (IndexedDB) as the source of truth | The UI reads the database live; the network only syncs. |
| PWA | vite-plugin-pwa + Workbox | Precached app shell, installable, fully usable offline to browse and edit. |
| Lidl account | Pasted session + relay | You sign in on the official website, paste your session through a guided import, and a stateless relay makes the calls. |
| Relay | Cloudflare Worker, public by default | Nothing to install for visitors; anyone can run their own relay without rebuilding the app. |
| AI | Mistral, OpenAI, Claude | One common interface, direct calls from the browser, output constrained by a JSON Schema generated for your robot. |
| Languages | French and English | Browser language by default, switchable in Settings; the default AI prompt follows the language. |
| Identity | Pine green, cream, Young Serif | Warm serif headings, Atkinson Hyperlegible text that reads well from across the kitchen. |

## 1. What the swagger and the HAR capture show

The whole architecture follows from four observed facts.

| Finding | Evidence | Consequence for Mr Chef |
| --- | --- | --- |
| The Lidl OIDC client is confidential and accepts a single redirect | `client_id=monsieurcuisinewebcompanionclient`, `redirect_uri=https://www.monsieur-cuisine.com/sso/post/login/redirect/`; the code is exchanged by the WordPress server | No OIDC flow of our own: no redirect to Mr Chef, no client secret. |
| The Lidl sign-in form requires reCAPTCHA | `POST /Account/Login` with `ReCaptchaToken` and `__RequestVerificationToken` | No automated username and password sign-in. A human has to sign in in a real browser. |
| Every authenticated operation goes through a cookie-based WordPress gateway | `POST /proxy-api` with `{endpoint, method, lang, payload}`; the Tecpal token is injected server side and never seen by the browser | What matters is the browser session on monsieur-cuisine.com, not a Bearer token. |
| No CORS to any other origin | `mc-api.tecpal.com` answers `Access-Control-Allow-Origin: https://www.monsieur-cuisine.com`; `/proxy-api` sends no CORS headers | A PWA hosted elsewhere cannot call the API or the gateway directly, not even public reads. |

### Operations available through `/proxy-api`

| Mr Chef need | Tecpal method and endpoint |
| --- | --- |
| Check the session, show the profile | `GET api/v1/users` |
| List my recipes | `GET api/v3/auth/user/recipes?size=20&page=1&filters[status][]=draft&filters[status][]=private-publish` |
| Read a recipe | `GET api/v3/auth/user/recipes/{id}` |
| Create (draft) | `POST api/v3/auth/user/recipes/` with `status: "draft"` |
| Publish privately, update | `PUT api/v3/auth/user/recipes/{id}` with `status: "private-publish"` |
| Remove from the account (trash) | `PATCH api/v3/auth/user/recipes/{id}` with `{status: "trash"}` |
| Image: signed URL, upload, wait | `POST api/v1/media/image/upload-url`, `PUT storage.googleapis.com/…`, then `GET api/v1/media?ids[]=…` until `uploadStatus = "3"` |
| Reference data (robots, units, categories, difficulty, modules) | `POST /wp-admin/admin-ajax.php` `action=load_recipe_post` |

## 2. Technical stack

| Layer | Choice | Notes |
| --- | --- | --- |
| Framework | React 19 + strict TypeScript, Vite 8 | dnd-kit to reorder steps and ingredients, native `<dialog>` for accessible dialogs. |
| Routing | React Router 7, hash routing (`#/recette/…`) | No server rendering; the hash avoids GitHub Pages 404s when reloading a deep link. |
| Local data | Dexie 4 + `useLiveQuery` | Screens update as soon as a recipe changes, whether it comes from the AI, the editor or a sync. |
| UI state | Zustand | Small store for non-persistent state (toasts). |
| Schemas | Zod 4 | One definition validates, types and produces the JSON Schema sent to the AI providers. |
| Monsieur Cuisine client | `packages/mc-client` | Typed calls through the relay, with an allow list of endpoints shared with the relay. |
| PWA | vite-plugin-pwa (Workbox), update prompt | Precaches the app shell, fonts and icons; "A new version is ready" banner. Data lives in IndexedDB, not in the HTTP cache. |
| i18n | Typed dictionaries in `apps/web/src/i18n` (`fr.ts` is the reference, `en.ts` must match its type) | No i18n library: every key is checked by TypeScript. |
| Styles | Plain CSS with design tokens | Light and dark themes driven by the same tokens. |
| Tests | Vitest (schemas, sync, mapping, transfer, i18n) + Playwright (onboarding, generation, editing, sign-out, QR transfer, English UI) | The sync state machine and the Monsieur Cuisine mapping are the riskiest parts, so they are unit tested first. |
| Repository | npm workspaces: `apps/web`, `apps/relay`, `packages/recipe-schema`, `packages/mc-client` | The recipe schema and the Monsieur Cuisine client are shared between the app and the relay. |
| Hosting | GitHub Pages | Static app over HTTPS under `<account>.github.io/Mr-chef/`. The relay cannot run on Pages (static files only). |
| CI/CD | GitHub Actions | On every pull request: lint, type check, tests, build. On the main branch: deployment to Pages. A separate workflow deploys the relay to Cloudflare with wrangler. |

## 3. Architecture

### Local first

IndexedDB is the only source of truth. Generating, editing, browsing and deleting work without a
network. The network is used for two things only: calling the AI and syncing with Monsieur Cuisine.
A publication requested offline is queued and replayed when the network is back, with an
"Upload pending" badge on the recipe.

### Data model

```
recipes   id, title, createdAt, updatedAt, robotId, recipe, imageId, hash, remoteId,
          sync { remoteId, publishedHash, remoteStatus, remoteUpdatedAt, lastSyncedAt,
                 media, conflict, error },
          pending (publish | unpublish | null), origin { provider, model, prompt }
media     id, blob, createdAt
kv        settings: onboardingDone, robotId, activeProvider, models, systemPrompt,
          relayMode, relayUrl, mcUser, mcExpiresAt, sessionExpired, defaultServings,
          lastRefreshAt, lang, installDismissedAt
secrets   id, iv, data (AI keys, relay secret, Monsieur Cuisine session, encrypted)
keys      the non-extractable WebCrypto key
```

### Storing secrets

- AI keys, the relay secret and the Monsieur Cuisine session are encrypted with AES-GCM using a
  WebCrypto key generated on the device, marked non-extractable and kept in IndexedDB. Nothing in
  localStorage, nothing in logs.
- The session cookies only leave the device to reach the relay, over HTTPS, in a header.
- Accepted limit: encryption in the browser protects against reading the disk or exporting the
  profile, not against a malicious script running inside Mr Chef. The app loads no third-party
  scripts and self-hosts its fonts.

### Moving the configuration to another device

Settings › Transfer to another device builds a bundle (AI keys, relay, Monsieur Cuisine session,
preferences, each optional), compresses it, and encrypts it with AES-GCM using a key derived from a
random 16-character passphrase (PBKDF2-SHA256, 600,000 iterations). The result is shown as a QR code
pointing to `#/importer?c=…`; the code sits in the URL fragment, so it is never sent to a server.
The passphrase is displayed separately and typed on the other device, where dashes are inserted
automatically while typing.

## 4. Connecting the Monsieur Cuisine account despite the Lidl SSO

Lidl only sends the authorization code back to monsieur-cuisine.com, and the API only opens with the
session cookie WordPress sets on that domain, which no other origin may use. The chosen approach: you
sign in on the official website, paste your session into Mr Chef through a guided import, and a
stateless relay makes the calls for you.

### Guided import

1. Open monsieur-cuisine.com on a computer and sign in with your Lidl account (reCAPTCHA included).
2. Open the developer tools (F12), Network tab, and reload the page.
3. Right-click the first monsieur-cuisine.com request › Copy › **Copy as cURL**, or copy the `cookie`
   header value.
4. Paste it into Mr Chef. Only the `wordpress_logged_in_*` and `wordpress_sec_*` cookies are kept;
   everything else is discarded.
5. Mr Chef calls `api/v1/users` through the relay and shows "Connected as …" along with the session
   expiry date, which the `wordpress_logged_in` cookie carries in clear text.

### The relay

A small Cloudflare Worker (`apps/relay`) that keeps nothing between requests:

```
GET  /health      {ok, version, public}
POST /mc          {endpoint, method, lang, payload} + X-MC-Session header
                  → POST https://www.monsieur-cuisine.com/proxy-api
POST /mc/ajax     action=load_recipe_post (reference data)
POST /mc/logout   signs the session out on monsieur-cuisine.com
PUT  /upload      image upload to the signed Google Cloud Storage URL
POST /ai/mistral  fallback when Mistral blocks CORS
```

- Only accepts the Mr Chef origin (`ALLOWED_ORIGIN`) and the allow-listed endpoints.
- **Public mode** (default): no secret; each call is authenticated by the user's own session, and a
  rate limit of 120 requests per minute per IP applies. The site administrator sets
  `PUBLIC_RELAY_URL` so the app offers it by default.
- **Private mode**: a shared secret (`RELAY_SHARED_SECRET`) is required in the `x-relay-secret` header.
- **Your own relay**: anyone can deploy the same Worker on their own Cloudflare account (dashboard
  upload of `<site>/relais/index.js`, a GitHub fork, or wrangler) and enter its address in
  Settings › Relay › My own relay. No rebuild of the app is needed.
- No logging of headers or bodies (`observability.enabled = false`).

### Session lifetime

- Before each sync Mr Chef checks the session. On a 401, a "Monsieur Cuisine session expired" banner
  links straight to the paste step. Local recipes are never touched, and pending publications resume
  once a new session is saved.
- Signing out calls `/mc/logout` through the relay first, then wipes the database, the vault and the
  app caches.

### Options ruled out

| Option | Why not |
| --- | --- |
| "Mr Chef bridge" browser extension | Declined; still possible later to read the cookie automatically without changing the relay. |
| Our own OIDC flow to Lidl | `redirect_uri` locked to monsieur-cuisine.com, confidential client whose secret is on their server. |
| Automated username and password sign-in | reCAPTCHA on `/Account/Login`, and your Lidl credentials would pass through Mr Chef. |
| Iframe of the official website | Third-party cookies blocked by default, and the page cannot answer another origin anyway. |
| Direct calls from the PWA | CORS limited to monsieur-cuisine.com, and browsers forbid setting a `Cookie` header. Hence the relay. |

The API used is not a public API documented by Lidl or Tecpal and may change without notice. Mr Chef
reproduces it the way the website uses it, for your own account, at a modest rate. The client is
isolated in one package so it can be adapted quickly. Your session cookie gives access to your
Monsieur Cuisine account: only paste it into a Mr Chef instance and relay you trust.

## 5. Sync state machine

- The state is derived, not stored: no `remoteId` → **Local**; `remoteId` present and the local hash
  equal to `publishedHash` → **Published**; otherwise → **Out of sync**.
- The hash is a SHA-256 of the normalized recipe, so an edit that is undone goes back to Published.
- **Publish** follows the HAR sequence: images first, then creation as a draft, then `PUT` with
  `private-publish`. The remote id is saved right after the draft is created.
- **Unpublish** uses the observed `PATCH status: trash`. The local recipe stays and its `remoteId`
  is cleared. Publishing again creates a new remote recipe.
- **Sync** (library): pages through `GET api/v3/auth/user/recipes` (drafts and private), then reads the
  new or changed ones. An unknown remote recipe is imported as Published; a remote change with an
  untouched local copy replaces it; a recipe gone online goes back to Local. Changed on both sides:
  a **Conflict** badge and an explicit choice (keep mine and publish, or take the online version).

## 6. Multi-provider AI layer

```ts
interface RecipeProvider {
  id: 'mistral' | 'openai' | 'anthropic'
  listModels(key, signal?): Promise<ModelInfo[]>
  generate({ apiKey, model, system, user, schema, signal }): Promise<unknown> // then validated by Zod
}
```

| Provider | Constrained output | Models offered |
| --- | --- | --- |
| Mistral | `response_format: json_schema` (strict) | Mistral Large, Medium, Small, Mixtral 8x22B (list read from `/v1/models`); goes through the relay if CORS is blocked |
| OpenAI | `response_format: json_schema` (strict) | List read from `/v1/models` |
| Anthropic | Official SDK, `output_config.format` json_schema, browser calls allowed | Claude Opus 5.5 by default, Sonnet 5.5, Haiku 5.5 |

### Fitting the robot

Mr Chef supports every Monsieur Cuisine robot. The choice is made during onboarding and in Settings,
and it changes the programs offered in the editor and in the prompt.

`packages/recipe-schema/src/robots.ts` describes each model: `deviceTypeId`, allowed programs,
setting ranges, modules. On each generation the JSON Schema is rebuilt so the `mode.type` enum only
contains your robot's programs, and the system prompt lists the ranges in plain text. Because some
providers ignore minimum and maximum in strict mode, ranges are also enforced after generation:
out-of-range values are corrected and listed in the editor.

| Robot | deviceTypeId | Programs in Mr Chef |
| --- | --- | --- |
| Connect (MC2.0) | 12 | Full ranges from the swagger: custom cooking 37 to 130 °C in steps of 5, speed 1 to 10 (3 max when heating), knead 45 to 120 s, steam up to 60 min, sauté up to 130 °C, scale 5 to 5,000 g, turbo 1 to 20 s |
| Smart (MC3.0) | 13 | Custom cooking, turbo, scale, knead, steam, with Connect ranges (to be confirmed) |
| Compact | 776 | Custom cooking, turbo, scale, with Connect ranges (to be confirmed) |
| 4.0 | 777 | Custom cooking, turbo, scale, with Connect ranges; modules (2 L and 3 L bowls) listed; to be confirmed |
| Édition Plus | 11 | Custom cooking, turbo, scale, to be confirmed |

Profiles marked "to be confirmed" are flagged in the UI until a HAR capture of that robot is available.

### Prompts and language

The default system prompt exists in French and English; the app uses the one matching the UI
language, so an English UI gets recipes written in English. It can be edited in Settings and restored
in one click. Values sent to Monsieur Cuisine (units such as `c.c.` or `pincée`, category labels) stay
in French because the website expects them; the English UI only displays translated labels. A
generated recipe is saved to IndexedDB as soon as it arrives, before the editor opens, with the
provider, model and original request.

## 7. Visual identity

A well-kept kitchen notebook rather than a dashboard. Cream background, pine green for everything
that acts, a single warm colour (saffron) for the Out of sync state, and tomato for destructive
actions. All text and background pairs below meet WCAG AA.

| Token | Colour | Use |
| --- | --- | --- |
| Deep pine | `#1B4332` | Headings, primary button (10.3:1) |
| Pine | `#2D6A4F` | Links, hover, focus (6.4:1) |
| Needle | `#40916C` | Icons, strokes (large text only) |
| Mint | `#D8F3DC` | Published state background |
| Cream | `#FAF6EE` | Page background |
| Linen | `#F1ECE1` | Secondary surfaces, Local state |
| Saffron | `#8A5A00` / `#FBEFD3` | Out of sync |
| Tomato | `#A8402B` / `#F8E1DA` | Delete, sign out |
| Forest night | `#0E2219` | Dark theme background |

Typography: **Young Serif** for headings, **Atkinson Hyperlegible Next** for text (each letter stays
distinct a metre from the screen), **IBM Plex Mono** for robot settings in tabular figures. Fonts are
self-hosted so the app works offline.

Logo: concept A, a chef's hat whose central fold draws a small pine tree (chosen over a bowl with
steam and a fork-and-leaf medallion). It reads at 16 px and works in monochrome; app icons
(any, maskable, apple-touch) are generated from the SVG.

## 8. Screens

1. **Onboarding** (four steps, language picker and help link in the header): relay (public relay or
   your own), Monsieur Cuisine session (guided import, can be skipped for local-only use), robot, AI
   key (tested immediately by listing the models). A shortcut imports a configuration from another
   device.
2. **Home**: one text field for what you feel like, servings, the active provider, a Generate button
   with a cancellable loading state, links to recipes, settings and help. On a phone, a discreet
   banner offers to install the app (native button on Android, Share › Add to Home Screen on iPhone).
3. **Editor**: photo, title, description, difficulty, times, robot, servings, categories, ingredient
   groups and steps reorderable by drag and drop, a robot program sheet that only offers what the
   robot accepts, tips, nutrition, and a sync bar (Publish, Update online, Unpublish). Autosave.
4. **Library**: search, filters by state, Sync button, empty state with shortcuts.
5. **Settings**: language, AI keys and models per provider, robot and default servings, system
   prompt, relay, transfer to another device, Monsieur Cuisine account, and sign-out with a warning
   that lists unpublished recipes that would be lost.
6. **Import**: scan the QR code or paste the link, type the passphrase, review the contents, import.
7. **Help**: how it works, relay setup (public relay, own relay three ways, admin notes), session,
   AI keys, device transfer, installing the app, troubleshooting, security. Available in French and
   English.

## 9. Still open

- **Smart and Compact profiles**: the swagger only details settings for the Connect. Finalising them
  needs a short HAR capture per robot, creating a recipe with its automatic programs.
- **Public relay**: deploy it with the relay workflow, then set `PUBLIC_RELAY_URL` and redeploy Pages
  so visitors get it by default.
