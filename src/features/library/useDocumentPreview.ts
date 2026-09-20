/**
 * Превью изображения из библиотеки.
 *
 * Файлы лежат зашифрованными (ADR-0002), поэтому показать их напрямую по
 * пути нельзя: картинку нужно прочитать, расшифровать и отдать
 * `Image` как `data:`-URI.
 *
 * Отсюда два ограничения, которые здесь и держатся:
 *
 * - превью делается только для JPEG и PNG. PDF без нативного рендерера
 *   страницы в картинку не превратить, и это не задача Фазы 2;
 * - файлы крупнее `MAX_PREVIEW_BYTES` пропускаются. Расшифровка идёт
 *   целиком в памяти, а base64 — это ещё треть сверху; на бюджетном
 *   Android несколько таких строк сразу означают нехватку памяти.
 *
 * Настоящие миниатюры (уменьшенная копия рядом с оригиналом, сделанная
 * один раз при прикреплении) — отдельная работа, см. «Отложенные
 * обязательства» в CLAUDE.md.
 *
 * Грузит по одной видимой строке: `FlatList` виртуализирован, и хук
 * живёт ровно столько, сколько строка на экране.
 */

import { useEffect, useState } from 'react';

import { bytesToBase64 } from '../../storage/base64';
import { readFile, toRelativePath } from '../../storage/fs';
import type { LibraryDocument } from '../checklist/model';

/** Превью не делается для файлов крупнее — см. шапку модуля. */
export const MAX_PREVIEW_BYTES = 2 * 1024 * 1024;

const PREVIEWABLE_MIME_TYPES = ['image/jpeg', 'image/png'] as const;

export type PreviewState =
  | { readonly status: 'none' }
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly uri: string }
  | { readonly status: 'failed' };

const NONE: PreviewState = { status: 'none' };
const LOADING: PreviewState = { status: 'loading' };
const FAILED: PreviewState = { status: 'failed' };

export function isPreviewable(document: LibraryDocument): boolean {
  const mimeType = document.mimeType;

  if (mimeType === null) {
    return false;
  }

  if (!(PREVIEWABLE_MIME_TYPES as readonly string[]).includes(mimeType)) {
    return false;
  }

  // Размер неизвестен у записей, созданных до появления колонки, —
  // рисковать памятью ради них не стоит.
  return document.sizeBytes !== null && document.sizeBytes <= MAX_PREVIEW_BYTES;
}

export function useDocumentPreview(document: LibraryDocument): PreviewState {
  const previewable = isPreviewable(document);
  const [state, setState] = useState<PreviewState>(
    previewable ? LOADING : NONE,
  );

  const { filePath, mimeType } = document;

  useEffect(() => {
    if (!previewable || mimeType === null) {
      setState(NONE);
      return undefined;
    }

    // Строка могла уехать с экрана, пока файл читался: обновлять
    // состояние размонтированной строки не нужно.
    let cancelled = false;
    setState(LOADING);

    readFile(toRelativePath(filePath)).then(
      bytes => {
        if (!cancelled) {
          setState({
            status: 'ready',
            uri: `data:${mimeType};base64,${bytesToBase64(bytes)}`,
          });
        }
      },
      () => {
        // Файла нет или он не расшифровывается. Для строки списка это не
        // повод показывать ошибку на весь экран: место превью просто
        // остаётся пустым, а сам документ виден и удаляем.
        if (!cancelled) {
          setState(FAILED);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [previewable, filePath, mimeType]);

  return state;
}
