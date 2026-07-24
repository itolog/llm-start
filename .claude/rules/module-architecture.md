# Module architecture

Portable convention — copy this file into any TypeScript project as-is. Anything
specific to one repository (its directory map, path alias, tool choices) belongs
in that project's `CLAUDE.md`, not here.

## Self-contained module folders

Every component / hook / utility / service is a **folder**, not a loose file:

- `index.ts` — barrel exposing the public API
- the implementation file (`*.component.tsx`, `*.hook.ts`, `*.util.ts`, `*.service.ts`)
- optional `*.type.ts` (types/interfaces only) and `*.model.ts` (constants, static data)
- co-located tests (`*.test.ts`)

Consumers import the **folder**, never the inner files:

```ts
import { InputBar } from "@/components/input-bar"; // ✅ the module's public API
import { InputBar } from "@/components/input-bar/input-bar.component"; // ❌ reaches inside
```

Within a module, its own files import each other **relatively** (`./input-bar.model`) —
a module referencing itself doesn't go through the alias. Co-located tests are the one
place that imports the implementation file directly: they test the unit, not the contract.

## Naming

Folders and files are **kebab-case**; the file's role is a suffix on the basename:

| Suffix | Role |
| --- | --- |
| `*.component.tsx` | UI component |
| `*.hook.ts` | React hook |
| `*.util.ts` | pure utility function |
| `*.service.ts` | stateful service (I/O, external systems) |
| `*.type.ts` | types / interfaces only |
| `*.model.ts` | constants and static data |
| `*.test.ts` | tests (short form, no role suffix) |
| `index.ts` | public-API barrel |

Exported bindings keep their idiomatic casing — camelCase for functions and hooks
(`useChat`, `createMessage`), PascalCase for components and types (`Header`,
`TranslationStats`). Only *filenames* are kebab-case.

## Where a helper goes

- Used by **one** module → that module's own `utils/<helper>/` folder, imported relatively.
- Used by **2+** modules → the shared top-level `utils/`, imported via the project's alias.

Keeping single-use helpers module-local also avoids import cycles when the helper needs
the module's own types.

Sub-folders follow the same rules recursively: a helper inside `utils/` is itself a
module folder with a barrel and co-located tests.

## Keep nesting shallow

Depth is a judgement call, and the default is **shallow**. One level of `utils/` inside
a module is normal; a tree like `module/hooks/thing/utils/other-thing/` is not — it costs
readability for ownership signal that the types already carry.

When a "private" sub-module makes a folder deep, prefer promoting it to a sibling of its
consumer. Trade-off worth stating out loud: a sibling can be imported by anyone, so the
constraint that it isn't standalone-usable must then live in its options type rather than
in the directory structure.
