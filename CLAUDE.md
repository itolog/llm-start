# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A terminal-based translation app (TUI) built with **Ink** (React for CLI), **LangChain**, and **Ollama**. The user types text in the terminal and receives translations powered by a locally running Ollama LLM.

## Prerequisites

- Node.js v18+
- [Ollama](https://ollama.com/) installed and running locally
- A model pulled in Ollama (e.g., `gemma4:e4b-mlx`)
- `.env` file with `MODEL` and `TEMP` set (see `.env.example`)

## Commands

```bash
npm start          # Run the TUI app
npm run dev        # Run with file watching (tsx watch)
npm run build      # Compile TypeScript to dist/
npm run lint       # ESLint check
npm run lint:fix   # ESLint auto-fix
npm run format     # Prettier format all files
npm run format:check  # Prettier check without writing
```

## Architecture

The app is a single-file React component rendered to the terminal via Ink:

- **`src/index.tsx`** — Main TUI component. Manages state (messages, languages, loading), handles `/from <lang>` and `/to <lang>` slash commands inline, and calls the LLM on submit.
- **`src/llmModel/index.ts`** — Instantiates `ChatOllama` from `@langchain/ollama` using config values.
- **`src/llmModel/messages.ts`** — Defines the `ChatPromptTemplate` with the system prompt that enforces translation-only output (no explanations, no alternatives).
- **`src/config.ts`** — Reads `MODEL` and `TEMP` from environment via `dotenv`.
- **`src/helpers/index.ts`** — `cleanText()` utility: trims LLM response whitespace and collapses excessive blank lines.

## Key Decisions

- **`tsx`** is used instead of `ts-node` for running TypeScript directly (no compile step in dev).
- The project uses ESM (`"type": "module"`), so all local imports require `.js` extensions even for `.ts` source files.
- JSX target is `"react"` (classic runtime), not `"react-jsx"`, because Ink uses React but not the new JSX transform.
- The LLM chain is composed per-request: `prompt.pipe(llm)` — there is no persistent session or memory between messages.
- In-app commands (`/from`, `/to`) are intercepted before the LLM call and never sent to Ollama.
