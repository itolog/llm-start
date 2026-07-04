# Lang-App TUI Refactoring Plan

> Progress: 21/23 · Created: 2026-06-06 · Updated: 2026-07-04
> Branch: `feature/tui` · Scope: remaining refactoring + tests + docs + tooling

## A. Tests

| ID | Task | Status | Date |
| --- | --- | --- | --- |
| A1 | Cover `clean-text` with unit tests | ✅ done | 2026-07-04 |
| A2 | Cover `create-message` with unit tests | ✅ done | 2026-07-04 |
| A3 | Hook tests for `use-chat` / `use-lang-settings` via mocked chain | ✅ done | 2026-07-04 |
| A4 | Add `test:coverage` script (`vitest run --coverage`) | ✅ done | 2026-07-04 |

### Notes

- **A1** — 9 cases: empty string, whitespace-only, `\n{3,}` collapse, mixed content.
- **A2** — 5 cases: role/text passthrough, unique `id` across 100 calls.
- **A3** — `renderHook` (`@testing-library/react`) + added `happy-dom` (per-file docblock `@vitest-environment happy-dom`; node stays the global default). Mocks: `ink` (`useApp`), `llm-model` (`translationChain`/`checkModelAvailable`), `with-retry` as a passthrough — so the 1000 ms retry delay and 60 s timeout don't interfere and **fake timers were not needed**. `use-chat`: 11 cases (welcome, translate + cleanText, abort → "Request cancelled", generic error, /clear, /from, /to, /exit, model unavailable, empty input); `use-lang-settings`: 3 cases.
- **A4** — `@vitest/coverage-v8` + `coverage` block in `vitest.config.ts` (provider v8, excludes tests/types/index/stubs). `coverage/` added to `.gitignore` + oxfmt `ignorePatterns` (the HTML report crashed oxfmt with `DataCloneError`). Target utils: `parse-command` 92%, `clean-text` / `create-message` / `with-retry` — 100%.

## B. Dependencies

| ID | Task | Status | Date |
| --- | --- | --- | --- |
| B1 | Remove `ts-node` from devDeps | ⬜ todo | — |
| B2 | Remove `nodemon` | ✅ done | 2026-07-04 |
| B3 | Keep `concurrently` (used as `conc`) | ✅ done | 2026-07-04 |

### Notes

- **B1** — nothing references it (`bun` runs `.tsx` directly). After removal run `npm run verify` + `npm run build`.
- **B2** — already absent, verified 2026-07-04.

## C. Documentation

| ID | Task | Status | Date |
| --- | --- | --- | --- |
| C1 | README: config path + real model | ✅ done | 2026-07-04 |
| C2 | README: Architecture section matching real structure | ✅ done | 2026-07-04 |
| C3 | README: full Commands section + test/build | ✅ done | 2026-07-04 |
| C4 | `CLAUDE.md` committed and matches the structure | ✅ done | 2026-07-04 |

## D. Path aliases

| ID | Task | Status | Date |
| --- | --- | --- | --- |
| D1 | Add `"@/*": ["./src/*"]` to `tsconfig.json` `paths` | ✅ done | 2026-07-04 |
| D2 | Wire alias resolution into vitest | ✅ done | 2026-07-04 |
| D3 | Rewrite cross-module imports to `@/…` | ✅ done | 2026-07-04 |
| D4 | Update `CLAUDE.md` + `README.md` (alias rule) | ✅ done | 2026-07-04 |

### Notes

- **D2** — vitest does **not** read `tsconfig` `paths`; mirrored via `resolve.alias` (`"@/"` → `src/`, `fileURLToPath(new URL("./src/", import.meta.url))`) in `vitest.config.ts` — no extra dep. Tests were re-run green before rewriting imports.
- **D3** — 21 cross-module imports across 7 files → `@/…`; intra-module stay relative (`./header.component`). Edge case: `message-list.component.tsx`'s `../message` / `../loading-indicator` are sibling component modules → `@/components/message` etc. Test mocks (`vi.mock`) updated to `@/` too. `bun run build` compiles fine (bun resolves the alias natively).

## E. Import-sort (Oxc)

| ID | Task | Status | Date |
| --- | --- | --- | --- |
| E1 | Enable path-grouped import sorting via oxfmt `sortImports` | ✅ done | 2026-07-04 |
| E2 | Wire the sort into `lefthook.yml` (pre-commit) | ✅ done | 2026-07-04 |

### Notes

- **E1** — final approach: **oxfmt `sortImports`** in `.oxfmtrc.json` (0.56 supports it — perfectionist-style), groups `builtin` → `external` → `internal` (`@/`) → relative, blank line between groups, alphabetical within. Applied automatically by `oxfmt --write`; ran once across the repo. This is the path-grouped, trivago-plugin-equivalent the user wanted — fully auto, no manual maintenance. `react` is its own group first, via a `customGroups` entry (`elementNamePattern` takes **glob** patterns — `"react"`, not regex `"^react$"`; that was the initial mistake). **Superseded** the earlier oxlint `sort-imports` attempt (removed from `.oxlintrc.json`): that rule sorts by member syntax not path and its declaration reordering is not auto-fixable (would mean perpetual manual fixes). oxlint's `import/order` (which does group by path) is **not implemented** in oxlint 1.71/1.72.
- **E2** — the pre-commit `format` job (`oxfmt --write`) applies `sortImports` + re-stages — fully automatic. Also made pre-commit **sequential** (dropped `parallel: true`): `lint-fix` and `format` both mutate the same staged files, so they must not race; oxfmt runs last. Documented in `lefthook.yml` + `CLAUDE.md`.

## F. Git hooks

| ID | Task | Status | Date |
| --- | --- | --- | --- |
| F1 | `lefthook` in devDeps + `prepare: "lefthook install"` | ✅ done | 2026-07-04 |
| F2 | pre-commit: `oxlint --fix` + `oxfmt --write` on staged, `stage_fixed` | ✅ done | 2026-07-04 |
| F3 | pre-push: `bun run verify` | ✅ done | 2026-07-04 |
| F4 | pre-push: `deps-audit` (`bun audit`), parallel with verify | ✅ done | 2026-07-04 |
| F5 | Remove `husky` + `lint-staged` (migrate to Lefthook) | ✅ done | 2026-07-04 |

### Notes

- **F5** — first done with Husky + lint-staged, then consolidated onto Lefthook (single Go binary, `lefthook.yml`, parallel jobs — in line with the Oxc/bun toolchain). Removed the stale `core.hooksPath=.husky/_`.
- **F2** — `bun test` intentionally avoided in hooks (incompatible runtime, CLAUDE.md mandates vitest). Bypass: `--no-verify`.
- Incidental fix: oxfmt 0.56 crashes with `DataCloneError` on YAML → `*.yml`/`**/*.yml` added to `.oxfmtrc.json` `ignorePatterns` (the root-level `*.yml` is required — `**/*.yml` does not match repo-root files).

## G. To discuss

| ID | Task | Status | Date |
| --- | --- | --- | --- |
| G1 | Knip: permanent tool vs. one-off `bunx knip` audit | 💬 discuss | — |

### Notes

- **G1** — [Knip](https://knip.dev/) finds dead exports/deps (would confirm B1). Against: one more devDep in a just-trimmed toolchain; `index.ts` barrels cause false positives. Do not adopt without an explicit decision.

## Definition of Done

- `npm run lint` — 0 errors (code + types + format).
- `npm test` — green; `clean-text` / `parse-command` / `with-retry` coverage ≥ 90%.
- `npm run build` — compiles `dist/lang-app`.
- `ts-node` removed, `bun.lock` updated.

## Execution order

1. **B1** — remove `ts-node`, verify build + tests.
2. **G1** — decide Knip's fate.

## History

- 2026-06-07 — config/validation, module-level LLM chain, UI split (components + hooks + parse-command).
- 2026-06-11 — reliability (AbortController, timeouts, withRetry) + UX (history cap, model check, placeholder).
- 2026-06-25 — formatter migrated to oxfmt; earlier — oxlint replaced ESLint.
- 2026-07-04 — plan actualized (completed items removed); A1–A2 done; C1–C4 done (README rewritten); F1–F5 done (Husky → Lefthook, deps-audit); plan switched to table format (`plan` skill); casing conflict fixed (PascalCase → kebab dirs re-cased in git); A3–A4 done (hook tests via happy-dom + coverage); plan translated to English; D1–D4 done (`@/*` path alias, cross-module imports rewritten); E1–E2 done: import sorting switched to **oxfmt `sortImports`** (path-grouped, auto on `oxfmt --write`) after the oxlint `sort-imports` approach proved manual-only; pre-commit made sequential to avoid the fix/format race.
- Historical note: the env-validation from the original plan (§1: `dotenv`, `validateEnv`, `TEMP`→`LLM_TEMP`) was **superseded** — config is now the static `src/config/default-config.ts`, no `process.env` in `src/`.
