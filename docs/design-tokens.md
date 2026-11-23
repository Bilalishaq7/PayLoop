# Design tokens and the light theme

Status: **partly migrated.** The core surfaces use tokens; a block of legacy
per-utility overrides remains for components that have not moved yet.

## How it works

Colours are CSS variables defined once in `web/app/globals.css`:

- `:root` holds the dark theme (the default).
- `html.light` redefines the same variables for the light theme. The theme
  toggle already adds or removes the `light` class (`ThemeProvider`).

Two kinds of token:

| Kind | Examples | Used as |
| --- | --- | --- |
| Channel tokens (`R G B`) | `--page`, `--surface`, `--fg`, `--fg-muted`, `--fg-subtle`, `--line` | Tailwind classes: `bg-page`, `bg-surface`, `text-fg`, `text-fg-muted`, `text-fg-subtle`, `border-line` (opacity works: `border-line/10`) |
| Component tokens (full colour, with their own alpha) | `--card-bg`, `--card-border`, `--ghost-*`, `--input-*`, `--label-fg` | Inside the component classes `.card`, `.btn-ghost`, `.input`, `.label` |

New components should use the semantic classes. They then work in both themes
without any `html.light` rule.

## What is migrated

- `body`, `.card`, `.btn-ghost`, `.input` and `.label` use tokens, and their
  `html.light` override rules were removed.

## What is not migrated yet

The remaining `html.light .some-utility` rules in `globals.css` re-colour raw
utilities (`text-slate-400`, `bg-white/5`, `border-white/10`,
`text-emerald-300`, ...). Components still use those utilities directly.

To finish the migration, one component at a time:

1. Replace the raw utility with the semantic one (`text-slate-400` becomes
   `text-fg-subtle`, `border-white/10` becomes `border-line/10`, and so on).
2. When no component uses a utility any more, delete its override rule.
3. When the override block is empty, delete it and this section.

Status colours (`emerald`, `amber`, `brand`) have no semantic token yet; add
`--success`, `--warning` and `--accent` channel tokens when they are migrated.

## Notes and limits

- The dark theme was written to match the previous values exactly. The light
  values for the migrated classes copy the previous overrides.
- Contrast has not been measured with a tool. When the override block is gone,
  check text against 4.5:1 in both themes.
- Tailwind's class-based `dark:` variant was not adopted: dark is the default
  and light is the toggled state, so the variables are swapped under `.light`.
