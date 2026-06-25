# Lang-App TUI 🚀

A terminal-based chat translator built with **Ink** (React for CLI), **LangChain**, and **Ollama**.

## 🛠 Prerequisites

- **Node.js** (v18+)
- **Ollama** installed and running on your machine.
- A model downloaded in Ollama (e.g., `gemma4:e4b-mlx`).

## 📦 Installation

1. Clone the repository:

   ```bash
   git clone <repo-url>
   cd lang-app
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure the model:
   Edit the defaults in `src/config/defaultConfig.ts`:
   ```ts
   export const defaultConfig: Config = {
     MODEL: "gemma4:12b-mlx",
     LLM_TEMP: 0.1,
   };
   ```

## 🚀 Usage

### Start the Application

Run the TUI using the built-in script:

```bash
npm start
```

### TUI Commands

While the app is running, you can change translation settings via the input field:

- `/from <lang>` — Change source language (e.g., `/from english`).
- `/to <lang>` — Change target language (e.g., `/to polish`).

## 🏗 Architecture

- `src/index.tsx`: Main TUI interface and application logic.
- `src/config.ts`: Environment variable management.
- `src/llmModel/`: LangChain and Ollama integration.
- `src/helpers/`: Text processing utilities.

## 🛠 Development

- **Run in watch mode**: `npm run dev`
- **Linting**: `npm run lint` (powered by [Oxc](https://oxc.rs/) / `oxlint`)
- **Formatting**: `npm run format` (powered by [Oxc](https://oxc.rs/) / `oxfmt`)
