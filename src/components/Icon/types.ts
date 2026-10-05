/** Имена иконок приложения. Рисунки — в `constants.ts`. */
export type IconName =
  | 'add'
  | 'back'
  | 'chevronRight'
  | 'close'
  | 'document'
  | 'home'
  | 'library'
  | 'settings';

export type IconProps = {
  name: IconName;
  /** Цвет заливки — из палитры темы. */
  color: string;
  /** Сторона квадрата в точках. По умолчанию `ICON_SIZE`. */
  size?: number;
};
