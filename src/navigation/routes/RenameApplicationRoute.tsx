/**
 * Маршрут переименования заявки — модальный экран поверх списка.
 *
 * Название заявки приходит не параметром, а из базы
 * ([`ApplicationGate`](./ApplicationGate.tsx)): в параметрах маршрута
 * только идентификаторы (ADR-0014), да и к моменту восстановления
 * состояния название могло измениться.
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback } from 'react';

import { RenameApplicationScreen } from '../../features/checklist/RenameApplicationScreen';
import type { HomeStackParamList } from '../RootNavigator/types';
import { ApplicationGate } from './ApplicationGate';

type Props = NativeStackScreenProps<HomeStackParamList, 'RenameApplication'>;

export function RenameApplicationRoute({ route, navigation }: Props) {
  const { applicationId } = route.params;

  const close = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <ApplicationGate applicationId={applicationId}>
      {application => (
        <RenameApplicationScreen
          application={application}
          onRenamed={close}
          onCancel={close}
        />
      )}
    </ApplicationGate>
  );
}
