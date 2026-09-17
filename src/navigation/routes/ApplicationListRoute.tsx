/**
 * Маршрут списка заявок: связывает экран с навигацией и больше ничего не
 * делает. Данные грузит сам экран.
 */

import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useCallback } from 'react';

import { ApplicationListScreen } from '../../features/checklist/ApplicationListScreen';
import type { Application } from '../../features/checklist/model';

export function ApplicationListRoute() {
  const navigation = useNavigation();
  // Список перечитывается при возврате с чек-листа: заявку могли сбросить
  // или открыть, и порядок «недавние сверху» изменился.
  const isFocused = useIsFocused();

  const handleOpen = useCallback(
    (application: Application) => {
      navigation.navigate('Checklist', { applicationId: application.id });
    },
    [navigation],
  );

  const handleCreate = useCallback(() => {
    navigation.navigate('CreateApplication');
  }, [navigation]);

  return (
    <ApplicationListScreen
      isFocused={isFocused}
      onOpen={handleOpen}
      onCreate={handleCreate}
    />
  );
}
