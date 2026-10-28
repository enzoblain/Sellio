# Conventions du projet

## UI / design system

- Pas de couleur brute (`violet-950`, `gray-500`, hex, `rgb()`) : on passe par les tokens (`bg-surface`, `text-fg-muted`, `border-border`, `text-danger`, `var(--chart-*)`…), définis dans `src/routes/layout.css`.
- Avant de recréer un composant (bouton, input, carte, dialog, badge, empty/error state, icône), on réutilise ceux de `src/lib/components/ui/`.
- Les montants passent par `euros()` de `src/lib/format.ts`.
- Détails et tokens : `docs/ui-refonte.md`.
