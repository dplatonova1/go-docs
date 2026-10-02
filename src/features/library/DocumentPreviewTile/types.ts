import type { PreviewSource } from '../useDocumentPreview';

export type DocumentPreviewTileProps = {
  /** Документ для превью; `null` — файла нет (пункт без вложений). */
  document: PreviewSource | null;
  /** Префикс: картинка — `${testID}-preview`, заглушка — `-preview-placeholder`. */
  testID: string;
};

export type LoadedTileProps = {
  document: PreviewSource;
  testID: string;
};
