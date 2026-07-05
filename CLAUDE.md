# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A terminal-based translation app (TUI) built with **Ink** (React for CLI), **LangChain**, and **Ollama**. The user types text in the terminal and receives translations powered by a locally running Ollama LLM.

## Prerequisites

- Node.js v18+
- [Ollama](https://ollama.com/) installed and running locally
- A model pulled in Ollama (e.g., `gemma3:4b`)
- Model defaults set in `src/config/default-model-config.ts` (`MODEL`, `LLM_TEMP`)

## Commands

```bash
npm start             # Run the TUI app
npm run dev           # Run with file watching (bun --watch)
npm run build         # Compile to a standalone binary (dist/lang-app) via bun --compile

# Linting (run in parallel via concurrently)
npm run lint          # Run all lint:* checks in parallel
npm run lint:code     # oxlint check (Oxc, Rust-based linter)
npm run lint:types    # TypeScript type check (tsc --noEmit)
npm run lint:format   # oxfmt format check (Oxc formatter)
npm run lint:unused   # knip — unused files, dependencies, and exports
npm run fix:lint      # oxlint auto-fix

# Formatting
npm run format        # oxfmt format all files

# Testing
npm run test          # Run all tests once (vitest run)
npm run test:watch    # Run tests in watch mode

# Full verification — run this after every completed task
npm run verify        # npm run lint && npm run test
```

## After completing a task

Always run `npm run verify` before considering a task done. It runs all linters and tests in one command. Fix any errors before moving on.

## Architecture

Each component / hook / utility is a **self-contained module folder**: an
`index.ts` barrel exposing the public API, the implementation file, an optional
`*.type.ts` for its types, and co-located tests. Consumers import the folder
(`import { InputBar } from "../components/input-bar"`), never the inner files.

**Naming convention** — folders and files are **kebab-case**; the file's role is
a suffix on the basename:

- `*.component.tsx` — React component
- `*.hook.ts` — React hook
- `*.util.ts` — pure utility function
- `*.service.ts` — stateful service (Ollama access)
- `*.type.ts` — types/interfaces only
- `*.test.ts` — tests (short form, no role suffix)
- `index.ts` — public-API barrel

**Util placement** — a helper used by **only one module** lives in that module's
own `utils/` folder (e.g. `services/llm-model/utils/build-stats/`), imported
relatively; a helper shared by **2+ modules** lives in the top-level `src/utils/`
and is imported via the `@/utils/*` alias. Keeping single-use helpers module-local
also avoids import cycles when the helper needs the module's own types.

Exported binding names stay camelCase/PascalCase (`useChat`, `createMessage`,
`Header`); only filenames are kebab-case.

```
src/
  index.tsx                          # Entry point — render(<App />)
  stubs/
    react-devtools-core.ts           # Empty alias for Ink's dev-only import (see tsconfig paths)
  app/
    app.component.tsx                 # Root component
    index.ts
  config/
    index.ts                         # active `config` (mutable copy of model defaults) + re-exports appConfig + ModelConfig/AppConfig types
    model-config/                    # { model-config.type.ts (ModelConfig), default-model-config.ts (defaultModelConfig — MODEL, LLM_TEMP), index.ts }
    app-config/                      # { app-config.type.ts (AppConfig), app-config.ts (appConfig — OLLAMA_BASE_URL, LLM_TIMEOUT_MS, MAX_MESSAGES, MODEL_CHECK_TIMEOUT_MS), index.ts }
  components/
    header/                          # { header.component.tsx, index.ts } — gradient BigText banner (ink-gradient + ink-big-text)
    settings-bar/                    # { settings-bar.component.tsx, settings-bar.type.ts, index.ts }
    message-list/                    # { message-list.component.tsx, message-list.type.ts, index.ts }
    message/                         # { message.component.tsx, message.type.ts, index.ts } — MessageItem (built-in Box card; header row = role left / HH:MM right via justifyContent space-between)
    live-timer/                      # { live-timer.component.tsx, index.ts } — self-ticking elapsed timer shown during a translation (in place of StatsBar)
    loading-indicator/               # { loading-indicator.component.tsx, index.ts }
    input-bar/                       # { input-bar.component.tsx, input-bar.type.ts, index.ts }
    model-picker/                    # { model-picker.component.tsx, model-picker.type.ts, index.ts } — ink-select-input list, shown in place of InputBar for bare /model
  hooks/
    use-chat/                        # { use-chat.hook.ts, use-chat.type.ts, index.ts } — messages, submit, abort, translate
  types/
    message.type.ts                  # Message type (role, text, id, createdAt) — plain type file, not a module
  commands/
    parse-command/                   # { parse-command.util.ts, parse-command.type.ts (Command), parse-command.test.ts, index.ts }
  services/
    llm-model/
      llm-model.service.ts           # LlmModelService class (owns ChatOllama + chain) exported as llmModelService singleton — translate() + checkModelAvailable() + listModels() + resolveStartupModel() (all via a shared private fetchTags())
      llm-model.type.ts              # OllamaTag, StartupModel, TranslateParams, TranslationStats/Result, ChainResponse/ChainChunk
      llm-model.test.ts
      llm-prompt.ts                  # ChatPromptTemplate (system prompt)
      utils/                         # module-local helpers (used only by this service)
        build-stats/                 # { build-stats.util.ts, build-stats.test.ts, index.ts } — buildStats(ChainResponse, elapsedMs) → TranslationStats
        model-matches/               # { model-matches.util.ts, model-matches.test.ts, index.ts } — Ollama tag ↔ config matching (handles implicit :latest)
      index.ts
    index.ts
  utils/                             # cross-module helpers (used by 2+ modules)
    clean-text/                      # { clean-text.util.ts, index.ts }
    create-message/                  # { create-message.util.ts, index.ts } — Message factory
    with-retry/                      # { with-retry.util.ts, with-retry.type.ts (RetryOptions), with-retry.test.ts, index.ts }
```

## Planning

Whenever you produce a plan of work — a direct "make a plan" request, finalizing
a plan in **plan mode**, or a **code review** that yields follow-up tasks worth
tracking — persist it as a file and follow the **`plan` skill**
(`.claude/skills/plan/SKILL.md`) for the format (task IDs, status column,
progress header, update rules). Default location is **`plans/`** (git-tracked);
honor an explicit override if the user names a different path. Update the
existing plan file in place rather than creating a duplicate.

## Key Decisions

- **Chat messages render as cards** — `MessageItem` is a built-in `<Box borderStyle="round">` with per-role `borderColor` (You=magenta, Bot=cyan); the first child is a header `<Box justifyContent="space-between">` with the role (left, bold, role color) and the `HH:MM` timestamp (right, dim), then the message text (or the `LoadingIndicator` while the bot card is still empty/streaming). `MessageList` adds `gap={1}` between cards. **History:** an earlier version used `@mishieck/ink-titled-box` to put the role *in* the border line (`╭ Bot ─╮`), but it positions the title via `measureElement` + `useEffect`, which mis-rendered full-width cards in a real wide terminal (missing top-left corner / left border) — on top of a stale `ink ^6` peer. Reverted to the dependency-free built-in `Box` (Ink draws the border itself via yoga, no overlay/measurement), trading the in-border title for a header row inside the card. Added 2026-07-05.
- **`bun`** is used to run the app (`bun src/index.tsx`) and as the package manager.
- **`vitest`** is the test runner — use `npm run test`, not `bun test` (different runtime, incompatible APIs).
- `tsconfig` uses `moduleResolution: "bundler"` + `module: "Preserve"` (`noEmit`), so local imports are written **without** `.js` extensions and resolve `index` files by folder (e.g. `import { config } from "@/config"`). `bun` runs/builds the app, doing the resolution; `tsc` is type-check only.
- **Path alias `@/*` → `src/*`** (`tsconfig` `paths`). **Cross-module** imports use the alias (`import { useChat } from "@/hooks/use-chat"`); **intra-module** imports stay relative (`./header.component`, `./header.type`) — a module referencing its own files does not go through the alias. `bun` (run + `--compile`) reads the alias from `tsconfig` natively; `tsc` too. `vitest` does **not** read `tsconfig` `paths`, so it is mirrored via `resolve.alias` (`"@/"` → `src/`) in `vitest.config.ts`.
- JSX target is `"react"` (classic runtime), not `"react-jsx"`, because Ink uses React but not the new JSX transform.
- The translation chain (`prompt.pipe(llm)`) is created once in the `LlmModelService` constructor in `services/llm-model/llm-model.service.ts` — not per request. The service is exported as a singleton `llmModelService` and encapsulates the request orchestration (timeout, abort, retry, text cleaning); `useChat` only owns the per-submit `AbortController` and calls `llmModelService.translate(...)`.
- **Startup model resolution** — the configured `MODEL` in `default-model-config.ts` is a **preferred** default, not a hard requirement. On mount `useChat` calls `llmModelService.resolveStartupModel()` (reads `/api/tags`): `"ok"` if the preferred model is installed; `"no-models"` → posts a "pull one first" instruction and blocks translation; `"fallback"` → switches to the first installed model and tells the user (so the app works on any machine regardless of what the default names). The old behavior (hard error demanding you pull the exact default) is gone. `verifyModel()` (the missing-model warning) is still used after a manual `/model <name>` switch.
- In-app commands (`/from`, `/to`, `/model`, `/temp`, `/clear`, `/help`, `/exit`) are parsed by `parseCommand()` and never sent to Ollama. **Bare `/model`** (no argument) returns `{ type: "models" }` → `useChat` fetches `llmModelService.listModels()` and opens the `ModelPicker` (rendered in place of the `InputBar` while `modelItems` is non-null; Enter applies via the shared `applyModel`, Esc cancels). `/model <name>` still switches directly. The `Header` is a gradient `BigText` banner via **ink-gradient** (`name="vice"`) + **ink-big-text** (`font="tiny"`, `space={false}`); both peer-satisfy Ink 7 cleanly (`ink >=6`/`>=4`). Added 2026-07-05.
- `AbortController` is created per submit and passed to `chain.invoke`; timeout also calls `controller.abort()` to close the HTTP connection to Ollama.
- `withRetry` does not retry `AbortError` — user cancellation is intentional and should not be retried.
- **Linting uses [Oxc](https://oxc.rs/) (`oxlint`)** — config in `.oxlintrc.json` (`ignorePatterns: ["dist/**"]`, TS + React/React-Hooks correctness rules, `react-hooks/exhaustive-deps` enabled). ESLint was removed. **Circular-dependency detection** is oxlint's `import/no-cycle` rule (`"error"`) — the `import` plugin is enabled in `plugins`, and oxlint auto-reads the root `tsconfig.json` to resolve the `@/*` alias, so cycles across both relative and `@/` imports are caught. No `--import-plugin`/`--tsconfig` CLI flags or `import/resolver` settings are needed; a separate tool (madge/dpdm) is therefore unnecessary. Only `no-cycle` is enabled from the import plugin — the rest of its rules stay off. Added 2026-07-05. **Formatting uses [`oxfmt`](https://oxc.rs/) (Oxc formatter)** — config in `.oxfmtrc.json` (migrated from `.prettierrc` via `oxfmt --migrate=prettier`, so the same style: 2-space indent, double quotes, semicolons, trailing commas, `printWidth: 80`). Prettier was removed. **Import sorting is done by oxfmt's `sortImports`** (not oxlint): imports are grouped by path — `react` (a `customGroups` entry, always first) → `builtin` → `external` → `internal` (`@/*`) → relative (`parent`/`sibling`/`index`) — with a blank line between groups and alphabetical order within each group. It is applied automatically on `oxfmt --write` (so the pre-commit `format` job re-sorts + re-stages; no manual step). `oxlint`'s `sort-imports` rule is intentionally **not** used — its declaration reordering is not auto-fixable, whereas oxfmt's is. Note `customGroups` `elementNamePattern` takes **glob** patterns, not regex (`"react"`, not `"^react$"`). Markdown **and YAML** are excluded (`**/*.md`, `*.yml`/`*.yaml` + `**/*.yml`/`**/*.yaml` in `ignorePatterns`) because oxfmt 0.56 throws `DataCloneError` on them — re-enable once fixed upstream. (YAML matters since `lefthook.yml` lives at the repo root; note the root-level `*.yml` pattern is needed because `**/*.yml` alone does not match files in the repo root.)
- **Module-folder convention:** every component/hook/utility lives in its own kebab-case folder with an `index.ts` barrel (public API), an implementation file (`*.component.tsx` / `*.hook.ts` / `*.util.ts` / `*.service.ts`), and a `*.type.ts` for its types. Import the folder, not the inner files — this keeps each unit isolated and easy to test.
- **Dependency-graph visualization uses [skott](https://github.com/antoine-coulon/skott)** (a `devDependency`), run one-off via `npm run start:deps-graph` (`skott src/index.tsx --tsconfig=tsconfig.json --no-trackTypeOnlyDependencies`) — it opens skott's interactive webapp (`--no-trackTypeOnlyDependencies` omits `import type` edges so the graph reflects runtime coupling only) for exploring the module graph. skott hard-depends on `typescript@^5.9.3` (via `@typescript-eslint/typescript-estree`); this works because `bun` nests a compatible TS 5.9.x under `node_modules/skott/` while the repo's own `typescript@6.x` stays hoisted, and TS 6's package `exports` are compatible with `typescript-estree`. Note this **only works on TS 6, not TS 7** — under the earlier `typescript@7.0.1-rc`, TS 7's changed `exports` made `typescript-estree` throw `ERR_PACKAGE_PATH_NOT_EXPORTED` on the hoisted TS 7, so skott had to be run via `bunx` (isolated). If TypeScript is ever bumped back to 7, revert `start:deps-graph` to `bunx skott@<ver> …`. It lives under `start:*` (not `deps:*`) because it boots a long-running webapp server, unlike the one-shot `deps:audit`/`deps:update`/`deps:reinstall`. Circular-dependency *gating* is **not** skott's job here — that is oxlint's `import/no-cycle` (~0–20 ms, already in the lint pipeline). A standalone skott-API circular check was benchmarked and rejected: it costs ~600 ms/run (process + graph build) vs oxlint's near-zero amortized cost, so oxlint is the single gate and skott stays visualization-only. Added 2026-07-05.
- **Dead-code detection uses [knip](https://knip.dev/)** — config in `knip.json`, run via `npm run lint:unused` (`knip`). It is named `lint:unused` so `concurrently`'s `bun:lint:*` glob auto-includes it in `npm run lint` → `npm run verify` → the Lefthook **pre-push** `verify` job; it is intentionally **not** a separate hook job (would double-run) and **not** in pre-commit (knip resolves the whole module graph, so it can't run on `{staged_files}`). The entry point is auto-detected from `package.json` `main` (`src/index.tsx`) — an explicit `entry` is redundant. Two config tweaks handle this repo's conventions: `ignore: ["src/stubs/react-devtools-core.ts"]` (the stub is wired only through a `tsconfig` `paths` alias, so knip sees it as an unused file), and `ignoreExportsUsedInFile: { type: true }` (the module-folder barrels re-export each module's `*Props`/option types as public API even when nothing imports them through the barrel, which knip would otherwise flag as unused exported types). Added 2026-07-05; the initial run also surfaced a genuinely dead `llm` export in `llm-model.service.ts`, since made module-local.
- `npm run build` produces a **standalone binary** (`dist/lang-app`) via `bun build --compile --minify`. `react-devtools-core` (Ink's dev-only import) is aliased to an empty stub through `tsconfig` `paths` so it is not bundled.
- **Git hooks via [Lefthook](https://lefthook.dev/)** (single Go binary, config in `lefthook.yml`, self-installed by the `prepare` script → `lefthook install` on `bun install`): **pre-commit** runs `oxlint --fix` + `oxfmt --write` on staged files in parallel (`glob` + `{staged_files}`, `stage_fixed: true` re-stages the fixed files — no `lint-staged` needed); **pre-push** runs `bun run verify` (lint + tests) and `bun audit` (`deps-audit`) in parallel. Note `bun test` is intentionally **not** used — it uses a different runtime incompatible with vitest. Bypass in emergencies with `git commit --no-verify` / `git push --no-verify`. Replaced Husky + lint-staged (2026-07-04) to consolidate onto one native binary, matching the Oxc/bun toolchain.
