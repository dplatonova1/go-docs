/**
 * Превью документа для плитки карточки — по миниатюре
 * ([`thumbnail.ts`](./thumbnail.ts)), а не по исходному файлу.
 *
 * Миниатюра делается один раз при прикреплении и хранится зашифрованным
 * файлом `thumbnails/<id документа>`. Показ превью — это расшифровка
 * нескольких килобайт, а не исходного файла: так снято ограничение
 * «только JPEG/PNG до 2 МБ, расшифровка целиком при каждом показе»
 * ([ADR-0017](../../../docs/adr/0017-document-library-screen.md),
 * «Обновление»).
 *
 * У документов, прикреплённых до миниатюр, её нет. Для них она
 * делается при первом показе — один раз расшифровывается исходный файл
 * — и сразу сохраняется, так что дальше и они читаются с миниатюры. Если
 * файл сейчас на экране в нескольких местах, работа не повторяется:
 * идущие запросы общие (`inFlight`).
 *
 * PDF миниатюры не получает: без нативного рендерера страницу в
 * картинку не превратить. В плитке — заглушка.
 *
 * Грузит по одной видимой строке: `FlatList` виртуализирован, и хук
 * живёт ровно столько, сколько строка на экране.
 */

import { useEffect, useState } from 'react';

import { bytesToBase64 } from '../../storage/base64';
import { readFile, toRelativePath } from '../../storage/fs';
import {
  MAX_ATTACHMENT_BYTES,
  type DocumentId,
  type LibraryDocument,
} from '../checklist/model';
import { saveDocumentQuality } from '../checklist/repository';
import {
  THUMBNAIL_MIME_TYPE,
  analyzeImage,
  canHaveThumbnail,
} from './thumbnail';
import { readThumbnail, saveThumbnail } from './thumbnailStore';

export type PreviewState =
  | { readonly status: 'none' }
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly uri: string }
  | { readonly status: 'failed' };

/**
 * Что нужно хуку от документа — есть и у документа библиотеки, и у
 * прикреплённого к пункту чек-листа.
 */
export type PreviewSource = Pick<
  LibraryDocument,
  'id' | 'mimeType' | 'sizeBytes' | 'filePath'
>;

const NONE: PreviewState = { status: 'none' };
const LOADING: PreviewState = { status: 'loading' };
const FAILED: PreviewState = { status: 'failed' };

/** У документа может быть миниатюра — снимок, а не PDF. */
export function isPreviewable(document: PreviewSource): boolean {
  return canHaveThumbnail(document.mimeType);
}

/** Идущие загрузки миниатюр — общие для всех плиток одного документа. */
const inFlight = new Map<DocumentId, Promise<Uint8Array | null>>();

/**
 * Миниатюра с диска, а если её нет — сделанная из исходного файла и
 * сохранённая.
 *
 * @returns байты миниатюры или `null`, если её не сделать (размер
 *   неизвестен или больше предела прикрепления, картинка не разбирается).
 * @throws ошибки чтения и расшифровки — плитка покажет заглушку.
 */
async function loadThumbnail(
  document: PreviewSource,
): Promise<Uint8Array | null> {
  const stored = await readThumbnail(document.id);
  if (stored !== null) {
    return stored;
  }

  // Размер неизвестен у записей до Фазы 1, а больше предела прикрепления
  // файлов быть не должно — рисковать памятью ради них не стоит.
  if (
    document.sizeBytes === null ||
    document.sizeBytes > MAX_ATTACHMENT_BYTES
  ) {
    return null;
  }

  const bytes = await readFile(toRelativePath(document.filePath));
  const { thumbnail, quality } = await analyzeImage(bytes, document.mimeType);

  if (thumbnail !== null) {
    // Не сохранилась — не беда: покажем сейчас, сделаем в следующий раз.
    await saveThumbnail(document.id, thumbnail);
  }
  // Документ прикреплён до детектора: раз файл всё равно расшифрован,
  // ставим и пометку о качестве. Увидят её при следующем открытии
  // экрана — строка уже на экране со старыми данными.
  if (quality !== null) {
    await saveDocumentQuality(document.id, quality).catch(() => undefined);
  }
  return thumbnail;
}

function sharedLoad(document: PreviewSource): Promise<Uint8Array | null> {
  const pending = inFlight.get(document.id);
  if (pending !== undefined) {
    return pending;
  }

  const started = loadThumbnail(document).finally(() => {
    inFlight.delete(document.id);
  });
  inFlight.set(document.id, started);
  return started;
}

/**
 * @param document документ или `null`, если файла нет (пункт чек-листа
 *   без вложений) — тогда превью нет. `null` принимается, чтобы вызывающий
 *   не вызывал хук по условию.
 */
export function useDocumentPreview(
  document: PreviewSource | null,
): PreviewState {
  const previewable = document !== null && isPreviewable(document);
  const [state, setState] = useState<PreviewState>(
    previewable ? LOADING : NONE,
  );

  const id = document?.id ?? null;
  const mimeType = document?.mimeType ?? null;
  const sizeBytes = document?.sizeBytes ?? null;
  const filePath = document?.filePath ?? '';

  useEffect(() => {
    if (!previewable || id === null) {
      setState(NONE);
      return undefined;
    }

    // Строка могла уехать с экрана, пока миниатюра грузилась: обновлять
    // состояние размонтированной строки не нужно.
    let cancelled = false;
    setState(LOADING);

    sharedLoad({ id, mimeType, sizeBytes, filePath }).then(
      thumbnail => {
        if (cancelled) {
          return;
        }
        setState(
          thumbnail === null
            ? NONE
            : {
                status: 'ready',
                uri: `data:${THUMBNAIL_MIME_TYPE};base64,${bytesToBase64(
                  thumbnail,
                )}`,
              },
        );
      },
      () => {
        // Файла нет или он не расшифровывается. Для строки списка это не
        // повод показывать ошибку на весь экран: в плитке заглушка, а
        // сам документ виден и удаляем.
        if (!cancelled) {
          setState(FAILED);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [previewable, id, mimeType, sizeBytes, filePath]);

  return state;
}
