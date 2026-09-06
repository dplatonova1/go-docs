# Architecture Decision Records

Решения, зафиксированные в [`CLAUDE.md`](../../CLAUDE.md), разложены здесь по
ADR — с контекстом, отвергнутыми альтернативами и ценой каждого выбора.
`CLAUDE.md` остаётся кратким сводом «что решено»; ADR отвечают «почему» и
«чем за это платим».

| ADR | Решение | Статус |
|---|---|---|
| [0001](./0001-bare-react-native-new-architecture.md) | Bare React Native + New Architecture, без Expo | Accepted |
| [0002](./0002-local-first-storage.md) | Local-first: SQLite + зашифрованные файлы, без сервера | Accepted |
| [0003](./0003-form-catalog-positional-mapping.md) | Каталог форм: статичные шаблоны, fingerprint, маппинг по позиции | Accepted |
| [0004](./0004-no-llm-at-runtime.md) | LLM только на этапе разработки, рантайм детерминированный | Accepted |
| [0005](./0005-mrz-with-manual-confirmation.md) | MRZ вместо общего OCR + обязательное подтверждение полей | Accepted |
| [0006](./0006-platform-billing-for-premium.md) | Премиум через платформенный биллинг (Google Play / Apple IAP), без своего бэкенда | Accepted |
| [0007](./0007-privacy-policy-gate-for-cloud-sync.md) | Privacy policy — обязательное условие перед запуском облачной синхронизации | Accepted (вступает в силу в Фазе 6) |

## Когда заводить новый ADR

Если решение трудно откатить или его последствия переживут текущую фазу:
выбор библиотеки навигации, схема шифрования, формат JSON-шаблона формы,
включение сети в release-сборку, модель монетизации.

Не заводить ADR на то, что видно из кода: структура папок, имена
компонентов, выбор линтера.

## Формат

Копировать структуру существующих: Status → Context → Decision →
Consequences (Positive / Negative / Neutral) → Alternatives Considered →
References. Нумерация сквозная, четыре цифры. Принятый ADR не
переписывается — при смене решения заводится новый со статусом
`Superseded by ADR-XXXX` в старом.
