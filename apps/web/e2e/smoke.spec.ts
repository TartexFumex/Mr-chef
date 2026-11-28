import { expect, test, type Page } from '@playwright/test'

const AI_RECIPE = {
  title: 'Velouté de potiron au lait de coco',
  icon: 'pumpkin',
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
  // Le champ Portions peut être vidé pendant la saisie, puis il est recalé en quittant le champ.
  const portions = page.getByRole('spinbutton', { name: 'Portions' })
  await portions.click()
  await portions.press('End')
  await portions.press('Backspace')
  await expect(portions).toHaveValue('')
  await portions.pressSequentially('2')
  await expect(portions).toHaveValue('2')
  await portions.fill('')
  await portions.blur()
  await expect(portions).toHaveValue('1')
  await portions.fill('4')

  await page.getByPlaceholder(/Décrivez votre envie/).fill('Un velouté de potiron pour ce soir')
  await page.getByRole('button', { name: 'Générer la recette' }).click()

  await expect(page.getByLabel('Titre', { exact: true })).toHaveValue(AI_RECIPE.title)
  // Icône choisie par l'IA, puis changée depuis la grille.
  await expect(page.getByRole('img', { name: 'Courge, potiron' })).toBeVisible()
  await page.getByRole('button', { name: 'Icône', exact: true }).click()
  await page.getByRole('dialog').getByRole('option', { name: 'Soupe, potage, velouté' }).click()
  await expect(page.getByRole('img', { name: 'Soupe, potage, velouté' })).toBeVisible()
  await expect(page.locator('.topbar .badge')).toHaveText('Locale')
  await expect(page.getByText(/ajustement/)).toBeVisible()
  await expect(page.getByRole('button', { name: /Cuisson personnalisée · 25 min · 100 °C · vit\. 3/ })).toBeVisible()

  // Modifier le programme d'une étape via la feuille de réglage.
  await page.getByRole('button', { name: /Turbo · 5 s/ }).click()
  await page.getByRole('dialog').getByLabel('Secondes').fill('8')
  await page.getByRole('dialog').getByRole('button', { name: 'Valider' }).click()
  await expect(page.getByRole('button', { name: /Turbo · 8 s/ })).toBeVisible()

  // Retour en lecture seule : plus aucun champ modifiable.
  await page.getByRole('link', { name: 'Terminé' }).click()
  await expect(page.getByRole('heading', { level: 2, name: AI_RECIPE.title })).toBeVisible()
  await expect(page.getByLabel('Titre', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Turbo · 8 s')).toBeVisible()

  // Mots-clés en bas de l'éditeur, puis recherche par mot-clé.
  await page.getByRole('link', { name: 'Modifier' }).click()
  const tags = page.getByLabel(/Mots-clés/)
  await tags.fill('soupe, hiver')
  await page.getByRole('link', { name: 'Terminé' }).click()
  await expect(page.getByRole('button', { name: 'hiver' })).toBeVisible()

  // Deuxième recette : la complétion propose les mots-clés existants.
  await page.goto('./#/recettes')
  await page.getByRole('button', { name: 'Nouvelle recette vierge' }).click()
  await page.getByLabel(/Mots-clés/).fill('hi')
  await page.getByRole('group', { name: 'Suggestions' }).getByRole('button', { name: '+ hiver' }).click()
  await expect(page.getByLabel(/Mots-clés/)).toHaveValue('hiver, ')
  await page.getByRole('link', { name: 'Terminé' }).click()

  await page.goto('./#/recettes')
  const search = page.getByRole('searchbox')
  await search.fill('potiron')
  await expect(page.getByRole('link', { name: new RegExp(AI_RECIPE.title) })).toBeVisible()
  await expect(page.getByRole('link', { name: /Nouvelle recette/ })).toHaveCount(0)
  await page.getByRole('group', { name: 'Rechercher par' }).getByRole('button', { name: 'Mot-clé' }).click()
  await search.fill('soupe')
  await expect(page.getByRole('link', { name: new RegExp(AI_RECIPE.title) })).toBeVisible()
  await expect(page.getByRole('link', { name: /Nouvelle recette/ })).toHaveCount(0)
  await search.fill('hiver')
  await expect(page.getByRole('link', { name: /Nouvelle recette/ })).toBeVisible()
  await expect(page.getByRole('link', { name: new RegExp(AI_RECIPE.title) })).toBeVisible()

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
  // Saisie en minuscules et sans tirets : Mr Chef les ajoute au fil de la frappe.
  const field = phone.getByLabel('Phrase secrète')
  await field.fill('')
  await field.pressSequentially(passphrase.replaceAll('-', '').toLowerCase())
  await expect(field).toHaveValue(passphrase)
  await phone.getByRole('button', { name: 'Déchiffrer' }).click()
  await expect(phone.getByText(/Clés IA : mistral/)).toBeVisible()
  await phone.getByRole('button', { name: 'Importer' }).click()
  await expect(phone.getByRole('heading', { name: 'Mr Chef' })).toBeVisible()
  await phone.goto(link.replace(/#.*/, '#/parametres'))
  await expect(phone.getByLabel('Monsieur Cuisine Compact')).toBeChecked()
  await other.close()
})

test('retouche par IA : petit carré d’attente, puis choix entre ancienne et nouvelle version', async ({ page }) => {
  await mockMistral(page)
  await page.goto('./#/onboarding')
  await page.getByRole('button', { name: /Passer : je publierai plus tard/ }).click()
  await page.getByRole('button', { name: /Passer : recettes en local seulement/ }).click()
  await page.getByRole('button', { name: 'Continuer' }).click()
  await page.getByLabel(/Clé API Mistral/).fill('test-key-123456')
  await page.getByRole('button', { name: 'Vérifier et enregistrer' }).click()
  await page.getByRole('button', { name: 'Commencer à cuisiner' }).click()
  await page.getByPlaceholder(/Décrivez votre envie/).fill('Un velouté de potiron')
  await page.getByRole('button', { name: 'Générer la recette' }).click()
  await page.getByRole('link', { name: 'Terminé' }).click()
  await expect(page.getByRole('heading', { level: 2, name: AI_RECIPE.title })).toBeVisible()

  // La révision reçoit la recette actuelle et la demande ; la réponse est retenue pour voir l'attente.
  const revised = { ...AI_RECIPE, title: 'Velouté de potiron épicé' }
  let release!: () => void
  const held = new Promise<void>((r) => (release = r))
  let sent = ''
  await page.unroute('https://api.mistral.ai/v1/chat/completions')
  await page.route('https://api.mistral.ai/v1/chat/completions', async (r) => {
    sent = r.request().postData() ?? ''
    await held
    await r.fulfill({ json: { choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(revised) } }] } })
  })

  await page.getByRole('button', { name: 'Retoucher avec l’IA' }).click()
  await page.getByLabel(/Que voulez-vous changer/).fill('Plus épicé')
  await page.getByRole('button', { name: 'Régénérer' }).click()
  await expect(page.locator('.revise-pending .typing')).toBeVisible()
  // La recette actuelle reste affichée pendant la génération.
  await expect(page.getByRole('heading', { level: 2, name: AI_RECIPE.title })).toBeVisible()
  await expect.poll(() => sent).toContain('Plus épicé')
  expect(sent).toContain(AI_RECIPE.title)
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/pending-${test.info().project.name}.png` })
  release()

  await expect(page.getByText('Nouvelle version proposée')).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: revised.title })).toBeVisible()
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/choice-${test.info().project.name}.png` })
  await page.getByRole('button', { name: 'Voir l’actuelle' }).click()
  await expect(page.getByRole('heading', { level: 2, name: AI_RECIPE.title })).toBeVisible()
  await page.getByRole('button', { name: 'Garder l’ancienne' }).click()
  await expect(page.getByText('Nouvelle version proposée')).toHaveCount(0)
  await expect(page.getByRole('heading', { level: 2, name: AI_RECIPE.title })).toBeVisible()

  // Deuxième essai, cette fois on remplace.
  await page.getByRole('button', { name: 'Retoucher avec l’IA' }).click()
  await page.getByRole('button', { name: 'Régénérer' }).click()
  await page.getByRole('button', { name: 'Remplacer par la nouvelle' }).click()
  await expect(page.getByText('Recette mise à jour.')).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { level: 2, name: revised.title })).toBeVisible()
})

test('la page Aide affiche l’origine à autoriser pour le relais', async ({ page }) => {
  await page.goto('./#/aide')
  await expect(page.getByRole('heading', { name: 'Installer le relais' })).toBeVisible()
  const origin = new URL(page.url()).origin
  await expect(page.getByText(origin, { exact: true }).first()).toBeVisible()
})

test.describe('navigateur en anglais', () => {
  test.use({ locale: 'en-US' })

  test('version anglaise par défaut, avec choix de la langue', async ({ page }) => {
    await page.goto('./')
    await expect(page.getByRole('heading', { name: 'Welcome to Mr Chef' })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await page.getByRole('combobox', { name: 'Language' }).selectOption('fr')
    await expect(page.getByRole('heading', { name: 'Bienvenue dans Mr Chef' })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
    await page.getByRole('combobox', { name: 'Langue' }).selectOption('en')
    await page.goto('./#/aide')
    await expect(page.getByRole('heading', { name: 'Set up the relay' })).toBeVisible()
  })
})

test('changer de robot après la génération adapte les programmes', async ({ page }) => {
  await mockMistral(page)
  await page.goto('./#/onboarding')
  await page.getByRole('button', { name: /Passer : je publierai plus tard/ }).click()
  await page.getByRole('button', { name: /Passer : recettes en local seulement/ }).click()
  await page.getByText('Monsieur Cuisine Compact', { exact: true }).click()
  await page.getByRole('button', { name: 'Continuer' }).click()
  await page.getByLabel(/Clé API Mistral/).fill('test-key-123456')
  await page.getByRole('button', { name: 'Vérifier et enregistrer' }).click()
  await page.getByRole('button', { name: 'Commencer à cuisiner' }).click()

  await page.getByPlaceholder(/Décrivez votre envie/).fill('Un velouté')
  await page.getByRole('button', { name: 'Générer la recette' }).click()
  const robot = page.locator('label.field', { has: page.getByText('Robot', { exact: true }) }).locator('select')
  await expect(robot).toHaveValue('compact')
  // Turbo sans durée sur le Compact.
  await expect(page.getByRole('button', { name: /^Turbo$/ })).toBeVisible()

  await robot.selectOption('smart')
  await expect(robot).toHaveValue('smart')
  await expect(page.getByText(/Recette adaptée au Monsieur Cuisine Smart/)).toBeVisible()
  await expect(page.getByRole('button', { name: /Turbo · 1 s/ })).toBeVisible()

  // Le choix survit au rechargement.
  await page.reload()
  await expect(robot).toHaveValue('smart')
})
