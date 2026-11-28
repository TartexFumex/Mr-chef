import { type ModeSpec, type ModeType, type Range } from './robots'

export type Locale = 'fr' | 'en'

interface ModeWords {
  label: string
  /** À quoi sert le programme, sans les plages (elles dépendent du robot). */
  purpose: string
}

/** Libellé et usage de chaque programme, par langue. */
export const MODE_TEXT: Record<Locale, Record<ModeType, ModeWords>> = {
  fr: {
    customized: { label: 'Cuisson personnalisée', purpose: 'Hacher, mixer, mélanger ou cuire en réglant durée, température et vitesse.' },
    kneading: { label: 'Pétrir', purpose: 'Pétrissage de pâte.' },
    kneadingSolidDough: { label: 'Pétrir pâte ferme', purpose: 'Pâte ferme (pain, pâte à pizza, pâte brisée).' },
    kneadingSoftDough: { label: 'Pétrir pâte souple', purpose: 'Pâte souple (brioche, pâte levée sucrée).' },
    kneadingLiquidDough: { label: 'Pétrir pâte liquide', purpose: 'Pâte liquide (crêpes, gaufres, cake).' },
    kneadingProveDough: { label: 'Levée de pâte', purpose: 'Faire lever une pâte au chaud dans le bol.' },
    steaming: { label: 'Cuisson vapeur', purpose: 'Cuisson vapeur dans le panier ou l’accessoire vapeur, avec de l’eau dans le bol.' },
    roasting: { label: 'Saisir', purpose: 'Saisir ou rissoler (oignons, viande).' },
    roastingGentle: { label: 'Saisir doux', purpose: 'Faire revenir doucement (oignons, ail, légumes).' },
    roastingIntense: { label: 'Saisir intense', purpose: 'Saisir à feu vif (viande, dorer).' },
    scale: { label: 'Balance', purpose: 'Peser un ingrédient. Le texte de l’étape doit dire quoi peser.' },
    turbo: { label: 'Turbo', purpose: 'Impulsion à vitesse maximale. Le texte de l’étape doit dire quoi mixer.' },
    sousVide: { label: 'Sous vide', purpose: 'Cuisson basse température d’aliments sous vide, dans l’eau.' },
    slowCooking: { label: 'Mijoter', purpose: 'Cuisson lente (ragoûts, plats mijotés).' },
    fermentation: { label: 'Fermentation', purpose: 'Fermentation (yaourt, pâte, levain).' },
    riceCooking: { label: 'Cuisson du riz', purpose: 'Cuisson automatique du riz.' },
    foodProcessor: { label: 'Robot multifonction', purpose: 'Râper, émincer ou trancher avec l’accessoire multifonction.' },
    puree: { label: 'Purée', purpose: 'Mixer en purée lisse.' },
    smoothie: { label: 'Smoothie', purpose: 'Mixer un smoothie ou une boisson.' },
    heatWater: { label: 'Chauffer l’eau', purpose: 'Chauffer de l’eau jusqu’à la température voulue.' },
    heatingUp: { label: 'Réchauffer', purpose: 'Réchauffer une préparation en remuant doucement.' },
    openCooking: { label: 'Cuisson ouverte', purpose: 'Cuire sans couvercle (réduire, griller, caraméliser).' },
  },
  en: {
    customized: { label: 'Custom cooking', purpose: 'Chop, blend, stir or cook by setting time, temperature and speed.' },
    kneading: { label: 'Knead', purpose: 'Dough kneading.' },
    kneadingSolidDough: { label: 'Knead firm dough', purpose: 'Firm dough (bread, pizza dough, shortcrust).' },
    kneadingSoftDough: { label: 'Knead soft dough', purpose: 'Soft dough (brioche, sweet yeast dough).' },
    kneadingLiquidDough: { label: 'Knead batter', purpose: 'Batter (pancakes, waffles, cake).' },
    kneadingProveDough: { label: 'Prove dough', purpose: 'Let a dough rise in the warm bowl.' },
    steaming: { label: 'Steam', purpose: 'Steam in the basket or steamer attachment, with water in the bowl.' },
    roasting: { label: 'Sauté', purpose: 'Sear or brown (onions, meat).' },
    roastingGentle: { label: 'Gentle sauté', purpose: 'Gently fry (onions, garlic, vegetables).' },
    roastingIntense: { label: 'Intense sauté', purpose: 'Sear on high heat (meat, browning).' },
    scale: { label: 'Scale', purpose: 'Weigh an ingredient. The step text must say what to weigh.' },
    turbo: { label: 'Turbo', purpose: 'Pulse at maximum speed. The step text must say what to blend.' },
    sousVide: { label: 'Sous vide', purpose: 'Low-temperature cooking of vacuum-sealed food in water.' },
    slowCooking: { label: 'Slow cooking', purpose: 'Slow cooking (stews, braises).' },
    fermentation: { label: 'Fermentation', purpose: 'Fermentation (yoghurt, dough, starter).' },
    riceCooking: { label: 'Rice cooking', purpose: 'Automatic rice cooking.' },
    foodProcessor: { label: 'Food processor', purpose: 'Grate, slice or shred with the food processor attachment.' },
    puree: { label: 'Purée', purpose: 'Blend into a smooth purée.' },
    smoothie: { label: 'Smoothie', purpose: 'Blend a smoothie or a drink.' },
    heatWater: { label: 'Heat water', purpose: 'Heat water to the chosen temperature.' },
    heatingUp: { label: 'Reheat', purpose: 'Reheat a dish while stirring gently.' },
    openCooking: { label: 'Open cooking', purpose: 'Cook without the lid (reduce, toast, caramelise).' },
  },
}

const W = {
  fr: {
    time: 'durée',
    temp: 'température',
    speed: 'vitesse',
    weight: 'poids',
    to: 'à',
    or: 'ou',
    noHeat: '0 (sans chauffe)',
    by: (s: number) => `par pas de ${s}`,
    max: (v: number, when: string) => `${v} maximum ${when}`,
    heating: 'dès qu’on chauffe',
    reverse: 'en sens inverse',
    after: (min: number) => `au-delà de ${min} min`,
    fromSpeed: (s: number, m: number) => `${m} min maximum à partir de la vitesse ${s}`,
    reverseOk: 'sens inverse possible',
    noSetting: 'aucun réglage',
    dec: (n: number) => String(n).replace('.', ','),
  },
  en: {
    time: 'time',
    temp: 'temperature',
    speed: 'speed',
    weight: 'weight',
    to: 'to',
    or: 'or',
    noHeat: '0 (no heat)',
    by: (s: number) => `in steps of ${s}`,
    max: (v: number, when: string) => `${v} maximum ${when}`,
    heating: 'when heating',
    reverse: 'in reverse',
    after: (min: number) => `beyond ${min} min`,
    fromSpeed: (s: number, m: number) => `${m} min maximum from speed ${s}`,
    reverseOk: 'reverse rotation available',
    noSetting: 'no setting',
    dec: (n: number) => String(n),
  },
}

function duration(seconds: number): string {
  if (seconds < 60) return `${seconds} s`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h && !m && !s) return `${h} h`
  if (h) return `${h} h ${m} min`
  if (s) return `${m} min ${s} s`
  return `${m} min`
}

/** Décrit une plage de valeurs : « 37 à 130 °C par pas de 5 », « 0 (sans chauffe) ou 37 à 130 °C… ». */
function describeRange(r: Range, unit: string, locale: Locale): string {
  const w = W[locale]
  const u = unit ? ` ${unit}` : ''
  if (r.values?.length) {
    const vals = [...r.values].sort((a, b) => a - b)
    const zero = vals[0] === 0 && unit === '°C'
    const rest = zero ? vals.slice(1) : vals
    // Plage régulière, éventuellement précédée d'une valeur isolée (37 puis 40, 45…).
    let head: number[] = []
    let body = rest
    if (rest.length > 3 && rest[1]! - rest[0]! !== rest[2]! - rest[1]!) {
      head = [rest[0]!]
      body = rest.slice(1)
    }
    const step = body.length > 1 ? body[1]! - body[0]! : 0
    const regular = body.every((v, i) => i === 0 || v - body[i - 1]! === step)
    let text: string
    if (regular && body.length > 2) {
      const start = head.length ? head[0]! : body[0]!
      text = `${start} ${w.to} ${body[body.length - 1]}${u} ${w.by(step)}`
    } else {
      text = `${rest.join(', ')}${u}`
    }
    return zero ? `${w.noHeat} ${w.or} ${text}` : text
  }
  const step = r.step && r.step !== 1 ? ` ${w.by(r.step)}` : ''
  return `${w.dec(r.min)} ${w.to} ${w.dec(r.max)}${u}${step}`
}

/** Explication d'un programme avec les plages du robot choisi, pour l'interface et le prompt IA. */
export function modeHint(spec: ModeSpec, locale: Locale = 'fr'): string {
  const w = W[locale]
  const parts: string[] = []
  if (spec.time) parts.push(`${w.time} ${duration(spec.time.min)} ${w.to} ${duration(spec.time.max)}`)
  if (spec.temperature) parts.push(`${w.temp} ${describeRange(spec.temperature, '°C', locale)}`)
  if (spec.speed) {
    const limits: string[] = []
    const l = spec.speedLimits
    if (l?.heating !== undefined) limits.push(w.max(l.heating, w.heating))
    if (l?.reverse !== undefined) limits.push(w.max(l.reverse, w.reverse))
    if (l?.longTime) limits.push(w.max(l.longTime.max, w.after(l.longTime.afterSeconds / 60)))
    const speedText = describeRange(spec.speed, '', locale)
    parts.push(`${w.speed} ${speedText}${limits.length ? ` (${limits.join(', ')})` : ''}`)
  }
  if (spec.timeLimitAtSpeed) parts.push(w.fromSpeed(spec.timeLimitAtSpeed.fromSpeed, spec.timeLimitAtSpeed.maxSeconds / 60))
  if (spec.clockwise) parts.push(w.reverseOk)
  if (spec.weight) parts.push(`${w.weight} ${describeRange(spec.weight, 'g', locale)}`)
  const purpose = modeText(spec.type, locale).purpose
  const settings = parts.length ? parts.join(', ') : w.noSetting
  return `${purpose} ${settings.charAt(0).toUpperCase()}${settings.slice(1)}.`
}

export function modeText(type: string, locale: Locale = 'fr'): ModeWords {
  return MODE_TEXT[locale][type as ModeType] ?? { label: type, purpose: '' }
}
