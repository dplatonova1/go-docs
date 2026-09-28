/**
 * Чек-лист заявки.
 *
 * Заявку выбирает маршрут (`navigation/routes/ChecklistRoute.tsx`) — сюда
 * она приходит готовой. Название показывает шапка навигации, поэтому
 * своего заголовка у экрана нет (ADR-0014).
 *
 * Под списком — удаление заявки: если список документов при создании
 * составлен неверно, заявку удаляют и создают заново. Удаление необратимо
 * и показывает диалог с тем, что именно пропадёт, а что останется
 * (ADR-0016). То же действие есть в списке заявок.
 *
 * У каждого пункта — прикрепление файла с устройства
 * (`attachDocument.ts`), прикрепление уже загруженного из библиотеки
 * (отдельный экран, сюда приходит колбэком) и открепление
 * (`detachDocumentFromItem` в репозитории: открепление — это только
 * запись в БД, файл не трогается). Пикер в системе один, поэтому
 * одновременно идёт только одно действие.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  FlatList,
  type ListRenderItemInfo,
} from 'react-native';
import { useTheme } from 'styled-components/native';

import { Button } from '../../../components/Button';
import { Screen } from '../../../components/Screen';
import { translations, useTranslation } from '../../../i18n';
import {
  buildPackage,
  preparePackagePlan,
  qualityWarning,
  sharePackage,
  type PackageBuildResult,
} from '../../package';
import { ChecklistItemRow } from '../ChecklistItemRow';
import { pickAndAttachDocument } from '../attachDocument';
import { describeError } from '../errorMessages';
import {
  checklistItemKeyOf,
  isAttached,
  withAttachedDocument,
  withoutDocument,
  type AttachedDocument,
  type ChecklistItem,
  type ChecklistItemId,
  type DocumentId,
  type ApplicationDeletionImpact,
} from '../model';
import {
  applicationDeletionConfirmation,
  documentDetachConfirmation,
} from '../confirmations';
import {
  deleteApplication,
  detachDocumentFromItem,
  getApplicationDeletionImpact,
  listChecklistItems,
} from '../repository';
import {
  ATTACH_IDLE,
  DETACH_IDLE,
  PACKAGE_IDLE,
  PACKAGE_PREPARING,
  LOADING,
  RESET_IDLE,
  RESET_WORKING,
  TEST_IDS,
} from './constants';
import {
  ErrorText,
  Footer,
  Header,
  NoticeText,
  PackageBlock,
  Summary,
  listContentStyle,
} from './styles';
import type {
  AttachState,
  ChecklistScreenProps,
  DetachState,
  ItemsState,
  PackageState,
  ResetState,
} from './types';

/** Сообщение о неудаче — только для того пункта, где она случилась. */
function errorOfItem(
  state: AttachState | DetachState,
  itemId: ChecklistItemId,
): string | null {
  return state.status === 'failed' && state.itemId === itemId
    ? state.message
    : null;
}

/** То же для сообщения об успешном, но необычном исходе. */
function noticeOfItem(
  state: AttachState,
  itemId: ChecklistItemId,
): string | null {
  return state.status === 'notice' && state.itemId === itemId
    ? state.message
    : null;
}

export function ChecklistScreen({
  application,
  isFocused = true,
  onPickFromLibrary,
  onReset,
}: ChecklistScreenProps) {
  const t = useTranslation();
  const theme = useTheme();
  const [state, setState] = useState<ItemsState>(LOADING);
  const [attempt, setAttempt] = useState(0);
  const [resetState, setResetState] = useState<ResetState>(RESET_IDLE);
  const [packageState, setPackageState] =
    useState<PackageState>(PACKAGE_IDLE);
  // Сборка идёт долго, и второе нажатие успевает раньше, чем доедет
  // состояние: два пакета разом писали бы в один и тот же файл.
  const buildingRef = useRef(false);
  const [attachState, setAttachState] = useState<AttachState>(ATTACH_IDLE);
  // Состояние доезжает до следующего рендера, а второе нажатие может
  // успеть раньше и открыть пикер повторно. Ref закрывает это синхронно.
  const attachingRef = useRef(false);
  const [detachState, setDetachState] = useState<DetachState>(DETACH_IDLE);
  // Та же защита, что и у прикрепления: подтверждение в диалоге можно
  // успеть нажать дважды.
  const detachingRef = useRef(false);

  useEffect(() => {
    if (!isFocused) {
      return undefined;
    }

    // Ответ, пришедший после размонтирования или после повторной
    // попытки, не должен перезаписать актуальное состояние.
    let cancelled = false;

    listChecklistItems(application.id).then(
      items => {
        if (!cancelled) {
          setState({ status: 'loaded', items });
        }
      },
      (error: unknown) => {
        if (!cancelled) {
          setState({ status: 'failed', message: describeError(error) });
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [application.id, isFocused, attempt]);

  const retry = useCallback(() => {
    setState(LOADING);
    setAttempt(value => value + 1);
  }, []);

  const handleAttach = useCallback(async (itemId: ChecklistItemId) => {
    if (attachingRef.current) {
      return;
    }
    attachingRef.current = true;
    setAttachState({ status: 'working', itemId });

    try {
      const result = await pickAndAttachDocument(itemId);

      // Файл уже в базе — список обновляется на месте, без перечитывания
      // и мигания индикатора загрузки. `already-attached` список не
      // трогает: этот документ у пункта уже есть.
      if (result.status === 'attached' || result.status === 'reused') {
        setState(current =>
          current.status === 'loaded'
            ? {
                status: 'loaded',
                items: withAttachedDocument(
                  current.items,
                  itemId,
                  result.document,
                ),
              }
            : current,
        );
        AccessibilityInfo.announceForAccessibility(
          translations().checklist.announceAttached,
        );
      }

      // Дедупликация — не ошибка, но и не обычное прикрепление: файл не
      // загружался заново, и об этом нужно сказать (ADR-0018).
      if (result.status === 'reused') {
        setAttachState({
          status: 'notice',
          itemId,
          message: translations().checklist.reusedNotice,
        });
      } else if (result.status === 'already-attached') {
        const notice = translations().checklist.alreadyAttachedNotice;
        AccessibilityInfo.announceForAccessibility(notice);
        setAttachState({
          status: 'notice',
          itemId,
          message: notice,
        });
      } else {
        setAttachState(ATTACH_IDLE);
      }
    } catch (error) {
      setAttachState({
        status: 'failed',
        itemId,
        message: describeError(error),
      });
    } finally {
      attachingRef.current = false;
    }
  }, []);

  const confirmDetach = useCallback(
    async (itemId: ChecklistItemId, documentId: DocumentId) => {
      if (detachingRef.current) {
        return;
      }
      detachingRef.current = true;
      setDetachState({ status: 'working', itemId, documentId });

      try {
        await detachDocumentFromItem(itemId, documentId);
        setState(current =>
          current.status === 'loaded'
            ? {
                status: 'loaded',
                items: withoutDocument(current.items, itemId, documentId),
              }
            : current,
        );
        AccessibilityInfo.announceForAccessibility(
          translations().checklist.announceDetached,
        );
        setDetachState(DETACH_IDLE);
      } catch (error) {
        setDetachState({
          status: 'failed',
          itemId,
          message: describeError(error),
        });
      } finally {
        detachingRef.current = false;
      }
    },
    [],
  );

  const handleDetachFile = useCallback(
    (itemId: ChecklistItemId, document: AttachedDocument) => {
      const item =
        state.status === 'loaded'
          ? state.items.find(candidate => candidate.id === itemId)
          : undefined;

      if (item === undefined) {
        return;
      }

      // Файл остаётся на устройстве, но найти его снова будет негде,
      // пока нет экрана библиотеки — диалог говорит об этом прямо.
      const { title, message } = documentDetachConfirmation(
        item.label,
        document,
        item.documents.length === 1,
      );

      Alert.alert(title, message, [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.checklist.detach,
          style: 'destructive',
          onPress: () => {
            confirmDetach(itemId, document.id);
          },
        },
      ]);
    },
    [state, confirmDetach, t],
  );

  const confirmReset = useCallback(async () => {
    setResetState(RESET_WORKING);
    try {
      await deleteApplication(application.id);
      // Экран размонтируется — состояние после этого не трогаем.
      onReset();
    } catch (error) {
      setResetState({ status: 'failed', message: describeError(error) });
    }
  }, [application.id, onReset]);

  const handleResetPress = useCallback(async () => {
    setResetState(RESET_WORKING);

    let impact: ApplicationDeletionImpact;
    try {
      impact = await getApplicationDeletionImpact(application.id);
    } catch (error) {
      setResetState({ status: 'failed', message: describeError(error) });
      return;
    }

    setResetState(RESET_IDLE);

    const { title, message } = applicationDeletionConfirmation(
      application.title,
      impact,
    );
    Alert.alert(title, message, [
      // Первой и с ролью cancel: случайное касание не должно удалять.
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: () => {
          confirmReset();
        },
      },
    ]);
  }, [application.id, application.title, confirmReset, t]);

  const share = useCallback(async (result: PackageBuildResult) => {
    try {
      await sharePackage(result);
    } catch (error) {
      setPackageState({ status: 'failed', message: describeError(error) });
    }
  }, []);

  const handleBuildPackage = useCallback(async () => {
    if (buildingRef.current) {
      return;
    }
    buildingRef.current = true;
    setPackageState(PACKAGE_PREPARING);

    try {
      // План считается до сборки: он же проверяет, хватит ли места.
      const plan = await preparePackagePlan(application.id);
      setPackageState({
        status: 'building',
        processed: 0,
        total: plan.includedDocumentCount + plan.unsupportedDocumentCount,
      });

      const result = await buildPackage(application, plan, progress => {
        setPackageState({ status: 'building', ...progress });
      });

      setPackageState({ status: 'done', result });
      AccessibilityInfo.announceForAccessibility(
        translations().checklist.announcePackageBuilt,
      );
      await share(result);
    } catch (error) {
      setPackageState({ status: 'failed', message: describeError(error) });
    } finally {
      buildingRef.current = false;
    }
  }, [application, share]);

  const packageWarning =
    packageState.status === 'done'
      ? qualityWarning(packageState.result.registry)
      : null;

  const total = state.status === 'loaded' ? state.items.length : 0;
  const attachedCount =
    state.status === 'loaded' ? state.items.filter(isAttached).length : 0;
  const isBuildingPackage =
    packageState.status === 'preparing' || packageState.status === 'building';
  const isResetting = resetState.status === 'working';
  const isAttaching = attachState.status === 'working';
  const isDetaching = detachState.status === 'working';
  const isBusy =
    isAttaching || isDetaching || isResetting || isBuildingPackage;

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<ChecklistItem>) => (
      <ChecklistItemRow
        item={item}
        index={index}
        total={total}
        isAttaching={
          attachState.status === 'working' && attachState.itemId === item.id
        }
        detachingDocumentId={
          detachState.status === 'working' && detachState.itemId === item.id
            ? detachState.documentId
            : null
        }
        actionsDisabled={isBusy}
        actionError={
          errorOfItem(attachState, item.id) ?? errorOfItem(detachState, item.id)
        }
        actionNotice={noticeOfItem(attachState, item.id)}
        onAttach={handleAttach}
        onPickFromLibrary={onPickFromLibrary}
        onDetachFile={handleDetachFile}
      />
    ),
    [
      total,
      attachState,
      detachState,
      isBusy,
      handleAttach,
      onPickFromLibrary,
      handleDetachFile,
    ],
  );

  const header = (
    <Header>
      {state.status === 'loaded' ? (
        <Summary>{t.checklist.summary(total)}</Summary>
      ) : null}
    </Header>
  );

  if (state.status === 'loaded') {
    const footer = (
      <Footer>
        <PackageBlock>
          {/* Без «всё готово»: пакет собирается и при неполном
              чек-листе, а решать, готов он или нет, человеку. */}
          <Summary testID={TEST_IDS.packageSummary}>
            {t.checklist.attachedSummary(attachedCount, total)}
          </Summary>

          {packageState.status === 'building' ? (
            <NoticeText
              accessibilityLiveRegion="polite"
              testID={TEST_IDS.packageProgress}
            >
              {t.checklist.buildProgress(
                packageState.processed,
                packageState.total,
              )}
            </NoticeText>
          ) : null}

          {packageState.status === 'done' ? (
            <NoticeText
              accessibilityLiveRegion="polite"
              testID={TEST_IDS.packageResult}
            >
              {t.checklist.buildResult(packageState.result.pageCount)}
            </NoticeText>
          ) : null}

          {/* Пометки детектора есть и в реестре внутри PDF, но туда надо
              заглянуть, а переснять дешевле до отправки. */}
          {packageState.status === 'done' && packageWarning !== null ? (
            <NoticeText
              accessibilityLiveRegion="polite"
              testID={TEST_IDS.packageQualityWarning}
            >
              {packageWarning}
            </NoticeText>
          ) : null}

          {packageState.status === 'failed' ? (
            <ErrorText
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              testID={TEST_IDS.packageError}
            >
              {packageState.message}
            </ErrorText>
          ) : null}

          <Button
            label={
              isBuildingPackage ? t.checklist.building : t.checklist.build
            }
            accessibilityLabel={t.checklist.buildA11y}
            testID={TEST_IDS.packageButton}
            disabled={isBusy}
            onPress={handleBuildPackage}
          />

          {packageState.status === 'done' ? (
            <Button
              variant="secondary"
              label={t.checklist.shareAgain}
              accessibilityLabel={t.checklist.shareAgainA11y}
              testID={TEST_IDS.packageShareButton}
              disabled={isBusy}
              onPress={() => share(packageState.result)}
            />
          ) : null}
        </PackageBlock>

        <Summary>{t.checklist.resetHint}</Summary>

        {resetState.status === 'failed' ? (
          <ErrorText
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            testID={TEST_IDS.resetError}
          >
            {resetState.message}
          </ErrorText>
        ) : null}

        <Button
          variant="danger"
          label={
            isResetting ? t.common.deleting : t.checklist.deleteApplication
          }
          accessibilityLabel={t.checklist.deleteApplicationA11y}
          testID={TEST_IDS.resetButton}
          disabled={isBusy}
          onPress={handleResetPress}
        />
      </Footer>
    );

    return (
      <Screen scrollable={false} testID={TEST_IDS.screen}>
        <FlatList
          testID={TEST_IDS.list}
          data={state.items}
          keyExtractor={checklistItemKeyOf}
          renderItem={renderItem}
          ListHeaderComponent={header}
          ListFooterComponent={footer}
          contentContainerStyle={listContentStyle}
        />
      </Screen>
    );
  }

  return (
    <Screen testID={TEST_IDS.screen}>
      {header}

      {state.status === 'loading' ? (
        <ActivityIndicator
          size="large"
          color={theme.colors.primary}
          accessibilityLabel={t.checklist.loadingA11y}
          testID={TEST_IDS.loading}
        />
      ) : (
        <>
          <ErrorText
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            testID={TEST_IDS.loadError}
          >
            {state.message}
          </ErrorText>
          <Button
            label={t.common.retry}
            accessibilityLabel={t.checklist.retryA11y}
            testID={TEST_IDS.retryButton}
            onPress={retry}
          />
        </>
      )}
    </Screen>
  );
}
