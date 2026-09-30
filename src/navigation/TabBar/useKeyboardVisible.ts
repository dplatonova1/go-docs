/**
 * Открыта ли экранная клавиатура.
 *
 * Нужно панели вкладок на Android: окно там сжимается под клавиатуру
 * (`adjustResize`), и панель, прижатая к низу окна, всплыла бы над
 * клавиатурой и закрыла поле ввода. На iOS клавиатура просто ложится
 * поверх панели, поэтому там хук всегда отвечает `false`.
 */

import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return undefined;
    }

    const show = Keyboard.addListener('keyboardDidShow', () =>
      setVisible(true),
    );
    const hide = Keyboard.addListener('keyboardDidHide', () =>
      setVisible(false),
    );

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return visible;
}
