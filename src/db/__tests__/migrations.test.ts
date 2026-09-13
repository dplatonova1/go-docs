/**
 * Тесты отбора миграций.
 *
 * Проверяется чистая логика: что применяется, в каком порядке и что
 * повторный запуск ничего не делает. Само выполнение SQL требует
 * нативной части и проверяется на устройстве.
 */

import {
  MIGRATIONS,
  selectPendingMigrations,
  type Migration,
} from '../migrations';

function migration(version: number): Migration {
  return { version, name: `m${version}`, statements: [`-- ${version}`] };
}

const all = [migration(1), migration(2), migration(3)];

describe('selectPendingMigrations', () => {
  it('на чистой базе применяет всё', () => {
    const pending = selectPendingMigrations(all, new Set());
    expect(pending.map((m) => m.version)).toEqual([1, 2, 3]);
  });

  it('идемпотентна: когда всё применено, не возвращает ничего', () => {
    const pending = selectPendingMigrations(all, new Set([1, 2, 3]));
    expect(pending).toEqual([]);
  });

  it('применяет только то, что выше текущего максимума', () => {
    const pending = selectPendingMigrations(all, new Set([1, 2]));
    expect(pending.map((m) => m.version)).toEqual([3]);
  });

  it('сортирует по возрастанию независимо от порядка в массиве', () => {
    const shuffled = [migration(3), migration(1), migration(2)];
    const pending = selectPendingMigrations(shuffled, new Set());
    expect(pending.map((m) => m.version)).toEqual([1, 2, 3]);
  });

  it('продолжает с места остановки после частичного сбоя', () => {
    // Миграция 2 упала: применена только 1.
    const pending = selectPendingMigrations(all, new Set([1]));
    expect(pending.map((m) => m.version)).toEqual([2, 3]);
  });

  it('не пропускает молча миграцию с номером ниже максимума', () => {
    // Версия 2 отсутствует среди применённых, хотя схема уже на 3 —
    // такое бывает при слиянии веток. Правило «выше максимума» пропустило
    // бы её незаметно, оставив схему неполной.
    expect(() => selectPendingMigrations(all, new Set([1, 3]))).toThrow(/2/);
  });

  it('пустой список миграций не ломает отбор', () => {
    expect(selectPendingMigrations([], new Set())).toEqual([]);
    expect(selectPendingMigrations([], new Set([1]))).toEqual([]);
  });
});

describe('MIGRATIONS', () => {
  it('версии уникальны', () => {
    const versions = MIGRATIONS.map((m) => m.version);
    expect(new Set(versions).size).toBe(versions.length);
  });

  it('версии идут по возрастанию начиная с 1', () => {
    const versions = MIGRATIONS.map((m) => m.version);
    expect(versions).toEqual([...versions].sort((a, b) => a - b));
    expect(versions[0]).toBe(1);
  });

  it('каждый statement — ровно один SQL-оператор', () => {
    for (const item of MIGRATIONS) {
      for (const statement of item.statements) {
        // Точка с запятой внутри строки означала бы несколько операторов
        // в одном вызове execute(), который принимает только один.
        expect(statement).not.toContain(';');
        expect(statement.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('первая миграция создаёт все пять таблиц Фазы 0', () => {
    const sql = MIGRATIONS.flatMap((m) => m.statements).join('\n');

    for (const table of [
      'applications',
      'checklist_items',
      'documents',
      'checklist_item_documents',
      'form_templates',
    ]) {
      expect(sql).toContain(`CREATE TABLE ${table}`);
    }
  });

  it('перечислимые столбцы защищены CHECK-ограничениями', () => {
    // Допустимые значения держатся на уровне БД, а не на аккуратности
    // вызывающего кода: опечатка 'complete' вместо 'completed'
    // записалась бы молча, а фильтр по статусу её потом не нашёл бы.
    const sql = MIGRATIONS.flatMap((m) => m.statements).join(' ');

    expect(sql).toContain(
      "CHECK (status IN ('in_progress', 'completed', 'archived'))",
    );
    expect(sql).toContain("CHECK (status IN ('pending', 'attached', 'done'))");
    expect(sql).toContain(
      "application_type IN ('visa', 'residence_permit', 'pmg', 'other')",
    );
    expect(sql).toContain("quality_flag IN ('blurry', 'dark')");
  });

  it('CHECK на nullable-столбцах пропускает NULL явно', () => {
    // В SQLite CHECK со значением NULL нарушением не считается, поэтому
    // NULL прошёл бы и без этого условия. Но полагаться на такую тонкость
    // в схеме, которую будут читать люди, не стоит — пишем явно.
    const sql = MIGRATIONS.flatMap((m) => m.statements).join(' ');

    expect(sql).toContain('application_type IS NULL');
    expect(sql).toContain('quality_flag IS NULL');
  });

  it('связи объявлены с ON DELETE CASCADE', () => {
    const sql = MIGRATIONS.flatMap((m) => m.statements).join('\n');
    const references = sql.match(/REFERENCES\s+\w+\(\w+\)[^,\n]*/g) ?? [];

    expect(references.length).toBeGreaterThan(0);
    for (const reference of references) {
      expect(reference).toContain('ON DELETE');
    }
  });
});
