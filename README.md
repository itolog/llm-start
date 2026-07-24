# Lang-App TUI 🚀

A terminal-based chat translator built with **Ink** (React for CLI), **LangChain**, and **Ollama**.

## 🛠 Prerequisites

- [**Bun**](https://bun.sh/) — the runtime and package manager (used to run, build, and manage packages).
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

3. Configure the preferred model. Edit the defaults in
   `src/config/model-config/default-model-config.ts`:

   ```ts
   export const defaultModelConfig: ModelConfig = {
     MODEL: "gemma4:12b-mlx",
     LLM_TEMP: 0.1,
   };
   ```

   This is only a **preferred** default — it does not have to be installed. On
   startup the app falls back to an installed model if this one is missing (or
   prompts you to pull one if none are). You can also switch at runtime with
   `/model` and `/temp`.

   The Ollama endpoint and timeouts live in
   `src/config/app-config/app-config.ts` (`OLLAMA_BASE_URL`, `LLM_TIMEOUT_MS`,
   `MODEL_CHECK_TIMEOUT_MS`, `MAX_MESSAGES`). To point at a non-default Ollama
   host without editing source, set the `OLLAMA_URL` environment variable (e.g.
   in a `.env` file); it falls back to `http://localhost:11434`.

## 🚀 Usage

Start the TUI:

```bash
bun start
```

On startup the app checks Ollama for installed models: if the preferred `MODEL`
is available it uses it; otherwise it falls back to the first installed model
(telling you), or — if none are installed — prints how to pull one.

### TUI Commands

Type into the input field. Anything not starting with `/` is translated.

- `/from <lang>` — Change the source language (e.g., `/from english`).
- `/to <lang>` — Change the target language (e.g., `/to polish`).
- `/model [name]` — Switch the model. Omit the name to pick from a list.
- `/temp [0-2]` — Set the temperature. Omit the value to adjust with a stepper.
- `/clear` — Clear the message history.
- `/help` — List available commands.
- `/exit` (`/quit`, `/q`) — Close the app.

## 🛠 Development

- **Conventions**: `.claude/rules/` — `module-architecture.md` (module folders,
  naming, helper placement) and `code-comments.md` (comment style). Project
  specifics (layout, key decisions) are in `CLAUDE.md`.
- **Run in watch mode**: `bun run dev`
- **Linting**: `bun run lint` (powered by [Oxc](https://oxc.rs/) / `oxlint`)
- **Formatting**: `bun run format` (powered by [Oxc](https://oxc.rs/) / `oxfmt`)
- **Tests**: `bun run test` (Vitest — note: `bun run test`, not `bun test`)
- **Full verification**: `bun run verify` (lint + tests)
- **Build a standalone binary**: `bun run build` → `dist/lang-app`
