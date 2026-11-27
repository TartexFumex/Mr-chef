import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Icon } from './Icon'

export function TopBar({ title, back = '/', children }: { title: string; back?: string | null; children?: ReactNode }) {
  return (
    <header className="topbar">
      {back !== null && (
        <Link to={back} className="icon-btn" aria-label="Retour">
          <Icon name="back" />
        </Link>
      )}
      <h1>{title}</h1>
      {children}
    </header>
  )
}
