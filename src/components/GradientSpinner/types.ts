export type GradientSpinnerProps = {
  /** Что услышит пользователь скринридера: что именно грузится. */
  accessibilityLabel: string;
  testID?: string;
  /**
   * Занять всё свободное место и встать по центру и по вертикали. Для
   * лоадера вместо содержимого экрана; родитель не должен прокручиваться
   * (`Screen scrollable={false}`), иначе растягиваться некуда.
   */
  fill?: boolean;
};

/** Пропсы оформления обёртки, см. `styles.ts`. */
export type HolderStyleProps = {
  $fill: boolean;
};
