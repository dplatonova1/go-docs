# src/components

Переиспользуемые UI-компоненты, не привязанные к конкретной фиче.
Компоненты одной фичи живут рядом с ней, в [`../features`](../features).

## Структура компонента

Каждый компонент — отдельная папка с его именем. Правило одно для
`src/components` и для компонентов внутри [`../features`](../features).

```
Button/
├── Button.tsx     разметка и логика — и больше ничего
├── types.ts       все типы и enum компонента
├── styles.ts      все стили, на styled-components
├── constants.ts   все константы компонента
└── index.ts       публичный экспорт
```

- **`Button.tsx`** не объявляет ни типов, ни стилей, ни констант — только
  импортирует их из соседних файлов. Быстрая проверка на ревью: в `.tsx`
  нет `type`, `interface`, `enum`, `styled`, `StyleSheet` и `const`
  верхнего уровня, кроме самого компонента.
- **`types.ts`** — пропсы (`ButtonProps`), пропсы оформления
  styled-компонентов (`ContainerStyleProps`) и enum. Пропсы оформления —
  transient, с префиксом `$` (`$disabled`, `$hasError`): styled-components
  не передаёт их в нативный компонент.
- **`styles.ts`** — styled-компоненты, названные по роли (`Container`,
  `Label`, `ErrorText`), а не по тегу (`StyledView`). Цвета — только из
  темы: `${({ theme }) => theme.colors.text}`, не литералами. Состояния —
  через transient-пропсы, а не массивами условий в JSX.
  Два случая, когда шаблона `styled.X` не хватает, решаются там же через
  `toStyleSheet(css\`…\`)`:
  - React Native отдаёт состояние только в колбэк (`pressed` у
    `Pressable`) — см. [`Button/styles.ts`](./Button/styles.ts);
  - стиль нужен не в `style`, а в другом пропе (`contentContainerStyle`)
    — см. [`Screen/styles.ts`](./Screen/styles.ts).
- **`constants.ts`** — именованные значения: используемые в логике
  (`KEYBOARD_BEHAVIOR`, `ERROR_TEST_ID_SUFFIX`) и значения состояний
  оформления, у которых есть смысл (`PRESSED_OPACITY`). Одноразовые
  отступы, радиусы и размеры шрифта остаются литералами в шаблоне
  `styles.ts` — выносить каждое число не нужно. Константа, которая должна
  совпадать у нескольких компонентов, живёт в
  [`../theme/metrics.ts`](../theme/metrics.ts) (`MIN_TOUCH_TARGET`).
- **`index.ts`** экспортирует компонент и тип его пропсов. Снаружи
  импортируют только папку (`components/Button`), не `Button/styles`.
- Пустые файлы не заводятся: нет констант — нет `constants.ts`.

Styled-стили берут тему из `AppThemeProvider`
([`../theme/ThemeProvider.tsx`](../theme/ThemeProvider.tsx)). Без
провайдера компонент падает на первом обращении к цвету, поэтому провайдер
стоит в корне `App.tsx` и в обёртке рендера в тестах. Почему
styled-components — [ADR-0011](../../docs/adr/0011-styled-components.md).

## Доступность

A11y соблюдаем с первого дня, а не «потом причешем»: у каждого
интерактивного элемента осмысленный `accessibilityLabel` и
`accessibilityRole`, тач-таргет не меньше 44×44, вёрстка переживает
увеличенный системный шрифт. Аудитория продукта — люди, заполняющие
документы в стрессе и часто не на родном языке; текст должен быть крупным
и однозначным.

## Конвенции React Native

- **Списки — `FlatList`/`SectionList`, не `ScrollView`.** Пунктов чек-листа
  и документов может быть много, и каждый с превью. Элементы списка —
  `memo`, `renderItem` и колбэки — `useCallback`, `keyExtractor` по
  стабильному id из БД, а не по индексу.
- **Стили — styled-components в `styles.ts`,** не инлайн-объекты в JSX:
  инлайн создаёт новый объект на каждый рендер и ломает мемоизацию.
- **Цвета — только из темы** (`theme.colors`, палитра в
  [`../theme/colors.ts`](../theme/colors.ts)), у каждого `Text` и у фона
  экрана. Умолчаний платформы не хватает: на Android в тёмной теме текст
  без цвета остаётся чёрным на тёмном фоне, и экран выглядит пустым.
  Рамка, которая обозначает границу элемента управления (поле ввода,
  кнопка-контур), — `border`; разделители и рамки карточек — `divider`.
  Новый цвет в палитре — вместе с проверкой контраста в
  [`../theme/__tests__/colors.test.ts`](../theme/__tests__/colors.test.ts).
- **Шрифт — у каждого `Text`: `font-family: ${FONTS.…}` и
  `${textSize(n)}`** из [`../theme/typography.ts`](../theme/typography.ts).
  Без `font-family` текст рисуется системным шрифтом; голый `font-size`
  теряет трекинг темы. Вес задаётся начертанием (`FONTS.semibold`), не
  `font-weight`. Новый шрифт — только с кириллицей, включая сербскую, и
  сербской латиницей (см. [`typography.ts`](../theme/typography.ts)):
  файл в `assets/fonts` под PostScript-именем, затем
  `npx react-native-asset`.
- **Тени — готовые объекты из [`../theme/shadows.ts`](../theme/shadows.ts)
  в `style`,** не `box-shadow` в шаблоне: styled-components не переводит
  его в тень, работающую на Android. Пример —
  [`Button`](./Button/Button.tsx).
- **Скругления — `RADII`** из [`../theme/metrics.ts`](../theme/metrics.ts).
- **Размеры — через flex,** не захардкоженные числа. Целевые устройства —
  от маленьких Android-телефонов до планшетов.
- **Формы — `KeyboardAvoidingView`** (`behavior` через `Platform.select`:
  `padding` на iOS, `height` на Android) + `keyboardShouldPersistTaps="handled"`.
  Полей ручного подтверждения в проекте будет много.
- **Безопасные зоны — `react-native-safe-area-context`** (уже в
  зависимостях), не `SafeAreaView` из `react-native`.
- **Платформенные различия — `Platform.select`** или `.ios.tsx`/`.android.tsx`.
  Тени платформенного ветвления не требуют: `boxShadow` на New
  Architecture работает на обеих платформах.
- **Подписки и таймеры — с очисткой в `useEffect`.** Особенно камера и
  файловые операции: утечка тут удерживает нативный ресурс.
- **Анимации — Reanimated,** если понадобятся, а не `setTimeout`.
