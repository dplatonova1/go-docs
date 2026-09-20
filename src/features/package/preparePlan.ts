/**
 * План сборки по заявке: читает пункты с документами и считает, что
 * войдёт в пакет.
 *
 * Отдельно от `buildPackage`, потому что нужен раньше: по плану экран
 * показывает «прикреплено N из M» и проверяет место на устройстве.
 */

import type { ApplicationId } from '../checklist/model';
import { listPackageEntries } from '../checklist/repository';
import { planPackage } from './plan';
import type { PackagePlan } from './types';

export async function preparePackagePlan(
  applicationId: ApplicationId,
): Promise<PackagePlan> {
  return planPackage(await listPackageEntries(applicationId));
}
