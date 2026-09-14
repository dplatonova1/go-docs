import { Platform } from 'react-native';

/**
 * Как `KeyboardAvoidingView` поднимает содержимое над клавиатурой:
 * `padding` на iOS, `height` на Android (см. конвенции в
 * `src/components/README.md`).
 */
export const KEYBOARD_BEHAVIOR = Platform.OS === 'ios' ? 'padding' : 'height';
