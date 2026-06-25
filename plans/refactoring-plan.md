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
| **LOW**      | Model not available (deleted from Ollama or never pulled) — cryptic error instead of helpful message                                                                                                                                                                                              | 5       |
| **LOW**      | `checkModelAvailable()` has no timeout — if Ollama hangs, startup blocks indefinitely                                                                                                                                                                                                             | 5       |

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

## 5. UX: History Limit, New Commands, and Model Unavailable Handling

**Files:** `src/hooks/useChat.ts`, `src/components/MessageList.tsx`, `src/llmModel/index.ts`

### Problems

- **[LOW — fixed]** Unbounded `messages` array — `setMessages(prev => [...prev, msg])` is O(n) and triggers a full Ink re-render; noticeable lag after a few hundred messages.
- **[LOW — new]** If the configured model was deleted from Ollama (or never pulled), the user gets a cryptic error instead of a helpful message.
- **[LOW — new]** `checkModelAvailable()` had no timeout — if Ollama hangs, the app waits indefinitely on startup.

### Solution

- [x] **[LOW — new]** Cap `messages` at `MAX_MESSAGES = 200` (constant in `src/constants.ts`); trim the head when exceeded.
- [x] ~~Enable auto-scroll via `<Static items={messages}>`~~ — **reverted**: `<Static>` is append-only and never re-renders/drops printed rows, which silently broke `/clear`, the model-unavailable replace, and `MAX_MESSAGES` head-trim. History is now a plain `.map()`; the terminal scrolls naturally.
- [x] Show placeholder `"Type to translate. /help for commands."` in `InputBar` while `input` is empty.
- [x] **[LOW — new]** `checkModelAvailable()` in `src/llmModel/index.ts` — queries Ollama's `GET /api/tags` (no inference) and checks `config.MODEL` is listed, with a 5-second timeout (`MODEL_CHECK_TIMEOUT_MS` in `constants.ts`).
- [x] **[LOW — new]** On mount, `useChat` calls `checkModelAvailable()` and shows a clear error if the model is not found: `Error: Model "xxx" is not available. Please pull the model first using: ollama pull xxx`.
- [x] `/quit` alias is already implemented in `parseCommand.ts` alongside `/exit`.
- [ ] **WONTDO** `isDisabled` prop — `ink-text-input@6.0.0` type definitions do not expose this prop. Input is already effectively disabled via `if (!input.trim() || isLoading) return` in `submit()`.

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

## 12. Migrate Linting/Formatting to Oxc

**Goal:** replace the ESLint + Prettier toolchain with [Oxc](https://oxc.rs/) (Rust-based, ~50–100× faster) to cut lint/format time and shrink devDeps.

### Steps

- [x] Add `oxlint` to devDeps (`oxlint@1.71.0`); create `.oxlintrc.json` (ports `eslint.config.mts`: `ignorePatterns: ["dist/**"]`, `typescript`/`react`/`react-perf`/`unicorn`/`oxc` plugins, `correctness` category as error). Verified scanning works (~99 ms vs ESLint).
- [x] Replace `lint:code` (`eslint .`) → `oxlint`; replace `fix:lint` (`eslint . --fix`) → `oxlint --fix`.
- [x] **Formatter migrated to `oxfmt`** (2026-06-25): added `oxfmt@0.56.0` to devDeps; generated `.oxfmtrc.json` via `oxfmt --migrate=prettier` (keeps the Prettier style — 2-space indent, double quotes, semicolons, trailing commas, `printWidth: 80`); swapped `lint:format`/`format` scripts from `prettier` to `oxfmt`; removed `prettier` devDep + `.prettierrc` + `.prettierignore` (its ignore patterns now live in `.oxfmtrc.json` `ignorePatterns`). **Markdown excluded** (`**/*.md`) because oxfmt 0.56's markdown formatter throws `DataCloneError` (not threads-related) — re-enable once fixed upstream. `npm run verify` green.
- [x] React-hooks coverage confirmed: `react-hooks/exhaustive-deps` explicitly enabled (`warn`) and verified firing on a missing-dep `useEffect`; `react-hooks/rules-of-hooks` enabled (`error`).
- [ ] **WONTDO (now) — deferred to section 14:** import-sorting depends on the path-alias group (`@/*`) and on `oxfmt`. Since section 14 (aliases) and `oxfmt` are not in yet, the import-sort pass is deferred — do it together with section 14.
- [x] Update `lint:code`/`fix:lint` scripts; removed `eslint`, `@eslint/js`, `eslint-config-prettier`, `typescript-eslint`, `globals` (and `jiti`, only needed to load the `.mts` ESLint config) from devDeps; deleted `eslint.config.mts`. `npm run verify` green.
- [x] ~~`.prettierignore` already excludes `dist`, `node_modules`, `.claude`~~ — removed; patterns migrated into `.oxfmtrc.json` `ignorePatterns`.
- [x] Update `CLAUDE.md` (commands section + the ESLint `ignores` note → Oxc note) and `README.md`.

### Risks / Notes

- Oxc does **not** support custom ESLint plugins; confirm nothing beyond TS + React rules is in use (currently nothing is).
- `oxlint` reads its own config — the existing `eslint.config.mts` will be removed, not reused.

---

## 13. Git Hooks via Husky

**Goal:** enforce lint/format/tests automatically with [Husky](https://github.com/typicode/husky) so broken code never reaches the remote.

### Steps

- [ ] Add `husky` (+ `lint-staged`) to devDeps; run `bunx husky init` (creates `.husky/` and the `prepare` script).
- [ ] **pre-commit:** run `lint-staged` — `oxlint --fix` + formatter on **staged files only** (fast, no full-repo scan). Add a `lint-staged` config to `package.json`.
- [ ] **pre-push:** run the full gate — `npm run verify` (lint + typecheck + tests). Optionally `npm run build` to catch bundle breakage before pushing.
- [ ] Ensure hooks invoke via `bun`/`bunx` consistently with the rest of the toolchain; keep them fast (pre-commit < ~2s, pre-push may be longer).
- [ ] Document a bypass note (`git commit --no-verify`) for emergencies in `CLAUDE.md`.
- [ ] Confirm `prepare` script runs on fresh `bun install` so hooks self-install for new clones.

### Sequencing

- Do **after** section 12 so the hooks call `oxlint` directly (avoid wiring ESLint into hooks only to rip it out).

---

## 14. Path Aliases

**Goal:** replace deep relative imports (`../../utils/clean-text`, `../../types/message.type`) with a stable alias so moving files doesn't churn import paths and intent is clearer.

### Steps

- [ ] Add `paths` to `tsconfig.json`: `"@/*": ["./src/*"]` (alongside the existing `react-devtools-core` stub alias). `moduleResolution: "bundler"` already supports this without `baseUrl`.
- [ ] Confirm each consumer resolves the alias:
  - **bun** (run `bun src/index.tsx` + `bun build --compile`) — reads `tsconfig` `paths` natively. ✓ expected.
  - **vitest** — does **not** read `tsconfig` `paths` by default. Add `vite-tsconfig-paths` (or a `resolve.alias` entry in a `vitest.config.ts`) so tests resolve `@/*`. **This is the main risk — verify test runs before rewriting imports.**
- [ ] Decide alias granularity: a single `@/*` → `src/*` is simplest. (Optional finer aliases like `@components/*`, `@utils/*` add config for little gain at this size — default to the single root alias.)
- [ ] Rewrite cross-module imports to the alias; keep **intra-module** imports relative (`./header.component`, `./header.type`) — a module referring to its own files should not go through the alias.
- [ ] Run the Oxc import-sorter (section 12) so aliases land in their own group.
- [ ] Update `CLAUDE.md` (note the alias + the "intra-module stays relative" rule) and `README.md`.

### Sequencing

- Do **before** section 12's import-sort pass (so sorting accounts for the alias group), but the `tsconfig`/vitest wiring can land anytime — it's independent of the Oxc swap.

---

## 15. To Discuss (Not Decided Yet)

> This section is for discussion before a decision is made. Do **not** implement
> anything from it without explicit approval.

### 15.1 Knip — unused code & dependency detection

**What it is:** [Knip](https://knip.dev/) finds unused files, exports, types,
dependencies, and npm scripts (dead-code + dependency audit).

**Why it might help here:**

- Closes the open questions from section 8 (Dependency Cleanup): whether `ts-node`
  and `concurrently` are actually used. Scripts call the `conc` binary (a
  `concurrently` alias), so it is used — Knip would confirm this formally; `ts-node`
  is the questionable one.
- The project follows the module-folder convention with `index.ts` barrels — Knip
  can catch "dead" re-exports and unreachable modules.

**Arguments against / risks:**

- One more devDep + config in a toolchain we just deliberately trimmed
  (ESLint→oxlint, Prettier→oxfmt).
- `index.ts` barrels produce false positives on "unused exports" — requires tuning
  `entry`/`project` (and possibly `ignore`).
- For a project this size, a one-off manual dependency audit may be cheaper than a
  permanent integration.

**Draft adoption plan (only after approval):**

1. `bun add -d knip`.
2. `knip.json`: `entry` = `src/index.tsx` + `**/*.test.ts`; `project` = `src/**`.
3. Script `"knip": "knip"` (wire into `verify` cautiously — run standalone first so
   false positives don't break the gate).
4. Triage findings (especially `ts-node`), remove confirmed dead weight, note it in
   section 8.

**Decision to make:** adopt Knip as a permanent toolchain tool **or** limit it to a
one-off `bunx knip` audit and then drop it.

---

## Execution Order

1. Pre-flight (section 0) — decide fate of `CLAUDE.md`.
2. ~~Config + validation (section 1) + tests~~ — **DONE** (2026-06-07): `LLM_TEMP` renamed, `parseConfig()` added, 6 unit tests passing.
3. ~~LLM chain (section 2)~~ — **DONE** (2026-06-07): `translationChain` at module level, named exports, `instanceof Runnable` test passing.
4. ~~UI split (section 3)~~ — **DONE** (2026-06-07): types, hooks, 6 components, App.tsx split, 23 parseCommand tests passing.
5. ~~Reliability (section 4)~~ — **DONE** (2026-06-11): `AbortController`, 60s timeout, `withRetry` helper, unit tests.
6. ~~UX improvements (section 5)~~ — **DONE** (2026-06-11): history cap, auto-scroll, placeholder, model unavailable check.
7. Helpers and retries (section 6) — parallel with section 4.
8. Test infrastructure (section 7) — set up early, grow alongside new modules.
9. Dependency cleanup (section 8) — near the end, once real usage is clear.
10. Documentation (section 9) — after code is stable.
11. Final check against section 11.
12. Path aliases (section 14) — wire `tsconfig`/vitest, then rewrite cross-module imports.
13. Migrate lint/format to Oxc (section 12) — toolchain swap once code is stable; runs the import-sort pass (accounts for the alias group).
14. Husky git hooks (section 13) — last, after Oxc so hooks call `oxlint` directly.
