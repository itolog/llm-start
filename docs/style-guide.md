# Code style guide

House rules that aren't enforced by a linter. Formatting, imports, and module
layout are covered by the tooling (`oxfmt`, `oxlint`, `knip`) and by
`CLAUDE.md` — this file is for the judgement calls those can't make.

## Comments

### Comment the *why*, never the *what*

The code already says what it does. A comment earns its place only when it
records something the reader can't recover from the code itself:

- **Why** a non-obvious choice was made (trade-off, constraint, workaround).
- An **invariant** the types don't express (e.g. "non-null while the picker is
  open").
- A **gotcha** or an approach that was tried and rejected, so nobody re-does it.

Delete comments that merely restate the name or the body — they rot and add
noise:

```ts
// ❌ restates the name / body
// Whether the temperature stepper is open.
const [tempPickerOpen, setTempPickerOpen] = useState(false);

// Picker selection: close it, then apply the chosen model.
const selectModel = async (model: string) => {
  setModelItems(null);
  await applyModel(model);
};
```

```ts
// ✅ records an invariant the code can't
// Non-null while the model picker is open (holds the installed model tags).
const [modelItems, setModelItems] = useState<string[] | null>(null);

// ✅ records why, and warns off a rejected approach
// Plain map(), not <Static>: history is mutable (/clear, model-error replace,
// MAX_MESSAGES head-trim), and <Static> only ever appends — it silently breaks
// all three.
```

### Doc comments on the public API are the exception

The "why, not what" rule targets **inline comments inside a function body** —
comments that narrate code the reader is already looking at. It does **not**
apply to **documentation of a module's public surface**: an exported type's
fields, a service method, a public utility. Describing *what* those do is good
and encouraged — it's the module's contract, read by callers who are *not*
looking at the implementation.

```ts
// ✅ documents the public contract — keep these, "what" and all
export interface TranslationStats {
  /** Wall-clock duration of the request (submit → completion), in ms. */
  elapsedMs: number;
  /** Prompt (input) tokens spent on the request. */
  promptTokens: number;
}
```

Prefer JSDoc (`/** … */`) for this so editors surface it on hover; a leading
`//` block over the same declaration is fine too. The distinction is *audience*,
not syntax: contract docs face callers, inline "why" comments face maintainers.

### Language

All comments are written in **English** (independent of the conversation or PR
language).

### Better Comments annotations

We follow the [Better Comments](https://marketplace.visualstudio.com/items?itemName=aaron-bond.better-comments)
convention for the *few* comments that need to stand out. Install the extension
to get the color-coding; the prefixes are meaningful on their own even without
it. Use the leading tag right after `//`:

| Prefix | Meaning | Use for |
| --- | --- | --- |
| `// * ` | Highlight | An important note or emphasis worth surfacing. |
| `// ! ` | Alert | A warning / danger — "don't do X", footguns, fragile assumptions. |
| `// ? ` | Query | An open question or something that needs clarification. |
| `// TODO: ` | TODO | A tracked follow-up (prefer a plan entry for anything real). |
| `// ` (plain) | Normal | The default "why" comment — most comments stay plain. |

Guidance:

- **Most comments stay plain.** Reach for a tag only when the category adds
  signal — an untagged "why" comment is the norm, not the exception.
- Reserve `// !` for genuine footguns (e.g. the `<Static>` note above, or "don't
  reach for `@mishieck/ink-titled-box` again"). Over-tagging drains the color of
  its meaning.
- A `// //` prefix marks commented-out code as deliberately-dead — but prefer to
  **delete** dead code; git remembers it.
