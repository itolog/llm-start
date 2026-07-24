# CLAUDE.md

## Project Overview

A terminal-based translation app (TUI) built with **Ink** (React for CLI), **LangChain**, and
**Ollama**. Running it needs a local Ollama with at least one model pulled; the *preferred*
model + temperature are seeded from `src/config/model-config/`.

## Commands

**`bun` is the only package manager and script runner here — never invoke `npm`, `npx`, `yarn`, or `pnpm`.** Use `bun run <script>` for scripts and `bunx <tool>` for one-off binaries. `bun run` with no argument lists every script.

```bash
bun start
bun run dev
bun run build
bun run test
bun run fix:lint
bun run format
bun run verify
```

`dev` watches files; `build` emits the standalone `dist/lang-app`; `fix:lint` and `format` auto-fix.

`bun run test` runs Vitest — **never `bun test`** (different runtime, incompatible APIs).

`bun run verify` is lint + test: always run it before considering a task done, and fix what it reports before moving on.

Keep this block free of trailing `#` comments — extra words after a script name are passed through as arguments to it, and `verify` forwards them to `concurrently`, which then tries to execute each word as a command.

## Planning

A plan of work — asked for directly, finalized in plan mode, or falling out of a code review —
is persisted as a file following the **`plan` skill**: default location `plans/`, existing plan
updated in place rather than duplicated.

## Conventions

Project-agnostic house rules live in `.claude/rules/` and load automatically — don't
restate them here. The rest of this file is what's specific to this repo.

## Key Decisions

Non-obvious choices and their *why* — the reasoning you can't recover from the code.

### Runtime & build

- **`bun`** runs the app (`bun src/index.tsx`) and is the package manager. **`vitest`** is the
  test runner — use `bun run test`, **never** `bun test` (different runtime, incompatible APIs).
  `bunfig.toml` sets `[run] bun = true`, so even tools with a `node` shebang execute on Bun.
- `bun run build` produces a **standalone binary** (`dist/lang-app`) via `bun build --compile
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

### LLM service

- The translation chain (`prompt.pipe(llm)`) is built once in the `LlmModelService` constructor,
  not per request. The service is a singleton `llmModelService` and owns request orchestration
  (timeout, abort, retry, text cleaning); `useChat` only owns the per-submit `AbortController`.
- **The service is the single source of truth for the active model + temperature** (seeded from
  `defaultModelConfig`; `setModel`/`setTemperature` rebuild the chain). React reads them via
  `subscribe` + `getModel`/`getTemperature` through `useSyncExternalStore` (in `useModel`) — there
  is no duplicate copy in component state. There is no longer a mutable global `config` object.
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
- **Dead code:** [knip](https://knip.dev/) (`knip.json`), run as `bun run lint:unused` (folds
  into `bun run verify`). Kept **out of pre-commit** — it resolves the whole module graph, so
  it can't run on staged files only.
- **Deps graph:** [skott](https://github.com/antoine-coulon/skott), `bun run start:deps-graph`
  — visualization only, **not a CI gate** (a skott-based circular check was benchmarked at
  ~600 ms/run and rejected in favor of oxlint's `import/no-cycle`). Works on **TS 6 only** —
  if TypeScript is bumped to 7, `start:deps-graph` breaks (`ERR_PACKAGE_PATH_NOT_EXPORTED`);
  run it via `bunx skott@<ver> …` instead.
- **Git hooks:** [Lefthook](https://lefthook.dev/) (`lefthook.yml`) — pre-commit fix+format on
  staged files, pre-push `verify` + `bun audit`. Replaced Husky + lint-staged.
