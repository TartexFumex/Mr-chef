/**
 * Profils des robots Monsieur Cuisine.
 *
 * Programmes et plages repris de la configuration embarquée par le site
 * www.monsieur-cuisine.com (bundle Vue `chunk-common.1.140.2.js`, objets `guide.deviceModes`
 * choisis par code d'appareil MC0.5 / MC1.1 / MC2.0 / MC3.0 / MC4.0). L'API ne fournit
 * aucun point d'accès qui décrive ces capacités.
 *
 * Programmes volontairement absents : ceux réservés aux administrateurs du site
 * (`ramp`, `kneading` sur le Smart), ceux dont les réglages ne tiennent pas dans
 * temps / température / vitesse / sens / poids (`cookingEggs`, `precleaning`, balance
 * par ingrédient du MC4) et ceux du MC4 liés à un accessoire (friteuse, grill,
 * presse-agrumes, robot multifonction), que le site enregistre par module.
 */

export type ModeType =
  | 'customized'
  | 'kneading'
  | 'kneadingSolidDough'
  | 'kneadingSoftDough'
  | 'kneadingLiquidDough'
  | 'kneadingProveDough'
  | 'steaming'
  | 'roasting'
  | 'roastingGentle'
  | 'roastingIntense'
  | 'scale'
  | 'turbo'
  | 'sousVide'
  | 'slowCooking'
  | 'fermentation'
  | 'riceCooking'
  | 'foodProcessor'
  | 'puree'
  | 'smoothie'
  | 'heatWater'
  | 'heatingUp'
  | 'openCooking'

export interface Range {
  min: number
  max: number
  /** Pas entre deux valeurs (1 par défaut). */
  step?: number
  /** Liste fermée des valeurs autorisées ; prioritaire sur min / max / step. */
  values?: number[]
}

export interface SpeedLimits {
  /** Vitesse maximale quand la température est supérieure à 0. */
  heating?: number
  /** Vitesse maximale en sens inverse. */
  reverse?: number
  /** Vitesse maximale au-delà d'une certaine durée (Compact : 6 au-delà de 10 min). */
  longTime?: { afterSeconds: number; max: number }
}

export interface ModeSpec {
  type: ModeType
  /** Durée en secondes (le site saisit certains programmes en minutes mais stocke des secondes). */
  time?: Range
  /** Unité de saisie de la durée sur le site. */
  timeUnit?: 'seconds' | 'minutes'
  temperature?: Range
  speed?: Range
  speedLimits?: SpeedLimits
  /** Durée maximale à partir d'une vitesse donnée (MC4 : 10 min dès la vitesse 6). */
  timeLimitAtSpeed?: { fromSpeed: number; maxSeconds: number }
  clockwise?: boolean
  weight?: Range
  /** Le texte de l'étape est obligatoire (balance, turbo). */
  requiresDescription?: boolean
}

export type RobotId = 'smart' | 'compact' | 'connect' | 'mc4' | 'edition-plus'

export interface RobotProfile {
  id: RobotId
  deviceTypeId: number
  name: string
  code: string
  /** false tant que la publication d'une recette pour ce modèle n'a pas été vérifiée. */
  verified: boolean
  modes: ModeSpec[]
  modules?: { code: string; label: string }[]
}

const steps = (from: number, to: number, step = 5): number[] => {
  const out: number[] = []
  for (let v = from; v <= to; v += step) out.push(v)
  return out
}
const min = (m: number) => m * 60

/** 0 (sans chauffe) puis 37 à 130 °C par pas de 5, comme sur l'écran du robot. */
const TEMP_0_130: Range = { min: 0, max: 130, values: [0, ...steps(37, 37), ...steps(40, 130)] }

/** Programmes du Connect, repris à l'identique par l'Édition Plus. */
const CONNECT_MODES: ModeSpec[] = [
  {
    type: 'customized',
    time: { min: 1, max: 5940 },
    temperature: TEMP_0_130,
    speed: { min: 1, max: 10 },
    speedLimits: { heating: 3 },
    clockwise: true,
  },
  { type: 'kneading', time: { min: 45, max: 120 } },
  { type: 'steaming', time: { min: 1, max: 3600 } },
  { type: 'roasting', temperature: { min: 0, max: 130 }, time: { min: 1, max: 840 } },
  { type: 'scale', weight: { min: 5, max: 5000 }, requiresDescription: true },
  { type: 'turbo', time: { min: 1, max: 20 }, requiresDescription: true },
]

const COMPACT_MODES: ModeSpec[] = [
  {
    type: 'customized',
    time: { min: 1, max: 5400 },
    temperature: TEMP_0_130,
    speed: { min: 1, max: 10 },
    speedLimits: { heating: 3, reverse: 3, longTime: { afterSeconds: 600, max: 6 } },
    clockwise: true,
  },
  { type: 'kneading', time: { min: 45, max: 90 } },
  { type: 'steaming', time: { min: 1, max: 3600 } },
  { type: 'roasting', temperature: { min: 100, max: 130, values: steps(100, 130) }, time: { min: 1, max: 840 } },
  { type: 'scale', weight: { min: 1, max: 3000 }, requiresDescription: true },
  // Turbo « lite » : une impulsion sans réglage de durée.
  { type: 'turbo', requiresDescription: true },
]

const SMART_MODES: ModeSpec[] = [
  CONNECT_MODES[0]!,
  { type: 'kneadingSolidDough', time: { min: 45, max: 240 } },
  { type: 'kneadingSoftDough', time: { min: 45, max: 240 } },
  { type: 'kneadingLiquidDough', time: { min: 45, max: 360 } },
  { type: 'steaming', time: { min: 1, max: 3600 } },
  { type: 'roasting', temperature: TEMP_0_130, time: { min: 1, max: 840 } },
  { type: 'scale', weight: { min: 5, max: 5000 }, requiresDescription: true },
  { type: 'turbo', time: { min: 1, max: 20 }, requiresDescription: true },
  { type: 'sousVide', temperature: { min: 40, max: 85 }, time: { min: min(15), max: min(720), step: 60 }, timeUnit: 'minutes' },
  { type: 'slowCooking', temperature: { min: 37, max: 95, values: [37, ...steps(40, 95)] }, time: { min: min(15), max: min(480), step: 60 }, timeUnit: 'minutes' },
  { type: 'fermentation', temperature: { min: 37, max: 65, values: [37, ...steps(40, 65)] }, time: { min: min(30), max: min(720), step: 60 }, timeUnit: 'minutes' },
  { type: 'riceCooking', time: { min: 1200, max: 2400 } },
  { type: 'foodProcessor', time: { min: 1, max: 300 } },
  { type: 'puree', time: { min: 30, max: 120 } },
  { type: 'smoothie', time: { min: 30, max: 120 } },
]

const MC4_MODES: ModeSpec[] = [
  {
    type: 'customized',
    time: { min: 1, max: 5999 },
    temperature: TEMP_0_130,
    speed: { min: 0.5, max: 10, step: 0.5 },
    speedLimits: { heating: 4, reverse: 4 },
    timeLimitAtSpeed: { fromSpeed: 6, maxSeconds: 600 },
    clockwise: true,
  },
  { type: 'kneadingSolidDough', time: { min: 1, max: 360 } },
  { type: 'kneadingSoftDough', time: { min: 1, max: 240 } },
  { type: 'kneadingLiquidDough', time: { min: 1, max: 600 } },
  { type: 'kneadingProveDough', temperature: { min: 37, max: 40 }, time: { min: min(30), max: min(60), step: 60 }, timeUnit: 'minutes' },
  { type: 'steaming', time: { min: 1, max: 3600 } },
  { type: 'roastingGentle', temperature: { min: 100, max: 145, values: steps(100, 145) }, time: { min: 1, max: 1200 } },
  { type: 'roastingIntense', temperature: { min: 100, max: 165, values: steps(100, 165) }, time: { min: 1, max: 1200 } },
  { type: 'turbo', time: { min: 2, max: 20 }, requiresDescription: true },
  { type: 'sousVide', temperature: { min: 40, max: 85 }, time: { min: min(1), max: min(720), step: 60 }, timeUnit: 'minutes' },
  { type: 'slowCooking', temperature: { min: 37, max: 95, values: [37, ...steps(40, 95)] }, time: { min: min(1), max: min(480), step: 60 }, timeUnit: 'minutes' },
  { type: 'fermentation', temperature: { min: 37, max: 70, values: [37, ...steps(40, 70)] }, time: { min: min(1), max: min(720), step: 60 }, timeUnit: 'minutes' },
  { type: 'heatWater', temperature: { min: 37, max: 100, values: [37, ...steps(40, 100)] } },
  {
    type: 'heatingUp',
    temperature: { min: 37, max: 90, values: [37, ...steps(40, 90)] },
    time: { min: 1, max: 1200 },
    speed: { min: 0.5, max: 2, step: 0.5 },
  },
  { type: 'openCooking', temperature: { min: 37, max: 165, values: [37, ...steps(40, 165)] }, time: { min: min(1), max: min(120), step: 60 }, timeUnit: 'minutes' },
  { type: 'puree', time: { min: 1, max: 300 } },
  { type: 'smoothie', time: { min: 1, max: 120 } },
]

export const ROBOTS: RobotProfile[] = [
  { id: 'smart', deviceTypeId: 13, name: 'Monsieur Cuisine Smart', code: 'MC3.0', verified: true, modes: SMART_MODES },
  { id: 'compact', deviceTypeId: 776, name: 'Monsieur Cuisine Compact', code: 'MC0.5', verified: true, modes: COMPACT_MODES },
  { id: 'connect', deviceTypeId: 12, name: 'Monsieur Cuisine Connect', code: 'MC2.0', verified: true, modes: CONNECT_MODES },
  {
    id: 'mc4',
    deviceTypeId: 777,
    name: 'Monsieur Cuisine 4.0',
    code: 'MC4.0',
    // Le site range les réglages du MC4 par module (bol 3 L / 2 L) : format d'envoi à confirmer.
    verified: false,
    modes: MC4_MODES,
    modules: [
      { code: '3L_BOWL', label: 'Bol 3 L' },
      { code: '2L_BOWL', label: 'Bol 2 L' },
      { code: 'FOOD_PROCESSOR', label: 'Robot multifonction' },
      { code: 'CITRUS_JUICER', label: 'Presse-agrumes' },
      { code: 'AIR_FRYER', label: 'Friteuse à air' },
      { code: 'CONTACT_GRILL', label: 'Grill' },
    ],
  },
  { id: 'edition-plus', deviceTypeId: 11, name: 'Monsieur Cuisine Édition Plus', code: 'MC1.1', verified: true, modes: CONNECT_MODES },
]

export const DEFAULT_ROBOT_ID: RobotId = 'connect'

export function getRobot(id: RobotId | string | undefined | null): RobotProfile {
  return ROBOTS.find((r) => r.id === id) ?? ROBOTS.find((r) => r.id === DEFAULT_ROBOT_ID)!
}

export function robotFromDeviceTypeId(deviceTypeId: number | undefined): RobotProfile | undefined {
  return ROBOTS.find((r) => r.deviceTypeId === deviceTypeId)
}

export function modeSpec(robot: RobotProfile, type: string): ModeSpec | undefined {
  return robot.modes.find((m) => m.type === type)
}

/** Vitesse maximale autorisée pour des réglages donnés (bridages chauffe, sens inverse, durée). */
export function maxSpeedFor(spec: ModeSpec, s: { temperature?: number; clockwise?: boolean; time?: number }): number | undefined {
  if (!spec.speed) return undefined
  let max = spec.speed.max
  const l = spec.speedLimits
  if (l?.heating !== undefined && (s.temperature ?? 0) > 0) max = Math.min(max, l.heating)
  if (l?.reverse !== undefined && s.clockwise) max = Math.min(max, l.reverse)
  if (l?.longTime && (s.time ?? 0) > l.longTime.afterSeconds) max = Math.min(max, l.longTime.max)
  return max
}

/** Durée maximale autorisée pour une vitesse donnée. */
export function maxTimeFor(spec: ModeSpec, s: { speed?: number }): number | undefined {
  if (!spec.time) return undefined
  const l = spec.timeLimitAtSpeed
  if (l && (s.speed ?? 0) >= l.fromSpeed) return Math.min(spec.time.max, l.maxSeconds)
  return spec.time.max
}
