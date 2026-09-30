/**
 * English dictionary.
 *
 * Typed as `Messages`, so a missing, extra or wrongly-shaped key is a
 * tsc error rather than an empty string on screen. The Russian
 * dictionary ([`ru.ts`](./ru.ts)) defines the set of keys.
 *
 * Wording follows the same two project rules as the Russian one: counts
 * go after a colon or in parentheses so no plural forms are needed, and
 * an `accessibilityLabel` names the whole action instead of repeating
 * the visible label.
 *
 * The audience fills in official paperwork, often under stress and not
 * in their first language: short sentences, plain words, no idioms.
 */

import type { Messages } from '../types';

export const en: Messages = {
  common: {
    retry: 'Try again',
    cancel: 'Cancel',
    delete: 'Delete',
    deleting: 'Deleting…',
    save: 'Save',
    saving: 'Saving…',
  },

  tabs: {
    home: 'Home',
    library: 'Library',
    settings: 'Settings',
  },

  navigation: {
    applicationList: 'Applications',
    createApplication: 'New application',
    renameApplication: 'Rename application',
    documentLibrary: 'Document library',
    pickDocument: 'Choose a file',
    settings: 'Settings',
    backA11y: 'Back',
  },

  bootstrap: {
    loadingA11y: 'Loading your data',
    failedTitle: 'Data unavailable',
    retryA11y: 'Try opening your data again',
  },

  applicationGate: {
    loadingA11y: 'Loading the application',
    retryA11y: 'Try loading the application again',
    missing: 'This application was deleted. Open another one from the list.',
    backToList: 'Back to applications',
    backToListA11y: 'Go back to the list of applications',
  },

  leaveCreate: {
    title: 'Leave without saving?',
    message: 'The name and the list of items are not saved and will be lost.',
    stay: 'Stay',
    leave: 'Leave',
  },

  applicationList: {
    emptyHint:
      'No applications yet. Create the first one: you will need a name and ' +
      'the list of documents from the authority website.',
    loadingA11y: 'Loading the list of applications',
    retryA11y: 'Try loading the list of applications again',
    createA11y: 'Create a new application',
  },

  applicationRow: {
    openA11y: (number: number, total: number, title: string) =>
      `Application ${number} of ${total}: ${title}. Open the checklist`,
    rename: 'Rename',
    renameA11y: (title: string) => `Rename the application ${title}`,
    deleteA11y: (title: string) => `Delete the application ${title}`,
  },

  checklist: {
    summary: (total: number) => `Items in the checklist: ${total}`,
    loadingA11y: 'Loading checklist items',
    retryA11y: 'Try loading checklist items again',
    attachedSummary: (attached: number, total: number) =>
      `Files attached to ${attached} of ${total} checklist items`,
    buildProgress: (processed: number, total: number) =>
      `Processing ${processed} of ${total}`,
    buildResult: (pageCount: number) => `Package ready: pages — ${pageCount}`,
    build: 'Build package',
    building: 'Building…',
    buildA11y: 'Combine all attached documents into a single PDF file',
    shareAgain: 'Share again',
    shareAgainA11y: 'Share the package you have just built again',
    resetHint:
      'Is the list of documents wrong? You can delete this application and ' +
      'create it again — the attached files stay in the library.',
    deleteApplication: 'Delete application',
    deleteApplicationA11y: 'Delete this application',
    detach: 'Detach',
    announceAttached: 'File attached',
    announceDetached: 'File detached',
    announcePackageBuilt: 'Package ready',
    reusedNotice:
      'This file was already in the library — attached without uploading it again.',
    alreadyAttachedNotice: 'This file is already attached to this item.',
  },

  checklistItem: {
    statusAttached: 'Attached',
    statusNotAttached: 'Not attached',
    unnamedFile: 'Unnamed file',
    line: (number: number, label: string) => `${number}. ${label}`,
    labelA11y: (number: number, total: number, label: string) =>
      `Item ${number} of ${total}: ${label}`,
    statusA11y: (number: number, status: string) => `Item ${number}: ${status}`,
    fileA11y: (name: string) => `Attached file: ${name}`,
    detachA11y: (name: string, number: number, label: string) =>
      `Detach the file ${name} from item ${number}: ${label}`,
    attach: 'Attach a file',
    attachMore: 'Attach another file',
    attaching: 'Attaching…',
    attachA11y: (number: number, label: string) =>
      `Upload a file from this device and attach it to item ${number}: ${label}`,
    pickFromLibrary: 'Choose from library',
    pickFromLibraryA11y: (number: number, label: string) =>
      `Attach a file already uploaded to the app to item ${number}: ${label}`,
  },

  createApplication: {
    titleLabel: 'Application name',
    titlePlaceholder: 'For example, Residence permit in Serbia',
    textLabel: 'List of documents',
    textA11y: 'Text of the document list to split into items',
    textPlaceholder: 'Paste the list of documents from the authority website',
    parse: 'Split into items',
    parseA11y: 'Split the pasted text into checklist items',
    sectionTitle: (count: number) => `Checklist items (${count})`,
    hint:
      'Paste the text and tap “Split into items”, or add items by hand. ' +
      'You can edit the list before saving.',
    addItem: 'Add item',
    addItemA11y: 'Add a checklist item by hand',
    save: 'Save application',
    saveA11y: 'Save the application and its checklist items',
    titleRequired: 'Enter a name for the application',
    nothingParsed:
      'No items were found in this text. Check the text or add items by hand.',
    noItems: 'Add at least one item',
    emptyItems: 'Some items are empty — fill them in or delete them',
    replaceTitle: 'Replace the list?',
    replaceMessage: (count: number) =>
      `The current items (${count}) and your edits to them will be replaced by the result.`,
    replaceConfirm: 'Replace',
    announceParsed: (count: number) =>
      `Items found: ${count}. Check the list before saving.`,
    announceMovedUp: 'Item moved up',
    announceMovedDown: 'Item moved down',
    announceRemoved: 'Item deleted',
  },

  draftItem: {
    label: (number: number) => `Item ${number}`,
    inputA11y: (number: number, total: number) =>
      `Text of item ${number} of ${total}`,
    moveUp: 'Up',
    moveUpA11y: (number: number) => `Move item ${number} up`,
    moveDown: 'Down',
    moveDownA11y: (number: number) => `Move item ${number} down`,
    removeA11y: (number: number) => `Delete item ${number}`,
    emptyItem: 'Empty item: fill it in or delete it',
  },

  renameApplication: {
    hint:
      'Only you see this name, in the list of applications. It does not ' +
      'affect the documents or the checklist items.',
    titleLabel: 'Application name',
    titleRequired: 'Enter a name for the application',
    saveA11y: 'Save the new application name',
    cancelA11y: 'Cancel renaming the application',
    announceRenamed: 'Application renamed',
  },

  library: {
    pickHint:
      'Choose a file already uploaded to the app — it will be attached to the item without uploading it again.',
    browseSummary: (total: number) => `Files in the library: ${total}`,
    emptyBrowse:
      'The library is empty. Files appear here when you attach them to ' +
      'checklist items, and they stay after an application is deleted.',
    emptyPick:
      'There are no files in the library yet. Attach the first one from ' +
      'this device — after that you can reuse it in other applications.',
    alreadyAttached: 'This file is already attached to the item.',
    loadingA11y: 'Loading the document library',
    retryA11y: 'Try loading the document library again',
    announceAttached: 'File attached',
    announceDeleted: 'File deleted from the library',
  },

  documentRow: {
    unnamedDocument: 'Unnamed file',
    previewPlaceholder: {
      none: 'No preview',
      loading: 'Preview…',
      failed: 'File unavailable',
    },
    nameA11y: (number: number, total: number, name: string, added: string) =>
      `Document ${number} of ${total}: ${name}, added ${added}`,
    added: (date: string) => `Added ${date}`,
    attach: 'Attach to item',
    attaching: 'Attaching…',
    attached: 'Already attached',
    attachA11y: (name: string) =>
      `Attach the file ${name} to the checklist item`,
    attachedA11y: (name: string) =>
      `The file ${name} is already attached to this item`,
    deleteFromLibrary: 'Delete from library',
    deleteA11y: (name: string) =>
      `Delete the file ${name} from the library and from every checklist`,
  },

  settings: {
    languageTitle: 'Language',
    languageHint:
      'The language of the interface, the error messages and the cover ' +
      'page of the package you build. The choice is kept on this device.',
    languageA11y: (name: string) => `Switch the app language to ${name}`,
    selectedA11y: (name: string) => `App language: ${name}. Already selected`,
    selected: 'Selected',
    announceChanged: 'App language changed',
    themeTitle: 'Theme',
    themeHint: 'App appearance. “System” follows the device setting.',
    themeNames: {
      system: 'System',
      light: 'Light',
      dark: 'Dark',
    },
    themeA11y: (name: string) => `Appearance: ${name}`,
    themeSelectedA11y: (name: string) =>
      `Appearance: ${name}. Already selected`,
    themeSelected: 'Selected',
    announceThemeChanged: 'Appearance changed',
  },

  date: {
    months: [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ],
    // Day before month, as in «12 March 2026»: the same order as in the
    // Russian format, and unambiguous for readers who expect either.
    format: (day: number, month: string, year: number) =>
      `${day} ${month} ${year}`,
    unknown: 'date unknown',
  },

  errors: {
    storage: {
      'keychain-unavailable':
        'The secure storage of this device is unavailable. Unlock the device and try again.',
      'keychain-read-back-failed':
        'The encryption key could not be saved on this device. Please try again.',
      'encryption-key-lost':
        'The encryption key on this device is lost, so the saved data cannot be opened.',
      'key-format-unsupported':
        'This data was created by a newer version of the app. Please update the app.',
      'csprng-unavailable':
        'The system random number generator is unavailable. Restart the app.',
      'path-outside-sandbox': 'Internal error: invalid file path.',
      'invalid-path': 'Internal error: invalid file path.',
      'file-not-found': 'File not found.',
      'file-corrupted': 'The file is damaged or cannot be decrypted.',
      'file-format-unsupported':
        'This file was created by a newer version of the app. Please update the app.',
      'file-too-large': (megabytes: number) =>
        `The file is larger than ${megabytes} MB. Make it smaller — compress the PDF, or take the photo at a lower resolution — and try again.`,
      'not-enough-space':
        'There is not enough free space on this device. Free up some space and try again.',
      'database-failure':
        'The data on this device could not be reached. Please try again.',
    },

    attachment: {
      'picker-failed': 'The file picker could not be opened. Please try again.',
      'copy-failed':
        'The file could not be read. If it is stored in the cloud, open it in your cloud app so it downloads to the phone, then try again.',
      unsupported:
        'You can attach JPEG, PNG or PDF. Save the file in one of these formats and try again.',
    },

    packageAssembly:
      'The package could not be built from your documents. Please try again.',
    unknown: 'Unexpected error. Please try again.',
  },

  confirmations: {
    unnamedDocument: 'unnamed',

    deleteApplicationTitle: (title: string) =>
      `Delete the application “${title}”?`,
    deleteApplicationItems: (count: number) =>
      `The checklist items of this application will be deleted (${count}).`,
    deleteApplicationDocuments: (count: number) =>
      `The attached documents (${count}) stay in the library — you can attach them to another application.`,
    deleteApplicationIrreversible: 'Deleting an application cannot be undone.',

    detachTitle: (name: string) => `Detach the file “${name}”?`,
    detachLink: 'The file will no longer be attached to this item.',
    detachWhereToFind:
      'The app has no list of uploaded documents yet, so you will not be able to find it again — if you need it, attach the file once more.',
    detachUnchecks: (label: string) =>
      `The item “${label}” will become unchecked again.`,

    deleteDocumentTitle: (name: string) =>
      `Delete the file “${name}” from the library?`,
    deleteDocumentIrreversible:
      'The file will be deleted from this device and cannot be restored.',
    deleteDocumentUsageEntry: (applicationTitle: string, itemCount: number) =>
      `“${applicationTitle}” — items: ${itemCount}`,
    deleteDocumentUsage: (itemCount: number, where: string) =>
      `It is attached to checklist items (${itemCount}) in these applications: ${where}.`,
    deleteDocumentConsequence:
      'It will disappear from those checklists, and items left without any other file will become unchecked again.',
    deleteDocumentUnused:
      'It is not attached to any checklist item at the moment.',
    deleteDocumentTail: 'This cannot be undone.',
  },

  package: {
    fileName: (applicationTitle: string) => `Package — ${applicationTitle}.pdf`,
    fallbackFileName: 'Document package.pdf',

    registryTitle: (applicationTitle: string) =>
      `Document package: ${applicationTitle}`,
    registrySubtitle: (createdAt: string, attached: number, total: number) =>
      `Built on ${createdAt}. Files attached to ${attached} of ${total} checklist items.`,
    registryRow: (fileName: string, status: string, pages: string) =>
      `${fileName} — ${status}${pages}`,
    registryPages: (pageCount: number) => `, pages: ${pageCount}`,
    registryNoFileName: '—',

    registryStatus: {
      included: 'included',
      'not-included': 'not included — format not supported',
      'no-file': 'no file attached',
    },

    registryQuality: {
      blurry: 'may be blurry — check before printing',
      dark: 'may be too dark — check before printing',
    },

    summaryQuality: {
      blurry: 'may be blurry',
      dark: 'may be too dark',
    },

    summaryEntry: (itemNumber: number, itemLabel: string, note: string) =>
      `item ${itemNumber} “${itemLabel}” — ${note}`,
    summaryMore: (rest: number) => ` and more (${rest})`,
    summary: (count: number, listed: string, tail: string) =>
      `Photos with remarks (${count}): ${listed}${tail}. ` +
      'Check them before printing — you may want to retake them and build the package again.',
  },
};
