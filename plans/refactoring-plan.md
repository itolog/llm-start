# Lang-App TUI Refactoring Plan

Date: 2026-06-06 (updated after code review)
Branch: `feature/tui`
Scope: full refactoring + bug fixes + tests + cleanup

---

## Code Review Findings (new bugs)

Discovered during review — addressed in the relevant sections below:

| Severity     | Bug                                                                                                                                                                                                                                                                                               | Section |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| **CRITICAL** | `process.env.TEMP` is a reserved OS environment variable (macOS/Linux store a tmp-directory path there). `dotenv.config()` does not override existing env vars by default → `TEMP=0.1` in `.env` is silently ignored → `Number("/var/folders/…")` = `NaN` → Ollama receives `"temperature": null` | 1       |
| **HIGH**     | `config.MODEL = undefined` → `ChatOllama` silently falls back to `"llama3"` (SDK: `this.model = fields.model ?? "llama3"`). No error thrown — app runs with the wrong model                                                                                                                       | 1       |
| **MEDIUM**   | `/from` parsing uses `.replace("/from ", "")` which replaces the first occurrence anywhere in the string. Input `/from /from russian` sets `newLang = "/from russian"`. Same for `/to`. Fix: use `slice(n)`                                                                                       | 1 / 3   |
| **MEDIUM**   | `key={i}` (array index) — React will reuse DOM nodes incorrectly when messages are removed (`/clear`). Fix: add `id: crypto.randomUUID()` to each message                                                                                                                                         | 3       |
| **LOW**      | `prompt.pipe(llm)` is recreated on every submit — the object is stateless and should be created once at module level                                                                                                                                                                              | 2       |
| **LOW**      | No `AbortController` — on component unmount (Ctrl+C) the HTTP request to Ollama keeps running, wasting tokens and connections                                                                                                                                                                     | 4       |
| **LOW**      | Unbounded `messages` array — `setMessages(prev => [...prev, msg])` is O(n) and triggers a full Ink re-render; noticeable lag after hundreds of messages                                                                                                                                           | 5       |

---

## 0. Pre-flight Checks

- [x] ~~Verify `npm install` with `typescript@^6.0.3`~~ — TypeScript 6.0.3 is real and installs without errors.
- [x] ~~Remove `dist/logger/` from history~~ — already covered by the `/dist` rule in `.gitignore` (confirmed with `git check-ignore`).
- [ ] Decide the fate of `CLAUDE.md`: either commit it (`git add CLAUDE.md`) or add it to `.gitignore` as a local assistant document. Currently untracked.
- [ ] Lock `package-lock.json` baseline before making changes (if not already done).

---

## 1. Configuration and Environment Validation

**File:** `src/config.ts` → split into `src/config.ts` (re-export) + `src/config/validateEnv.ts`

### Problems

- **[CRITICAL — fixed]** `process.env.TEMP` is a reserved OS variable (macOS/Linux/Windows store the temp directory path there). `dotenv.config()` does not override existing env vars. Result: `TEMP=0.1` in `.env` is silently ignored → `Number("/var/folders/…")` = `NaN` → `JSON.stringify({ temperature: NaN })` → `"temperature": null` sent to Ollama. This happens **on every macOS machine** with no error.
- **[HIGH — fixed]** `config.MODEL = undefined` → `ChatOllama` silently uses `"llama3"` as the default model (SDK: `this.model = fields.model ?? "llama3"`). The app runs without errors but translates with the wrong model.
- `Number(process.env.TEMP)` returns `NaN` when the variable is absent; `NaN` serialises to `null` in JSON. — **fixed** by `Number.isFinite` check.
- No temperature range validation (valid range: 0..2). — **fixed**.

### Solution

- [x] **Rename** `TEMP` → `LLM_TEMP` everywhere (`.env.example`, `config.ts`, `README.md`, tests). `.env.example` and `README.md` updated; `CLAUDE.md` still mentions old name (see section 9).
- [x] Replace the ad-hoc `interface Config` with a manual `parseConfig()` that:
  - throws a descriptive error with a hint when `MODEL` is empty or unset (no silent fallback to `"llama3"`);
  - parses `LLM_TEMP` via `Number.parseFloat` + `Number.isFinite` check;
  - applies default `LLM_TEMP = 0.1` when the variable is not set;
  - validates the temperature range `[0, 2]`;
  - reads optional `OLLAMA_BASE_URL` with default `http://localhost:11434`.
- [x] Extract to `src/config/validateEnv.ts`; `src/config.ts` is a thin re-export.
- [x] Add unit tests `src/config/validateEnv.test.ts` (6 cases): valid env, `MODEL` missing → error, non-numeric `LLM_TEMP` → error, `LLM_TEMP` out of range → error, `LLM_TEMP` not set → default `0.1`, `OLLAMA_BASE_URL` not set → default.

---

## 2. LLM Chain: Single Instance per Module

**Files:** `src/llmModel/index.ts`, `src/hooks/useChat.ts`

### Problems

- **[LOW — fixed]** `prompt.pipe(llm)` is recreated on every `handleSubmit` call. The composed chain is stateless — there is no reason to allocate it on every request.
- `default export` makes it harder to name the chain explicitly. — **fixed**: named exports only.

### Solution

- [x] In `src/llmModel/index.ts`:
  - `export const llm = new ChatOllama({ model: config.MODEL, temperature: config.LLM_TEMP })` (named export, no `default`).
  - `export const translationChain = prompt.pipe(llm)` — created once at module level.
- [x] `translationChain` is imported in `src/hooks/useChat.ts`; `await translationChain.invoke({...})` is called per submit.
- [x] Unit test `src/llmModel/index.test.ts` asserts `translationChain instanceof Runnable` ✅.

---

## 3. UI Architecture: Extract Hooks and Components

**File:** `src/index.tsx` (originally 113 lines, everything in one component)

### Target Structure

```
src/
  index.tsx                     # render(<App />) — entry point, ~10 lines
  App.tsx                       # root wrapper component
  components/
    Header.tsx                  # "--- LLM Translator TUI ---" heading
    SettingsBar.tsx             # gray bar with fromLang ➔ toLang
    MessageList.tsx             # renders the messages array
    Message.tsx                 # single message row (You/Bot)
    LoadingIndicator.tsx        # "Translating..." spinner
    InputBar.tsx                # "> " + TextInput
  hooks/
    useChat.ts                  # messages, submit, loading, commands
    useLangSettings.ts          # fromLang/toLang + /from, /to commands
  types/
    message.ts                  # export type Message = { role: 'You' | 'Bot'; text: string; id: string }
  commands/
    parseCommand.ts             # pure function: parse /from, /to, /help, /clear, /exit
```

### Steps

- [x] Create `src/types/message.ts` with type `Message` and factory `createMessage(role, text)` (generates `id: crypto.randomUUID()`).
- [x] Implement `parseCommand(input)` in `src/commands/parseCommand.ts`:
  - returns discriminated union: `{ type: 'from'; lang: string } | { type: 'to'; lang: string } | { type: 'clear' } | { type: 'help' } | { type: 'exit' } | { type: 'translate'; text: string }` (+ extra `error` variant for empty args and unknown commands);
  - case-insensitive command matching;
  - **[MEDIUM — new]** extract argument via `slice(n)`, not `.replace(prefix, "")` — `.replace` finds the first match anywhere in the string (`/from /from russian` → `newLang = "/from russian"`);
  - validates that `/from`/`/to` have a non-empty argument (returns `{ type: 'error', message }`);
  - unit tests: 23 cases in `parseCommand.test.ts` covering valid commands, empty argument, wrong prefix, casing, nested prefix (`/from /from russian`).
- [x] Extract `useLangSettings` (hook for `fromLang`/`toLang` pair + `setFrom`/`setTo`). Returns raw `useState` setters.
- [x] Extract `useChat` (hook: `messages`, `isLoading`, `input`, `submit()`, `clear()`; takes options object `{ fromLang, toLang, setFromLang, setToLang }`; uses `translationChain`).
- [x] Split `App` into components listed above; `MessageList` takes `{ messages, isLoading }`, `Message` (`MessageItem` in code) takes `msg: Message`. `index.tsx` is now 3 lines, `App.tsx` is the root component.
- [x] **[MEDIUM — new]** Replace `key={i}` with `key={message.id}` — index keys cause incorrect React reconciliation when messages are removed.

---

## 4. Reliability: Timeouts, Cancellation, Retries

**File:** `src/hooks/useChat.ts`

### Solution

- [x] **[LOW — new]** Create an `AbortController` on each submit; pass `signal` to `chain.invoke`; cancel the previous controller in `useEffect` cleanup on unmount. Without this, the Ollama HTTP connection stays alive after the TUI exits.
- [x] 60-second timeout (extract constant `LLM_TIMEOUT_MS` to `src/constants.ts`).
- [x] On `AbortError` show a neutral message `"Request cancelled"` (do not highlight in red).
- [x] Simple retry for network errors (1 retry with 1s delay) — wrap in `withRetry` helper in `src/helpers/retry.ts`, cover with tests.
- [x] Unit tests for `withRetry` implemented.

---

## 5. UX: History Limit and New Commands

**Files:** `src/hooks/useChat.ts`, `src/components/MessageList.tsx`

### Solution

- [ ] **[LOW — new]** Cap `messages` at `MAX_MESSAGES = 200` (constant in `src/constants.ts`); trim the head when exceeded. Without this, `setMessages(prev => [...prev, msg])` is O(n) and triggers a full Ink re-render — noticeable lag after a few hundred messages.
- [ ] Enable auto-scroll: use `<Static items={messages}>` (Ink 7) for history so the input bar stays pinned at the bottom.
- [ ] Implement slash commands:
  - `/help` — print the full command list;
  - `/clear` — clear history;
  - `/exit` (or `/quit`) — `process.exit(0)`.
- [ ] Show placeholder `"Type to translate. /help for commands."` in `InputBar` while `input` is empty.
- [ ] Visually disable `TextInput` during `isLoading` (via `isDisabled` prop in `ink-text-input@6`).

---

## 6. Helpers: Expand and Test

**File:** `src/helpers/index.ts` → rename/expand

### Solution

- [ ] Rename `src/helpers/index.ts` → `src/helpers/text.ts` (explicit naming).
- [x] Add `withRetry<T>(fn, { retries, delayMs })` to `src/helpers/retry.ts`.
- [ ] Cover `cleanText` with unit tests: empty string, whitespace-only, multiple line breaks, mixed content, edge cases (`\n\n\n`, `\n\n\n\n\n`).
- [x] Cover `withRetry` with unit tests: success on first try, success after N retries, retries exhausted.

---

## 7. Test Infrastructure

### Solution

- [ ] Add `vitest` + `@testing-library/react` to devDependencies.
- [ ] Create `vitest.config.ts` if custom settings are needed.
- [ ] Add scripts to `package.json`:
  - `"test": "vitest run"`
  - `"test:watch": "vitest"`
  - `"test:coverage": "vitest run --coverage"`
- [ ] Target coverage: `cleanText`, `parseCommand`, `validateEnv`, `withRetry` — 100% lines; hooks `useChat`/`useLangSettings` — via mocked chain, main scenarios (submit, error, cancel, clear).
- [ ] Add script `"typecheck": "tsc --noEmit"` for CI.

---

## 8. Dependency and Script Cleanup

**File:** `package.json`

### Solution

- [ ] Remove unused devDeps: `concurrently`, `nodemon`, `ts-node` (`tsx` is used instead).
- [ ] TypeScript 6.0.3 is already installed and works — **do not downgrade to 5.x**. Verify `npm run build` passes after changes.
- [ ] Add a combined verify script: `"verify": "npm run lint && npm run format:check && npm run typecheck && npm run test"`.
- [ ] Confirm `npm run build` compiles to `outDir: ./dist`.

---

## 9. Documentation

**Files:** `README.md`, `CLAUDE.md`

### Solution

- [ ] In `README.md`:
  - replace `gemma4:e4b-mlx` with a real model name (check what is actually running locally);
  - **rename `TEMP` → `LLM_TEMP`** in the `.env` example;
  - add a "Commands" section: `/from`, `/to`, `/clear`, `/help`, `/exit`;
  - mention `OLLAMA_BASE_URL`;
  - reflect the new directory structure (`components/`, `hooks/`, `commands/`, `types/`).
- [ ] Update `CLAUDE.md` "Architecture" section to match the new structure; note tests and history limit.
- [ ] Commit `CLAUDE.md` or explicitly add it to `.gitignore` — pick one and document the decision.

---

## 10. Git Hygiene

- [ ] One logical commit per group (sections 1–9), messages in style: `refactor: ...`, `feat: ...`, `test: ...`, `chore: ...`, `docs: ...`.
- [ ] Before `git add`: run `git status`, `git diff --stat`, verify no secrets in `.env`.
- [ ] Do not push without an explicit request.

---

## 11. Definition of Done

- [ ] `npm run lint` — 0 errors.
- [ ] `npm run format:check` — 0 differences.
- [ ] `npm run typecheck` — 0 errors.
- [ ] `npm test` — all tests green, coverage for `cleanText`/`parseCommand`/`validateEnv`/`withRetry` ≥ 90%.
- [ ] `npm run build` — compiles successfully.
- [ ] `npm start` — TUI launches; `/from russian`, `/to english`, translation uses the model from `MODEL` (not the `"llama3"` fallback); temperature is applied from `LLM_TEMP`; `/clear` clears history; `/help` prints commands; `/exit` closes the app.
- [ ] `README.md` reflects actual state; `TEMP` renamed to `LLM_TEMP`.
- [ ] Unused devDeps removed, lockfile updated.

---

## Execution Order

1. Pre-flight (section 0) — decide fate of `CLAUDE.md`.
2. ~~Config + validation (section 1) + tests~~ — **DONE** (2026-06-07): `LLM_TEMP` renamed, `parseConfig()` added, 6 unit tests passing.
3. ~~LLM chain (section 2)~~ — **DONE** (2026-06-07): `translationChain` at module level, named exports, `instanceof Runnable` test passing.
4. ~~UI split (section 3)~~ — **DONE** (2026-06-07): types, hooks, 6 components, App.tsx split, 23 parseCommand tests passing.
5. Reliability (section 4) — inside `useChat` once it exists.
6. UX improvements (section 5) — after `useChat` is working.
7. Helpers and retries (section 6) — parallel with section 4.
8. Test infrastructure (section 7) — set up early, grow alongside new modules.
9. Dependency cleanup (section 8) — near the end, once real usage is clear.
10. Documentation (section 9) — after code is stable.
11. Final check against section 11.
