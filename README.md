# Lang-App TUI 🚀

A terminal-based chat application built with **Ink** (React for CLI), **LangChain**, and **Ollama**.

## 🛠 Prerequisites

- **Node.js** (v18+)
- **Ollama** installed and running on your machine.
- A model downloaded in Ollama (e.g., `gemma4:e4b-mlx` or `llama3`).

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

3. Set up environment variables:
   Create a `.env` file in the root directory:
   ```env
   MODEL=gemma4:e4b-mlx
   TEMP=0.1
   LANGSMITH_TRACING="true"
   LANGSMITH_API_KEY=your_api_key_here
   ```

## 🚀 Usage

### Run the TUI Chat
Since the app uses TSX and requires an interactive terminal, use `tsx` to run it directly:

```bash
npm install -g tsx
tsx src/index.tsx
```

### Run the Basic CLI Example
To run the standard script (which demonstrates basic translation):

```bash
npx tsc
node dist/index.js
```

## 🏗 Architecture

- `src/index.tsx`: The main TUI interface entry point.
- `src/config.ts`: Environment variable management.
- `src/llmModel/`: LangChain and Ollama integration logic.
- `src/helpers/`: Text processing utilities.

## 🛠 Development

- **Compile TypeScript**: `npx tsc`
- **Clean & Build**: `npm run build`
