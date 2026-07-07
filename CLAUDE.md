# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A terminal-based translation app (TUI) built with **Ink** (React for CLI), **LangChain**, and **Ollama**. The user types text in the terminal and receives translations powered by a locally running Ollama LLM.

## Prerequisites

- [Bun](https://bun.sh/) (`engines.bun` pins the version; runs and builds the app, no Node.js required)
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
npm run lint:code     # Lint check
npm run lint:types    # Type check (tsc --noEmit)
npm run lint:format   # Format check
npm run lint:unused   # Unused files, dependencies, and exports
npm run fix:lint      # Auto-fix lint errors

# Formatting
npm run format        # Format all files

# Testing
npm run test          # Run all tests once
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

Top-level layout (per-file detail is discoverable by browsing — this is the map, not an
inventory):

```
src/
  index.tsx        # Entry point — render(<App />)
  stubs/           # react-devtools-core empty stub (Ink dev-only import, wired via tsconfig paths)
  app/             # Root App component
  config/          # active `config` (mutable model defaults) + appConfig; model-config/ + app-config/ sub-modules
  components/       # header, settings-bar, message-list, message, commands-help, live-timer,
                   #   loading-indicator, input-bar, model-picker, temp-picker
  hooks/           # use-chat — messages, submit, abort, translate
  types/           # message.type.ts (plain type file, not a module)
  commands/        # parse-command — parses in-app /commands
  services/        # llm-model — LlmModelService (ChatOllama + chain) as llmModelService singleton;
                   #   module-local utils/ (build-stats, model-matches)
  utils/           # cross-module helpers (@/utils/*): clean-text, create-message, with-retry
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

Non-obvious choices and their *why* — the reasoning you can't recover from the code. Extended
rationale for the tooling/rendering decisions lives in **`docs/adr/tooling.md`**; update that
file (not this list) when the detail changes.

### Runtime & build

- **`bun`** runs the app (`bun src/index.tsx`) and is the package manager. **`vitest`** is the
  test runner — use `npm run test`, **never** `bun test` (different runtime, incompatible APIs).
- `npm run build` produces a **standalone binary** (`dist/lang-app`) via `bun build --compile
  --minify`. `react-devtools-core` (Ink's dev-only import) is aliased to an empty stub via
  `tsconfig` `paths` so it isn't bundled.
- JSX target is `"react"` (classic runtime), not `"react-jsx"` — Ink uses React but not the
  new JSX transform.

### Module resolution & imports

- `tsconfig`: `moduleResolution: "bundler"` + `module: "Preserve"` (`noEmit`), so local imports
  omit `.js` extensions and resolve `index` by folder. `bun` runs/builds (does the resolution);
  `tsc` is type-check only.
- **Path alias `@/*` → `src/*`.** Cross-module imports use the alias; intra-module imports stay
  relative (a module referencing its own files doesn't go through the alias). `bun`/`tsc` read
  the alias from `tsconfig`; `vitest` does **not**, so it's mirrored in `vitest.config.ts`
  `resolve.alias`.
- **Module-folder convention** (see Architecture above): import the folder barrel, never the
  inner files — keeps each unit isolated and testable.

### LLM service

- The translation chain (`prompt.pipe(llm)`) is built once in the `LlmModelService` constructor,
  not per request. The service is a singleton `llmModelService` and owns request orchestration
  (timeout, abort, retry, text cleaning); `useChat` only owns the per-submit `AbortController`.
- `AbortController` is per-submit; the timeout also calls `controller.abort()` to close the HTTP
  connection to Ollama. `withRetry` does **not** retry `AbortError` — user cancellation is
  intentional.
- **Startup model resolution** — the configured `MODEL` is a *preferred* default, not a hard
  requirement. On mount `useChat` calls `resolveStartupModel()` (`/api/tags`): `"ok"` if
  installed; `"no-models"` → posts a "pull one first" notice and blocks translation; `"fallback"`
  → switches to the first installed model and tells the user (so the app works on any machine).
  `verifyModel()` still warns after a manual `/model <name>` switch.

### UI / commands

- In-app commands (`/from`, `/to`, `/model`, `/temp`, `/clear`, `/help`, `/exit`) are parsed by
  `parseCommand()` and never sent to Ollama. **Bare `/model`** and **bare `/temp`** open pickers
  (`ModelPicker` / `TempPicker`) in place of the `InputBar`; `/model <name>` and `/temp <value>`
  apply directly. Only one of InputBar / ModelPicker / TempPicker is mounted at a time so their
  `useInput` handlers don't compete for keys.
- Chat messages render as **cards** (built-in Ink `<Box borderStyle="round">`, per-role
  `borderColor`) with a header row (role + `HH:MM`) *inside* the card — not an in-border title.
  `@mishieck/ink-titled-box` was tried for the in-border title and reverted: it positions the
  title via `measureElement` + `useEffect`, which mis-renders full-width cards in a wide
  terminal (missing top-left corner / left border). Don't reach for it again.

### Tooling

The *what* is in the config files (`.oxlintrc.json`, `.oxfmtrc.json`, `knip.json`,
`lefthook.yml`) — those are strict JSON/YAML and can't hold comments, so the non-obvious
*why* / future-action notes live here:

- **Lint:** [oxlint](https://oxc.rs/) (`.oxlintrc.json`) — incl. `import/no-cycle` for
  circular-dependency detection (auto-reads `tsconfig` for the `@/*` alias; no separate
  madge/dpdm needed). ESLint removed.
- **Format:** [oxfmt](https://oxc.rs/) (`.oxfmtrc.json`) — also does import sorting via
  `sortImports`. Prettier removed. **MD & YAML are excluded** because oxfmt 0.56 throws
  `DataCloneError` on them — re-enable once fixed upstream.
- **Dead code:** [knip](https://knip.dev/) (`knip.json`), run as `npm run lint:unused` (folds
  into `npm run verify`). Kept **out of pre-commit** — it resolves the whole module graph, so
  it can't run on staged files only.
- **Deps graph:** [skott](https://github.com/antoine-coulon/skott), `npm run start:deps-graph`
  — visualization only, **not a CI gate** (a skott-based circular check was benchmarked at
  ~600 ms/run and rejected in favor of oxlint's `import/no-cycle`). Works on **TS 6 only** —
  if TypeScript is bumped to 7, `start:deps-graph` breaks (`ERR_PACKAGE_PATH_NOT_EXPORTED`);
  run it via `bunx skott@<ver> …` instead.
- **Git hooks:** [Lefthook](https://lefthook.dev/) (`lefthook.yml`) — pre-commit fix+format on
  staged files, pre-push `verify` + `bun audit`. Replaced Husky + lint-staged.
