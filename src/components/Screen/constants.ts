import { Platform } from 'react-native';
import type { Edge } from 'react-native-safe-area-context';

/**
 * Как `KeyboardAvoidingView` поднимает содержимое над клавиатурой:
 * `padding` на iOS, `height` на Android (см. конвенции в
 * `src/components/README.md`).
 */
export const KEYBOARD_BEHAVIOR = Platform.OS === 'ios' ? 'padding' : 'height';

/**
 * Безопасные зоны по умолчанию — без верхней.
 *
 * Экраны живут в навигационном стеке, и вырез сверху уже обошла его шапка
 * ([ADR-0014](../../../docs/adr/0014-react-navigation-native-stack.md)).
 * Библиотека безопасных зон об этом не знает и отдаёт полный отступ окна,
 * поэтому `edges` со всеми сторонами добавляли бы его второй раз — под
 * шапкой появлялась бы пустая полоса высотой со статус-бар.
 */
export const DEFAULT_EDGES: readonly Edge[] = ['bottom', 'left', 'right'];

/** Для экранов вне навигации: там вырез обходить некому. */
export const ALL_EDGES: readonly Edge[] = ['top', 'bottom', 'left', 'right'];
