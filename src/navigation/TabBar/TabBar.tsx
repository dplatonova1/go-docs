/**
 * Нижняя панель вкладок: «Главная», «Библиотека», «Настройки»
 * ([ADR-0022](../../../docs/adr/0022-bottom-tabs.md)).
 *
 * Своя, а не штатная панель `bottom-tabs`: у штатной выбранная вкладка
 * отличается только цветом, а здесь — формой (пилюля с градиентом, см.
 * `theme/tabs.ts`) и начертанием подписи. Пилюля одна и при
 * переключении переезжает к новой вкладке (`usePillIndicator`).
 *
 * Нажатие повторяет поведение штатной панели: событие `tabPress` уходит
 * навигатору, и если его никто не отменил — переход. Нажатие на уже
 * открытую вкладку стек этой вкладки обрабатывает сам: возвращается к
 * своему первому экрану.
 */

import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from 'styled-components/native';

import { Icon } from '../../components/Icon';
import { TAB_ICON_SIZE, TABS } from './constants';
import {
  Bar,
  IconBubble,
  Pill,
  Tab,
  TabBody,
  TabLabel,
  TabsRow,
} from './styles';
import type { TabName } from './types';
import { useKeyboardVisible } from './useKeyboardVisible';
import { usePillIndicator } from './usePillIndicator';

export function TabBar({
  state,
  descriptors,
  navigation,
  insets,
}: BottomTabBarProps) {
  const theme = useTheme();
  const keyboardVisible = useKeyboardVisible();
  const pill = usePillIndicator(state.index, state.routes.length);

  if (keyboardVisible) {
    return null;
  }

  return (
    <Bar accessibilityRole="tablist" $bottomInset={insets.bottom}>
      <TabsRow onLayout={pill.onRowLayout}>
        {pill.style === null ? null : (
          <Pill
            style={[theme.tabs.activeFill, pill.style]}
            pointerEvents="none"
          />
        )}

        {state.routes.map((route, index) => {
          const name = route.name as TabName;
          const { icon, testID } = TABS[name];
          const label = descriptors[route.key]?.options.title ?? route.name;
          const selected = state.index === index;

          const handlePress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!selected && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Tab
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected }}
              testID={testID}
              onPress={handlePress}
            >
              {/* `key` по состоянию: при переключении содержимое вкладки
                  создаётся заново, а не перекрашивается. На Android
                  смена фона у существующего элемента (круг под иконкой)
                  теряла скругление: оно не менялось, и New Architecture
                  его повторно не присылала. */}
              <TabBody
                key={selected ? 'selected' : 'idle'}
                onLayout={pill.onBodyLayout}
              >
                <IconBubble $selected={selected}>
                  <Icon
                    name={icon}
                    size={TAB_ICON_SIZE}
                    color={
                      selected
                        ? theme.tabs.activeForeground
                        : theme.tabs.inactiveForeground
                    }
                  />
                </IconBubble>
                <TabLabel $selected={selected}>{label}</TabLabel>
              </TabBody>
            </Tab>
          );
        })}
      </TabsRow>
    </Bar>
  );
}
