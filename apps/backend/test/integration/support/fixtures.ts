import { randomUUID } from 'node:crypto';
import type { OrgRole } from '@prisma/client';
import type { PrismaService } from '../../../src/database/prisma.service';

export interface Member {
  id: string;
  name: string;
}

export interface OrganizationFixture {
  organizationId: string;
  projectId: string;
  owner: Member;
  manager: Member;
  engineer: Member;
}

/**
 * Every test file builds its own organization with unique names, so files never see each other's data
 * and the database needs no cleanup between runs.
 */
export async function createOrganization(prisma: PrismaService, label: string): Promise<OrganizationFixture> {
  const suffix = randomUUID().slice(0, 8);
  const organization = await prisma.organization.create({
    data: { name: `${label} ${suffix}`, slug: `${label.toLowerCase().replace(/\W+/g, '-')}-${suffix}`, timezone: 'Asia/Kolkata' },
  });

  const addMember = async (name: string, role: OrgRole): Promise<Member> => {
    const user = await prisma.user.create({
      data: {
        name,
        email: `${name.toLowerCase().replace(/\W+/g, '.')}.${suffix}@integration.test`,
        password: 'not-a-real-hash',
        organizations: { create: { organizationId: organization.id, role } },
      },
    });
    return { id: user.id, name: user.name };
  };

  const owner = await addMember('Olivia Owner', 'OWNER');
  const manager = await addMember('Manoj Manager', 'PROJECT_MANAGER');
  const engineer = await addMember('Esha Engineer', 'SITE_ENGINEER');
  const projectId = await createProject(prisma, organization.id, owner.id, 'Ring Road');

  return { organizationId: organization.id, projectId, owner, manager, engineer };
}

export async function createProject(prisma: PrismaService, organizationId: string, createdById: string, name: string): Promise<string> {
  const project = await prisma.project.create({
    data: { name, code: `PRJ-${randomUUID().slice(0, 6)}`, organizationId, createdById, status: 'ACTIVE' },
  });
  return project.id;
}

export async function archiveProject(prisma: PrismaService, projectId: string): Promise<void> {
  await prisma.project.update({ where: { id: projectId }, data: { status: 'ARCHIVED' } });
}

export async function createWorker(
  prisma: PrismaService,
  organizationId: string,
  name: string,
  options: { projectId?: string; deactivated?: boolean } = {},
): Promise<string> {
  const worker = await prisma.worker.create({
    data: {
      name,
      initials: name.split(' ').map((part) => part[0]).join(''),
      role: 'Mason',
      trade: 'Masonry',
      organizationId,
      projectId: options.projectId,
      deactivatedAt: options.deactivated ? new Date() : null,
    },
  });
  return worker.id;
}

export async function createMaterial(prisma: PrismaService, organizationId: string, name: string, unitCost = 400): Promise<string> {
  const material = await prisma.material.create({
    data: { name, sku: `SKU-${randomUUID().slice(0, 8)}`, unit: 'bag', unitCost, organizationId },
  });
  return material.id;
}

/** A store holding `quantity` of the material (nothing reserved unless given). */
export async function createStoreWithStock(
  prisma: PrismaService,
  organizationId: string,
  name: string,
  stock: { materialId: string; quantity: number; reserved?: number }[] = [],
): Promise<string> {
  const warehouse = await prisma.warehouse.create({
    data: { name, code: `WH-${randomUUID().slice(0, 6)}`, organizationId },
  });
  for (const line of stock) {
    await prisma.inventoryItem.create({
      data: { materialId: line.materialId, warehouseId: warehouse.id, organizationId, quantity: line.quantity, reserved: line.reserved ?? 0 },
    });
  }
  return warehouse.id;
}

export async function stockAt(prisma: PrismaService, warehouseId: string, materialId: string): Promise<number> {
  const item = await prisma.inventoryItem.findUnique({ where: { materialId_warehouseId: { materialId, warehouseId } } });
  return item ? Number(item.quantity) : 0;
}

export async function createVendor(prisma: PrismaService, organizationId: string, name: string): Promise<string> {
  const vendor = await prisma.vendor.create({ data: { name, code: `V-${randomUUID().slice(0, 6)}`, organizationId } });
  return vendor.id;
}

/** Runs the calls at the same time and reports which succeeded, so races can be asserted on. */
export async function settleTogether<T>(calls: (() => Promise<T>)[]): Promise<{ fulfilled: T[]; rejected: unknown[] }> {
  const results = await Promise.allSettled(calls.map((call) => call()));
  return {
    fulfilled: results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : [])),
    rejected: results.flatMap((result) => (result.status === 'rejected' ? [result.reason] : [])),
  };
}
