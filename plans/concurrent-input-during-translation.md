# Handling Input During an In-Flight Translation

> Progress: 2/9 · Created: 2026-07-22 · Updated: 2026-07-24
> Branch: `main` · Scope: define & implement what happens when the user submits while a translation is still streaming

## Context

Today `submit` (`src/hooks/use-chat/use-chat.hook.ts`) starts with
`if (!input.trim() || isLoading) return;`. While `isLoading` is true, **every**
submit is silently swallowed — plain text and pure commands alike — with no
feedback. Even `/exit` cannot run during a long translation. There is also **no
way to cancel** a running translation: `Esc` in `InputBar` only dismisses the
command-suggestions dropdown.

Key facts established from the code:

- `useTranslation.handleTranslate` installs a fresh `AbortController` per run and
  aborts the previous one; the abort infrastructure exists but is not exposed as
  a user-triggerable cancel.
- A cancelled request's `catch` already writes `"Request cancelled"` onto its own
  bot message — the desired outcome for an `Esc` interrupt.
- `llmModelService.translate` binds the stream via `this.chain.stream(...)` once
  at the start of an attempt, so a mid-stream `setModel`/`setTemperature` rebuild
  does **not** corrupt the running stream. Applying `/model` / `/temp` while a
  translation streams is therefore safe with no abort needed. (Only edge case: a
  retry re-reads `this.chain`.)

## Decisions

- **New translate while loading → interrupt-first.** The new input does not fire
  until the user stops the current translation (`Esc`). Matches how similar tools
  gate a new request behind an explicit interrupt; avoids silently discarding
  in-flight work. (Queue and silent-supersede considered and rejected.)
- **`/model` & `/temp` while loading → apply, let current finish.** The setting
  takes effect on the **next** request; the in-flight translation completes on the
  model/temp it started with. This is the standard convention (a settings change
  is not "cancel what you're doing") and is free here — the running stream is
  already bound to the old chain.

## A. Input categorization

| ID | Task | Status | Date |
| --- | --- | --- | --- |
| A1 | Split command handling into "pure" (no LLM) / "chain-affecting" / "translate" | ✅ done | 2026-07-24 |
| A2 | Replace blanket `isLoading` guard with empty-input guard + per-category policy | ✅ done | 2026-07-24 |

### Notes

- **A1** — Pure (run anytime, incl. mid-translation): `from`, `to`, `clear`,
  `help`, `exit`, `error`, and picker-open commands `models`, `tempPicker` (UI
  only, never touch the chain). Chain-affecting: `model` (apply), `temp` (apply).
  Translate: `translate`.
- **A2** — Keep `if (!input.trim()) return;`. `isLoading` no longer blocks
  everything; each category follows the policy in B / C below.
- **Implementation** — `getCommandCategory` lives in
  `src/hooks/use-chat/utils/command-category/` (single consumer → module-local
  util); it is a `ts-pattern` `match(...).exhaustive()` so a newly added command
  must be classified explicitly instead of silently falling into "pure".
  `submit` now gates only `translate` while `isLoading`, and returns *before*
  `setInput("")` so the text survives for a resubmit after `Esc` (B2). That
  gated submit is still silent — the user-facing hint is B3.

## B. New translate while loading — interrupt-first

| ID | Task | Status | Date |
| --- | --- | --- | --- |
| B1 | Expose a `cancel` action from `useTranslation` (abort current) up through `useChat` | ⬜ todo | — |
| B2 | Wire `Esc`-to-cancel, active only while `isLoading` (no conflict with pickers/suggestions) | ⬜ todo | — |
| B3 | A `translate` submit while loading → visible hint ("press Esc to stop first"), not silent | ⬜ todo | — |

### Notes

- **B2** — `Esc` is contended: `InputBar` uses it to dismiss the suggestions
  dropdown; pickers use it to cancel. Scope the cancel binding so it only fires
  when a translation is loading and no picker/dropdown owns the key — e.g. a
  dedicated `useInput` gated on `isLoading` in `App`, or fold cancel into
  `InputBar`'s existing handler with priority rules. Confirm only one `useInput`
  reacts per keypress.
- **B3** — With interrupt-first, hitting Enter on new text mid-translation must
  not be a silent no-op; post a short Bot notice telling the user to stop the
  current one first.

## C. Chain-affecting commands while loading — apply, let finish

| ID | Task | Status | Date |
| --- | --- | --- | --- |
| C1 | `/model` & `/temp` apply immediately during load; in-flight stream finishes on old settings (no abort) | ⬜ todo | — |

### Notes

- **C1** — No code change may be needed beyond removing the blanket guard (A2):
  `applyModel`/`applyTemp` already call `setModel`/`setTemperature`, which rebuild
  the chain for the next request without touching the running stream. Verify the
  active-model availability check (`checkModelAvailable`) still runs after a
  mid-load `/model` switch.

## D. Feedback & verification

| ID | Task | Status | Date |
| --- | --- | --- | --- |
| D1 | Ensure every non-actioned submit gives visible feedback (no silent Enter) | ⬜ todo | — |
| D2 | Add `use-chat` / `use-translation` tests for submits during loading | ⬜ todo | — |
| D3 | Run `bun run verify` | ⬜ todo | — |

### Notes

- **D2** — Cases: `Esc` cancels a running translation → card shows "Request
  cancelled"; a `translate` submit during load posts the B3 hint and does not
  start a request; `/exit` & `/help` work during load; `/model` during load
  applies and the current stream finishes; empty input stays a no-op.

## Execution order

1. **A** — categorization is the foundation the rest branches on.
2. **B** — interrupt-first: cancel action + `Esc` wiring + hint.
3. **C** — mostly falls out of A2; verify no abort/stream regression.
4. **D** — feedback pass + tests + verify.

## History

- 2026-07-22 — Plan created from code review of `use-chat`, `use-translation`,
  `input-bar`, and `llm-model.service`.
- 2026-07-22 — Decisions set: new translate → interrupt-first (B reworked to add
  an `Esc` cancel); `/model`/`/temp` → apply-and-let-finish (C simplified, no
  abort).
- 2026-07-24 — A1 + A2 done: `command-category` util (ts-pattern, exhaustive) +
  category-aware guard in `submit`; tests for the util and for pure /
  chain-affecting / translate submits during load. C1 verified in passing
  (`/model` mid-load applies, re-checks availability, stream finishes).
