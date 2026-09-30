/**
 * Маршрут списка заявок: связывает экран с навигацией и больше ничего не
 * делает. Данные грузит сам экран.
 */

import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback } from 'react';

import { ApplicationListScreen } from '../../features/checklist/ApplicationListScreen';
import type { Application } from '../../features/checklist/model';
import type { HomeStackParamList } from '../RootNavigator/types';

export function ApplicationListRoute() {
  const navigation =
    useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  // Список перечитывается при возврате: заявку могли открыть,
  // переименовать или удалить с другого экрана, и порядок «недавние
  // сверху» изменился.
  const isFocused = useIsFocused();

  const handleOpen = useCallback(
    (application: Application) => {
      navigation.navigate('Checklist', { applicationId: application.id });
    },
    [navigation],
  );

  const handleRename = useCallback(
    (application: Application) => {
      navigation.navigate('RenameApplication', {
        applicationId: application.id,
      });
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
      onRename={handleRename}
      onCreate={handleCreate}
    />
  );
}
