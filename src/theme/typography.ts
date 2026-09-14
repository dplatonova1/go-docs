/**
 * Шрифт и трекинг из темы.
 *
 * Onest встроен в приложение (`assets/fonts`, подключается
 * `npx react-native-asset`) — загрузка шрифтов из сети запрещена
 * (ADR-0002, ADR-0004).
 *
 * Шрифт обязан содержать кириллицу, включая сербскую (ђ ћ џ љ њ ј), и
 * сербскую латиницу (č ć đ š ž): символы, которых в шрифте нет, молча
 * рисуются системным шрифтом, и в одной строке смешиваются два шрифта.
 * Так вышло с Outfit из исходной темы tweakcn — в нём только латиница,
 * поэтому он заменён на Onest.
 */

import { css } from 'styled-components/native';

/**
 * Начертания Onest.
 *
 * Значение — PostScript-имя шрифта, оно же имя файла в `assets/fonts`:
 * только при таком совпадении одна строка работает и на iOS, и на Android.
 *
 * Вес выбирается семейством, `font-weight` вместе с ними не задаётся: на
 * Android он может дать искусственно утолщённое начертание вместо
 * настоящего.
 */
export const FONTS = {
  regular: 'Onest-Regular',
  medium: 'Onest-Medium',
  semibold: 'Onest-SemiBold',
  bold: 'Onest-Bold',
} as const;

/**
 * Трекинг темы, `--tracking-normal: 0.025em`. В React Native
 * `letter-spacing` задаётся в dp, а не в em, поэтому пересчитывается от
 * размера шрифта.
 */
const TRACKING_EM = 0.025;

/**
 * Размер текста вместе с трекингом темы. Использовать вместо голого
 * `font-size`, иначе трекинг теряется.
 */
export function textSize(size: number) {
  return css`
    font-size: ${size}px;
    letter-spacing: ${size * TRACKING_EM}px;
  `;
}
