/**
 * Настройки приложения: язык и тема оформления.
 *
 * Язык и тема меняются сразу по нажатию, без кнопки «Сохранить»: выбор виден
 * тут же, весь экран перерисовывается на новом языке, и подтверждать
 * нечего. Запись в файл идёт следом, и только её неудача даёт сообщение
 * об ошибке — переключённый язык при этом остаётся, просто не переживёт
 * перезапуск ([`i18n/persistence.ts`](../../../i18n/persistence.ts)).
 *
 * Названия языков — на них самих («Русский», «English») и не
 * переводятся: человек, которому приложение досталось на незнакомом
 * языке, ищет в списке знакомое слово.
 *
 * Строки — `radio` внутри `radiogroup`, а не кнопки: скринридер тогда
 * объявляет и сколько всего вариантов, и какой из них выбран.
 */

import { useCallback, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useTheme } from 'styled-components/native';

import { GradientRing } from '../../../components/GradientRing';
import { Screen } from '../../../components/Screen';
import { RADII } from '../../../theme/metrics';
import {
  LOCALES,
  LOCALE_NAMES,
  getLocale,
  translations,
  useTranslation,
  type Locale,
} from '../../../i18n';
// Запись выбора — мимо барьера `i18n`, см. комментарий в его `index.ts`.
import { changeLocale } from '../../../i18n/persistence';
import {
  THEME_MODES,
  changeThemeMode,
  getThemeMode,
  type ThemeMode,
} from '../../../theme/themeMode';
import { describeError } from '../../checklist/errorMessages';
import {
  IDLE,
  LOCALE_TEST_ID_PREFIX,
  TEST_IDS,
  THEME_TEST_ID_PREFIX,
} from './constants';
import {
  ErrorText,
  Hint,
  Option,
  OptionLabel,
  OptionList,
  Section,
  SectionTitle,
  SelectedMark,
  pressedStyle,
  selectedOptionStyle,
} from './styles';
import type { SaveState } from './types';

export function SettingsScreen() {
  const t = useTranslation();
  const theme = useTheme();
  // Текущий язык — из стора, а не из состояния экрана: источник правды
  // один, и `useTranslation` уже перерисовывает экран при его смене.
  const locale = getLocale();
  const [saveState, setSaveState] = useState<SaveState>(IDLE);
  // Выбор темы — в состоянии экрана: `useColorScheme()` отвечает только
  // «светлая или тёмная» и не отличает «Как в системе» от явного выбора.
  const [themeMode, setThemeMode] = useState<ThemeMode>(getThemeMode);
  const [themeSaveState, setThemeSaveState] = useState<SaveState>(IDLE);

  const handleSelect = useCallback(async (next: Locale) => {
    if (next === getLocale()) {
      return;
    }

    try {
      await changeLocale(next);
      // Словарь берётся после смены языка: подтверждение должно
      // прозвучать на новом языке, а не на том, от которого уходят.
      AccessibilityInfo.announceForAccessibility(
        translations().settings.announceChanged,
      );
      setSaveState(IDLE);
    } catch (error) {
      setSaveState({ status: 'failed', message: describeError(error) });
    }
  }, []);

  const handleSelectTheme = useCallback(async (next: ThemeMode) => {
    if (next === getThemeMode()) {
      return;
    }

    setThemeMode(next);
    try {
      await changeThemeMode(next);
      AccessibilityInfo.announceForAccessibility(
        translations().settings.announceThemeChanged,
      );
      setThemeSaveState(IDLE);
    } catch (error) {
      setThemeSaveState({ status: 'failed', message: describeError(error) });
    }
  }, []);

  return (
    <Screen testID={TEST_IDS.screen}>
      <Section>
        <SectionTitle accessibilityRole="header">
          {t.settings.languageTitle}
        </SectionTitle>
        <Hint>{t.settings.languageHint}</Hint>

        <OptionList
          accessibilityRole="radiogroup"
          testID={TEST_IDS.languageGroup}
        >
          {LOCALES.map(option => {
            const selected = option === locale;
            const name = LOCALE_NAMES[option];

            return (
              <Option
                key={option}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={
                  selected
                    ? t.settings.selectedA11y(name)
                    : t.settings.languageA11y(name)
                }
                testID={`${LOCALE_TEST_ID_PREFIX}-${option}`}
                style={({ pressed }) => [
                  selected ? theme.field.focused : theme.field.rest,
                  selected && selectedOptionStyle,
                  pressed && pressedStyle,
                ]}
                onPress={() => handleSelect(option)}
              >
                {selected ? <GradientRing radius={RADII.field} /> : null}
                <OptionLabel $selected={selected}>{name}</OptionLabel>
                {selected ? (
                  <SelectedMark>{t.settings.selected}</SelectedMark>
                ) : null}
              </Option>
            );
          })}
        </OptionList>

        {saveState.status === 'failed' ? (
          <ErrorText
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            testID={TEST_IDS.saveError}
          >
            {saveState.message}
          </ErrorText>
        ) : null}
      </Section>

      <Section>
        <SectionTitle accessibilityRole="header">
          {t.settings.themeTitle}
        </SectionTitle>
        <Hint>{t.settings.themeHint}</Hint>

        <OptionList accessibilityRole="radiogroup" testID={TEST_IDS.themeGroup}>
          {THEME_MODES.map(option => {
            const selected = option === themeMode;
            const name = t.settings.themeNames[option];

            return (
              <Option
                key={option}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={
                  selected
                    ? t.settings.themeSelectedA11y(name)
                    : t.settings.themeA11y(name)
                }
                testID={`${THEME_TEST_ID_PREFIX}-${option}`}
                style={({ pressed }) => [
                  selected ? theme.field.focused : theme.field.rest,
                  selected && selectedOptionStyle,
                  pressed && pressedStyle,
                ]}
                onPress={() => handleSelectTheme(option)}
              >
                {selected ? <GradientRing radius={RADII.field} /> : null}
                <OptionLabel $selected={selected}>{name}</OptionLabel>
                {selected ? (
                  <SelectedMark>{t.settings.themeSelected}</SelectedMark>
                ) : null}
              </Option>
            );
          })}
        </OptionList>

        {themeSaveState.status === 'failed' ? (
          <ErrorText
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            testID={TEST_IDS.themeSaveError}
          >
            {themeSaveState.message}
          </ErrorText>
        ) : null}
      </Section>
    </Screen>
  );
}
