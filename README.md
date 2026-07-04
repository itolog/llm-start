# Lang-App TUI 🚀

A terminal-based chat translator built with **Ink** (React for CLI), **LangChain**, and **Ollama**.

## 🛠 Prerequisites

- **Node.js** (v18+)
- [**Bun**](https://bun.sh/) — used to run, build, and manage packages.
- **Ollama** installed and running on your machine.
- A model pulled in Ollama (e.g., `gemma3:4b`).

## 📦 Installation

1. Clone the repository:

   ```bash
   git clone <repo-url>
   cd lang-app
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

3. Configure the model. Edit the defaults in `src/config/default-config.ts`:

   ```ts
   export const defaultConfig: Config = {
     MODEL: "gemma4:12b-mlx",
     LLM_TEMP: 0.1,
   };
   ```

   The Ollama endpoint and timeouts live in `src/constants.ts`
   (`OLLAMA_BASE_URL`, `LLM_TIMEOUT_MS`, `MODEL_CHECK_TIMEOUT_MS`, `MAX_MESSAGES`).

## 🚀 Usage

Start the TUI:

```bash
npm start
```

On startup the app checks that `MODEL` is available in Ollama and, if not, prints
how to pull it.

### TUI Commands

Type into the input field. Anything not starting with `/` is translated.

- `/from <lang>` — Change the source language (e.g., `/from english`).
- `/to <lang>` — Change the target language (e.g., `/to polish`).
- `/clear` — Clear the message history.
- `/help` — List available commands.
- `/exit` (`/quit`) — Close the app.

## 🏗 Architecture

Each component / hook / utility is a self-contained **kebab-case module folder**
with an `index.ts` barrel; consumers import the folder, not the inner files.

- `src/index.tsx` — entry point (`render(<App />)`).
- `src/app/` — root `App` component wiring the UI together.
- `src/components/` — `header`, `settings-bar`, `message-list`, `message`,
  `loading-indicator`, `input-bar`.
- `src/hooks/` — `use-chat` (messages, submit, abort), `use-lang-settings`
  (from/to language state).
- `src/commands/parse-command/` — parses in-app `/` commands.
- `src/llm-model/` — LangChain + Ollama integration (`translationChain`,
  `checkModelAvailable`).
- `src/config/` — model defaults (`default-config.ts`) and the `Config` type.
- `src/utils/` — `clean-text`, `create-message`, `with-retry`.
- `src/constants.ts` — shared constants.

Imports use the **`@/*` → `src/*`** path alias for cross-module references
(`import { useChat } from "@/hooks/use-chat"`); imports **within** a module stay
relative (`./header.component`).

See `CLAUDE.md` for the full module/naming convention.

## 🛠 Development

- **Run in watch mode**: `npm run dev`
- **Linting**: `npm run lint` (powered by [Oxc](https://oxc.rs/) / `oxlint`)
- **Formatting**: `npm run format` (powered by [Oxc](https://oxc.rs/) / `oxfmt`)
- **Tests**: `npm test` (Vitest)
- **Full verification**: `npm run verify` (lint + tests)
- **Build a standalone binary**: `npm run build` → `dist/lang-app`
