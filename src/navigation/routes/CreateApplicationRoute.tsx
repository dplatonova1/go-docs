/**
 * Маршрут создания заявки.
 *
 * Берёт на себя то, что экран знать не должен: предупреждение о потере
 * черновика при уходе и переход на созданную заявку.
 *
 * `usePreventRemove` перехватывает все способы уйти — аппаратную кнопку
 * Android, жест и кнопку «назад» в шапке. В Фазе 1 экран был корневым, и
 * вручную обрабатывалась только аппаратная кнопка (ADR-0014).
 */

import { usePreventRemove } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { CreateApplicationScreen } from '../../features/checklist/CreateApplicationScreen';
import type { Application } from '../../features/checklist/model';
import type { RootStackParamList } from '../RootNavigator/types';
import { LEAVE_CREATE_CONFIRMATION } from './constants';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateApplication'>;

export function CreateApplicationRoute({ navigation }: Props) {
  const [isDirty, setDirty] = useState(false);
  const [created, setCreated] = useState<Application | null>(null);

  usePreventRemove(isDirty, ({ data }) => {
    Alert.alert(LEAVE_CREATE_CONFIRMATION.title, LEAVE_CREATE_CONFIRMATION.message, [
      { text: 'Остаться', style: 'cancel' },
      {
        text: 'Выйти',
        style: 'destructive',
        onPress: () => navigation.dispatch(data.action),
      },
    ]);
  });

  // Переход — эффектом, а не прямо в колбэке: `usePreventRemove` читает
  // `isDirty` из отрендеренного состояния, и уход, отправленный в том же
  // такте, что и сброс флага, показал бы диалог «выйти без сохранения»
  // после успешного сохранения.
  useEffect(() => {
    if (created !== null) {
      navigation.replace('Checklist', { applicationId: created.id });
    }
  }, [created, navigation]);

  const handleCreated = useCallback((application: Application) => {
    setDirty(false);
    setCreated(application);
  }, []);

  return (
    <CreateApplicationScreen
      onCreated={handleCreated}
      onDirtyChange={setDirty}
    />
  );
}
