import { useState, type InputHTMLAttributes } from 'react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'min' | 'max'> & {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  /** Valeur reprise quand le champ est laissé vide (par défaut : min, sinon 0). */
  fallback?: number
}

export function clampNumber(n: number, min?: number, max?: number): number {
  let v = n
  if (min !== undefined) v = Math.max(min, v)
  if (max !== undefined) v = Math.min(max, v)
  return v
}

function parse(text: string): number | null {
  if (text.trim() === '') return null
  const n = Number(text.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/**
 * Champ numérique qu'on peut vider pendant la saisie : le texte tapé est gardé tel quel,
 * la valeur n'est transmise que lorsqu'elle est un nombre, et le champ est recalé
 * (bornes, valeur par défaut si vide) quand il perd le focus.
 */
export function NumberInput({ value, onChange, min, max, fallback, onBlur, ...rest }: Props) {
  const [text, setText] = useState(String(value))
  const [seen, setSeen] = useState(value)

  // La valeur a changé ailleurs (autre champ, sauvegarde, IA) : on réaffiche, sauf si c'est
  // simplement le résultat de ce qui est en train d'être tapé.
  if (value !== seen) {
    setSeen(value)
    const typed = parse(text)
    if (typed === null || clampNumber(typed, min, max) !== value) setText(String(value))
  }

  return (
    <input
      {...rest}
      type="number"
      min={min}
      max={max}
      value={text}
      onChange={(e) => {
        setText(e.target.value)
        const n = parse(e.target.value)
        if (n !== null) onChange(clampNumber(n, min, max))
      }}
      onBlur={(e) => {
        const n = parse(text)
        const next = n === null ? (fallback ?? min ?? 0) : clampNumber(n, min, max)
        if (next !== value) onChange(next)
        setText(String(next))
        onBlur?.(e)
      }}
    />
  )
}
