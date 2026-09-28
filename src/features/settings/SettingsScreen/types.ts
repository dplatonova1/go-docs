/**
 * Сохранение выбора языка.
 *
 * Состояния «идёт запись» здесь нет намеренно: язык переключается до
 * записи и мгновенно, а ждать файл настроек не нужно ни пользователю,
 * ни экрану. Видимым остаётся только исход, и только неудачный.
 */
export type SaveState =
  | { readonly status: 'idle' }
  | { readonly status: 'failed'; readonly message: string };

/** Пропсы оформления строки языка, см. `styles.ts`. */
export type OptionStyleProps = {
  $selected: boolean;
};
