# Improvements & Development Roadmap

> Progress: 6/10 · Created: 2026-07-05 · Updated: 2026-07-05
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
| C1 | Runtime `/model <name>` command | ✅ done | 2026-07-05 |
| C2 | Runtime `/temp <value>` command | ✅ done | 2026-07-05 |
| C3 | Stream translation output token-by-token | ⬜ todo | — |
| C4 | Persist chat history across sessions | ⬜ todo | — |
| C5 | Show active model/temperature in the settings bar | ✅ done | 2026-07-05 |
| C6 | Add a stats bar above the input (elapsed time, token usage, tok/s) | ✅ done | 2026-07-05 |

### Notes

- **C1 / C2 / C5** — Done. `config` is now a mutable copy of `defaultConfig`; `LlmModelService` gained `setModel`/`setTemperature` that mutate config and `rebuild()` the `ChatOllama` + chain. `parseCommand` handles `/model <name>` and `/temp <0-2>` (range-validated) → new `Command` variants; `useChat` applies them via the service + React setters, and re-runs `verifyModel()` after a `/model` switch (extracted from the mount effect). `App` holds `model`/`temp` state (seeded from `config`) and `SettingsBar` renders `… │ {model} @ temp {temp}`. Tests: +6 parseCommand (`/model`, `/temp`), +2 useChat handlers, +2 service reconfiguration (config restored to avoid cross-test leakage); suite 63 → 77.
- **C3** — Replace `chain.invoke` with `chain.stream` in the service, surfacing partial text to the hook (e.g. a callback or async iterator) so the bot message fills in live. Keep timeout/abort/retry semantics; retry-mid-stream needs a decision.
- **C4** — Persist messages (bounded by `MAX_MESSAGES`) to disk and reload on startup; decide storage location and whether `/clear` also wipes the persisted file.
- **C6** — New stats bar rendered above the `InputBar` showing per-translation metrics:
  1. **Elapsed time** — wall-clock duration of the last translation (start on submit, stop on completion/abort).
  2. **Token usage** — tokens spent on the request (prompt + completion; surface `promptTokens`/`completionTokens`/`totalTokens` from the Ollama response metadata — `eval_count`/`prompt_eval_count`).
  3. **Tokens/second** — generation throughput (`completionTokens / elapsedSeconds`), and possibly other derived metrics (e.g. total-tokens counter across the session).
  Source the metrics from ChatOllama response metadata (`response.usage_metadata` / `response.response_metadata` — LangChain surfaces Ollama's `eval_count`, `eval_duration`, `prompt_eval_count`). Decide: where metrics live (extend `LlmModelService.translate` to return usage alongside text, or expose via callback), how they flow to `App`/the bar (new state vs. `useChat` return), and whether the bar is always visible or only after the first translation. **Note the interaction with C3 (streaming):** if streaming lands first, tok/s can update live during the stream; otherwise compute once on completion. Placement is a new `stats-bar/` module folder (mirrors `settings-bar/`), rendered between the message list and `InputBar`.

  **Done (2026-07-05):** `LlmModelService.translate` now returns `TranslationResult` (`{ text, stats }`) instead of a bare string. `TranslationStats` = `elapsedMs` (wall-clock, `Date.now()` around `withRetry`), `promptTokens`/`completionTokens`/`totalTokens` (a `buildStats` helper reads `usage_metadata.input_tokens/output_tokens/total_tokens`, falling back to Ollama's `response_metadata.prompt_eval_count`/`eval_count`, defaulting to 0), and `tokensPerSecond` (`completionTokens / elapsedSeconds`, 0 when elapsed is 0). `useChat` holds a `stats` state (`TranslationStats | null`), set on successful translation and returned from the hook. `App` renders the new `stats-bar/` module (`StatsBar`, `dimColor` text mirroring `settings-bar/`) between the message list and `InputBar`, **only after the first translation** (`{stats && <StatsBar …/>}`) — computed once on completion (not updated on abort/error). Streaming (C3) not yet landed, so tok/s is a single post-completion figure. Suite 77 → 81 (+3 service stats tests, +1 useChat stats test); `verify` green.

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
- 2026-07-05 — C1/C2/C5 done: runtime `/model` + `/temp` commands over a mutable config + `LlmModelService.setModel`/`setTemperature` rebuild; settings bar shows model @ temp. Suite 63 → 77, `verify` green. C3 (streaming) and C4 (persistence) remain.
- 2026-07-05 — C6 added (todo): a stats bar above the input showing per-translation elapsed time, token usage, and tokens/second, sourced from ChatOllama response metadata. Interacts with C3 (live tok/s if streaming lands first).
- 2026-07-05 — C6 done: `translate` returns `{ text, stats }` (`TranslationStats`: elapsed, prompt/completion/total tokens, tok/s) via a `buildStats` helper (usage_metadata → Ollama response_metadata fallback → 0); `useChat` exposes a `stats` state; new `stats-bar/` module rendered after the first translation between the message list and input. Suite 77 → 81, `verify` green.
