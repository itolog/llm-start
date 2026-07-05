# Improvements & Development Roadmap

> Progress: 2/9 · Created: 2026-07-05 · Updated: 2026-07-05
> Branch: `main` · Scope: DX tooling, test coverage, and feature roadmap for the TUI translator

## A. Tooling & DX

| ID | Task | Status | Date |
| --- | --- | --- | --- |
| A1 | Automate `package.json` key sorting | 💬 discuss | — |
| A2 | Add GitHub Actions CI running `bun run verify` + coverage on push/PR | ⬜ todo | — |
| A3 | Add a coverage threshold gate to `vitest.config.ts` | ✅ done | 2026-07-05 |

### Notes

- **A1** — Goal: canonical key order in `package.json` (currently only whitespace-formatted by oxfmt, key order is manual — e.g. `lint:format` sits out of order at the end of `scripts`). Considered `bunx sort-package-json` (script `deps:sort` + a pre-commit job that sorts & re-stages, mirroring the oxlint/oxfmt jobs). Deferred: the user prefers not to add a permanent devDependency, and `bunx` on-demand plus a hook may not be worth the churn for a solo project. Decide: (a) `bunx` on-demand + hook, (b) leave manual, or (c) accept the devDependency. Keep as `💬 discuss` until chosen. Note: knip may flag a `bunx`-only binary as unlisted — verify `lint:unused` stays green if wired.
- **A2** — No CI exists today. A minimal workflow (`bun install` → `bun run verify`) would gate PRs the same way the Lefthook pre-push does locally. **Must also run the coverage gate** (A3) — but under **node**, not bun (`vitest run --coverage` / a node step), since the v8 coverage provider collects 0 tests under the bun runtime.
- **A3** — Done in `vitest.config.ts`: `thresholds` (statements 90 / branches 85 / functions 85 / lines 90) plus coverage `exclude`s for presentational `*.component.tsx` views (no logic, exercised via hook tests) and the static `llm-prompt.ts` (mocked in tests). Current actuals: 94 / 90 / 87 / 94. To make the baseline honest, added 5 `checkModelAvailable` tests (fetch stubbed), lifting the service from 55% → ~94%. **Decision — the gate is NOT wired into `verify`/pre-push:** the project is bun-only, and vitest's v8 coverage collects no tests under bun (and `bun run …` shims `node` in child PATH, so even a direct `vitest` child runs under bun). Enforcement is therefore deferred to CI (A2) under node. Locally the gate runs on demand via `vitest run --coverage` executed by node (not `bun run test:coverage`). Rejected alternatives: adding npm to the hooks (user wants bun-only) and the istanbul provider (extra devDependency, unverified under bun).

## B. Testing

| ID | Task | Status | Date |
| --- | --- | --- | --- |
| B1 | Unit-test `LlmModelService.translate` orchestration | ✅ done | 2026-07-05 |

### Notes

- **B1** — Done: 6 tests in `llm-model.test.ts` (methods-exist + 5 orchestration cases: cleaned text + prompt vars, retry-once-then-resolve, no-retry-on-`AbortError`, external-signal abort, timeout abort). Chain stubbed via `vi.mock("./llm-prompt")` returning a fake `pipe().invoke` — no Ollama connection. Retry/timeout cases use `vi.useFakeTimers()` + `advanceTimersByTimeAsync` to skip the 1000 ms retry delay and 60000 ms timeout.

## C. Features

| ID | Task | Status | Date |
| --- | --- | --- | --- |
| C1 | Runtime `/model <name>` command | ⬜ todo | — |
| C2 | Runtime `/temp <value>` command | ⬜ todo | — |
| C3 | Stream translation output token-by-token | ⬜ todo | — |
| C4 | Persist chat history across sessions | ⬜ todo | — |
| C5 | Show active model/temperature in the settings bar | ⬜ todo | — |

### Notes

- **C1 / C2** — `default-config.ts` already anticipates these ("runtime overrides (e.g. /model, /temp commands) will layer on top of this later"). Needs a runtime-mutable config layer over `defaultConfig`, re-instantiating (or reconfiguring) `LlmModelService` when `MODEL`/`LLM_TEMP` change, plus new entries in `parseCommand` + the `match` in `useChat`. Re-run `checkModelAvailable()` after a `/model` switch.
- **C3** — Replace `chain.invoke` with `chain.stream` in the service, surfacing partial text to the hook (e.g. a callback or async iterator) so the bot message fills in live. Keep timeout/abort/retry semantics; retry-mid-stream needs a decision.
- **C4** — Persist messages (bounded by `MAX_MESSAGES`) to disk and reload on startup; decide storage location and whether `/clear` also wipes the persisted file.

## Execution order

1. **B1** — lock down the freshly refactored service before building on it.
2. **A2 / A3** — cheap CI + coverage safety net for everything after.
3. **A1** — resolve the sorting decision (low urgency).
4. **C1 / C2 / C5** — runtime config is the most-requested UX gap and unblocks C5.
5. **C3 / C4** — larger UX features, sequenced last.

## History

- 2026-07-05 — Plan created after the `llm-model` → `services/llm-model` service refactor; captures the deferred `package.json` sorting decision (A1) as `💬 discuss`.
- 2026-07-05 — B1 done: added 5 orchestration tests for `LlmModelService.translate` (chain mocked, fake timers); suite 53 → 58 tests, `verify` green.
- 2026-07-05 — A3 done: coverage `thresholds` + view/prompt `exclude`s in `vitest.config.ts`; added 5 `checkModelAvailable` tests (58 → 63). Gate kept out of the bun `verify`/pre-push (v8 coverage yields 0 tests under bun); enforcement deferred to CI (A2) under node. `verify` stays bun-native (lint + `bun run test`).
