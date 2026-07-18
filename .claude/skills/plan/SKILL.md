---
name: plan
description: Create or update a persistent plan file using the project's standard table-based format (task IDs, status column, progress header). Use when the user asks to create/update a plan or mark tasks done, when finalizing a plan in plan mode, or when a code review produces a list of follow-up work worth persisting.
---

# Plan format skill

Persist plans as markdown files following the format below. When creating a new
plan, copy the template into the plan location (see below). When updating an
existing plan, preserve the format and follow the update rules.

## Location

- **Default: `plans/`** (git-tracked — plans are committed with the repo).
- **Override** per request: if the user names a target path/folder
  (e.g. "put the plan in `docs/`"), use that instead.
- One file per plan, kebab-case name describing the work
  (`plans/refactoring-plan.md`, `plans/auth-rework.md`).
- When updating, edit the existing file in place — do not create a duplicate.

## File layout

```markdown
# <Plan Title>

> Progress: <done>/<total> · Created: YYYY-MM-DD · Updated: YYYY-MM-DD
> Branch: `<branch>` · Scope: <one line>

## A. <Section name>

| ID | Task | Status | Date |
| --- | --- | --- | --- |
| A1 | <short imperative task> | ⬜ todo | — |
| A2 | <short imperative task> | ✅ done | 2026-07-04 |

### Notes

- **A1** — extra context, risks, links. Only when a task needs more than one line.

## B. <Next section>

...

## Execution order

1. **B** — why first.
2. **A** — why after.

## History

- 2026-07-04 — A2 done (9 test cases); plan reformatted.
```

## Rules

### IDs

- Sections are lettered: `A`, `B`, `C`… Tasks are numbered within the section:
  `A1`, `A2`, `B1`…
- IDs are **stable forever**: never renumber, never reuse a dropped ID. New
  tasks get the next free number in their section.
- Reference IDs in commits and discussion (`test: cover use-chat (A3)`).

### Statuses

Exactly one status per task, in the Status column:

- `⬜ todo` — not started
- `🔄 wip` — in progress
- `✅ done` — completed and verified
- `❌ wontdo` — decided against (add one-line reason in Notes)
- `💬 discuss` — needs a decision before work starts; do not implement

### Task rows

- Keep the Task cell to one short line (imperative: "Remove ts-node", not
  "ts-node should be removed"). Details, risks, and multi-line context go to
  the section's `### Notes` block, anchored by ID.
- Date = completion date for `✅`/`❌`, otherwise `—`.

### Updating a plan

1. Change the task's Status and Date — do not move or delete rows.
2. Update the `Progress: <done>/<total>` counter and `Updated:` date in the
   header (`✅` counts as done; `❌` reduces total).
3. Append one line to `## История` (date — what changed).
4. Superseded/obsolete tasks become `❌ wontdo` with a reason — never silently
   deleted, so the plan stays an honest record.

### Language

Plan files are written in **English** — headers, task text, and notes. This is
independent of the conversation language (a chat in Russian still produces an
English plan file). Code identifiers, paths, and tool names stay in their
original form.
