import type { RecipeRecord } from '../db/db'
import { useT } from '../i18n'
import { syncStateOf } from '../lib/recipes'

/** Badge d'état : Locale, Publiée, Désynchronisée, plus « En attente » et « Conflit ». */
export function StatusBadge({ rec }: { rec: RecipeRecord }) {
  const t = useT()
  if (rec.sync.conflict) return <span className="badge conflict">{t.status.conflict}</span>
  if (rec.pending) {
    return <span className="badge pending">{rec.pending === 'publish' ? t.status.pendingPublish : t.status.pendingUnpublish}</span>
  }
  const state = syncStateOf(rec)
  return <span className={`badge ${state}`}>{t.status[state]}</span>
}
