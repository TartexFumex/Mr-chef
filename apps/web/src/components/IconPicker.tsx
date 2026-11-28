import { RECIPE_ICONS } from '@mr-chef/recipe-schema'
import { useLang, useT } from '../i18n'
import { Dialog } from './Dialog'
import { RecipeIconArt } from './RecipeIcon'

/** Grille des icônes de recette ; le titre court sous chaque dessin, le titre complet au survol. */
export function IconPicker({
  open,
  current,
  onPick,
  onClose,
}: {
  open: boolean
  current: string
  onPick: (id: string) => void
  onClose: () => void
}) {
  const t = useT()
  const lang = useLang()
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t.editor.pickIcon}
      actions={
        <button type="button" className="btn" onClick={onClose}>
          {t.common.cancel}
        </button>
      }
    >
      <div className="icon-grid" role="listbox" aria-label={t.editor.pickIcon}>
        {RECIPE_ICONS.map((icon) => {
          const title = lang === 'en' ? icon.en : icon.fr
          return (
            <button
              key={icon.id}
              type="button"
              role="option"
              aria-selected={icon.id === current}
              title={title}
              aria-label={title}
              onClick={() => onPick(icon.id)}
            >
              <RecipeIconArt id={icon.id} size={52} />
              <span>{title.split(',')[0]}</span>
            </button>
          )
        })}
      </div>
    </Dialog>
  )
}
