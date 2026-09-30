/**
 * Кнопка «назад» в шапке — иконка `back` вместо штатной стрелки.
 *
 * Своя кнопка, потому что native-stack принимает для «назад» только
 * растровую картинку. Уход — обычным `goBack()`: подтверждение ухода с
 * черновика (`usePreventRemove` в `CreateApplicationRoute`) перехватывает
 * само действие, а не кнопку, поэтому продолжает работать. Жест и
 * аппаратная кнопка «назад» от этой замены не зависят.
 */

import { useNavigation } from '@react-navigation/native';

import { Icon } from '../../components/Icon';
import { useTranslation } from '../../i18n';
import { BACK_ICON_SIZE, TEST_ID } from './constants';
import { Container, pressedStyle } from './styles';
import type { HeaderBackButtonProps } from './types';

export function HeaderBackButton({ tintColor }: HeaderBackButtonProps) {
  const t = useTranslation();
  const navigation = useNavigation();

  return (
    <Container
      accessibilityRole="button"
      accessibilityLabel={t.navigation.backA11y}
      testID={TEST_ID}
      style={({ pressed }) => (pressed ? pressedStyle : undefined)}
      onPress={() => navigation.goBack()}
    >
      <Icon name="back" size={BACK_ICON_SIZE} color={tintColor} />
    </Container>
  );
}
