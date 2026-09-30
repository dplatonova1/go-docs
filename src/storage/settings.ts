/**
 * Настройки приложения — маленький JSON-файл в приватной песочнице.
 *
 * **Без шифрования, и это осознанно.** Здесь лежат предпочтения
 * интерфейса, а не данные пользователя: выбранные язык и тема — не
 * персональные данные, и знание о нём никому ничего не даёт. Зато файл читается до
 * открытия базы и до обращения к Keychain, поэтому сообщение «ключ
 * шифрования потерян» пользователь увидит на своём языке, а не на языке
 * по умолчанию ([ADR-0021](../../docs/adr/0021-runtime-localization.md)).
 *
 * ВАЖНО: документы, их имена, названия заявок и всё, что ввёл
 * пользователь, сюда писать нельзя — для этого есть зашифрованный
 * [`fs.ts`](./fs.ts) и база.
 *
 * Чтение никогда не бросает: испорченный или отсутствующий файл
 * настроек — не повод не запустить приложение. Запись бросает: молча
 * потерянный выбор пользователя выглядел бы как «приложение меня не
 * слушается».
 */

import {
  FileEncoding,
  rawExists,
  rawRead,
  rawWrite,
  toRelativePath,
} from './sandbox';

/** Известные настройки. Новая настройка — новый вариант здесь. */
export type SettingKey = 'locale' | 'themeMode';

export type Settings = Partial<Record<SettingKey, string>>;

const SETTINGS_PATH = toRelativePath('settings.json');

const EMPTY: Settings = {};

/**
 * Разбирает содержимое файла, отбрасывая всё, что не пара строк.
 *
 * Строгость здесь дешевле проверок на каждом чтении: снаружи настройка
 * либо строка, либо её нет.
 */
function parseSettings(content: string): Settings {
  const parsed: unknown = JSON.parse(content);

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return EMPTY;
  }

  const settings: Settings = {};

  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === 'string') {
      settings[key as SettingKey] = value;
    }
  }

  return settings;
}

/** @returns сохранённые настройки; пустой объект, если их нет или файл испорчен. */
export async function readSettings(): Promise<Settings> {
  try {
    if (!(await rawExists(SETTINGS_PATH))) {
      return EMPTY;
    }

    return parseSettings(await rawRead(SETTINGS_PATH, FileEncoding.Utf8));
  } catch {
    return EMPTY;
  }
}

/**
 * Записывает одну настройку, сохраняя остальные.
 *
 * Чтение-слияние-запись, а не запись поверх: настроек будет больше
 * одной, и сохранение языка не должно стирать соседние.
 */
export async function writeSetting(
  key: SettingKey,
  value: string,
): Promise<void> {
  const settings = { ...(await readSettings()), [key]: value };

  await rawWrite(
    SETTINGS_PATH,
    JSON.stringify(settings),
    FileEncoding.Utf8,
  );
}
