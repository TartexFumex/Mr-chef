import type { Recipe } from './recipe'

/** Icône de recette (dessin dans l'appli) et son titre, choisi par l'IA ou par l'utilisateur quand il n'y a pas de photo. */
export interface RecipeIcon {
  id: string
  fr: string
  en: string
  /** Débuts de mots (minuscules, sans accents) qui orientent le choix pour une recette sans icône. */
  words: string[]
}

export const RECIPE_ICONS = [
  { id: 'soup', fr: 'Soupe, potage, velouté', en: 'Soup, broth, velouté', words: ['soupe', 'potage', 'veloute', 'bouillon', 'creme de', 'soup', 'broth', 'chowder', 'minestrone', 'gaspacho', 'gazpacho'] },
  { id: 'stew', fr: 'Plat mijoté, ragoût, curry', en: 'Stew, casserole, curry', words: ['mijot', 'ragout', 'bourguignon', 'blanquette', 'curry', 'tajine', 'chili', 'daube', 'stew', 'casserole', 'goulash'] },
  { id: 'pasta', fr: 'Pâtes', en: 'Pasta', words: ['pate', 'spaghetti', 'tagliatelle', 'penne', 'lasagne', 'macaroni', 'linguine', 'gnocchi', 'ravioli', 'pasta', 'noodle', 'nouille'] },
  { id: 'rice', fr: 'Riz, risotto', en: 'Rice, risotto', words: ['riz', 'risotto', 'paella', 'pilaf', 'biryani', 'rice'] },
  { id: 'wok', fr: 'Plat asiatique, wok, ramen', en: 'Asian dish, stir-fry, ramen', words: ['wok', 'ramen', 'pho', 'pad thai', 'saute', 'asiat', 'stir'] },
  { id: 'meat', fr: 'Viande rouge', en: 'Red meat', words: ['boeuf', 'veau', 'agneau', 'steak', 'cote', 'roti', 'beef', 'lamb', 'veal', 'roast'] },
  { id: 'poultry', fr: 'Volaille', en: 'Poultry', words: ['poulet', 'volaille', 'dinde', 'canard', 'pintade', 'chicken', 'turkey', 'duck'] },
  { id: 'pork', fr: 'Porc, charcuterie', en: 'Pork, charcuterie', words: ['porc', 'lard', 'jambon', 'saucisse', 'chorizo', 'pork', 'bacon', 'ham', 'sausage'] },
  { id: 'fish', fr: 'Poisson', en: 'Fish', words: ['poisson', 'saumon', 'cabillaud', 'thon', 'truite', 'colin', 'merlu', 'fish', 'salmon', 'cod', 'tuna', 'trout'] },
  { id: 'seafood', fr: 'Fruits de mer', en: 'Seafood', words: ['crevette', 'moule', 'saint-jacques', 'crabe', 'homard', 'calamar', 'seafood', 'shrimp', 'prawn', 'mussel', 'scallop'] },
  { id: 'egg', fr: 'Œufs, omelette', en: 'Eggs, omelette', words: ['oeuf', 'omelette', 'brouill', 'egg', 'frittata'] },
  { id: 'quiche', fr: 'Quiche, tarte salée, tourte', en: 'Quiche, savoury tart, pie', words: ['quiche', 'tourte', 'tarte salee', 'feuillete', 'pie'] },
  { id: 'gratin', fr: 'Gratin, fromage', en: 'Gratin, cheese', words: ['gratin', 'fromage', 'fondue', 'raclette', 'tartiflette', 'cheese'] },
  { id: 'pizza', fr: 'Pizza', en: 'Pizza', words: ['pizza', 'calzone', 'focaccia'] },
  { id: 'burger', fr: 'Burger, sandwich', en: 'Burger, sandwich', words: ['burger', 'sandwich', 'croque', 'panini', 'wrap', 'hot dog'] },
  { id: 'salad', fr: 'Salade', en: 'Salad', words: ['salade', 'taboule', 'salad', 'coleslaw', 'bowl'] },
  { id: 'vegetables', fr: 'Légumes', en: 'Vegetables', words: ['legume', 'carotte', 'courgette', 'ratatouille', 'poireau', 'chou', 'brocoli', 'vegetable', 'veggie'] },
  { id: 'potato', fr: 'Pommes de terre', en: 'Potatoes', words: ['pomme de terre', 'patate', 'puree', 'frite', 'potato', 'mash'] },
  { id: 'pumpkin', fr: 'Courge, potiron', en: 'Squash, pumpkin', words: ['courge', 'potiron', 'potimarron', 'butternut', 'citrouille', 'pumpkin', 'squash'] },
  { id: 'mushroom', fr: 'Champignons', en: 'Mushrooms', words: ['champignon', 'cepe', 'girolle', 'mushroom'] },
  { id: 'legumes', fr: 'Légumineuses, lentilles, pois chiches', en: 'Beans, lentils, chickpeas', words: ['lentille', 'pois chiche', 'haricot', 'houmous', 'hummus', 'dhal', 'dal', 'falafel', 'bean', 'lentil', 'chickpea'] },
  { id: 'sauce', fr: 'Sauce, condiment, pesto', en: 'Sauce, dip, pesto', words: ['sauce', 'pesto', 'mayonnaise', 'vinaigrette', 'ketchup', 'chutney', 'tapenade', 'dip', 'condiment'] },
  { id: 'bread', fr: 'Pain', en: 'Bread', words: ['pain', 'baguette', 'brioche', 'bread', 'loaf', 'bun'] },
  { id: 'pancake', fr: 'Crêpes, pancakes, gaufres', en: 'Pancakes, crêpes, waffles', words: ['crepe', 'pancake', 'gaufre', 'waffle', 'blini'] },
  { id: 'cake', fr: 'Gâteau', en: 'Cake', words: ['gateau', 'cake', 'genoise', 'fondant', 'brownie', 'quatre-quarts', 'cheesecake', 'muffin'] },
  { id: 'tart', fr: 'Tarte sucrée', en: 'Sweet tart, pie', words: ['tarte', 'tartelette', 'crumble', 'tart'] },
  { id: 'cookie', fr: 'Biscuits, cookies', en: 'Cookies, biscuits', words: ['biscuit', 'cookie', 'sable', 'macaron', 'madeleine', 'financier'] },
  { id: 'chocolate', fr: 'Chocolat', en: 'Chocolate', words: ['chocolat', 'chocolate', 'cacao', 'cocoa', 'truffe', 'truffle'] },
  { id: 'cream', fr: 'Crème dessert, flan', en: 'Custard, flan, pudding', words: ['creme', 'flan', 'mousse', 'panna cotta', 'riz au lait', 'custard', 'pudding'] },
  { id: 'icecream', fr: 'Glace, sorbet', en: 'Ice cream, sorbet', words: ['glace', 'sorbet', 'granite', 'ice cream', 'sorbet', 'gelato'] },
  { id: 'fruit', fr: 'Fruits, compote, confiture', en: 'Fruit, compote, jam', words: ['fruit', 'fraise', 'pomme', 'poire', 'compote', 'confiture', 'framboise', 'abricot', 'berry', 'apple', 'jam'] },
  { id: 'citrus', fr: 'Agrumes', en: 'Citrus', words: ['citron', 'orange', 'pamplemousse', 'agrume', 'lemon', 'lime', 'citrus'] },
  { id: 'smoothie', fr: 'Smoothie, milkshake', en: 'Smoothie, milkshake', words: ['smoothie', 'milkshake', 'jus', 'juice', 'shake'] },
  { id: 'hotdrink', fr: 'Boisson chaude', en: 'Hot drink', words: ['chocolat chaud', 'cafe', 'the ', 'latte', 'tisane', 'vin chaud', 'coffee', 'tea', 'hot chocolate'] },
  { id: 'cocktail', fr: 'Cocktail, boisson fraîche', en: 'Cocktail, cold drink', words: ['cocktail', 'mojito', 'limonade', 'sangria', 'lemonade', 'punch'] },
  { id: 'baby', fr: 'Repas pour bébé', en: 'Baby food', words: ['bebe', 'baby'] },
  { id: 'aperitif', fr: 'Apéritif, tapas', en: 'Appetiser, tapas', words: ['apero', 'aperitif', 'tapas', 'amuse', 'verrine', 'toast', 'appetizer', 'appetiser', 'starter'] },
  { id: 'breakfast', fr: 'Petit-déjeuner, porridge', en: 'Breakfast, porridge', words: ['porridge', 'granola', 'muesli', 'petit-dejeuner', 'breakfast', 'overnight'] },
  { id: 'plate', fr: 'Plat (autre)', en: 'Dish (other)', words: [] },
] as const satisfies readonly RecipeIcon[]

export type RecipeIconId = (typeof RECIPE_ICONS)[number]['id']
export const DEFAULT_ICON: RecipeIconId = 'plate'

export function isRecipeIcon(id: unknown): id is RecipeIconId {
  return typeof id === 'string' && RECIPE_ICONS.some((i) => i.id === id)
}

export function recipeIcon(id: string | null | undefined): RecipeIcon {
  return RECIPE_ICONS.find((i) => i.id === id) ?? RECIPE_ICONS.find((i) => i.id === DEFAULT_ICON)!
}

const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/œ/g, 'oe').toLowerCase()

/** Devine une icône d'après le titre (recettes importées ou créées avant les icônes). */
export function guessIcon(recipe: Pick<Recipe, 'title'>): RecipeIconId {
  const title = ` ${plain(recipe.title)} `
  let best: { id: RecipeIconId; pos: number } | null = null
  for (const icon of RECIPE_ICONS) {
    for (const w of icon.words) {
      const pos = title.search(new RegExp(`[^a-z]${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`))
      // Le premier mot reconnu dans le titre l'emporte (« Tarte aux pommes » → tarte).
      if (pos >= 0 && (!best || pos < best.pos)) best = { id: icon.id, pos }
    }
  }
  return best?.id ?? DEFAULT_ICON
}

/** Icône à afficher : celle de la recette, sinon devinée d'après le titre. */
export function iconOf(recipe: Pick<Recipe, 'title' | 'icon'>): RecipeIcon {
  return recipeIcon(isRecipeIcon(recipe.icon) ? recipe.icon : guessIcon(recipe))
}

/** Liste « id : titre » donnée à l'IA pour choisir l'icône. */
export function iconChoicesText(): string {
  return RECIPE_ICONS.map((i) => `${i.id}: ${i.en}`).join('; ')
}
