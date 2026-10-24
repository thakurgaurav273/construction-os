import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ConflictException, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { assertProjectOpen, findOpenProject, findProjectInOrganization } from '../src/modules/projects/project-guards';

function fakeDb(project: { id: string; name: string; status: string } | null): Pick<Prisma.TransactionClient, 'project'> {
  const findFirst = async (args: { where: { organizationId: string } }): Promise<typeof project> => (args.where.organizationId === 'org-1' ? project : null);
  return { project: { findFirst } } as unknown as Pick<Prisma.TransactionClient, 'project'>;
}

describe('project guards', () => {
  const active = { id: 'p1', name: 'Ring Road', status: 'ACTIVE' };
  const archived = { ...active, status: 'ARCHIVED' };

  it('lets open projects take new work', async () => {
    assert.doesNotThrow(() => assertProjectOpen({ status: 'ON_HOLD' }, 'order for it'));
    assert.equal((await findOpenProject(fakeDb(active), 'p1', 'org-1', 'order for it')).name, 'Ring Road');
  });

  it('refuses new work on archived projects with what to do next', async () => {
    await assert.rejects(findOpenProject(fakeDb(archived), 'p1', 'org-1', 'order for it'), (error: unknown) => (
      error instanceof ConflictException && /archived, so you can't order for it\. Restore it/.test(error.message)
    ));
  });

  it('still reads archived projects, but never another organization’s', async () => {
    assert.equal((await findProjectInOrganization(fakeDb(archived), 'p1', 'org-1')).status, 'ARCHIVED');
    await assert.rejects(findProjectInOrganization(fakeDb(active), 'p1', 'org-2'), NotFoundException);
  });
});
