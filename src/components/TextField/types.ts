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
  /**
   * Текст ошибки. Если задан и не пуст, поле помечается как некорректное.
   * `undefined` допустим явно, чтобы экран мог писать
   * `error={hasError ? message : undefined}`.
   */
  error?: string | undefined;
  /**
   * Минимальная высота поля в строках — для многострочного ввода, где
   * одной строки мало (вставка списка документов). Поле всё равно растёт
   * с содержимым. По умолчанию 1.
   *
   * Не `numberOfLines`: на iOS он ограничивает высоту, а не задаёт
   * минимум.
   */
  minLines?: number;
};

/** Пропсы оформления поля ввода, см. `styles.ts`. */
export type InputStyleProps = {
  $hasError: boolean;
  $multiline: boolean;
  $minLines: number;
};
