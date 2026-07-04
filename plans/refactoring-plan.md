# Lang-App TUI Refactoring Plan

Date: 2026-06-06 · actualized 2026-07-04 (completed items removed)
Branch: `feature/tui`
Scope: remaining refactoring + tests + docs + tooling

---

## Completed (kept as a changelog, not open work)

These sections are fully done and verified against the codebase — removed from
the actionable list:

- **Config + LLM chain** — the original env-validation design (§1: `dotenv`,
  `.env`, `validateEnv`, `parseConfig`, `TEMP`→`LLM_TEMP`) was **superseded**: the
  app now uses a static `src/config/default-config.ts` (`MODEL`, `LLM_TEMP`) with
  a `Config` type. No `process.env` in `src/`. The `translationChain` is created
  once at module level in `llm-model/llm-model.service.ts` (named exports, no
  `default`) — §2 done.
- **UI split (§3)** — `index.tsx` → `app/` + `components/` (header, settings-bar,
  message-list, message, loading-indicator, input-bar) + hooks (`use-chat`,
  `use-lang-settings`) + `commands/parse-command` + `types/message.type.ts`.
  Module-folder / kebab-case convention applied throughout. Message keys use
  `id: crypto.randomUUID()` (via `create-message`); `parseCommand` uses `slice(n)`.
- **Reliability (§4)** — `AbortController` per submit, 60s timeout
  (`LLM_TIMEOUT_MS`), `AbortError` → "Request cancelled", `withRetry` helper
  (`utils/with-retry`) with tests.
- **UX (§5)** — `MAX_MESSAGES` cap, plain `.map()` history (`<Static>` reverted),
  input placeholder, `checkModelAvailable()` via `GET /api/tags` with 5s timeout,
  model-unavailable error message, `/quit` alias.
- **Oxc migration (§12)** — `oxlint` + `oxfmt` in, ESLint + Prettier removed,
  configs `.oxlintrc.json` / `.oxfmtrc.json`, markdown excluded (oxfmt 0.56
  `DataCloneError`). Import-sort pass deferred to §14 (below).
- **Test infra baseline (§7 partial)** — `vitest` + `@testing-library/react` in
  devDeps, `vitest.config.ts`, `test` / `test:watch` scripts. Typecheck exists as
  `lint:types` (`tsc --noEmit`).

---

## Open Work

### A. Tests — fill the gaps (was §6 / §7)

- [x] Cover `clean-text` (`utils/clean-text`) with unit tests: empty string,
  whitespace-only, multiple line breaks, mixed content, edge cases (`\n\n\n`,
  `\n\n\n\n\n`). **DONE (2026-07-04)** — 9 cases.
- [x] Cover `create-message` (`utils/create-message`): role/text passthrough,
  unique `id` per call. **DONE (2026-07-04)** — 5 cases.
- [ ] Hook tests via mocked chain: `use-chat` (submit, error, cancel, clear) and
  `use-lang-settings` (`/from`, `/to` updates).
- [ ] Add `"test:coverage": "vitest run --coverage"` script. Target for
  `clean-text` / `parse-command` / `with-retry` — 100% lines.

### B. Dependency cleanup (was §8)

- [ ] Remove `ts-node` from devDeps — nothing references it (`bun` runs `.tsx`
  directly). Verify `npm run verify` + `npm run build` after removal.
- [x] ~~Remove `nodemon`~~ — already gone.
- [x] ~~Keep `concurrently`~~ — used as `conc` in `lint` / `verify` scripts.

### C. Documentation (was §9) — **DONE (2026-07-04)**

`README.md` rewritten to match reality:

- [x] Config path fixed → `src/config/default-config.ts`; model default
  `gemma4:12b-mlx`; `constants.ts` noted for endpoint/timeouts.
- [x] Architecture section paths corrected (`src/app/`, `src/llm-model/`,
  `src/utils/`, module-folder convention), Bun documented as runtime/PM/bundler.
- [x] Full "Commands" section added: `/from`, `/to`, `/clear`, `/help`,
  `/exit` (`/quit`); test + build commands documented.
- [x] `CLAUDE.md` — committed and already matches the current structure.

### D. Path aliases (was §14)

`tsconfig.json` currently has only the `react-devtools-core` stub alias — no
`@/*`.

- [ ] Add `"@/*": ["./src/*"]` to `tsconfig.json` `paths`.
- [ ] Wire vitest to resolve it (vitest does **not** read `tsconfig` `paths`): add
  `vite-tsconfig-paths` or a `resolve.alias` in `vitest.config.ts`. **Verify tests
  pass before rewriting any imports — main risk.**
- [ ] Rewrite **cross-module** imports to `@/…`; keep **intra-module** imports
  relative (`./header.component`, `./header.type`).
- [ ] Update `CLAUDE.md` (alias + "intra-module stays relative" rule) and `README.md`.

### E. Oxc import-sort (deferred from §12)

- [ ] Enable the Oxc import-sorter and run it once, **after** section D so the
  `@/*` alias lands in its own import group.

### F. Git hooks (was §13) — **DONE (2026-07-04)**

Initially done with Husky + lint-staged, then **migrated to [Lefthook](https://lefthook.dev/)**
(single Go binary — consolidates husky + lint-staged into one tool + `lefthook.yml`,
matches the Oxc/bun native-binary toolchain; runs jobs in parallel).

- [x] `lefthook@2` in devDeps; `prepare: "lefthook install"` self-installs hooks on
  `bun install` (removed the old husky `core.hooksPath=.husky/_` first).
- [x] **pre-commit** (`parallel: true`): `oxlint --fix` (glob `*.{ts,tsx}`) +
  `oxfmt --write` (glob `*.{ts,tsx,js,jsx,json}`) on `{staged_files}`,
  `stage_fixed: true` re-stages fixes. Verified end-to-end.
- [x] **pre-push:** `bun run verify` (lint + tests).
- [x] `bun test` intentionally avoided (incompatible runtime — CLAUDE.md mandates
  vitest); `--no-verify` bypass documented in `CLAUDE.md`.
- [x] Removed `husky` + `lint-staged`, deleted `.husky/`, dropped the `lint-staged`
  config from `package.json`.

---

## To Discuss (not decided)

> Do not implement without explicit approval.

### Knip — unused code & dependency detection

[Knip](https://knip.dev/) finds unused files/exports/deps. Would formally confirm
the `ts-node` removal (section B) and catch dead barrel re-exports. Against: one
more devDep in a toolchain we just trimmed; `index.ts` barrels cause
false-positive "unused export" noise; a one-off `bunx knip` audit may be cheaper
than a permanent integration.

**Decision to make:** permanent tool vs. one-off `bunx knip` audit, then drop.

---

## Definition of Done (remaining)

- [ ] `npm run lint` — 0 errors (`lint:code` + `lint:types` + `lint:format`).
- [ ] `npm test` — green; `clean-text` / `parse-command` / `with-retry` coverage ≥ 90%.
- [ ] `npm run build` — compiles to `dist/lang-app`.
- [ ] `README.md` reflects actual paths, model, commands, and structure.
- [ ] `ts-node` removed, `bun.lock` updated.

---

## Execution Order

1. **C. Documentation** — cheapest, highest-value; README is actively wrong.
2. **A. Tests** — fill `clean-text` / `create-message` / hooks gaps.
3. **B. Dependency cleanup** — remove `ts-node`, verify.
4. **D. Path aliases** — wire `tsconfig` + vitest, then rewrite cross-module imports.
5. **E. Import-sort** — right after aliases so grouping accounts for `@/*`.
6. **F. Husky** — last, so hooks call the finalized `oxlint`/`oxfmt`.
