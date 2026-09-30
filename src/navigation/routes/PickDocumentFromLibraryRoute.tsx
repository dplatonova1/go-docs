/**
 * Маршрут выбора файла из библиотеки для пункта чек-листа.
 *
 * После прикрепления возвращает на чек-лист: он перечитает пункты при
 * возвращении фокуса и покажет новый файл.
 */

import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback } from 'react';

import { DocumentLibraryScreen } from '../../features/library/DocumentLibraryScreen';
import type { HomeStackParamList } from '../RootNavigator/types';

type Props = NativeStackScreenProps<
  HomeStackParamList,
  'PickDocumentFromLibrary'
>;

export function PickDocumentFromLibraryRoute({ route, navigation }: Props) {
  const { itemId } = route.params;
  const isFocused = useIsFocused();

  const handleAttached = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <DocumentLibraryScreen
      itemId={itemId}
      isFocused={isFocused}
      onAttached={handleAttached}
    />
  );
}
