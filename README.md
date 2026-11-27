# Mr Chef

Application web installable (PWA), locale d'abord, qui génère des recettes avec l'IA de votre choix
(Mistral, OpenAI ou Claude), vous laisse les retoucher dans un éditeur visuel, puis les publie sur
votre compte Monsieur Cuisine pour les retrouver sur votre robot (Smart, Compact, Connect, 4.0, Édition Plus).

## Fonctionnement

- **Local d'abord** : recettes, photos et réglages vivent dans IndexedDB ; l'app fonctionne hors ligne
  et met en file les publications jusqu'au retour du réseau.
- **IA** : appel direct au fournisseur depuis le navigateur avec votre clé (chiffrée sur l'appareil),
  sortie structurée par JSON Schema, puis ajustement automatique aux programmes du robot choisi.
- **Monsieur Cuisine** : passage par votre relais Cloudflare personnel (voir
  [docs/relais-cloudflare.md](docs/relais-cloudflare.md)) avec la session collée depuis le site.
- **États de synchronisation** : *Locale*, *Publiée*, *Désynchronisée*, dérivés d'une empreinte SHA-256
  de la recette.
- **Français et anglais** : langue du navigateur par défaut, modifiable dans les Paramètres
  (textes dans `apps/web/src/i18n`). En anglais, le prompt par défaut demande des recettes en anglais.
- **Installation** : sur téléphone, Mr Chef propose de s'installer sur l'écran d'accueil (bouton sur Android,
  marche à suivre sur iPhone) ; l'invitation écartée ne revient pas avant 90 jours.

## Structure

```
apps/web               PWA React 19 + Vite (interface, base Dexie, coffre, IA, synchro)
apps/relay             Cloudflare Worker sans état vers monsieur-cuisine.com
packages/recipe-schema Schéma Zod, profils robots, schéma IA, mapping Monsieur Cuisine
packages/mc-client     Client Monsieur Cuisine (via le relais) et import de session
```

## Démarrer

Prérequis : Node 22.12 ou plus et npm 10 ou plus (workspaces npm). Les scripts d'installation
autorisés (esbuild, workerd, sharp) sont déclarés dans `allowScripts` du `package.json` racine,
ce qui évite l'avertissement de npm 12.

```bash
npm install
npm run dev         # http://localhost:5173
npm run relay:dev   # relais local sur http://localhost:8787 (voir docs)
```

## Vérifications

```bash
npm run lint
npm run typecheck
npm test                                        # tests unitaires (Vitest)
npx -w @mr-chef/web playwright install chromium # une fois
npm run test:e2e                                # tests de bout en bout (Playwright)
npm run build
```

## Déploiement

- **Application** : le workflow *Déployer sur GitHub Pages* publie `apps/web/dist` sur GitHub Pages à chaque push
  sur la branche principale (activez Pages › Source : GitHub Actions).
- **Relais** : workflow manuel *Déployer le relais* (voir la doc).

## Notes

- Les durées de recette sont en minutes, celles des programmes robot en secondes, comme sur Monsieur Cuisine.
- Les plages des programmes viennent du swagger du Connect ; pour Smart et Compact elles sont reprises
  du Connect en attendant une capture réseau de ces modèles (signalé dans l'interface).
- Une session Monsieur Cuisine dure le temps du cookie WordPress (date lue dans le cookie et affichée dans les Paramètres) ; Mr Chef prévient
  quand il faut la recoller.
