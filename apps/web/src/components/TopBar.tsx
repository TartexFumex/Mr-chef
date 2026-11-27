import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useT } from '../i18n'
import { Icon } from './Icon'

export function TopBar({ title, back = '/', children }: { title: string; back?: string | null; children?: ReactNode }) {
  const t = useT()
  return (
    <header className="topbar">
      {back !== null && (
        <Link to={back} className="icon-btn" aria-label={t.common.back}>
          <Icon name="back" />
        </Link>
      )}
      <h1>{title}</h1>
      {children}
    </header>
  )
}
