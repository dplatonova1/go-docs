/**
 * Русский словарь — источник правды по набору ключей.
 *
 * Строка с подстановкой — функция, а не шаблон с плейсхолдерами:
 * аргументы тогда проверяет tsc, а порядок слов каждый язык выбирает
 * свой.
 *
 * Два правила формулировок, общие для всех языков проекта:
 *
 * 1. **Числа — в скобках или после двоеточия, без склонения** («пунктов:
 *    7», «снимки (1)»). Так текст остаётся верным при любом количестве,
 *    и правила плюрализации не нужны ни здесь, ни в английском.
 * 2. **`accessibilityLabel` называет действие целиком**, а не повторяет
 *    надпись: «Открепить» в списке из нескольких файлов ничего не
 *    сообщает, «Открепить файл X от пункта 3» — сообщает.
 */

import type { AttachmentErrorCode } from '../../features/checklist/errors';
import type { QualityFlag, RegistryStatus } from '../../features/package/types';
import type { StorageErrorCode } from '../../storage/errors';

export const ru = {
  common: {
    retry: 'Повторить',
    cancel: 'Отмена',
    delete: 'Удалить',
    deleting: 'Удаление…',
    save: 'Сохранить',
    saving: 'Сохранение…',
  },

  /** Нижняя панель вкладок. */
  tabs: {
    home: 'Главная',
    library: 'Библиотека',
    settings: 'Настройки',
  },

  /** Заголовки в шапке навигации. Заголовок чек-листа — название заявки. */
  navigation: {
    applicationList: 'Заявки',
    createApplication: 'Новая заявка',
    renameApplication: 'Переименовать заявку',
    documentLibrary: 'Библиотека документов',
    pickDocument: 'Выбор файла',
    settings: 'Настройки',
    /** Кнопка «назад» в шапке: видна только иконка, это — для скринридера. */
    backA11y: 'Назад',
  },

  /** Экран запуска: навигации на нём ещё нет. */
  bootstrap: {
    loadingA11y: 'Загрузка данных',
    failedTitle: 'Данные недоступны',
    retryA11y: 'Повторить открытие данных',
  },

  /** Загрузка заявки по идентификатору из параметров маршрута. */
  applicationGate: {
    loadingA11y: 'Загрузка заявки',
    retryA11y: 'Повторить загрузку заявки',
    missing: 'Заявка удалена. Откройте другую из списка.',
    backToList: 'К списку заявок',
    backToListA11y: 'Вернуться к списку заявок',
  },

  /** Подтверждение ухода с недозаполненной формы создания заявки. */
  leaveCreate: {
    title: 'Выйти без сохранения?',
    message: 'Название и список пунктов не сохранены и пропадут.',
    stay: 'Остаться',
    leave: 'Выйти',
  },

  applicationList: {
    emptyHint:
      'Заявок пока нет. Создайте первую: понадобится название и список ' +
      'документов с сайта ведомства.',
    loadingA11y: 'Загрузка списка заявок',
    retryA11y: 'Повторить загрузку списка заявок',
    create: 'Создать заявку',
    createA11y: 'Создать новую заявку',
  },

  applicationRow: {
    openA11y: (number: number, total: number, title: string) =>
      `Заявка ${number} из ${total}: ${title}. Открыть чек-лист`,
    rename: 'Переименовать',
    renameA11y: (title: string) => `Переименовать заявку ${title}`,
  },

  checklist: {
    summary: (total: number) => `Пунктов в чек-листе: ${total}`,
    loadingA11y: 'Загрузка пунктов чек-листа',
    retryA11y: 'Повторить загрузку пунктов чек-листа',
    // Без «всё готово»: пакет собирается и при неполном чек-листе, а
    // решать, готов он или нет, человеку.
    attachedSummary: (attached: number, total: number) =>
      `Прикреплено ${attached} из ${total} пунктов чек-листа`,
    buildProgress: (processed: number, total: number) =>
      `Обрабатывается ${processed} из ${total}`,
    buildResult: (pageCount: number) => `Пакет собран: страниц — ${pageCount}`,
    build: 'Собрать пакет',
    building: 'Сборка…',
    buildA11y: 'Собрать все прикреплённые документы в один PDF-файл',
    shareAgain: 'Отправить ещё раз',
    shareAgainA11y: 'Отправить собранный пакет ещё раз',
    resetHint:
      'Список документов составлен неверно? Заявку можно удалить и создать ' +
      'заново — прикреплённые файлы останутся в библиотеке.',
    deleteApplication: 'Удалить заявку',
    deleteApplicationA11y: 'Удалить эту заявку',
    detach: 'Открепить',
    /** Вслух: исход действия иначе заметен только глазами. */
    announceAttached: 'Файл прикреплён',
    announceDetached: 'Файл откреплён',
    announcePackageBuilt: 'Пакет собран',
    /**
     * Сообщения дедупликации (ADR-0018). Показываются вместо тихого
     * повторения обычного прикрепления: пользователь выбрал файл и вправе
     * знать, что второй копии не появилось.
     */
    reusedNotice:
      'Этот файл уже был в библиотеке — прикреплён без повторной загрузки.',
    alreadyAttachedNotice: 'Этот файл уже прикреплён к этому пункту.',
  },

  checklistItem: {
    /**
     * Статус текстом, а не только цветом: иначе его не различат люди с
     * нарушением цветовосприятия и не прочтёт скринридер.
     */
    statusAttached: 'Прикреплено',
    statusNotAttached: 'Не прикреплено',
    /** Показывается вместо имени, если источник файла его не сообщил. */
    unnamedFile: 'Файл без имени',
    line: (number: number, label: string) => `${number}. ${label}`,
    labelA11y: (number: number, total: number, label: string) =>
      `Пункт ${number} из ${total}: ${label}`,
    statusA11y: (number: number, status: string) =>
      `Пункт ${number}: ${status}`,
    fileA11y: (name: string) => `Прикреплённый файл: ${name}`,
    detachA11y: (name: string, number: number, label: string) =>
      `Открепить файл ${name} от пункта ${number}: ${label}`,
    attach: 'Прикрепить файл',
    attachMore: 'Прикрепить ещё файл',
    attaching: 'Прикрепление…',
    attachA11y: (number: number, label: string) =>
      `Загрузить файл с устройства и прикрепить к пункту ${number}: ${label}`,
    pickFromLibrary: 'Выбрать из библиотеки',
    pickFromLibraryA11y: (number: number, label: string) =>
      `Прикрепить к пункту ${number}: ${label} файл, уже загруженный в приложение`,
  },

  createApplication: {
    titleLabel: 'Название заявки',
    titlePlaceholder: 'Например, ВНЖ в Сербии',
    textLabel: 'Список документов',
    textA11y: 'Текст списка документов для разбора на пункты',
    textPlaceholder: 'Вставьте список документов с сайта ведомства',
    parse: 'Разобрать на пункты',
    parseA11y: 'Разобрать вставленный текст на пункты чек-листа',
    sectionTitle: (count: number) => `Пункты чек-листа (${count})`,
    hint:
      'Вставьте текст и нажмите «Разобрать на пункты» или добавьте пункты ' +
      'вручную. Перед сохранением список можно поправить.',
    addItem: 'Добавить пункт',
    addItemA11y: 'Добавить пункт чек-листа вручную',
    save: 'Сохранить заявку',
    saveA11y: 'Сохранить заявку и пункты чек-листа',
    titleRequired: 'Укажите название заявки',
    nothingParsed:
      'В тексте не нашлось ни одного пункта. Проверьте текст или добавьте пункты вручную.',
    noItems: 'Добавьте хотя бы один пункт',
    emptyItems: 'Есть пустые пункты — заполните или удалите их',
    /** Список уже мог быть поправлен руками — молча затирать правки нельзя. */
    replaceTitle: 'Заменить список?',
    replaceMessage: (count: number) =>
      `Текущие пункты (${count}) и правки в них будут заменены результатом разбора.`,
    replaceConfirm: 'Заменить',
    announceParsed: (count: number) =>
      `Найдено пунктов: ${count}. Проверьте список перед сохранением.`,
    announceMovedUp: 'Пункт перемещён выше',
    announceMovedDown: 'Пункт перемещён ниже',
    announceRemoved: 'Пункт удалён',
  },

  draftItem: {
    label: (number: number) => `Пункт ${number}`,
    inputA11y: (number: number, total: number) =>
      `Текст пункта ${number} из ${total}`,
    moveUp: 'Выше',
    moveUpA11y: (number: number) => `Переместить пункт ${number} выше`,
    moveDown: 'Ниже',
    moveDownA11y: (number: number) => `Переместить пункт ${number} ниже`,
    removeA11y: (number: number) => `Удалить пункт ${number}`,
    emptyItem: 'Пустой пункт: заполните или удалите его',
  },

  renameApplication: {
    hint:
      'Название видно только вам — в списке заявок. На документы и пункты ' +
      'чек-листа оно не влияет.',
    titleLabel: 'Название заявки',
    titleRequired: 'Введите название заявки',
    saveA11y: 'Сохранить новое название заявки',
    cancelA11y: 'Отменить переименование заявки',
    announceRenamed: 'Название заявки изменено',
  },

  library: {
    pickHint:
      'Выберите файл, уже загруженный в приложение, — он прикрепится к пункту без повторной загрузки.',
    browseSummary: (total: number) => `Файлов в библиотеке: ${total}`,
    emptyBrowse:
      'Библиотека пуста. Файлы попадают сюда, когда вы прикрепляете их к ' +
      'пунктам чек-листа, и остаются после удаления заявки.',
    emptyPick:
      'В библиотеке пока нет файлов. Прикрепите первый с устройства — ' +
      'дальше его можно будет переиспользовать в других заявках.',
    /** Показывается, если документ уже был прикреплён к этому пункту. */
    alreadyAttached: 'Этот файл уже прикреплён к пункту.',
    loadingA11y: 'Загрузка библиотеки документов',
    retryA11y: 'Повторить загрузку библиотеки документов',
    announceAttached: 'Файл прикреплён',
    announceDeleted: 'Файл удалён из библиотеки',
  },

  /** Плитка превью документа: библиотека и пункт чек-листа. */
  documentPreview: {
    none: 'Без превью',
    loading: 'Превью…',
    failed: 'Файл недоступен',
    noFile: 'Нет файла',
  },

  documentRow: {
    /** Показывается вместо имени, если источник его не сообщил. */
    unnamedDocument: 'Файл без имени',
    /** Что написано вместо превью, когда картинки нет. */
    nameA11y: (number: number, total: number, name: string, added: string) =>
      `Документ ${number} из ${total}: ${name}, добавлен ${added}`,
    added: (date: string) => `Добавлен ${date}`,
    attach: 'Прикрепить к пункту',
    attaching: 'Прикрепление…',
    attached: 'Уже прикреплён',
    attachA11y: (name: string) => `Прикрепить файл ${name} к пункту чек-листа`,
    attachedA11y: (name: string) =>
      `Файл ${name} уже прикреплён к этому пункту`,
    deleteFromLibrary: 'Удалить из библиотеки',
    // Вслух — что именно удаляется и откуда: рядом в чек-листе есть
    // похожее по звучанию «Открепить», а последствия разные.
    deleteA11y: (name: string) =>
      `Удалить файл ${name} из библиотеки, со всех чек-листов`,
  },

  settings: {
    languageTitle: 'Язык',
    languageHint:
      'Язык интерфейса, сообщений об ошибках и титульной страницы ' +
      'собранного пакета. Выбор сохраняется на этом устройстве.',
    languageA11y: (name: string) => `Переключить язык приложения на ${name}`,
    selectedA11y: (name: string) => `Язык приложения: ${name}. Уже выбран`,
    selected: 'Выбран',
    announceChanged: 'Язык приложения изменён',
    themeTitle: 'Тема',
    themeHint:
      'Оформление приложения. «Как в системе» следует настройке устройства.',
    themeNames: {
      system: 'Как в системе',
      light: 'Светлая',
      dark: 'Тёмная',
    },
    themeA11y: (name: string) => `Тема оформления: ${name}`,
    themeSelectedA11y: (name: string) =>
      `Тема оформления: ${name}. Уже выбрана`,
    themeSelected: 'Выбрана',
    announceThemeChanged: 'Тема оформления изменена',
  },

  /**
   * Дата добавления документа.
   *
   * Свои названия месяцев, а не `Intl.DateTimeFormat`: полнота ICU в
   * Hermes зависит от платформы и сборки, и русские месяцы могут молча
   * превратиться в английские.
   *
   * В родительном падеже: строка читается как «12 марта 2026», а не
   * «12 март 2026».
   */
  date: {
    months: [
      'января',
      'февраля',
      'марта',
      'апреля',
      'мая',
      'июня',
      'июля',
      'августа',
      'сентября',
      'октября',
      'ноября',
      'декабря',
    ] as readonly string[],
    format: (day: number, month: string, year: number) =>
      `${day} ${month} ${year}`,
    /** Показывается, если в базе оказалась строка, которую не разобрать. */
    unknown: 'дата неизвестна',
  },

  /**
   * Сообщения об ошибках — по коду, а не по тексту исключения: текст
   * исключения пишется для разработчика и может содержать детали,
   * которые пользователю ничего не скажут.
   */
  errors: {
    storage: {
      'keychain-unavailable':
        'Защищённое хранилище устройства недоступно. Разблокируйте устройство и попробуйте ещё раз.',
      'keychain-read-back-failed':
        'Не удалось сохранить ключ шифрования на устройстве. Попробуйте ещё раз.',
      'encryption-key-lost':
        'Ключ шифрования на устройстве потерян, сохранённые данные недоступны.',
      'key-format-unsupported':
        'Данные созданы более новой версией приложения. Обновите приложение.',
      'csprng-unavailable':
        'Системный генератор случайных чисел недоступен. Перезапустите приложение.',
      'path-outside-sandbox': 'Внутренняя ошибка: недопустимый путь к файлу.',
      'invalid-path': 'Внутренняя ошибка: недопустимый путь к файлу.',
      'file-not-found': 'Файл не найден.',
      'file-corrupted': 'Файл повреждён или не может быть расшифрован.',
      'file-format-unsupported':
        'Файл создан более новой версией приложения. Обновите приложение.',
      // Предел приходит аргументом: он живёт в модели чек-листа, а
      // словарь от фич не зависит.
      'file-too-large': (megabytes: number) =>
        `Файл больше ${megabytes} МБ. Уменьшите его — например, сожмите PDF или сделайте фото с меньшим разрешением — и попробуйте снова.`,
      'not-enough-space':
        'На устройстве не хватает свободного места. Освободите место и попробуйте снова.',
      'database-failure':
        'Не удалось обратиться к данным на устройстве. Попробуйте ещё раз.',
    } satisfies Record<
      StorageErrorCode,
      string | ((megabytes: number) => string)
    >,

    attachment: {
      'picker-failed': 'Не удалось открыть выбор файла. Попробуйте ещё раз.',
      'copy-failed':
        'Не удалось получить файл. Если он хранится в облаке, откройте его в приложении облака, чтобы он загрузился на телефон, и попробуйте снова.',
      unsupported:
        'Прикрепить можно JPEG, PNG или PDF. Сохраните файл в одном из этих форматов и попробуйте снова.',
    } satisfies Record<AttachmentErrorCode, string>,

    packageAssembly:
      'Не удалось собрать пакет из документов. Попробуйте ещё раз.',
    unknown: 'Непредвиденная ошибка. Попробуйте ещё раз.',
  },

  /**
   * Подтверждения необратимых действий. Каждое называет последствие
   * прямо и числами.
   */
  confirmations: {
    /** Показывается вместо имени, если источник его не сообщил. */
    unnamedDocument: 'без имени',

    deleteApplicationTitle: (title: string) => `Удалить заявку «${title}»?`,
    deleteApplicationItems: (count: number) =>
      `Будут удалены пункты чек-листа этой заявки (${count}).`,
    deleteApplicationDocuments: (count: number) =>
      `Прикреплённые документы (${count}) останутся в библиотеке — их можно прикрепить к другой заявке.`,
    deleteApplicationIrreversible: 'Отменить удаление заявки нельзя.',

    detachTitle: (name: string) => `Открепить файл «${name}»?`,
    detachLink: 'Файл перестанет быть прикреплённым к этому пункту.',
    detachWhereToFind:
      'Списка загруженных документов в приложении пока нет, поэтому найти его снова будет нельзя — если он понадобится, прикрепите файл заново.',
    detachUnchecks: (label: string) =>
      `Пункт «${label}» снова станет неотмеченным.`,

    deleteDocumentTitle: (name: string) =>
      `Удалить файл «${name}» из библиотеки?`,
    deleteDocumentIrreversible:
      'Файл будет удалён с устройства без возможности восстановления.',
    deleteDocumentUsageEntry: (applicationTitle: string, itemCount: number) =>
      `«${applicationTitle}» — пунктов: ${itemCount}`,
    deleteDocumentUsage: (itemCount: number, where: string) =>
      `Сейчас он прикреплён к пунктам чек-листа (${itemCount}) в заявках: ${where}.`,
    deleteDocumentConsequence:
      'Из этих чек-листов он пропадёт, а пункты, где других файлов нет, снова станут неотмеченными.',
    deleteDocumentUnused:
      'Сейчас он не прикреплён ни к одному пункту чек-листа.',
    deleteDocumentTail: 'Отменить это нельзя.',
  },

  /** Тексты собранного PDF и вокруг сборки (ADR-0019). */
  package: {
    /**
     * Имя готового файла. Попадает в share sheet, поэтому язык тот же,
     * что и у реестра внутри.
     */
    fileName: (applicationTitle: string) => `Пакет — ${applicationTitle}.pdf`,
    fallbackFileName: 'Пакет документов.pdf',

    registryTitle: (applicationTitle: string) =>
      `Пакет документов: ${applicationTitle}`,
    registrySubtitle: (createdAt: string, attached: number, total: number) =>
      `Собран ${createdAt}. Прикреплено ${attached} из ${total} пунктов чек-листа.`,
    registryRow: (fileName: string, status: string, pages: string) =>
      `${fileName} — ${status}${pages}`,
    registryPages: (pageCount: number) => `, страниц: ${pageCount}`,
    /** Стоит вместо имени, когда к пункту ничего не прикреплено. */
    registryNoFileName: '—',

    registryStatus: {
      included: 'включено',
      'not-included': 'не включено — формат не поддерживается',
      'no-file': 'файл не прикреплён',
    } satisfies Record<RegistryStatus, string>,

    registryQuality: {
      blurry: 'возможно, снимок размыт — проверьте перед печатью',
      dark: 'возможно, снимок тёмный — проверьте перед печатью',
    } satisfies Record<QualityFlag, string>,

    /** Та же претензия коротко — для сводки на экране после сборки. */
    summaryQuality: {
      blurry: 'возможно, размыт',
      dark: 'возможно, тёмный',
    } satisfies Record<QualityFlag, string>,

    summaryEntry: (itemNumber: number, itemLabel: string, note: string) =>
      `пункт ${itemNumber} «${itemLabel}» — ${note}`,
    summaryMore: (rest: number) => ` и ещё (${rest})`,
    summary: (count: number, listed: string, tail: string) =>
      `Снимки с замечаниями (${count}): ${listed}${tail}. ` +
      'Проверьте их перед печатью — возможно, стоит переснять и собрать пакет заново.',
  },
};
