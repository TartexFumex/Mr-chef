import { expect, test, type Page } from '@playwright/test'

const AI_RECIPE = {
  title: 'Velouté de potiron au lait de coco',
  description: 'Un velouté doux et réconfortant.',
  hintsAndTips: 'Servez avec des graines de courge grillées.',
  complexity: 'facile',
  categories: ['Soupes & potées', 'Végétarien'],
  servings: { amount: 4, unit: 'portions' },
  preparationMinutes: 10,
  totalMinutes: 35,
  nutritionPerServing: { calories: 210, carbohydrate: 18, fat: 12, protein: 4 },
  ingredientGroups: [
    {
      name: 'Ingrédients',
      ingredients: [
        { name: 'Potiron en morceaux', amount: '800', unit: 'g' },
        { name: 'Lait de coco', amount: '200', unit: 'ml' },
        { name: 'Sel', amount: '1', unit: 'pincée' },
      ],
    },
  ],
  steps: [
    { title: 'Mixer', description: 'Mettre le potiron dans le bol.', program: { type: 'turbo', timeSeconds: 5, temperature: null, speed: null, reverse: null, weightGrams: null } },
    // Vitesse 5 en chauffe : Mr Chef doit la ramener à 3.
    { title: 'Cuire', description: 'Ajouter le lait de coco et cuire.', program: { type: 'customized', timeSeconds: 1500, temperature: 100, speed: 5, reverse: false, weightGrams: null } },
  ],
}

async function mockMistral(page: Page) {
  await page.route('https://api.mistral.ai/v1/models', (r) =>
    r.fulfill({ json: { data: [{ id: 'mistral-large-latest' }, { id: 'mistral-small-latest' }] } }),
  )
  await page.route('https://api.mistral.ai/v1/chat/completions', (r) =>
    r.fulfill({ json: { choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(AI_RECIPE) } }] } }),
  )
}

test('premier lancement, génération, édition et bibliothèque', async ({ page, context }) => {
  await mockMistral(page)
  await page.goto('./')

  await expect(page.getByRole('heading', { name: 'Bienvenue dans Mr Chef' })).toBeVisible()
  await page.getByRole('button', { name: /Passer : je publierai plus tard/ }).click()
  await page.getByRole('button', { name: /Passer : recettes en local seulement/ }).click()
  await page.getByText('Monsieur Cuisine Smart', { exact: true }).click()
  await page.getByRole('button', { name: 'Continuer' }).click()

  await page.getByLabel(/Clé API Mistral/).fill('test-key-123456')
  await page.getByRole('button', { name: 'Vérifier et enregistrer' }).click()
  await expect(page.getByText('••••3456')).toBeVisible()
  await page.getByRole('button', { name: 'Commencer à cuisiner' }).click()

  await expect(page.getByRole('heading', { name: 'Mr Chef' })).toBeVisible()
  await page.getByPlaceholder(/Décrivez vos envies/).fill('Un velouté de potiron pour ce soir')
  await page.getByRole('button', { name: 'Générer la recette' }).click()

  await expect(page.getByLabel('Titre', { exact: true })).toHaveValue(AI_RECIPE.title)
  await expect(page.locator('.topbar .badge')).toHaveText('Locale')
  await expect(page.getByText(/ajustement/)).toBeVisible()
  await expect(page.getByRole('button', { name: /Cuisson personnalisée · 25 min · 100 °C · vit\. 3/ })).toBeVisible()

  // Modifier le programme d'une étape via la feuille de réglage.
  await page.getByRole('button', { name: /Turbo · 5 s/ }).click()
  await page.getByRole('dialog').getByLabel('Secondes').fill('8')
  await page.getByRole('dialog').getByRole('button', { name: 'Valider' }).click()
  await expect(page.getByRole('button', { name: /Turbo · 8 s/ })).toBeVisible()

  await page.getByRole('link', { name: 'Retour' }).click()
  await expect(page.getByRole('heading', { name: AI_RECIPE.title })).toBeVisible()

  await context.setOffline(true)
  await expect(page.getByText(/Hors ligne\./)).toBeVisible()
  await context.setOffline(false)
})

test('la déconnexion prévient des recettes non publiées puis efface tout', async ({ page }) => {
  await mockMistral(page)
  await page.goto('./#/onboarding')
  await page.getByRole('button', { name: /Passer : je publierai plus tard/ }).click()
  await page.getByRole('button', { name: /Passer : recettes en local seulement/ }).click()
  await page.getByRole('button', { name: 'Continuer' }).click()
  await page.getByLabel(/Clé API Mistral/).fill('test-key-123456')
  await page.getByRole('button', { name: 'Vérifier et enregistrer' }).click()
  await page.getByRole('button', { name: 'Commencer à cuisiner' }).click()

  await page.getByRole('link', { name: 'Mes recettes' }).click()
  await page.getByRole('button', { name: 'Nouvelle recette vierge' }).click()
  await expect(page.getByLabel('Titre', { exact: true })).toHaveValue('Nouvelle recette')

  await page.goto('./#/parametres')
  await page.getByRole('button', { name: 'Se déconnecter' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText(/1 recette non publiée/)).toBeVisible()
  await expect(dialog.getByText('Nouvelle recette')).toBeVisible()
  await dialog.getByRole('button', { name: 'Tout effacer' }).click()
  await expect(page.getByRole('heading', { name: 'Bienvenue dans Mr Chef' })).toBeVisible()
})

test('transfert de configuration par QR code chiffré vers un nouvel appareil', async ({ page, browser }) => {
  await mockMistral(page)
  await page.goto('./#/onboarding')
  await page.getByRole('button', { name: /Passer : je publierai plus tard/ }).click()
  await page.getByRole('button', { name: /Passer : recettes en local seulement/ }).click()
  await page.getByText('Monsieur Cuisine Compact', { exact: true }).click()
  await page.getByRole('button', { name: 'Continuer' }).click()
  await page.getByLabel(/Clé API Mistral/).fill('test-key-123456')
  await page.getByRole('button', { name: 'Vérifier et enregistrer' }).click()
  await page.getByRole('button', { name: 'Commencer à cuisiner' }).click()
  await expect(page.getByRole('heading', { name: 'Mr Chef' })).toBeVisible()

  await page.getByRole('link', { name: 'Paramètres' }).click()
  await page.getByRole('button', { name: 'Générer le QR code' }).click()
  await expect(page.getByRole('img', { name: 'QR code de configuration' })).toBeVisible()
  const passphrase = (await page.locator('.passphrase').textContent())!.trim()
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.getByRole('button', { name: 'Copier le lien' }).click()
  const link = await page.evaluate(() => navigator.clipboard.readText())
  expect(link).toContain('#/importer?c=')
  expect(link).not.toContain('test-key')

  // Nouvel appareil : stockage vierge.
  const other = await browser.newContext({ serviceWorkers: 'block', locale: 'fr-FR' })
  const phone = await other.newPage()
  await phone.goto(link)
  await phone.getByLabel('Phrase secrète').fill('MAUV-AISE-PHRA-SE22')
  await phone.getByRole('button', { name: 'Déchiffrer' }).click()
  await expect(phone.getByText('Phrase secrète incorrecte.')).toBeVisible()
  await phone.getByLabel('Phrase secrète').fill(passphrase.toLowerCase())
  await phone.getByRole('button', { name: 'Déchiffrer' }).click()
  await expect(phone.getByText(/Clés IA : mistral/)).toBeVisible()
  await phone.getByRole('button', { name: 'Importer' }).click()
  await expect(phone.getByRole('heading', { name: 'Mr Chef' })).toBeVisible()
  await phone.goto(link.replace(/#.*/, '#/parametres'))
  await expect(phone.getByLabel('Monsieur Cuisine Compact')).toBeChecked()
  await other.close()
})

test('la page Aide affiche l’origine à autoriser pour le relais', async ({ page }) => {
  await page.goto('./#/aide')
  await expect(page.getByRole('heading', { name: 'Installer le relais' })).toBeVisible()
  const origin = new URL(page.url()).origin
  await expect(page.getByText(origin, { exact: true }).first()).toBeVisible()
})
