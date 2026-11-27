import { MODE_SPECS, type ModeType } from './robots'

export type Locale = 'fr' | 'en'

/** Libellé et explication de chaque programme, par langue (le français vient de MODE_SPECS). */
export const MODE_TEXT: Record<Locale, Record<ModeType, { label: string; hint: string }>> = {
  fr: Object.fromEntries(Object.values(MODE_SPECS).map((m) => [m.type, { label: m.label, hint: m.hint }])) as Record<
    ModeType,
    { label: string; hint: string }
  >,
  en: {
    customized: {
      label: 'Custom cooking',
      hint: 'Time 1 s to 99 min, temperature 0 (no heat) or 37 to 130 °C in steps of 5, speed 1 to 10 (3 maximum when heating), reverse rotation available.',
    },
    kneading: { label: 'Knead', hint: 'Dough kneading, 45 to 120 s.' },
    steaming: { label: 'Steam', hint: 'Steam cooking, up to 60 min.' },
    roasting: { label: 'Sauté', hint: 'Sear or brown, temperature up to 130 °C, time up to 14 min.' },
    scale: { label: 'Scale', hint: 'Weigh an ingredient, 5 to 5000 g. The step text must say what to weigh.' },
    turbo: { label: 'Turbo', hint: 'Pulse at maximum speed, 1 to 20 s. The step text must say what to blend.' },
  },
}

export function modeText(type: string, locale: Locale = 'fr'): { label: string; hint: string } {
  return MODE_TEXT[locale][type as ModeType] ?? { label: type, hint: '' }
}
