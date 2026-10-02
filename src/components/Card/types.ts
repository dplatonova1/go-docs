import type { ReactNode } from 'react';
import type { ViewProps } from 'react-native';

export type CardProps = Omit<ViewProps, 'style'> & {
  testID: string;
  /**
   * Картинка в плитке слева от содержимого: превью, иконка, заглушка.
   * Плитка — `CARD_MEDIA_SIZE`, скругление и заливку даёт карточка.
   */
  media?: ReactNode;
  /** Нижняя строка под разделителем: действия, мета-данные. */
  footer?: ReactNode;
};
