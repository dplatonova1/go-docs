# GoDocs

Чек-лист документов и автозаполнение форм для виз, ВНЖ и ПМЖ.

Пользователь вставляет список требуемых документов, скопированный с сайта
консульства → приложение строит чек-лист → пользователь прикладывает файлы
к пунктам → приложение собирает финальный PDF-пакет для печати с реестром.
Отдельно — автозаполнение официальных форм (docx/PDF) данными из уже
загруженных документов.

**Всё работает офлайн, данные не покидают устройство.** Документы лежат на
диске зашифрованными, ключ — в Keychain / Android Keystore. Release-сборка
не запрашивает разрешение на доступ в интернет. Обоснование — в
[ADR-0002](docs/adr/0002-local-first-storage.md).

## Стек

Bare React Native 0.87.1, TypeScript (strict), New Architecture
(Fabric + TurboModules), Hermes. `op-sqlite`, `react-native-keychain`,
`@dr.pogodin/react-native-fs`, `react-native-vision-camera`, `pdf-lib`.

Не Expo — нужен прямой доступ к нативным проектам
([ADR-0001](docs/adr/0001-bare-react-native-new-architecture.md)).

## Запуск

Требуется настроенное окружение React Native: Node ≥ 22.11, JDK, Android SDK
— см. [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment).

```sh
npm install
npm start          # Metro в отдельном терминале
npm run android    # сборка и запуск на эмуляторе/устройстве
```

iOS (только с macOS) — перед первой сборкой:

```sh
bundle install
bundle exec pod install
npm run ios
```

## Проверки

```sh
npx tsc --noEmit   # типы
npm run lint       # eslint
npm test           # jest
```

## Структура

```
src/
├── db/           SQLite (op-sqlite), схема и миграции
├── storage/      зашифрованные файлы, ключ в Keychain/Keystore
├── components/   переиспользуемый UI
├── features/     фичи по вертикалям: checklist, package, forms, profile
└── navigation/   навигаторы и типы маршрутов
docs/
├── architecture.md   обзор, диаграмма, NFR, риски
└── adr/              решения с контекстом и альтернативами
```

`App.tsx` и `index.js` пока со стартового шаблона — заменяются в Фазе 1
вместе с первыми экранами.

## Документация

- [CLAUDE.md](CLAUDE.md) — свод решений и фазы разработки
- [docs/architecture.md](docs/architecture.md) — архитектура целиком
- [docs/adr/](docs/adr/) — Architecture Decision Records

## Приватность

Единственная копия данных — на устройстве, автобэкап Google отключён
(`allowBackup="false"`). Потеря устройства означает потерю собранного
пакета; это осознанный компромисс ради приватности, и он должен быть явно
проговорён пользователю в UI. Экспорт готового пакета служит ручным
бэкапом.
