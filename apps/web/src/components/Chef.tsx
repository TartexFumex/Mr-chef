import type { ReactNode } from 'react'
import logoUrl from '../assets/logo.svg'
import { useT } from '../i18n'

/** Gaston, le robot chef de Mr Chef, avec sa bulle de parole. */
export function ChefSays({
  children,
  size = 56,
  live = false,
  thinking = false,
}: {
  children: ReactNode
  size?: number
  live?: boolean
  /** Gaston se balance et « tape » des points pendant que l'IA travaille. */
  thinking?: boolean
}) {
  const t = useT()
  return (
    <div className={thinking ? 'chef-says thinking' : 'chef-says'}>
      <img src={logoUrl} width={size} height={size} alt={t.chef.name} />
      <p className="bubble" aria-live={live ? 'polite' : undefined}>
        {children}
        {thinking && (
          <span className="typing" aria-hidden>
            <i />
            <i />
            <i />
          </span>
        )}
      </p>
    </div>
  )
}

/** Choisit une réplique au hasard dans une liste. */
export function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)]!
}
