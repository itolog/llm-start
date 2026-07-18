# Code Review 2026-07-18

> Progress: 11/13 · Created: 2026-07-18 · Updated: 2026-07-18
> Branch: `main` · Scope: Full project review

## A. Architecture

| ID | Task | Status | Date |
| --- | --- | --- | --- |
| A1 | Split useChat into smaller hooks | ✅ done | 2026-07-18 |
| A2 | Eliminate dual source of truth for config | ✅ done | 2026-07-18 |
| A3 | Introduce an Ink error boundary | ✅ done | 2026-07-18 |
| A4 | Add environment variable support for Ollama URL | ✅ done | 2026-07-18 |
| A5 | Pass `OLLAMA_BASE_URL` to ChatOllama in LlmModelService | ✅ done | 2026-07-18 |

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
- **A3** — Done: added `src/components/error-boundary/` — a class component
  (no hook equivalent for error boundaries) using `getDerivedStateFromError`
  to show a contained red fallback card ("Something went wrong" + the error
  message + Ctrl+C hint) instead of tearing down Ink with a raw stack trace.
  Wired around `<App>` in `src/index.tsx`. No extra dependency
  (`react-error-boundary` not needed). Tested via ink-testing-library (renders
  children normally; renders the fallback on a child throw).
- **A4** — Done: `OLLAMA_BASE_URL` now reads `process.env.OLLAMA_URL`, using
  `||` (not `??`) so an unset *or* empty value falls back to
  `http://localhost:11434`. Users can target a remote Ollama host without
  editing source. Tested by stubbing the env + re-importing the module.
- **A5** — Done: `rebuild()` now passes `baseUrl: appConfig.OLLAMA_BASE_URL`
  to `ChatOllama`, so inference and the `/api/tags` checks hit the same host
  (and honour A4's `OLLAMA_URL`). Verified at runtime: with
  `OLLAMA_URL=http://remote:9999`, the service's `ChatOllama.baseUrl` resolves
  to that host.

## B. Code quality

| ID | Task | Status | Date |
| --- | --- | --- | --- |
| B1 | Refactor parseCommand to use ts-pattern | 💬 discuss | — |
| B2 | Replace manual abort listener with AbortSignal.any | ✅ done | 2026-07-18 |
| B3 | Remove unnecessary config mutation from LlmModelService | ❌ wontdo | 2026-07-18 |
| B4 | Reset stale StatsBar after error, cancel, and /clear | ✅ done | 2026-07-18 |

### Notes

- **B1** — 15 sequential `if/else` blocks when `ts-pattern` is already a
  dependency. Downgraded to discuss: `match` on strings needs `.when()`
  guards with `startsWith`, which is no shorter, and branch order still
  matters — ts-pattern would not actually prevent the mis-ordering risk the
  original note cited. The current chain is readable; only do this if
  consistency with the rest of the codebase is valued over brevity.
- **B2** — Done: each attempt now builds one `attemptSignal` via
  `AbortSignal.any([signal, timeoutController.signal])`, dropping the manual
  `onAbort` + `add`/`removeEventListener` bookkeeping and the
  `if (signal.aborted)` branch (AbortSignal.any starts aborted if the caller's
  signal already is). **Kept `setTimeout` + a timeout `AbortController`** rather
  than `AbortSignal.timeout(ms)` on purpose: (1) `AbortSignal.timeout` aborts
  with a `TimeoutError`, which would flip the retry (`withRetry` skips only
  `AbortError`) and user-facing message semantics; (2) it uses a native timer
  that vitest fake timers don't advance, breaking the 60s timeout test.
  timeoutController.abort() keeps the `AbortError` reason, so behavior +
  all tests are unchanged.
- **B3** — Wontdo as a separate task: this is the same root cause as A2
  (dual source of truth between mutable `config` and React state). Folded
  into A2's fix; keeping both would double-count the work.
- **B4** — Done: `handleTranslate` now calls `setStats(null)` up front (so a
  cancelled/failed request leaves no stats; success restores them below), and
  `useTranslation` exposes `resetStats`. `useChat` composes a `clearChat` that
  runs both `clear()` (transcript) and `resetStats()`, wired to `/clear` and
  returned as `clear`. Tests added for the fail-clears-stats, resetStats, and
  `/clear`-clears-stats paths (143 total).

## C. Testing

| ID | Task | Status | Date |
| --- | --- | --- | --- |
| C1 | Add smoke test for the full App component | ✅ done | 2026-07-18 |
| C2 | Add render/interaction tests for the Ink components | ✅ done | 2026-07-18 |

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
- **C2** — Done: render/interaction tests for the three interactive
  components via `ink-testing-library` `stdin.write()` — `temp-picker.test.ts`
  (←/→ adjust + clamp, Enter applies, Esc cancels), `model-picker.test.ts`
  (list, ↓ highlight, Enter selects, Esc cancels), `input-bar.test.ts`
  (suggestions show/hide, prefix narrowing, ↓ + Tab/Enter complete, Esc
  dismiss, Enter submits plain text). +19 tests (162 total). Two gotchas
  captured for future component tests: (1) build control sequences from
  `String.fromCharCode(27)` so the source has no invisible bytes; (2) ink
  attaches its stdin listener in a mount effect and flushes asynchronously, so
  `await` a short `tick()` before and after each `stdin.write`.

## D. Linter / cleanup

| ID | Task | Status | Date |
| --- | --- | --- | --- |
| D1 | Remove Russian words from .claude/skills/plan/SKILL.md | ✅ done | 2026-07-18 |
| D2 | Purge all Russia-related references from the codebase | ✅ done | 2026-07-18 |

### Notes

- **D1** — Translated the Cyrillic column headers/labels in the plan-format
  skill (status, notes, task, date, progress, updated, delete, "must be
  deleted") to English. A follow-up pass later caught one leftover the first
  sweep missed: the update-rule step referenced a `## История` section — fixed
  to `## History` (matches the English template heading).
- **D2** — Reopened: the initial "no action needed" call was wrong. `parse-command.test.ts`
  used `russian` as the example language throughout (`/from`, priority tests),
  and the plan skill still had one `Russian` mention. Purged: test examples
  switched to `german` (consistent with `use-chat.test.ts`); SKILL.md's
  illustrative "a chat in Russian" → "a chat in Spanish". Whole-project grep
  for `russia|russian|росси|moscow` **and** any Cyrillic `[а-яА-ЯёЁ]` across
  `src/`, `docs/`, `.claude/`, `README.md`, `CLAUDE.md` now returns zero
  matches. Task titles below keep the word "Russia" only as the name of the
  cleanup work.

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
4. **A5 + A4 + A3** — done: baseUrl passthrough, OLLAMA_URL env var, and the
   Ink error boundary; all additive, no refactoring.
5. **E1** — self-contained UI tweak; needs manual terminal verification.
6. **C2** — done: component render/interaction tests.
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
- 2026-07-18 — A3/A4/A5 done: Ink error boundary around `<App>`; `OLLAMA_URL`
  env var for the Ollama host; `baseUrl` passed to ChatOllama (inference +
  /api/tags share one host). 140 tests, verify + build green; env→baseUrl flow
  verified at runtime.
- 2026-07-18 — B2 done: per-attempt AbortSignal.any replaces the manual abort
  listener; timeout kept on setTimeout+controller to preserve AbortError
  semantics and fake-timer tests. 140 tests, verify + build green.
- 2026-07-18 — B4 done: stats cleared at the start of each translation and via
  resetStats; /clear now wipes stats too (clearChat). 143 tests, verify green.
- 2026-07-18 — D2 reopened + actually finished: `russian` test examples → `german`,
  SKILL.md "Russian" → "Spanish", and a leftover `## История` → `## History`
  (D1 miss). Whole-project grep for Russia refs and Cyrillic is now clean.
- 2026-07-18 — C2 done: interaction tests for TempPicker / ModelPicker /
  InputBar via ink-testing-library stdin.write (+19; 162 total). verify green.
