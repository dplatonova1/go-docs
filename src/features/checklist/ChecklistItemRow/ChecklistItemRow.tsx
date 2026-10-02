/**
 * Пункт сохранённого чек-листа — карточка с картинкой: превью
 * прикреплённого файла в плитке слева, текст, статус «прикреплено / не
 * прикреплено», файлы с кнопкой-иконкой открепления; кнопки прикрепления —
 * под разделителем.
 *
 * В плитке — первый файл, у которого есть превью; если превью нет ни у
 * одного — заглушка первого файла, без файлов — «Нет файла»
 * ([`DocumentPreviewTile`](../../library/DocumentPreviewTile)).
 *
 * Элементы озвучиваются по отдельности, а не одной группой: внутри
 * `accessible`-контейнера скринридер не дал бы нажать кнопку.
 *
 * Тексты берутся хуком, а не приходят пропсами: строка мемоизирована, и
 * при смене языка с прежними пропсами она бы не перерисовалась —
 * подписка на язык у неё своя (см. [`src/i18n`](../../../i18n)).
 */

import { memo, useCallback } from 'react';

import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { IconButton } from '../../../components/IconButton';
import { useTranslation } from '../../../i18n';
import { DocumentPreviewTile } from '../../library/DocumentPreviewTile';
import { isPreviewable } from '../../library/useDocumentPreview';
import { isAttached, type AttachedDocument } from '../model';
import { TEST_ID_PREFIX } from './constants';
import {
  ErrorText,
  FileName,
  FileRow,
  Label,
  NoticeText,
  StatusBadge,
  StatusText,
} from './styles';
import type { ChecklistItemRowProps } from './types';

export const ChecklistItemRow = memo(function ChecklistItemRowImpl({
  item,
  index,
  total,
  isAttaching,
  detachingDocumentId,
  actionsDisabled,
  actionError,
  actionNotice,
  onAttach,
  onPickFromLibrary,
  onDetachFile,
}: ChecklistItemRowProps) {
  const t = useTranslation();
  const number = index + 1;
  const testID = `${TEST_ID_PREFIX}-${index}`;
  const attached = isAttached(item);
  const previewDocument =
    item.documents.find(isPreviewable) ?? item.documents[0] ?? null;
  const statusText = attached
    ? t.checklistItem.statusAttached
    : t.checklistItem.statusNotAttached;

  const handleAttach = useCallback(
    () => onAttach(item.id),
    [item.id, onAttach],
  );

  const handlePickFromLibrary = useCallback(
    () => onPickFromLibrary(item.id),
    [item.id, onPickFromLibrary],
  );

  const handleDetach = useCallback(
    (document: AttachedDocument) => onDetachFile(item.id, document),
    [item.id, onDetachFile],
  );

  let attachLabel = attached
    ? t.checklistItem.attachMore
    : t.checklistItem.attach;
  if (isAttaching) {
    attachLabel = t.checklistItem.attaching;
  }

  return (
    <Card
      testID={testID}
      media={<DocumentPreviewTile document={previewDocument} testID={testID} />}
      footer={
        <>
          <Button
            variant="secondary"
            label={attachLabel}
            accessibilityLabel={t.checklistItem.attachA11y(number, item.label)}
            testID={`${testID}-attach`}
            disabled={actionsDisabled}
            onPress={handleAttach}
          />

          <Button
            variant="secondary"
            label={t.checklistItem.pickFromLibrary}
            accessibilityLabel={t.checklistItem.pickFromLibraryA11y(
              number,
              item.label,
            )}
            testID={`${testID}-pick-from-library`}
            disabled={actionsDisabled}
            onPress={handlePickFromLibrary}
          />
        </>
      }
    >
      <Label
        accessibilityLabel={t.checklistItem.labelA11y(
          number,
          total,
          item.label,
        )}
        testID={`${testID}-label`}
      >
        {t.checklistItem.line(number, item.label)}
      </Label>

      <StatusBadge
        $attached={attached}
        accessible
        accessibilityLabel={t.checklistItem.statusA11y(
          number,
          statusText.toLowerCase(),
        )}
        testID={`${testID}-status`}
      >
        <StatusText $attached={attached}>{statusText}</StatusText>
      </StatusBadge>

      {item.documents.map((document, documentIndex) => {
        const name = document.name ?? t.checklistItem.unnamedFile;
        const isDetaching = detachingDocumentId === document.id;

        return (
          <FileRow key={document.id}>
            <FileName
              accessibilityLabel={t.checklistItem.fileA11y(name)}
              testID={`${testID}-file-${documentIndex}`}
              // Середина, а не конец: расширение в конце имени важнее.
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {name}
            </FileName>

            {/* Иконка в стилистике кнопок удаления: круг с заливкой
                `rose` (решено 2026-10-02). */}
            <IconButton
              icon="close"
              accent="rose"
              busy={isDetaching}
              // Вслух — что именно открепляется: иконка без имени файла в
              // списке из нескольких ничего не говорит.
              accessibilityLabel={t.checklistItem.detachA11y(
                name,
                number,
                item.label,
              )}
              testID={`${testID}-file-${documentIndex}-detach`}
              disabled={actionsDisabled}
              onPress={() => handleDetach(document)}
            />
          </FileRow>
        );
      })}

      {actionError !== null ? (
        <ErrorText
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          testID={`${testID}-error`}
        >
          {actionError}
        </ErrorText>
      ) : null}

      {actionNotice !== null ? (
        <NoticeText
          accessibilityLiveRegion="polite"
          testID={`${testID}-notice`}
        >
          {actionNotice}
        </NoticeText>
      ) : null}
    </Card>
  );
});
