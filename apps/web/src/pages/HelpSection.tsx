import type { ReactNode } from 'react'
import { useT, type Dict } from '../i18n'

export type SectionId = keyof Dict['help']['sections']
export const SECTIONS: SectionId[] = ['principe', 'relais', 'session', 'ia', 'transfert', 'installer', 'depannage', 'securite']

export function Section({ id, children }: { id: SectionId; children: ReactNode }) {
  const title = useT().help.sections[id]
  return (
    <section>
      <h2 id={id}>{title}</h2>
      {children}
    </section>
  )
}
