# Code Review 2026-07-18

> Progress: 5/13 · Created: 2026-07-18 · Updated: 2026-07-18
> Branch: `main` · Scope: Full project review

## A. Architecture

| ID | Task | Status | Date |
| --- | --- | --- | --- |
| A1 | Split useChat into smaller hooks | ✅ done | 2026-07-18 |
| A2 | Eliminate dual source of truth for config | ✅ done | 2026-07-18 |
| A3 | Introduce an Ink error boundary | ⬜ todo | — |
| A4 | Add environment variable support for Ollama URL | ⬜ todo | — |
| A5 | Pass `OLLAMA_BASE_URL` to ChatOllama in LlmModelService | ⬜ todo | — |

### Notes

- **A1** — Done: `useChat` (278 lines) split into three module-local
  sub-hooks under `src/hooks/use-chat/hooks/`: `useMessages` (transcript CRUD +
  history cap + reset), `useTranslation` (loading/stats/abort + streaming),
  `useModel` (model/temp state, pickers, startup resolution, availability
  ref). The main hook now only parses input and dispatches `/commands` to the
  sub-hook actions (~120 lines). Public API of `useChat` unchanged, so
  `app.component.tsx` and the existing `use-chat.test.ts` (now the composition
  integration test) are untouched. Each sub-hook got its own test file (+20
  tests, 133 total). `WELCOME_MESSAGE` moved into the useMessages module;
  `use-chat.model.ts` removed. Pure refactor — no behavior change. Stale-stats
  clearing on error/cancel/clear stays out of scope (that is B4).
- **A2** — Done (absorbs B3): `LlmModelService` is now the single source of
  truth for the active model + temperature. It holds them as private fields
  (seeded from `defaultModelConfig`), and `setModel`/`setTemperature` rebuild
  the chain and `notify()` subscribers. Added an external-store surface
  (`subscribe` / `getModel` / `getTemperature`, arrow fields for stable
  identity); `useModel` reads them via `useSyncExternalStore`, so the UI
  re-renders on change with no duplicate in `App` state. Removed the mutable
  global `config` object entirely (`@/config` now exports only
  `defaultModelConfig` + `appConfig`); `App` dropped its `model`/`temp`
  `useState` and `useChat` no longer takes `setModel`/`setTemp`. CLAUDE.md
  updated (config layout + LLM-service single-source note). Verify + build
  green (136 tests).
- **A3** — Ink supports error boundaries via `react-error-boundary` or a
  custom wrapper. Currently any render crash (e.g., corrupt message state)
  kills the app with no recovery. Add a boundary around `<App>` in
  `src/index.tsx`.
- **A4** — `OLLAMA_BASE_URL` is hardcoded in `src/config/app-config/app-config.ts`.
  Add `process.env.OLLAMA_URL ??` fallback so users can point to a remote
  Ollama host without editing source. Depends on A5 — without it the env var
  would only affect `/api/tags`, not inference.
- **A5** — `rebuild()` creates `new ChatOllama({ model, temperature })`
  **without** `baseUrl`, so inference relies on the LangChain library default
  (`http://localhost:11434`) while `fetchTags()` uses
  `appConfig.OLLAMA_BASE_URL`. Today the two coincide by luck; any change to
  the config (or A4's env var) would silently split model checks and
  inference across different hosts. Pass
  `baseUrl: appConfig.OLLAMA_BASE_URL` in `rebuild()`.

## B. Code quality

| ID | Task | Status | Date |
| --- | --- | --- | --- |
| B1 | Refactor parseCommand to use ts-pattern | 💬 discuss | — |
| B2 | Replace manual abort listener with AbortSignal.any | ⬜ todo | — |
| B3 | Remove unnecessary config mutation from LlmModelService | ❌ wontdo | 2026-07-18 |
| B4 | Reset stale StatsBar after error, cancel, and /clear | ⬜ todo | — |

### Notes

- **B1** — 15 sequential `if/else` blocks when `ts-pattern` is already a
  dependency. Downgraded to discuss: `match` on strings needs `.when()`
  guards with `startsWith`, which is no shorter, and branch order still
  matters — ts-pattern would not actually prevent the mis-ordering risk the
  original note cited. The current chain is readable; only do this if
  consistency with the rest of the codebase is valued over brevity.
- **B2** — In `llm-model.service.ts:translate()`, the AbortSignal listener
  is added/removed inside the retry callback. Simply hoisting the listener
  out of the retry is **not** viable: the `AbortController` is per-attempt
  (abort is one-shot — after attempt 1 times out, attempt 2 needs a fresh
  controller), so the listener must reference the current attempt's
  controller. The right fix is
  `AbortSignal.any([signal, AbortSignal.timeout(ms)])` per attempt — the
  manual listener, `setTimeout`, and teardown all disappear (Bun supports
  both APIs).
- **B3** — Wontdo as a separate task: this is the same root cause as A2
  (dual source of truth between mutable `config` and React state). Folded
  into A2's fix; keeping both would double-count the work.
- **B4** — `App` renders `StatsBar` whenever `stats` is non-null and not
  loading. After a cancelled/failed translation (and after `/clear`) the
  stats from the *previous successful* request reappear under the chat,
  which reads as stats for the failed one. Clear `stats` at the start of
  `handleTranslate` (or on error/cancel) and in `clear()`.

## C. Testing

| ID | Task | Status | Date |
| --- | --- | --- | --- |
| C1 | Add smoke test for the full App component | ✅ done | 2026-07-18 |
| C2 | Add render/interaction tests for the Ink components | ⬜ todo | — |

### Notes

- **C1** — Done: added `src/app/app.test.ts` rendering the full `<App />`
  tree via `ink-testing-library` (`render` + `lastFrame()`) with a stubbed
  `llmModelService`. Asserts the composed frame contains the settings bar
  (`english → polish`), the welcome commands table, and the prompt
  placeholder, and that the startup model resolution fires from the mount
  effect. This exercises the service→hook→component wiring (prop names, state
  sync) that the unit tests mocked away. `ink-testing-library@4` added as a
  devDependency; kept as `.test.ts` (no JSX, `React.createElement`) so it
  matches the `src/**/*.test.ts` vitest include and the naming convention.
- **C2** — Follow-up unlocked by ink-testing-library: `stdin.write()` can
  drive the interactive components — `InputBar` autocomplete (↑/↓/Tab/Esc),
  `TempPicker` (←/→), `ModelPicker` selection — which currently have no
  render-level coverage (only the hook logic is tested). Lower priority than
  the A/B refactors.

## D. Linter / cleanup

| ID | Task | Status | Date |
| --- | --- | --- | --- |
| D1 | Remove Russian words from .claude/skills/plan/SKILL.md | ✅ done | 2026-07-18 |
| D2 | Purge all Russia-related references from the codebase | ✅ done | 2026-07-18 |

### Notes

- **D1** — Fixed earlier in the session: translated `Статус`, `Заметки`,
  `Задача`, `Дата`, `Прогресс`, `Обновлён`, `Удалить`, `должен быть удалён`
  to English.
- **D2** — Grep for cyrillic `[а-яА-ЯёЁ]` across all source (`*.ts`, `*.tsx`,
  `*.json`, `*.toml`, `*.yml`) found **zero matches**. The word "russian"
  appears only as a language name in test cases (`parse-command.test.ts`),
  which is legitimate. Grep for `росси`, `russia`, `моск`, `moscow` — clean.
  No action needed.

## E. UI / UX

| ID | Task | Status | Date |
| --- | --- | --- | --- |
| E1 | Render command suggestions above the prompt (opencode-style) | ⬜ todo | — |

### Notes

- **E1** — The autocomplete dropdown currently renders *below* the input;
  opencode and Claude Code render it *above* the prompt, keeping the prompt
  pinned to the bottom edge. Implementation: move `<CommandSuggestions>`
  before the prompt row inside `InputBar`'s column Box. The original
  below-the-prompt choice (comment in `input-bar.component.tsx`) predates the
  `minHeight={rows}` + `justifyContent="flex-end"` fix in
  `app.component.tsx` — with the frame now held at full terminal height and
  the prompt as the last element, opening the list above it should no longer
  make the prompt jump or leave stale blank regions. Verify in a real
  terminal (both short and full chat history) before removing the old
  comment; optionally restyle the selected row as a full-width inverse bar
  like opencode.

## Execution order

1. **A2** — dual config source is the most likely source of runtime bugs
   (absorbs B3).
2. **A1 + B2** — splitting useChat is the largest refactor; the
   AbortSignal cleanup naturally falls out of it.
3. **B4** — small self-contained fix, can ride along with A1.
4. **A5 + A4 + A3** — baseUrl first (A4 depends on it), then env var and
   error boundary; all additive, no refactoring.
5. **E1** — self-contained UI tweak; needs manual terminal verification.
6. **C2** — component render/interaction tests (C1 smoke test already done).
7. **B1** — pending decision; do last if at all.

## History

- 2026-07-18 — Initial code review plan created; 15 files inspected, 11
  findings across 4 categories.
- 2026-07-18 — Re-review of the full project: header fixed (branch, progress
  2/11); B3 → wontdo (merged into A2); B1 → discuss (ts-pattern gain
  questionable); B2 re-scoped to `AbortSignal.any`; new findings A5 (ChatOllama
  missing `baseUrl`) and B4 (stale StatsBar); execution order updated.
- 2026-07-18 — E1 added: render command suggestions above the prompt
  (opencode / Claude Code style).
- 2026-07-18 — A1 done: useChat split into useMessages / useTranslation /
  useModel sub-hooks (module-local), each with its own tests (+20, 133 total);
  verify + build green. Pure refactor, public API unchanged.
- 2026-07-18 — C1 done: App smoke test via ink-testing-library (134 tests);
  added `ink-testing-library` devDependency. C2 added as follow-up for
  component render/interaction tests.
- 2026-07-18 — A2 done (absorbs B3): LlmModelService is the single source of
  truth for active model/temp; React reads it via useSyncExternalStore; mutable
  global `config` removed. 136 tests, verify + build green.
