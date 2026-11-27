import { SYNC_LABELS } from '@mr-chef/recipe-schema'
import type { RecipeRecord } from '../db/db'
import { syncStateOf } from '../lib/recipes'

/** Badge d'état : Locale, Publiée, Désynchronisée, plus « En attente » et « Conflit ». */
export function StatusBadge({ rec }: { rec: RecipeRecord }) {
  if (rec.sync.conflict) return <span className="badge conflict">Conflit</span>
  if (rec.pending) {
    return <span className="badge pending">{rec.pending === 'publish' ? 'Envoi en attente' : 'Retrait en attente'}</span>
  }
  const state = syncStateOf(rec)
  return <span className={`badge ${state}`}>{SYNC_LABELS[state]}</span>
}
