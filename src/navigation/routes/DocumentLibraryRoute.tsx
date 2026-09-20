/**
 * Маршрут библиотеки документов — просмотр всей библиотеки.
 *
 * Прикреплять отсюда некуда: пункт не выбран, поэтому `itemId` — `null`,
 * и экран показывает удаление вместо прикрепления.
 */

import { useIsFocused } from '@react-navigation/native';
import { useCallback } from 'react';

import { DocumentLibraryScreen } from '../../features/library/DocumentLibraryScreen';

export function DocumentLibraryRoute() {
  // Список перечитывается при возврате: файл могли прикрепить или
  // удалить с другого экрана.
  const isFocused = useIsFocused();

  // Прикрепление в этом режиме недоступно, но пропс обязателен: экран
  // один на оба режима.
  const handleAttached = useCallback(() => {}, []);

  return (
    <DocumentLibraryScreen
      itemId={null}
      isFocused={isFocused}
      onAttached={handleAttached}
    />
  );
}
