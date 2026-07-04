# Lang-App TUI Refactoring Plan

> Прогресс: 13/22 · Создан: 2026-06-06 · Обновлён: 2026-07-04
> Ветка: `feature/tui` · Скоуп: оставшийся рефакторинг + тесты + docs + тулинг

## A. Тесты

| ID | Задача | Статус | Дата |
| --- | --- | --- | --- |
| A1 | Покрыть `clean-text` unit-тестами | ✅ done | 2026-07-04 |
| A2 | Покрыть `create-message` unit-тестами | ✅ done | 2026-07-04 |
| A3 | Тесты хуков `use-chat` / `use-lang-settings` через мокнутый chain | ⬜ todo | — |
| A4 | Добавить скрипт `test:coverage` (`vitest run --coverage`) | ⬜ todo | — |

### Заметки

- **A1** — 9 кейсов: пустая строка, whitespace-only, `\n{3,}`-схлопывание, mixed content.
- **A2** — 5 кейсов: проброс role/text, уникальный `id` на 100 вызовах.
- **A3** — кейсы: submit, error, cancel, clear; `/from`, `/to`. Риск: таймеры → `vi.useFakeTimers()`.
- **A4** — цель покрытия `clean-text` / `parse-command` / `with-retry` — 100% строк.

## B. Зависимости

| ID | Задача | Статус | Дата |
| --- | --- | --- | --- |
| B1 | Удалить `ts-node` из devDeps | ⬜ todo | — |
| B2 | Удалить `nodemon` | ✅ done | 2026-07-04 |
| B3 | Оставить `concurrently` (используется как `conc`) | ✅ done | 2026-07-04 |

### Заметки

- **B1** — ничего на него не ссылается (`bun` гоняет `.tsx` сам). После удаления прогнать `npm run verify` + `npm run build`.
- **B2** — уже отсутствовал, проверено 2026-07-04.

## C. Документация

| ID | Задача | Статус | Дата |
| --- | --- | --- | --- |
| C1 | README: пути конфига + реальная модель | ✅ done | 2026-07-04 |
| C2 | README: секция Architecture под реальную структуру | ✅ done | 2026-07-04 |
| C3 | README: полная секция Commands + test/build | ✅ done | 2026-07-04 |
| C4 | `CLAUDE.md` закоммичен и соответствует структуре | ✅ done | 2026-07-04 |

## D. Path aliases

| ID | Задача | Статус | Дата |
| --- | --- | --- | --- |
| D1 | Добавить `"@/*": ["./src/*"]` в `tsconfig.json` `paths` | ⬜ todo | — |
| D2 | Подключить резолв алиаса в vitest | ⬜ todo | — |
| D3 | Переписать cross-module импорты на `@/…` | ⬜ todo | — |
| D4 | Обновить `CLAUDE.md` + `README.md` (правило алиасов) | ⬜ todo | — |

### Заметки

- **D2** — vitest **не** читает `tsconfig` `paths`: нужен `vite-tsconfig-paths` или `resolve.alias` в `vitest.config.ts`. **Главный риск — проверить тесты до переписывания импортов.**
- **D3** — intra-module импорты остаются относительными (`./header.component`).

## E. Import-sort (Oxc)

| ID | Задача | Статус | Дата |
| --- | --- | --- | --- |
| E1 | Включить импорт-сортер Oxc и прогнать один раз | ⬜ todo | — |

### Заметки

- **E1** — строго **после** секции D, чтобы `@/*` попал в свою группу импортов.

## F. Git hooks

| ID | Задача | Статус | Дата |
| --- | --- | --- | --- |
| F1 | `lefthook` в devDeps + `prepare: "lefthook install"` | ✅ done | 2026-07-04 |
| F2 | pre-commit: `oxlint --fix` + `oxfmt --write` по staged, `stage_fixed` | ✅ done | 2026-07-04 |
| F3 | pre-push: `bun run verify` | ✅ done | 2026-07-04 |
| F4 | pre-push: `deps-audit` (`bun audit`), параллельно с verify | ✅ done | 2026-07-04 |
| F5 | Удалить `husky` + `lint-staged` (миграция на Lefthook) | ✅ done | 2026-07-04 |

### Заметки

- **F5** — сначала сделано на Husky + lint-staged, затем консолидировано в Lefthook (один Go-бинарник, `lefthook.yml`, параллельные job'ы — в духе Oxc/bun-тулчейна). Снят старый `core.hooksPath=.husky/_`.
- **F2** — `bun test` в хуках намеренно не используется (несовместимый рантайм, CLAUDE.md требует vitest). Bypass: `--no-verify`.
- Попутный фикс: oxfmt 0.56 крашится `DataCloneError` на YAML → `*.yml`/`**/*.yml` добавлены в `ignorePatterns` `.oxfmtrc.json` (корневой `*.yml` обязателен — `**/*.yml` не матчит корень).

## G. На обсуждение

| ID | Задача | Статус | Дата |
| --- | --- | --- | --- |
| G1 | Knip: постоянный тул vs разовый `bunx knip`-аудит | 💬 discuss | — |

### Заметки

- **G1** — [Knip](https://knip.dev/) найдёт мёртвые exports/deps (подтвердил бы B1). Против: ещё одна devDep в только что урезанном тулчейне; `index.ts`-баррелы дают false positives. Не внедрять без явного решения.

## Definition of Done

- `npm run lint` — 0 ошибок (code + types + format).
- `npm test` — зелёный; покрытие `clean-text` / `parse-command` / `with-retry` ≥ 90%.
- `npm run build` — собирает `dist/lang-app`.
- `ts-node` удалён, `bun.lock` обновлён.

## Порядок выполнения

1. **A3–A4** — тесты хуков + coverage.
2. **B1** — удалить `ts-node`, проверить verify + build.
3. **D** — алиасы: tsconfig + vitest, затем импорты.
4. **E1** — импорт-сортер сразу после алиасов.
5. **G1** — решить судьбу Knip.

## История

- 2026-06-07 — конфиг/валидация, LLM chain на уровне модуля, UI split (компоненты + хуки + parse-command).
- 2026-06-11 — reliability (AbortController, таймауты, withRetry) + UX (history cap, model check, placeholder).
- 2026-06-25 — миграция форматтера на oxfmt; ранее — oxlint вместо ESLint.
- 2026-07-04 — план актуализирован (выполненное убрано); A1–A2 done; C1–C4 done (README переписан); F1–F5 done (Husky → Lefthook, deps-audit); план переведён на табличный формат (skill `plan`).
- Историческая заметка: env-валидация из исходного плана (§1: `dotenv`, `validateEnv`, `TEMP`→`LLM_TEMP`) **superseded** — конфиг теперь статический `src/config/default-config.ts`, `process.env` в `src/` нет.
