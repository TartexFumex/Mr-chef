# Setting up the Mr Chef Cloudflare relay

> This guide is also built into the app: the **Help** page (`#/aide`) shows the exact origin
> to allow for your installation.

The Monsieur Cuisine website only accepts requests from its own domain (CORS) and authenticates
everything with an `HttpOnly` WordPress cookie. A browser therefore cannot talk to Monsieur Cuisine
directly from Mr Chef. The **relay** is a small stateless Cloudflare Worker that receives your
requests, adds your session cookie and forwards them to `www.monsieur-cuisine.com/proxy-api`. It
stores nothing and only accepts the operations Mr Chef uses (allow list in
`packages/mc-client/src/endpoints.ts`).

Cloudflare's free plan is more than enough (100,000 requests per day).

## Public or private relay

- **Public** (default): open to every visitor of your Mr Chef site, with no secret. Every Monsieur
  Cuisine call is still authenticated by the user's own cookie; the relay grants no extra rights.
  Protections: strict origin (`RELAY_ALLOWED_ORIGIN`), operation allow list, a limit of 120 requests
  per minute per IP address (the `ratelimits` binding in `wrangler.toml`), no logs.
  Your visitors' sessions go through your Cloudflare account: they have to trust you.
  To offer it by default in the app, set the GitHub variable `PUBLIC_RELAY_URL`, then run
  **Déployer sur GitHub Pages** again.
- **Private**: GitHub variable `RELAY_MODE` = `private` and secret `RELAY_SHARED_SECRET`. Only people
  who know the secret can use it (Settings › Relay › My own relay).

## Using your own relay with the published app

No rebuild is needed: the relay address is set in the app
(**Settings › Relay › My own relay**). The relay only has to allow the origin of the site in use,
for example `https://tartexfumex.github.io`.

The simplest way is the Cloudflare dashboard: download the ready-made script from the Help page
(`<site>/relais/index.js`, produced by `npm run build`), create a "Hello World" Worker, paste the
script, then set `ALLOWED_ORIGIN` and `RELAY_PUBLIC` (and `RELAY_SHARED_SECRET` for a private relay)
in **Settings › Variables and Secrets**.

## Option A: deploy from GitHub Actions (recommended)

1. In Cloudflare, **My Profile › API Tokens › Create Token**, *Edit Cloudflare Workers* template.
   Also note your **Account ID** (Workers & Pages home page, right column).
2. In the GitHub repository, **Settings › Secrets and variables › Actions**:
   - secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` (and `RELAY_SHARED_SECRET` in private mode);
   - variable: `RELAY_ALLOWED_ORIGIN` = `https://<account>.github.io` (no path or trailing `/`;
     several origins can be given, separated by commas, e.g. `https://<account>.github.io,http://localhost:5173`).
3. **Actions › Déployer le relais › Run workflow**. After that, every push that changes
   `apps/relay/` or `packages/mc-client/` on the main branch redeploys the relay
   (only if `RELAY_ALLOWED_ORIGIN` is set).
4. The Worker address is printed at the end of the log, in the form
   `https://mr-chef-relay.<subdomain>.workers.dev`.

## Option B: deploy from your computer

```bash
npm install
cd apps/relay
npx wrangler login
npx wrangler deploy --var ALLOWED_ORIGIN:https://<account>.github.io --var RELAY_PUBLIC:true
# private relay: npx wrangler secret put RELAY_SHARED_SECRET, then --var RELAY_PUBLIC:false
```

## Checking it works

- Open `https://mr-chef-relay.<subdomain>.workers.dev/health`: the answer must be `{"ok":true,…}`.
- In Mr Chef, **Settings › Relay**: paste the address (and the secret for a private relay), then
  **Test the relay**.
- To set up a phone: **Settings › Transfer to another device** creates an encrypted QR code
  (AES-256, key derived from a passphrase shown separately) with the AI keys, the relay and the session.

## Local development

```bash
cp apps/relay/.dev.vars.example apps/relay/.dev.vars   # then change the secret
npm run relay:dev                                      # http://localhost:8787
npm run dev                                            # http://localhost:5173
```

`wrangler.toml` allows `http://localhost:5173` by default.

## Common errors

| Message in Mr Chef | Cause | Fix |
| --- | --- | --- |
| Origin refused by the relay | `RELAY_ALLOWED_ORIGIN` does not match the Mr Chef address | Fix the variable and redeploy |
| Wrong secret | Private relay and a different secret in Mr Chef | Paste the same secret again, or make the relay public |
| Too many requests to the relay | The 120 requests per minute limit was reached | Wait a minute |
| Monsieur Cuisine session expired | The WordPress cookie expired or you signed out of the website | Sign in again on monsieur-cuisine.com and paste the session again |
| "Déployer le relais" workflow not found | The file is not on the main branch, or GitHub has not indexed it yet | Check `.github/workflows/deploy-relay.yml` on the main branch; a push that changes it makes it appear |
| Relay unreachable | Wrong address or no network | Check the `…workers.dev` address |

## Security

- The session cookie stays encrypted on your device (AES-GCM, non-extractable WebCrypto key);
  it travels to the relay over HTTPS on each call and is never stored by the Worker.
- Worker logs are disabled (`observability.enabled = false`).
- Signing out in Mr Chef also signs out of Monsieur Cuisine.
