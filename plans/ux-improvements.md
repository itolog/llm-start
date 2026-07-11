# UX Improvements: SettingsBar & Command Autocomplete

> Progress: 3/8 · Created: 2026-07-11 · Updated: 2026-07-11
> Branch: `main` · Scope: make SettingsBar readable & always visible; add `/`-command autocomplete like Claude Code

## A. SettingsBar readability & pinning

Two problems today (`settings-bar.component.tsx`): (1) a single gray `Text` line
is hard to scan; (2) the bar sits above `MessageList` in normal flow, so it
scrolls off the top once the chat fills the terminal — yet it holds the always-
relevant state (langs / model / temp).

| ID | Task | Status | Date |
| --- | --- | --- | --- |
| A1 | Redesign SettingsBar as labelled "pills" (colored badges) | ✅ done | 2026-07-11 |
| A2 | Wrap `MessageList` in Ink `<Static>` so history goes to scrollback | ❌ wontdo | 2026-07-11 |
| A3 | Move SettingsBar into the pinned bottom region (next to InputBar) | ✅ done | 2026-07-11 |
| A4 | Handle narrow-terminal wrap for the pill row | ✅ done | 2026-07-11 |

### Notes

- **A1** — Render each field as a pill: `<Text backgroundColor color="black"> from ›
  english </Text>` with a per-field accent color (e.g. lang = cyan, model =
  magenta, temp = yellow), separated by a single space. Keep it a pure component;
  extend `SettingsBarProps` only if a compact/full flag is needed. No external
  deps — Ink `Text` background is enough. Mirror the visual language of
  `ModelPicker` for consistency.
- **A2** — ❌ wontdo. `<Static>` is deliberately avoided in
  `message-list.component.tsx` (documented there): history is mutable (`/clear`,
  model-error replace, `MAX_MESSAGES` head-trim) and `<Static>` only ever appends,
  which silently breaks all three. A3 does not need it — moving the bar to the end
  of the render tree already keeps it on screen (Ink shows the bottom of the
  output). Not doing this.
- **A3** — Move SettingsBar out from under `Header` to the end of the tree, just
  above the InputBar/picker slot. Ink shows the tail of the output, so the last
  block stays visible regardless of history length; Header + old messages scroll
  up as normal. Order chosen: SettingsBar directly above the prompt.
- **A4** — On a narrow terminal the pill row must wrap gracefully (Box
  `flexWrap="wrap"`) rather than truncate. Test at ~40 cols.

## B. Command autocomplete (Claude-Code style)

When the input starts with `/`, show a live-filtered list of commands above the
prompt; arrow keys move the selection, Tab/Enter completes it, Esc dismisses.
The empty `src/components/input-bar/utils/suggest-commands/` folder is the
intended home for the matching logic.

| ID | Task | Status | Date |
| --- | --- | --- | --- |
| B1 | Single source of truth for the command list (usage + description) | ⬜ todo | — |
| B2 | `suggest-commands` util: filter commands by the typed `/`-prefix | ⬜ todo | — |
| B3 | Suggestions dropdown component (highlighted selection) | ⬜ todo | — |
| B4 | Wire keyboard nav into InputBar (↑/↓ select, Tab/Enter complete, Esc close) | ⬜ todo | — |
| B5 | Tests for `suggest-commands` matching | ⬜ todo | — |

### Notes

- **B1** — `COMMANDS` already lives in `commands-help/commands-help.model.ts`.
  Reuse it as the canonical list (add command `name` like `/from` if the current
  `usage`/`description` shape isn't enough for matching) so `/help`, autocomplete,
  and `parseCommand` never drift. Do not duplicate the list inside input-bar.
- **B2** — Pure function: `(input: string) => CommandHelp[]`. Return `[]` when the
  input doesn't start with `/` or a space is already typed (argument stage, no
  longer completing the command token). Case-insensitive prefix match on the
  command name. Lives in `input-bar/utils/suggest-commands/` (single-use → module-
  local per the util-placement convention).
- **B3** — New module `components/command-suggestions/` (or keep it inside
  input-bar if only used there). Renders rows `usage — description`, highlights
  the active index (inverse/backgroundColor). Reuse the row style from
  `CommandsHelp` for consistency.
- **B4** — InputBar becomes stateful: track `selectedIndex` and whether the
  dropdown is open. Add a `useInput` handler for ↑/↓/Tab/Esc; it must not fight
  `ink-text-input`'s own key handling — intercept nav keys only while suggestions
  are open, and Tab/Enter should replace the input value with the completed
  command (e.g. `/mo` → `/model `). This grows `InputBarProps`/InputBar internals;
  keep `TextInput` for text entry.
- **B5** — Cover: `/` → all commands; `/te` → only `/temp`; `/temp ` (trailing
  space) → `[]`; non-slash text → `[]`; case-insensitivity. Vitest, co-located.

## Execution order

1. **A1** — quick, self-contained readability win; no structural change.
2. **A3 → A4** — move the bar to the bottom region and make the pill row wrap.
   (A2/`<Static>` dropped — see note.)
3. **B1 → B2 → B5** — logic + tests first (no UI risk).
4. **B3 → B4** — UI and key wiring last, on top of a stable bottom region.

## Open questions

- **A3 order** — SettingsBar above or below the prompt? (recommend: above.)
- **B3 placement** — standalone `command-suggestions` module vs. inline in
  input-bar. Standalone is more testable; inline is less ceremony.

## History

- 2026-07-11 — plan created (A1–A4, B1–B5).
- 2026-07-11 — A2 marked wontdo: `<Static>` conflicts with the mutable-history
  design documented in `message-list.component.tsx`; A3 (move to tail) achieves
  the "always visible" goal without it.
- 2026-07-11 — A1/A3/A4 done: SettingsBar rebuilt as wrapping colored pills
  (`Pill` sub-component) and relocated to the tree tail above the prompt; verify
  green (lint/types/105 tests).
