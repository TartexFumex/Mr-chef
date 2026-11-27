/** Formes de données Monsieur Cuisine (Tecpal) issues de swagger.json et du HAR. */

export type McRecipeStatus = 'draft' | 'pending' | 'private-publish' | 'publish' | 'rejected' | 'trash'

export interface McMediaRefInput {
  portraitMediaId: number | null
  landscapeMediaId: number | null
  portraitIsAiGenerated: boolean
  landscapeIsAiGenerated: boolean
}

export interface McDeviceSetting {
  order: number
  time?: number
  temperature?: number
  speed?: number
  clockwise?: boolean
  weight?: number
}

export interface McStepMode {
  type: string
  modules?: unknown
  modeSetting: unknown
  deviceSettings: McDeviceSetting[]
}

export interface McStep {
  id: number | null
  title: string
  description: string
  ingredients: unknown[]
  mode?: McStepMode | null
  order?: number
}

export interface McIngredient {
  id: number | null
  name: string
  amount: string
  unit: string
  systemIngredientId: number | null
  order: number
}

export interface McIngredientGroup {
  id: number | null
  name: string
  isDefault: boolean
  ingredients: McIngredient[]
  order?: number
}

export interface McServingSize {
  id: number | null
  isDefault: boolean
  amount: number
  unit: string
  instruction: string
  preparationTime: number
  readyInTime: number
  ingredientGroups: McIngredientGroup[]
  steps: McStep[]
}

export interface McRecipeWritePayload {
  status: McRecipeStatus
  source: 'member'
  languageLocale: string
  deviceTypeIds: number[]
  title: string
  description: string
  hintsAndTips: string
  thumbnail: McMediaRefInput
  detailsImage: McMediaRefInput
  complexityId: number
  allowSocialSharing: boolean
  categoryIds: number[]
  nutrients: { name: string; unit: string; amount: number }[]
  servingSizes: McServingSize[]
}

export interface McMediaOut {
  id: number
  url: string
  isAiGenerated?: boolean
}

/** Recette telle que renvoyée par GET api/v3/auth/user/recipes/{id}. */
export interface McRecipeRecord {
  id: number
  status: McRecipeStatus
  title: string
  description?: string | null
  hintsAndTips?: string | null
  languageLocale?: string
  complexity?: { id: number; name?: string } | null
  deviceTypes?: { id: number; name?: string; code?: string }[]
  categories?: { id: number; name?: string }[]
  thumbnail?: { landscapeMedia?: McMediaOut | null; portraitMedia?: McMediaOut | null } | null
  detailsImage?: { landscapeMedia?: McMediaOut | null; portraitMedia?: McMediaOut | null } | null
  nutrients?: { name: string; unit?: string; amount: number }[]
  servingSizes?: (Omit<McServingSize, 'steps' | 'ingredientGroups'> & {
    ingredientGroups: (McIngredientGroup & { ingredients: McIngredient[] })[]
    steps: (McStep & { mode: McStepMode | null })[]
  })[]
  preparationTime?: number
  readyInTime?: number
  createdAt?: string
  updatedAt?: string
}

/** Élément de liste (GET api/v3/auth/user/recipes). */
export interface McRecipeSummary {
  id: number
  status: McRecipeStatus
  title: string
  updatedAt?: string
  deviceTypes?: { id: number }[]
  thumbnail?: { landscapeMedia?: McMediaOut | null } | null
}

export interface McRecipeList {
  currentPage: number
  total: number
  totalPage: number
  pageSize: number
  recipes: McRecipeSummary[]
}
