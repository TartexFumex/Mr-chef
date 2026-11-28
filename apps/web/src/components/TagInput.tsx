import { useState } from 'react'
import { useT } from '../i18n'
import { completeTag, parseTags, setRecipeTags, suggestTags, useAllTags } from '../lib/tags'

/** Mots-clés d'une recette, séparés par des virgules, avec complétion depuis ceux déjà utilisés. */
export function TagInput({ recipeId, tags }: { recipeId: string; tags: string[] }) {
  const t = useT()
  const all = useAllTags()
  const [text, setText] = useState(() => (tags.length ? `${tags.join(', ')}, ` : ''))
  const [focused, setFocused] = useState(false)
  const suggestions = focused ? suggestTags(all, text) : []

  function update(next: string) {
    setText(next)
    void setRecipeTags(recipeId, parseTags(next))
  }

  return (
    <div className="stack" style={{ gap: 0 }}>
      <label className="field">
        <span>
          {t.tags.label} <span className="hint">{t.tags.hint}</span>
        </span>
        <input
          type="text"
          autoComplete="off"
          enterKeyHint="done"
          placeholder={t.tags.placeholder}
          value={text}
          onChange={(e) => update(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false)
            const clean = parseTags(text)
            setText(clean.length ? `${clean.join(', ')}, ` : '')
          }}
        />
      </label>
      {suggestions.length > 0 && (
        <div className="chips tag-suggestions" role="group" aria-label={t.tags.suggestions}>
          {suggestions.map((tag) => (
            <button
              key={tag}
              type="button"
              className="chip"
              // Garde le focus dans le champ pour enchaîner les mots-clés.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => update(completeTag(text, tag))}
            >
              + {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
