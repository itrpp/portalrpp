import type { Prisma } from '@shared/prisma/client';
import type { Department } from '@shared/prisma/client';

import prisma from '../config/database';

const floorDepartmentIncludeBuilding = { building: true } as const;

export type FloorDepartmentWithBuilding = Department & {
  building: Prisma.DepartmentGetPayload<{
    include: typeof floorDepartmentIncludeBuilding;
  }>['building'];
};

export async function createFloorDepartment(
  data: Prisma.DepartmentUncheckedCreateInput,
): Promise<FloorDepartmentWithBuilding> {
  return prisma.department.create({
    data,
    include: floorDepartmentIncludeBuilding,
  }) as Promise<FloorDepartmentWithBuilding>;
}

export async function findFloorDepartmentById(
  id: string,
): Promise<FloorDepartmentWithBuilding | null> {
  const fd = await prisma.department.findUnique({
    where: { id },
    include: floorDepartmentIncludeBuilding,
  });
  return fd as FloorDepartmentWithBuilding | null;
}

export async function findManyFloorDepartments(params: {
  where: Prisma.DepartmentWhereInput;
  skip: number;
  take: number;
  orderBy: Prisma.DepartmentOrderByWithRelationInput;
}): Promise<FloorDepartmentWithBuilding[]> {
  return prisma.department.findMany({
    where: params.where,
    skip: params.skip,
    take: params.take,
    include: floorDepartmentIncludeBuilding,
    orderBy: params.orderBy,
  }) as Promise<FloorDepartmentWithBuilding[]>;
}

export async function countFloorDepartments(
  where: Prisma.DepartmentWhereInput,
): Promise<number> {
  return prisma.department.count({ where });
}

/** คืนค่า Map id -> name สำหรับใช้ enrich porter request */
export async function findFloorDepartmentNamesByIds(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const list = await prisma.department.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  });
  return new Map(list.map((f: { id: string; name: string }) => [f.id, f.name]));
}

export async function updateFloorDepartment(
  id: string,
  data: Prisma.DepartmentUpdateInput,
): Promise<FloorDepartmentWithBuilding> {
  return prisma.department.update({
    where: { id },
    data,
    include: floorDepartmentIncludeBuilding,
  }) as Promise<FloorDepartmentWithBuilding>;
}

export async function deleteFloorDepartment(id: string): Promise<void> {
  await prisma.department.delete({ where: { id } });
}
