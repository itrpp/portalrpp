import type { Prisma } from '../generated/prisma/client';
import type { FloorDepartment } from '../generated/prisma/client';
import prisma from '../config/database';

const floorDepartmentIncludeBuilding = { building: true } as const;

export type FloorDepartmentWithBuilding = FloorDepartment & {
  building: Prisma.FloorDepartmentGetPayload<{ include: typeof floorDepartmentIncludeBuilding }>['building'];
};

export async function createFloorDepartment(
  data: Prisma.FloorDepartmentUncheckedCreateInput
): Promise<FloorDepartmentWithBuilding> {
  return prisma.floorDepartment.create({
    data,
    include: floorDepartmentIncludeBuilding
  }) as Promise<FloorDepartmentWithBuilding>;
}

export async function findFloorDepartmentById(
  id: string
): Promise<FloorDepartmentWithBuilding | null> {
  const fd = await prisma.floorDepartment.findUnique({
    where: { id },
    include: floorDepartmentIncludeBuilding
  });
  return fd as FloorDepartmentWithBuilding | null;
}

export async function findManyFloorDepartments(params: {
  where: Prisma.FloorDepartmentWhereInput;
  skip: number;
  take: number;
  orderBy: Prisma.FloorDepartmentOrderByWithRelationInput;
}): Promise<FloorDepartmentWithBuilding[]> {
  return prisma.floorDepartment.findMany({
    where: params.where,
    skip: params.skip,
    take: params.take,
    include: floorDepartmentIncludeBuilding,
    orderBy: params.orderBy
  }) as Promise<FloorDepartmentWithBuilding[]>;
}

export async function countFloorDepartments(
  where: Prisma.FloorDepartmentWhereInput
): Promise<number> {
  return prisma.floorDepartment.count({ where });
}

/** คืนค่า Map id -> name สำหรับใช้ enrich porter request */
export async function findFloorDepartmentNamesByIds(
  ids: string[]
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const list = await prisma.floorDepartment.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true }
  });
  return new Map(list.map((f) => [f.id, f.name]));
}

export async function updateFloorDepartment(
  id: string,
  data: Prisma.FloorDepartmentUpdateInput
): Promise<FloorDepartmentWithBuilding> {
  return prisma.floorDepartment.update({
    where: { id },
    data,
    include: floorDepartmentIncludeBuilding
  }) as Promise<FloorDepartmentWithBuilding>;
}

export async function deleteFloorDepartment(id: string): Promise<void> {
  await prisma.floorDepartment.delete({ where: { id } });
}
