# ADR-0001: Bare React Native + New Architecture, без Expo

## Status

Accepted (2026-09-03, Фаза 0)

## Context

Нужно кроссплатформенное мобильное приложение (Android приоритетно, iOS
следом) со следующими нативными зависимостями:

- `op-sqlite` — SQLite с нативным слоем;
- `react-native-keychain` — Keychain / Android Keystore;
- `@dr.pogodin/react-native-fs` — файловая система;
- `react-native-vision-camera` + MLKit-плагин для MRZ — нативный
  frame processor.

Все они требуют доступа к нативному проекту. При этом приложение не
использует сеть в рантайме (ADR-0002, ADR-0004), поэтому облачные сервисы
сборки и OTA-обновлений ценности не добавляют.

## Decision

Bare React Native 0.87.1, инициализированный через
`npx @react-native-community/cli@latest init`. New Architecture
(Fabric + TurboModules) включена — это дефолт начиная с 0.76, и мы её не
отключаем. TypeScript со `strict: true`.

## Consequences

### Positive

- Полный контроль над `android/` и `ios/`: можно править манифест, gradle,
  добавлять нативные модули без prebuild-прослоек.
- Нет зависимости от цикла релизов Expo SDK — обновляемся по своему графику.
- Нативные модули из списка выше ставятся напрямую, autolinking их подхватит.
- New Architecture — то, на что уже ориентируются свежие версии всех
  перечисленных библиотек; включать её потом было бы миграцией.

### Negative

- Обновление RN между мажорами — ручная работа с нативными проектами
  (Expo это частично автоматизирует).
- Настройка окружения (Android SDK, JDK, Xcode) ложится на разработчика.
- Нет `expo-updates` — правки JS без публикации в стор не выкатить.

### Neutral

- Expo-специфичные рекомендации (Expo Router, `babel-preset-expo`,
  `npx expo doctor`, `expo-image`) к проекту неприменимы; навигация будет
  на React Navigation.
- `ios/` сгенерирован и остаётся в репозитории, даже пока сборка под iOS
  не проверяется.

## Alternatives Considered

**Expo (managed / с dev client)**
- Отвергнуто: MLKit-плагин для vision-camera и `op-sqlite` требуют
  нативной настройки; выигрыш от managed-режима теряется, а ограничения
  остаются.
- В плюс шло: проще онбординг, EAS Build, OTA-обновления.

**Expo с prebuild (bare workflow)**
- Отвергнуто: даёт те же нативные папки, но добавляет слой конфигурации
  и config-плагинов поверх — сложность без выгоды при отсутствии сети и
  OTA.

**Нативная разработка (Kotlin + Swift)**
- Отвергнуто: две независимые кодовые базы для продукта, у которого почти
  вся сложность — в общей бизнес-логике (парсинг форм, сборка PDF).

## References

- https://reactnative.dev/docs/getting-started-without-a-framework
- https://github.com/react-native-community/cli/blob/main/docs/init.md
