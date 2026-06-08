# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A terminal-based translation app (TUI) built with **Ink** (React for CLI), **LangChain**, and **Ollama**. The user types text in the terminal and receives translations powered by a locally running Ollama LLM.

## Prerequisites

- Node.js v18+
- [Ollama](https://ollama.com/) installed and running locally
- A model pulled in Ollama (e.g., `gemma3:4b`)
- `.env` file with `MODEL` and `LLM_TEMP` set (see `.env.example`)

## Commands

```bash
npm start             # Run the TUI app
npm run dev           # Run with file watching (bun --watch)
npm run build         # Compile TypeScript to dist/

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

```
src/
  index.tsx                   # Entry point — render(<App />) ~3 lines
  App.tsx                     # Root component
  constants.ts                # Shared constants (LLM_TIMEOUT_MS, etc.)
  config.ts                   # Re-export of validated config
  config/
    validateEnv.ts            # parseConfig() — reads and validates .env
    validateEnv.test.ts
  components/
    Header.tsx                # "--- LLM Translator TUI ---" heading
    SettingsBar.tsx           # Gray bar with fromLang → toLang
    MessageList.tsx           # Renders the messages array
    Message.tsx               # Single message row (You / Bot)
    LoadingIndicator.tsx      # "Translating..." spinner
    InputBar.tsx              # "> " + TextInput
  hooks/
    useChat.ts                # messages, submit, loading, commands, abort
    useLangSettings.ts        # fromLang / toLang state
  types/
    message.ts                # Message type + createMessage() factory
  commands/
    parseCommand.ts           # Pure function: parses /from, /to, /help, /clear, /exit
    parseCommand.test.ts
  llmModel/
    index.ts                  # ChatOllama instance + translationChain (module-level)
    index.test.ts
    messages.ts               # ChatPromptTemplate (system prompt)
  helpers/
    index.ts                  # cleanText() utility
    retry.ts                  # withRetry<T>(fn, options) helper
    retry.test.ts
```

## Key Decisions

- **`bun`** is used to run the app (`bun src/index.tsx`) and as the package manager.
- **`vitest`** is the test runner — use `npm run test`, not `bun test` (different runtime, incompatible APIs).
- The project uses ESM (`"type": "module"`), so all local imports require `.js` extensions even for `.ts` source files.
- JSX target is `"react"` (classic runtime), not `"react-jsx"`, because Ink uses React but not the new JSX transform.
- `translationChain` is created once at module level in `llmModel/index.ts` — not per request.
- In-app commands (`/from`, `/to`, `/clear`, `/help`, `/exit`) are parsed by `parseCommand()` and never sent to Ollama.
- `AbortController` is created per submit and passed to `chain.invoke`; timeout also calls `controller.abort()` to close the HTTP connection to Ollama.
- `withRetry` does not retry `AbortError` — user cancellation is intentional and should not be retried.
- `dist/` is excluded from ESLint (`ignores: ["dist/**"]` in `eslint.config.mts`).
