import type { TextInputProps } from 'react-native';

export type TextFieldProps = Omit<
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

/** Пропсы оформления поля ввода, см. `styles.ts`. */
export type InputStyleProps = {
  $hasError: boolean;
};
