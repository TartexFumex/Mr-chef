# Mettre en place le relais Cloudflare de Mr Chef

> Ce guide est aussi intégré à l'application : page **Aide** (`#/aide`), qui affiche directement
> l'origine à autoriser pour votre installation.

Le site Monsieur Cuisine n'accepte les requêtes que depuis son propre domaine (CORS) et
authentifie tout par un cookie WordPress `HttpOnly`. Un navigateur ne peut donc pas parler
directement à Monsieur Cuisine depuis Mr Chef. Le **relais** est un petit Cloudflare Worker
personnel, sans état, qui reçoit vos demandes, y ajoute votre cookie de session et les
transmet à `www.monsieur-cuisine.com/proxy-api`. Il ne stocke rien et n'accepte que les
opérations utilisées par Mr Chef (liste blanche dans `packages/mc-client/src/endpoints.ts`).

Le plan gratuit de Cloudflare suffit largement (100 000 requêtes par jour).

## Ce qu'il vous faut

- un compte Cloudflare gratuit ;
- l'adresse publique de Mr Chef, par exemple `https://<compte>.github.io` (GitHub Pages) ;
- un secret partagé : dans Mr Chef, **Paramètres › Relais › Générer un secret** en crée un et le copie.

## Option A : déploiement depuis GitHub Actions (recommandé)

1. Dans Cloudflare, **My Profile › API Tokens › Create Token**, modèle *Edit Cloudflare Workers*.
   Notez aussi votre **Account ID** (page d'accueil Workers & Pages, colonne de droite).
2. Dans le dépôt GitHub, **Settings › Secrets and variables › Actions** :
   - secrets : `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `RELAY_SHARED_SECRET` ;
   - variable : `RELAY_ALLOWED_ORIGIN` = `https://<compte>.github.io` (sans chemin ni `/` final ;
     plusieurs origines possibles, séparées par des virgules, ex. `https://<compte>.github.io,http://localhost:5173`).
3. Onglet **Actions › Déployer le relais › Run workflow**. Ensuite, chaque push qui modifie
   `apps/relay/` ou `packages/mc-client/` sur la branche principale redéploie le relais
   (seulement si `RELAY_ALLOWED_ORIGIN` est défini).
4. L'adresse du Worker s'affiche à la fin du journal, de la forme
   `https://mr-chef-relay.<sous-domaine>.workers.dev`.

## Option B : déploiement depuis votre ordinateur

```bash
npm install
cd apps/relay
npx wrangler login
npx wrangler secret put RELAY_SHARED_SECRET     # collez le secret généré dans Mr Chef
npx wrangler deploy --var ALLOWED_ORIGIN:https://<compte>.github.io
```

## Vérifier

- Ouvrez `https://mr-chef-relay.<sous-domaine>.workers.dev/health` : la réponse doit être `{"ok":true,…}`.
- Dans Mr Chef, **Paramètres › Relais** : collez l'adresse et le secret, puis **Tester le relais**.
- Pour configurer un téléphone : **Paramètres › Transférer vers un autre appareil** génère un QR code
  chiffré (AES-256, clé dérivée d'une phrase secrète affichée à part) avec les clés IA, le relais
  et la session.

## Développement local

```bash
cp apps/relay/.dev.vars.example apps/relay/.dev.vars   # puis changez le secret
npm run relay:dev                                         # http://localhost:8787
npm run dev                                            # http://localhost:5173
```

`wrangler.toml` autorise `http://localhost:5173` par défaut.

## Erreurs fréquentes

| Message dans Mr Chef | Cause | Solution |
| --- | --- | --- |
| Origine refusée par le relais | `RELAY_ALLOWED_ORIGIN` ne correspond pas à l'adresse de Mr Chef | Corrigez la variable et redéployez |
| Secret incorrect | Secret différent entre le Worker et Mr Chef | Recollez le même secret des deux côtés |
| Session Monsieur Cuisine expirée | Le cookie WordPress a expiré ou vous vous êtes déconnecté du site | Reconnectez-vous sur monsieur-cuisine.com et recollez la session |
| Workflow « Déployer le relais » introuvable | Le fichier n'est pas sur la branche principale, ou GitHub ne l'a pas encore indexé | Vérifiez `.github/workflows/deploy-relay.yml` sur la branche principale ; un push qui le modifie le fait apparaître |
| Relais injoignable | Adresse erronée ou pas de réseau | Vérifiez l'adresse `…workers.dev` |

## Sécurité

- Le cookie de session reste chiffré (AES-GCM, clé WebCrypto non exportable) sur votre appareil ;
  il transite vers le relais en HTTPS à chaque appel et n'est jamais enregistré par le Worker.
- Les journaux du Worker sont désactivés (`observability.enabled = false`).
- La déconnexion dans Mr Chef appelle aussi la déconnexion Monsieur Cuisine.
