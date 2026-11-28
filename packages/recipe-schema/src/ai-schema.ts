import { z } from 'zod'
import { CATEGORIES, INGREDIENT_UNITS, SERVING_UNITS } from './reference'
import type { RobotProfile } from './robots'

/**
 * Schéma de sortie imposé aux modèles d'IA (Structured Outputs).
 * Écrit pour rester compatible avec le mode strict des trois fournisseurs :
 * toutes les propriétés sont requises, `additionalProperties: false`, les champs
 * facultatifs sont « nullable », et aucune borne numérique (les plages sont
 * appliquées après coup par `aiToRecipe`).
 */
export function buildAiJsonSchema(robot: RobotProfile): Record<string, unknown> {
  const nullableInt = { type: ['integer', 'null'] }
  const program = {
    type: 'object',
    additionalProperties: false,
    required: ['type', 'timeSeconds', 'temperature', 'speed', 'reverse', 'weightGrams'],
    properties: {
      type: { type: 'string', enum: robot.modes.map((m) => m.type) },
      timeSeconds: nullableInt,
      temperature: nullableInt,
      speed: { type: ['number', 'null'] },
      reverse: { type: ['boolean', 'null'] },
      weightGrams: nullableInt,
    },
  }
  return {
    type: 'object',
    additionalProperties: false,
    required: [
      'title', 'description', 'hintsAndTips', 'complexity', 'categories', 'servings',
      'preparationMinutes', 'totalMinutes', 'nutritionPerServing', 'ingredientGroups', 'steps',
    ],
    properties: {
      title: { type: 'string' },
      description: { type: 'string' },
      hintsAndTips: { type: 'string' },
      complexity: { type: 'string', enum: ['facile', 'moyen', 'difficile'] },
      categories: { type: 'array', items: { type: 'string', enum: CATEGORIES.map((c) => c.label) } },
      servings: {
        type: 'object',
        additionalProperties: false,
        required: ['amount', 'unit'],
        properties: {
          amount: { type: 'integer' },
          unit: { type: 'string', enum: [...SERVING_UNITS] },
        },
      },
      preparationMinutes: { type: 'integer' },
      totalMinutes: { type: 'integer' },
      nutritionPerServing: {
        type: 'object',
        additionalProperties: false,
        required: ['calories', 'carbohydrate', 'fat', 'protein'],
        properties: {
          calories: { type: 'number' },
          carbohydrate: { type: 'number' },
          fat: { type: 'number' },
          protein: { type: 'number' },
        },
      },
      ingredientGroups: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['name', 'ingredients'],
          properties: {
            name: { type: 'string' },
            ingredients: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['name', 'amount', 'unit'],
                properties: {
                  name: { type: 'string' },
                  amount: { type: 'string' },
                  unit: { type: 'string', enum: [...INGREDIENT_UNITS] },
                },
              },
            },
          },
        },
      },
      steps: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'description', 'program'],
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            program: { anyOf: [{ type: 'null' }, program] },
          },
        },
      },
    },
  }
}

/** Validation tolérante de la réponse IA (les plages sont corrigées ensuite). */
export const AiRecipeSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(''),
  hintsAndTips: z.string().default(''),
  complexity: z.enum(['facile', 'moyen', 'difficile']).catch('facile'),
  categories: z.array(z.string()).default([]),
  servings: z.object({ amount: z.number(), unit: z.string() }),
  preparationMinutes: z.number().catch(15),
  totalMinutes: z.number().catch(30),
  nutritionPerServing: z
    .object({ calories: z.number(), carbohydrate: z.number(), fat: z.number(), protein: z.number() })
    .catch({ calories: 0, carbohydrate: 0, fat: 0, protein: 0 }),
  ingredientGroups: z.array(
    z.object({
      name: z.string(),
      ingredients: z.array(z.object({ name: z.string(), amount: z.union([z.string(), z.number()]), unit: z.string() })),
    }),
  ),
  steps: z.array(
    z.object({
      title: z.string(),
      description: z.string().default(''),
      program: z
        .object({
          type: z.string(),
          timeSeconds: z.number().nullable().optional(),
          temperature: z.number().nullable().optional(),
          speed: z.number().nullable().optional(),
          reverse: z.boolean().nullable().optional(),
          weightGrams: z.number().nullable().optional(),
        })
        .nullable()
        .optional(),
    }),
  ),
})
export type AiRecipe = z.infer<typeof AiRecipeSchema>
