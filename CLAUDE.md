# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A terminal-based translation app (TUI) built with **Ink** (React for CLI), **LangChain**, and **Ollama**. The user types text in the terminal and receives translations powered by a locally running Ollama LLM.

## Prerequisites

- Node.js v18+
- [Ollama](https://ollama.com/) installed and running locally
- A model pulled in Ollama (e.g., `gemma3:4b`)
- Model defaults set in `src/config/defaultConfig.ts` (`MODEL`, `LLM_TEMP`)

## Commands

```bash
npm start             # Run the TUI app
npm run dev           # Run with file watching (bun --watch)
npm run build         # Compile to a standalone binary (dist/lang-app) via bun --compile

# Linting (run in parallel via concurrently)
npm run lint          # Run all lint:* checks in parallel
npm run lint:code     # ESLint check
npm run lint:types    # TypeScript type check (tsc --noEmit)
npm run lint:format   # Prettier format check
npm run lint:fix      # ESLint auto-fix

# Formatting
npm run format        # Prettier format all files

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

Exported binding names stay camelCase/PascalCase (`useChat`, `createMessage`,
`Header`); only filenames are kebab-case.

```
src/
  index.tsx                          # Entry point — render(<App />)
  constants.ts                       # Shared constants (OLLAMA_BASE_URL, LLM_TIMEOUT_MS, …)
  stubs/
    react-devtools-core.ts           # Empty alias for Ink's dev-only import (see tsconfig paths)
  app/
    app.component.tsx                 # Root component
    index.ts
  config/
    index.ts                         # active config (re-exports defaultConfig) + Config type
    default-config.ts                # MODEL, LLM_TEMP defaults
    config.type.ts                   # Config interface
  components/
    header/                          # { header.component.tsx, index.ts }
    settings-bar/                    # { settings-bar.component.tsx, settings-bar.type.ts, index.ts }
    message-list/                    # { message-list.component.tsx, message-list.type.ts, index.ts }
    message/                         # { message.component.tsx, message.type.ts, index.ts } — MessageItem
    loading-indicator/               # { loading-indicator.component.tsx, index.ts }
    input-bar/                       # { input-bar.component.tsx, input-bar.type.ts, index.ts }
  hooks/
    use-chat/                        # { use-chat.hook.ts, use-chat.type.ts, index.ts } — messages, submit, abort
    use-lang-settings/               # { use-lang-settings.hook.ts, index.ts } — fromLang / toLang state
  types/
    message.type.ts                  # Message type (plain type file, not a module)
  commands/
    parse-command/                   # { parse-command.util.ts, parse-command.type.ts (Command), parse-command.test.ts, index.ts }
  llm-model/
    llm-model.service.ts             # ChatOllama instance + translationChain (module-level) + checkModelAvailable
    llm-model.type.ts                # OllamaTag
    llm-model.test.ts
    llm-prompt.ts                    # ChatPromptTemplate (system prompt)
    index.ts
  utils/
    clean-text/                      # { clean-text.util.ts, index.ts }
    create-message/                  # { create-message.util.ts, index.ts } — Message factory
    with-retry/                      # { with-retry.util.ts, with-retry.type.ts (RetryOptions), with-retry.test.ts, index.ts }
```

## Key Decisions

- **`bun`** is used to run the app (`bun src/index.tsx`) and as the package manager.
- **`vitest`** is the test runner — use `npm run test`, not `bun test` (different runtime, incompatible APIs).
- `tsconfig` uses `moduleResolution: "bundler"` + `module: "Preserve"` (`noEmit`), so local imports are written **without** `.js` extensions and resolve `index` files by folder (e.g. `import { config } from "../config"`). `bun` runs/builds the app, doing the resolution; `tsc` is type-check only.
- JSX target is `"react"` (classic runtime), not `"react-jsx"`, because Ink uses React but not the new JSX transform.
- `translationChain` is created once at module level in `llm-model/llm-model.service.ts` — not per request.
- In-app commands (`/from`, `/to`, `/clear`, `/help`, `/exit`) are parsed by `parseCommand()` and never sent to Ollama.
- `AbortController` is created per submit and passed to `chain.invoke`; timeout also calls `controller.abort()` to close the HTTP connection to Ollama.
- `withRetry` does not retry `AbortError` — user cancellation is intentional and should not be retried.
- `dist/` is excluded from ESLint (`ignores: ["dist/**"]` in `eslint.config.mts`).
- **Module-folder convention:** every component/hook/utility lives in its own kebab-case folder with an `index.ts` barrel (public API), an implementation file (`*.component.tsx` / `*.hook.ts` / `*.util.ts` / `*.service.ts`), and a `*.type.ts` for its types. Import the folder, not the inner files — this keeps each unit isolated and easy to test.
- `npm run build` produces a **standalone binary** (`dist/lang-app`) via `bun build --compile --minify`. `react-devtools-core` (Ink's dev-only import) is aliased to an empty stub through `tsconfig` `paths` so it is not bundled.
