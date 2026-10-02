import { Platform } from 'react-native';
import type { Edge } from 'react-native-safe-area-context';

/**
 * Как `KeyboardAvoidingView` поднимает содержимое над клавиатурой:
 * `padding` на iOS, `height` на Android (см. конвенции в
 * `src/components/README.md`).
 */
export const KEYBOARD_BEHAVIOR = Platform.OS === 'ios' ? 'padding' : 'height';

/**
 * Безопасные зоны по умолчанию — только боковые.
 *
 * Сверху вырез уже обошла шапка навигационного стека
 * ([ADR-0014](../../../docs/adr/0014-react-navigation-native-stack.md)).
 * Библиотека безопасных зон об этом не знает и отдаёт полный отступ окна,
 * поэтому верхняя зона добавила бы его второй раз — под шапкой появлялась
 * бы пустая полоса высотой со статус-бар.
 *
 * Снизу — то же с панелью вкладок: все экраны со значением по умолчанию
 * живут внутри вкладок
 * ([ADR-0022](../../../docs/adr/0022-bottom-tabs.md)), и отступ системной
 * навигации уже учитывает `TabBar` (`insets.bottom`). Нижняя зона давала
 * над панелью пустую полосу высотой с системную навигацию (найдено
 * подсветкой слоёв 2026-10-03). Экраны вне вкладок передают `ALL_EDGES`.
 */
export const DEFAULT_EDGES: readonly Edge[] = ['left', 'right'];

/** Для экранов вне навигации: там вырез обходить некому. */
export const ALL_EDGES: readonly Edge[] = ['top', 'bottom', 'left', 'right'];
