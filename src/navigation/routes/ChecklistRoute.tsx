/**
 * Маршрут чек-листа: по `applicationId` из параметров находит заявку
 * ([`ApplicationGate`](./ApplicationGate.tsx)), ставит её название в
 * шапку и отмечает открытой.
 *
 * Отметка «открыта» решает, что показать при следующем запуске
 * ([ADR-0015](../../../docs/adr/0015-multiple-applications-last-opened.md)).
 */

import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback } from 'react';

import { ChecklistScreen } from '../../features/checklist/ChecklistScreen';
import type {
  Application,
  ChecklistItemId,
} from '../../features/checklist/model';
import { markApplicationOpened } from '../../features/checklist/repository';
import type { RootStackParamList } from '../RootNavigator/types';
import { ApplicationGate } from './ApplicationGate';

type Props = NativeStackScreenProps<RootStackParamList, 'Checklist'>;

export function ChecklistRoute({ route, navigation }: Props) {
  const { applicationId } = route.params;
  // Пункты перечитываются при возврате: файл могли прикрепить из
  // библиотеки, а это отдельный экран.
  const isFocused = useIsFocused();

  const handleReady = useCallback(
    (application: Application) => {
      navigation.setOptions({ title: application.title });

      // Потеря отметки меняет только порядок в списке и то, какая заявка
      // откроется при следующем запуске, — ронять из-за неё открытый
      // чек-лист нельзя (ADR-0015).
      markApplicationOpened(application.id).catch(() => {});
    },
    [navigation],
  );

  const goToList = useCallback(() => {
    navigation.popTo('ApplicationList');
  }, [navigation]);

  const pickFromLibrary = useCallback(
    (itemId: ChecklistItemId) => {
      navigation.navigate('PickDocumentFromLibrary', { itemId });
    },
    [navigation],
  );

  return (
    <ApplicationGate applicationId={applicationId} onReady={handleReady}>
      {application => (
        <ChecklistScreen
          application={application}
          isFocused={isFocused}
          onPickFromLibrary={pickFromLibrary}
          onReset={goToList}
        />
      )}
    </ApplicationGate>
  );
}
