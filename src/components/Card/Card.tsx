/**
 * Карточка — поверхность над фоном экрана: заявка в списке, пункт
 * чек-листа, документ в библиотеке. Форма, кант, блики и разделитель — с
 * референса, см. `theme/card.ts`; слои задаются объектом стиля из темы,
 * поэтому их подставляет компонент.
 *
 * Варианты: с картинкой (`media` — плитка слева от содержимого) и с
 * нижней строкой (`footer` — под разделителем). Оба необязательны.
 *
 * Полупрозрачная заливка `surface` рассчитана на то, что под карточкой
 * фон экрана `background`.
 */

import { useTheme } from 'styled-components/native';

import { Body, Container, Content, Divider, Footer, MediaTile } from './styles';
import type { CardProps } from './types';

export function Card({ children, media, footer, ...rest }: CardProps) {
  const theme = useTheme();
  const hasMedia = media !== undefined && media !== null;
  const hasFooter = footer !== undefined && footer !== null;

  return (
    <Container style={theme.card.fill} {...rest}>
      {hasMedia ? (
        <Body>
          <MediaTile
            style={theme.card.media}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {media}
          </MediaTile>
          <Content>{children}</Content>
        </Body>
      ) : (
        <Content>{children}</Content>
      )}

      {hasFooter ? (
        <>
          <Divider />
          <Footer>{footer}</Footer>
        </>
      ) : null}
    </Container>
  );
}
