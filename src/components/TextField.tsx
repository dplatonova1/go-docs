/**
 * Поле ввода с подписью и сообщением об ошибке.
 *
 * `accessibilityLabel` и `testID` обязательны в типах — см. пояснение в
 * [`Button.tsx`](./Button.tsx).
 *
 * Заготовка: оформление минимальное, финальный дизайн будет позже.
 */

import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

type TextFieldProps = Omit<
  TextInputProps,
  'accessibilityLabel' | 'testID'
> & {
  /** Видимая подпись над полем. */
  label: string;
  /**
   * Что услышит пользователь скринридера. Отдельно от `label`: видимая
   * подпись часто сокращена («Номер»), а вслух нужно однозначное
   * («Номер паспорта»).
   */
  accessibilityLabel: string;
  testID: string;
  /** Текст ошибки. Если задан, поле помечается как некорректное. */
  error?: string;
};

export function TextField({
  label,
  accessibilityLabel,
  testID,
  error,
  style,
  ...rest
}: TextFieldProps) {
  const hasError = error !== undefined && error.length > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <TextInput
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        style={[styles.input, hasError && styles.inputError, style]}
        {...rest}
      />

      {hasError ? (
        <Text
          // Ошибку нужно объявить вслух в момент появления, иначе
          // пользователь скринридера узнает о ней, только вернувшись к
          // полю. accessibilityLiveRegion работает на Android, role=alert
          // на iOS.
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          testID={`${testID}-error`}
          style={styles.error}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  label: {
    fontSize: 14,
  },
  input: {
    // 44 — минимальный тач-таргет, см. Button.tsx.
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  inputError: {
    borderWidth: 1,
  },
  error: {
    fontSize: 13,
  },
});
