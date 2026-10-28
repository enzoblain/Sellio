# Refonte UI : design system

Reprise de la décision #8 (validée par Enzo) : design system en CSS variables sur Tailwind v4, composants maison, aucune dépendance runtime ajoutée. Aucun changement d'API ni de schéma BDD.

## Audit (avant refonte)

- Stack : SvelteKit 2 + Svelte 5, Tailwind v4 (`@tailwindcss/vite`) + plugins forms et typography. Typography n'était utilisé nulle part (retiré). Pas de lib de graphes : le graphe mensuel du dashboard est un SVG fait main.
- Styling : 100 % utilitaires inline, `layout.css` de 3 lignes, aucun token, aucun dark mode. Couleurs en dur dans `metrics.ts`, le SVG du dashboard et le `<style>` de `ListingStacks`.
- Composants partagés : Navbar, Autocomplete, ListingGallery, ModelPhotos, PhotoPicker, ListingEditor, ListingStacks. Aucun composant UI de base.
- Douleurs : wrapper de page recopié sur 8 pages, bouton primaire copié 7 fois, style d'input 4 fois, carte et empty state partout, `<dialog>` modal réécrit dans chaque page, `euros()` dupliqué dans 7 fichiers, bloc « erreur + Réessayer » dupliqué, Navbar `w-56` alors que `main` a `md:pl-60` (16 px de trou).

## Choix techniques

- Tailwind v4 conservé, aucune nouvelle lib UI (ni shadcn-svelte, ni bits-ui, ni lib de charts).
- Tokens = CSS variables sémantiques dans `src/routes/layout.css`, exposées à Tailwind via `@theme inline` (`bg-surface`, `text-fg-muted`, `border-border`, `rounded-lg`…).
- Dark mode : `@custom-variant dark` sur la classe `.dark` de `<html>`. Défaut = `prefers-color-scheme`, choix mémorisé en `localStorage` (clé `theme`). Un script inline dans `app.html` applique la classe avant le premier rendu (pas de flash). Logique dans `src/lib/theme.ts`, bouton `ui/ThemeToggle.svelte`.
- Composants dans `src/lib/components/ui` : Page, Card, Button (primary/secondary/ghost), Input, Field, Dialog, Badge, EmptyState, ErrorState, Icon, ThemeToggle, puis (#15) Tabs, Drawer (Dialog plein écran mobile), SearchInput, Chip, FilterBar, SegmentedControl, DataList, Toaster (`toast()`).
- Formatage monétaire : `euros()` dans `src/lib/format.ts`.
- Police : Inter variable (OFL) self-hostée en woff2 dans `static/fonts/` (licence incluse), fallback `system-ui`.
- Graphes : SVG maison, couleurs via `var(--chart-*)`.

## Tokens (clair / sombre)

| Token                             | Clair                      | Sombre        |
| --------------------------------- | -------------------------- | ------------- |
| bg                                | #FAFAFA                    | #0A0A0B       |
| surface                           | #FFFFFF                    | #141416       |
| surface-2                         | #F4F4F5                    | #1C1C1F       |
| border                            | #E4E4E7                    | #27272A       |
| fg                                | #09090B                    | #FAFAFA       |
| fg-muted                          | #71717A                    | #A1A1AA       |
| accent                            | #6D28D9                    | #8B5CF6       |
| accent-fg                         | #FFFFFF                    | #FFFFFF       |
| success                           | #059669                    | #34D399       |
| warning                           | #D97706                    | #FBBF24       |
| danger                            | #DC2626                    | #F87171       |
| ring                              | accent à 40 %              | accent à 40 % |
| chart-revenue / purchases / other | success / accent / warning | idem          |
| chart-shipping                    | #C4B5FD                    | #4C1D95       |

- Typo : Inter, échelle 12 / 14 / 16 / 20 / 24 / 32 px ; titres 600 avec tracking -0.02em ; chiffres en `tabular-nums`.
- Espacements : grille de 4 px, padding de page 24 px mobile / 40 px desktop, cartes 20–24 px.
- Rayons : sm 6 px (badges), md 10 px (inputs, boutons), lg 14 px (cartes), xl 20 px (dialogs), full (pills).
- Ombres : très légères en clair (sm `0 1px 2px rgb(0 0 0/.04)`, md `0 4px 12px rgb(0 0 0/.06)`, lg pour dialogs) ; aucune en sombre, on s'appuie sur border + surface-2.

## Couleurs en dur recensées (avant la #13)

- `src/lib/dashboard/metrics.ts` : couleurs des catégories (`#7c3aed`, `#c4b5fd`, `#f59e0b`) → `var(--chart-*)`.
- `src/routes/+page.svelte` (SVG du graphe) : `#f3f4f6`, `#9ca3af`, `#10b981`, `#6b7280` → `var(--border)`, `var(--fg-muted)`, `var(--chart-revenue)`.
- `src/lib/components/listings/ListingStacks.svelte` (`<style>`) : `#ddd6fe`, `#ede9fe`, `#f5f3ff` → `var(--border)`, `var(--surface-2)`, `var(--surface)`.

Ces trois emplacements sont migrés vers les tokens dans la #13. Les classes `violet-*` / `gray-*` des écrans existants restent à migrer écran par écran dans la #14, en réutilisant les composants `ui/`.

## Activation du thème sombre

Activé à la fin de la #14 : `DARK_MODE_ENABLED = true` dans `src/lib/theme.ts` affiche le `ThemeToggle`, et le script anti-flash d'`app.html` (dans `<head>`) lit `localStorage.theme` / `prefers-color-scheme` et ajoute `dark` sur `<html>` avant le premier rendu. Sur mobile, le toggle est dans une barre haute en flux normal (pas en `fixed`), donc il ne chevauche pas le bouton « + Ajouter ».

## Tests

`npm test` (vitest + jsdom + @testing-library/svelte, devDependencies uniquement) : `format.test.ts` et `components/ui/ui.test.ts`.
