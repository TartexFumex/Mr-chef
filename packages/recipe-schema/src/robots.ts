/**
 * Profils des robots Monsieur Cuisine.
 *
 * Les plages du Monsieur Cuisine Connect viennent directement de swagger.json
 * (schéma RobotDeviceSettingItem). Pour les autres modèles, le swagger ne détaille
 * pas les plages : on n'expose que les programmes communs vérifiés, en reprenant les
 * plages du Connect, et `verified: false` le signale dans l'interface.
 * Une capture HAR par modèle permettra de compléter ces profils.
 */

export type ModeType =
  | 'customized'
  | 'kneading'
  | 'steaming'
  | 'roasting'
  | 'scale'
  | 'turbo'

export interface Range {
  min: number
  max: number
  step?: number
  /** Valeurs isolées autorisées hors de la plage (ex. température 0 = sans chauffe). */
  also?: number[]
}

export interface ModeSpec {
  type: ModeType
  label: string
  /** Explication courte pour l'utilisateur et pour le prompt IA. */
  hint: string
  time?: Range
  temperature?: Range
  speed?: Range
  /** Vitesse maximale lorsque la température est supérieure à 0. */
  maxSpeedWhenHeating?: number
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
  /** true si les plages proviennent de la documentation de ce modèle précis. */
  verified: boolean
  modes: ModeSpec[]
  modules?: { code: string; label: string }[]
}

const TIME_CUSTOM: Range = { min: 1, max: 5940 }

export const MODE_SPECS: Record<ModeType, ModeSpec> = {
  customized: {
    type: 'customized',
    label: 'Cuisson personnalisée',
    hint: 'Durée 1 s à 99 min, température 0 (sans chauffe) ou 37 à 130 °C par pas de 5, vitesse 1 à 10 (3 maximum dès qu’on chauffe), sens inverse possible.',
    time: TIME_CUSTOM,
    temperature: { min: 37, max: 130, step: 5, also: [0] },
    speed: { min: 1, max: 10 },
    maxSpeedWhenHeating: 3,
    clockwise: true,
  },
  kneading: {
    type: 'kneading',
    label: 'Pétrir',
    hint: 'Pétrissage de pâte, durée 45 à 120 s.',
    time: { min: 45, max: 120 },
  },
  steaming: {
    type: 'steaming',
    label: 'Cuisson vapeur',
    hint: 'Cuisson vapeur, durée jusqu’à 60 min.',
    time: { min: 1, max: 3600 },
  },
  roasting: {
    type: 'roasting',
    label: 'Saisir',
    hint: 'Saisir ou rissoler, température jusqu’à 130 °C, durée jusqu’à 14 min.',
    time: { min: 1, max: 840 },
    temperature: { min: 37, max: 130, step: 5, also: [0] },
  },
  scale: {
    type: 'scale',
    label: 'Balance',
    hint: 'Peser un ingrédient, 5 à 5000 g. Le texte de l’étape doit dire quoi peser.',
    weight: { min: 5, max: 5000 },
    requiresDescription: true,
  },
  turbo: {
    type: 'turbo',
    label: 'Turbo',
    hint: 'Impulsion à vitesse maximale, 1 à 20 s. Le texte de l’étape doit dire quoi mixer.',
    time: { min: 1, max: 20 },
    requiresDescription: true,
  },
}

const COMMON: ModeSpec[] = [MODE_SPECS.customized, MODE_SPECS.turbo, MODE_SPECS.scale]

export const ROBOTS: RobotProfile[] = [
  {
    id: 'smart',
    deviceTypeId: 13,
    name: 'Monsieur Cuisine Smart',
    code: 'MC3.0',
    verified: false,
    modes: [...COMMON, MODE_SPECS.kneading, MODE_SPECS.steaming],
  },
  {
    id: 'compact',
    deviceTypeId: 776,
    name: 'Monsieur Cuisine Compact',
    code: 'mc-compact',
    verified: false,
    modes: [...COMMON],
  },
  {
    id: 'connect',
    deviceTypeId: 12,
    name: 'Monsieur Cuisine Connect',
    code: 'MC2.0',
    verified: true,
    modes: [
      MODE_SPECS.customized,
      MODE_SPECS.kneading,
      MODE_SPECS.steaming,
      MODE_SPECS.roasting,
      MODE_SPECS.scale,
      MODE_SPECS.turbo,
    ],
  },
  {
    id: 'mc4',
    deviceTypeId: 777,
    name: 'Monsieur Cuisine 4.0',
    code: 'MC4.0',
    verified: false,
    modes: [...COMMON],
    modules: [
      { code: '3L_BOWL', label: 'Bol 3 L' },
      { code: '2L_BOWL', label: 'Bol 2 L' },
      { code: 'FOOD_PROCESSOR', label: 'Robot multifonction' },
      { code: 'CITRUS_JUICER', label: 'Presse-agrumes' },
      { code: 'AIR_FRYER', label: 'Friteuse à air' },
      { code: 'CONTACT_GRILL', label: 'Grill' },
    ],
  },
  {
    id: 'edition-plus',
    deviceTypeId: 11,
    name: 'Monsieur Cuisine Édition Plus',
    code: 'edition-plus',
    verified: false,
    modes: [...COMMON],
  },
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
