import { iconOf, recipeIcon, type Recipe, type RecipeIconId } from '@mr-chef/recipe-schema'
import { useLang } from '../i18n'

/**
 * Dessins des icônes de recette, dans le style de Gaston : tuile menthe, trait sapin épais,
 * aplats blancs et menthe, quelques touches chaudes. Les couleurs viennent des jetons
 * (clair et sombre), voir `.ri` dans app.css. Classes : w blanc, a menthe, y miel,
 * o orange, r tomate, c chocolat, d sapin plein, l trait, m détail fin.
 */
const BOWL = 'M10 32h44a22 19 0 0 1-44 0z'
const STEAM = '<path class="m" d="M24 22q-3-4 0-8M32 20q-3-4 0-8M40 22q-3-4 0-8"/>'
const dots = (pts: [number, number][], cls = 'm') => `<path class="${cls} dot" d="${pts.map(([x, y]) => `M${x} ${y}h.01`).join('')}"/>`

const ART: Record<RecipeIconId, string> = {
  soup: `${STEAM}<path class="w" d="M10 30a22 20 0 0 0 44 0"/><ellipse class="y" cx="32" cy="30" rx="22" ry="5"/>${dots([[26, 30], [36, 29]], 'm')}`,
  stew: `<path class="l" d="M7 34h5M52 34h5"/><rect class="a" x="12" y="27" width="40" height="23" rx="7"/><path class="w" d="M10 27a22 9 0 0 1 44 0z"/><circle class="d" cx="32" cy="15" r="3"/><path class="m" d="M20 38h10"/>`,
  pasta: `<circle class="w" cx="32" cy="33" r="21"/><circle class="y" cx="32" cy="33" r="13"/><path class="m" d="M32 24a9 9 0 1 1-9 9M32 28a5 5 0 1 1-5 5M41 30q-3 6-9 7"/><circle class="r" cx="27" cy="31" r="3.6"/><circle class="r" cx="37" cy="37" r="3.2"/><path class="dot-a" d="M33 27h.01M25 38h.01"/>`,
  rice: `<path class="l" d="M42 9L32 28M50 12L37 29"/><path class="w" d="M14 32a18 13 0 0 1 36 0"/>${dots([[24, 27], [31, 23], [38, 27], [28, 29]], 'd')}<path class="a" d="${BOWL}"/>`,
  wok: `<path class="l" d="M44 8L34 30M52 11L39 31"/><path class="o" d="${BOWL}"/><path class="l" d="M16 32q3-5 6 0t6 0 6 0 6 0 6 0 6 0"/><circle class="w" cx="22" cy="28" r="5"/><circle class="y" cx="22" cy="28" r="2.2" style="stroke-width:0"/>`,
  meat: `<path class="r" d="M12 30c0-10 12-16 24-14s18 10 15 20-14 15-25 13-14-9-14-19z"/><path class="m" d="M30 22q8 0 12 8"/><circle class="w" cx="24" cy="32" r="5.5"/>`,
  poultry: `<circle class="w" cx="14" cy="47" r="4.2"/><circle class="w" cx="18" cy="52" r="4.2"/><path class="w" d="M15 46l6 6 8-6-6-8z"/><path class="y" d="M38 10c10 0 16 8 16 16 0 11-11 16-20 13l-7 6-8-8 6-7c-4-9 1-20 13-20z"/><path class="m" d="M40 18q6 2 7 8"/>`,
  pork: `<path class="l" d="M12 42l-4 3M51 20l4-4"/><path class="k1" d="M14 40c8 10 30 8 36-16"/><path class="k2 r-k" d="M14 40c8 10 30 8 36-16"/><path class="m" d="M24 40q1 4 4 5M36 38q2 3 5 2"/>`,
  fish: `<path class="a" d="M46 32l10-9v18z"/><path class="a" d="M9 32c8-13 27-15 38 0-11 15-30 13-38 0z"/><path class="m" d="M27 25q4 7 0 14M33 30h6M33 35h5"/><circle class="d" cx="19" cy="30" r="2.4"/>`,
  seafood: `<path class="k1" d="M44 18c-15-1-23 9-21 20s14 13 20 5"/><path class="k2 r-k" d="M44 18c-15-1-23 9-21 20s14 13 20 5"/><path class="r" d="M42 44l9 1-3 9z"/><path class="m" d="M30 22l2 6M24 30l6 2M25 40l5-3"/><circle class="d" cx="42" cy="22" r="2.2"/><path class="l" d="M45 17l9-6M46 20l9-2"/>`,
  egg: `<path class="w" d="M12 32c0-11 10-18 21-16s19 7 18 17-10 17-21 16-18-7-18-17z"/><circle class="y" cx="31" cy="32" r="8"/><path class="m" d="M28 29q2-2 4-1"/>`,
  quiche: `<path class="y" d="M10 32h44l-4 14a4 4 0 0 1-4 3H18a4 4 0 0 1-4-3z"/><ellipse class="w" cx="32" cy="32" rx="22" ry="7"/>${dots([[22, 31], [38, 33], [31, 29]], 'dot-a')}<circle class="r" cx="28" cy="34" r="2.6"/><circle class="r" cx="41" cy="30" r="2.6"/><path class="m" d="M20 41v4M27 42v4M34 42v4M41 41v4"/>`,
  gratin: `<path class="y" d="M10 28l32-14 12 14z"/><path class="y" d="M10 28h44v20H10z"/><circle class="w" cx="21" cy="37" r="3.5"/><circle class="w" cx="36" cy="40" r="4.5"/><circle class="w" cx="46" cy="33" r="2.5"/><circle class="w" cx="34" cy="22" r="2.5"/>`,
  pizza: `<path class="y" d="M32 55L11 18q21-11 42 0z"/><path class="m" d="M15 24q17-8 34 0"/><circle class="r" cx="26" cy="29" r="4.5"/><circle class="r" cx="38" cy="31" r="4"/><circle class="r" cx="32" cy="42" r="3.5"/>${dots([[33, 25], [27, 37]], 'dot-a')}`,
  burger: `<path class="y" d="M12 44h40v1a7 7 0 0 1-7 7H19a7 7 0 0 1-7-7z"/><rect class="c" x="11" y="35" width="42" height="8" rx="4"/><path class="a" d="M10 31h44v3q-3.5 3-7 0t-7 0-7 0-7 0-7 0-9 0z"/><path class="y" d="M12 30a20 17 0 0 1 40 0z"/>${dots([[24, 21], [32, 18], [40, 22], [30, 25]], 'm')}`,
  salad: `<path class="a" d="M16 32c-2-10 4-17 12-18 1 9-4 16-12 18z"/><path class="a" d="M48 32c2-10-4-17-12-18-1 9 4 16 12 18z"/><path class="a" d="M26 32c-1-12 4-20 6-22 3 3 7 10 6 22z"/><circle class="r" cx="22" cy="30" r="4"/><circle class="r" cx="43" cy="29" r="3.5"/><path class="w" d="${BOWL}"/>`,
  vegetables: `<path class="a" d="M43 21c-1-6 1-11 7-14-1 7-3 11-7 14zM43 21c4-3 9-4 13 0-5 3-9 2-13 0zM43 21c-3-4-8-6-13-4 3 4 8 6 13 4z"/><path class="o" d="M45 23c4 4 3 9-1 13L20 54c-4 3-9-2-6-6l18-24c4-4 9-5 13-1z"/><path class="m" d="M28 33l5 3M23 41l4 3M35 27l3 2"/>`,
  potato: `<path class="y" d="M12 36c-2-11 7-21 20-21s21 7 21 17-9 18-21 18-18-5-20-14z"/>${dots([[23, 29], [38, 25], [35, 40], [45, 33]], 'm')}`,
  pumpkin: `<path class="l" d="M32 22c0-6 2-9 7-11"/><ellipse class="o" cx="21" cy="37" rx="10" ry="14"/><ellipse class="o" cx="43" cy="37" rx="10" ry="14"/><ellipse class="o" cx="32" cy="37" rx="10" ry="15"/><path class="a" d="M36 16c4-3 9-3 12 0-4 3-8 3-12 0z"/>`,
  mushroom: `<path class="w" d="M24 34h16l-1.5 15a3 3 0 0 1-3 3h-7a3 3 0 0 1-3-3z"/><path class="o" d="M10 34c0-12 10-21 22-21s22 9 22 21z"/><circle class="w" cx="22" cy="25" r="3"/><circle class="w" cx="36" cy="20" r="2.5"/><circle class="w" cx="43" cy="29" r="3"/>`,
  legumes: `<path class="a" d="M8 42c10-15 31-22 48-22-4 16-26 28-48 22z"/><path class="w" d="M15 40c9-10 24-15 35-16-5 9-20 18-35 16z"/><circle class="a" cx="22" cy="37" r="4"/><circle class="a" cx="31" cy="33" r="4"/><circle class="a" cx="40" cy="29" r="4"/>`,
  sauce: `<rect class="a" x="20" y="13" width="24" height="8" rx="2"/><rect class="w" x="17" y="21" width="30" height="31" rx="7"/><path class="r" d="M17 33h30v12a7 7 0 0 1-7 7H24a7 7 0 0 1-7-7z"/><path class="m" d="M23 27h8"/>`,
  bread: `<path class="y" d="M10 40c0-12 10-21 22-21s22 9 22 21v5a5 5 0 0 1-5 5H15a5 5 0 0 1-5-5z"/><path class="m" d="M22 27l-4 8M32 25l-4 9M42 27l-4 8"/>`,
  pancake: `<rect class="y" x="12" y="42" width="40" height="8" rx="4"/><rect class="y" x="10" y="34" width="44" height="8" rx="4"/><rect class="y" x="12" y="26" width="40" height="8" rx="4"/><path class="c" d="M18 26h28v2q0 3-3 3t-3 4-3 0v-2q0-3-3-3H18z"/><rect class="w" x="27" y="18" width="11" height="8" rx="2"/>`,
  cake: `<rect class="y" x="12" y="28" width="40" height="23" rx="3"/><path class="l" d="M12 40h40"/><path class="w" d="M12 32v-4a3 3 0 0 1 3-3h34a3 3 0 0 1 3 3v4q-4 4-8 0t-8 0-8 0-8 0-8 0z"/><path class="l" d="M32 19q2-6 7-8"/><circle class="r" cx="32" cy="20" r="4.5"/>`,
  tart: `<circle class="y" cx="32" cy="33" r="21"/><circle class="w" cx="32" cy="33" r="15"/><circle class="r" cx="32" cy="25" r="4"/><circle class="r" cx="24" cy="36" r="4"/><circle class="r" cx="40" cy="36" r="4"/><circle class="a" cx="32" cy="35" r="3"/>`,
  cookie: `<path class="y" d="M50 25a21 21 0 1 1-13-12 5 5 0 0 0 6 6 5 5 0 0 0 7 6z"/><circle class="c" cx="24" cy="28" r="3"/><circle class="c" cx="34" cy="38" r="3"/><circle class="c" cx="22" cy="42" r="2.5"/><circle class="c" cx="40" cy="28" r="2.2"/>`,
  chocolate: `<rect class="c" x="16" y="12" width="32" height="40" rx="4"/><path class="m-w" d="M16 25h32M16 38h32M32 12v40"/><path class="w" d="M14 34h36v16a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4z"/><path class="m" d="M20 42h12"/>`,
  cream: `<path class="l" d="M8 51h48"/><path class="y" d="M15 49l5-23h24l5 23z"/><path class="c" d="M20 26h24l1 6q-3 3-6 0t-6 0-6 0-6 2z"/><path class="m" d="M22 40h6"/>`,
  icecream: `<path class="y" d="M21 32l11 23 11-23z"/><path class="m" d="M26 38l9 6M29 46l5-6"/><circle class="r" cx="25" cy="28" r="8"/><circle class="w" cx="39" cy="28" r="8"/><circle class="a" cx="32" cy="18" r="8"/>`,
  fruit: `<path class="r" d="M32 55c-12-6-19-16-17-25 2-6 10-8 17-6 7-2 15 0 17 6 2 9-5 19-17 25z"/><path class="a" d="M20 25q12-8 24 0-6 3-12 4-6-1-12-4z"/><path class="l" d="M32 21v-7"/>${dots([[26, 34], [38, 34], [32, 41], [25, 43], [39, 44], [32, 49]], 'm-w')}`,
  citrus: `<circle class="y" cx="32" cy="33" r="21"/><circle class="w" cx="32" cy="33" r="16"/><path class="m" d="M32 18v30M17 33h30M21.5 22.5l21 21M42.5 22.5l-21 21"/>`,
  smoothie: `<path class="l" d="M36 26l6-17h7"/><path class="w" d="M17 18h30l-4 34a3 3 0 0 1-3 3H24a3 3 0 0 1-3-3z"/><path class="r" d="M18 28h28l-3 24a3 3 0 0 1-3 3H24a3 3 0 0 1-3-3z"/><circle class="a" cx="45" cy="19" r="5"/>`,
  hotdrink: `${STEAM.replace(/M24 22/, 'M22 20').replace(/M32 20/, 'M29 18').replace(/M40 22/, 'M36 20')}<path class="l" d="M44 30h3a6 6 0 0 1 0 12h-3"/><path class="w" d="M13 26h31v17a8 8 0 0 1-8 8H21a8 8 0 0 1-8-8z"/><ellipse class="c" cx="28.5" cy="26" rx="15.5" ry="3"/><path class="l" d="M8 54h40"/>`,
  cocktail: `<path class="l" d="M32 37v14M23 52h18M38 22l10-13"/><path class="a" d="M11 15h42L32 37z"/><path class="w" d="M15 19h34"/><circle class="y" cx="47" cy="16" r="5.5"/>`,
  baby: `<path class="y" d="M26 20c0-6 2-11 6-11s6 5 6 11z"/><rect class="a" x="20" y="19" width="24" height="7" rx="2.5"/><rect class="w" x="22" y="26" width="20" height="27" rx="6"/><path class="m" d="M22 34h6M22 41h6"/>`,
  aperitif: `<path class="l" d="M12 52L48 16"/><circle class="w" cx="51" cy="13" r="3"/><ellipse class="a" cx="24" cy="40" rx="6.5" ry="9" transform="rotate(45 24 40)"/><ellipse class="a" cx="37" cy="27" rx="6.5" ry="9" transform="rotate(45 37 27)"/><circle class="r" cx="22" cy="38" r="2.4"/><circle class="r" cx="35" cy="25" r="2.4"/>`,
  breakfast: `<path class="l" d="M50 8L36 28"/><ellipse class="w" cx="32" cy="32" rx="22" ry="5"/><circle class="y" cx="24" cy="31" r="3"/><circle class="y" cx="34" cy="30" r="3"/><circle class="r" cx="42" cy="32" r="3"/><circle class="r" cx="29" cy="33" r="2.6"/><path class="a" d="M10 32a22 19 0 0 0 44 0"/>`,
  plate: `<path class="l" d="M7 46h50"/><path class="w" d="M11 43a21 20 0 0 1 42 0z"/><circle class="a" cx="32" cy="20" r="3.5"/><path class="m" d="M20 37q1-8 8-11"/>`,
}

/** Dessin de l'icône d'une recette (ou d'un identifiant d'icône), sur sa tuile menthe. */
export function RecipeIconArt({ id, recipe, size = 64, label = false }: { id?: string; recipe?: Pick<Recipe, 'title' | 'icon'>; size?: number; label?: boolean }) {
  const lang = useLang()
  const icon = id ? recipeIcon(id) : recipe ? iconOf(recipe) : recipeIcon(null)
  const art = ART[icon.id as RecipeIconId] ?? ART.plate
  const title = lang === 'en' ? icon.en : icon.fr
  return (
    <svg
      className="ri"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role={label ? 'img' : undefined}
      aria-label={label ? title : undefined}
      aria-hidden={label ? undefined : true}
      // Dessins statiques définis ci-dessus, aucune donnée utilisateur.
      dangerouslySetInnerHTML={{ __html: `<rect class="bg" width="64" height="64" rx="16"/>${art}` }}
    />
  )
}
