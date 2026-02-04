import type { Prisma } from '../generated/prisma/client';
import type { FloorPlan, BleStation } from '../generated/prisma/client';
import prisma from '../config/database';

const floorPlanIncludeStations = { stations: true } as const;

export type FloorPlanWithStations = FloorPlan & {
  stations: BleStation[];
};

export async function findFloorPlanById(
  id: string
): Promise<FloorPlanWithStations | null> {
  const fp = await prisma.floorPlan.findUnique({
    where: { id },
    include: floorPlanIncludeStations
  });
  return fp as FloorPlanWithStations | null;
}

export async function findFloorPlanByBuildingIdAndFloorNumber(
  buildingId: string,
  floorNumber: number
): Promise<FloorPlan | null> {
  return prisma.floorPlan.findUnique({
    where: {
      buildingId_floorNumber: { buildingId, floorNumber }
    }
  });
}

export async function findManyFloorPlans(params: {
  where: Prisma.FloorPlanWhereInput;
  skip: number;
  take: number;
  orderBy: Prisma.FloorPlanOrderByWithRelationInput[];
}): Promise<FloorPlanWithStations[]> {
  return prisma.floorPlan.findMany({
    where: params.where,
    skip: params.skip,
    take: params.take,
    include: floorPlanIncludeStations,
    orderBy: params.orderBy
  }) as Promise<FloorPlanWithStations[]>;
}

export async function countFloorPlans(
  where: Prisma.FloorPlanWhereInput
): Promise<number> {
  return prisma.floorPlan.count({ where });
}

export async function createFloorPlan(
  data: Prisma.FloorPlanUncheckedCreateInput
): Promise<FloorPlanWithStations> {
  return prisma.floorPlan.create({
    data,
    include: floorPlanIncludeStations
  }) as Promise<FloorPlanWithStations>;
}

export async function updateFloorPlan(
  id: string,
  data: Prisma.FloorPlanUncheckedUpdateInput
): Promise<FloorPlanWithStations> {
  return prisma.floorPlan.update({
    where: { id },
    data,
    include: floorPlanIncludeStations
  }) as Promise<FloorPlanWithStations>;
}

export async function deleteFloorPlan(id: string): Promise<void> {
  await prisma.floorPlan.delete({ where: { id } });
}

/** ใช้ใน updateBuilding สำหรับจัดการ floor plans */
export async function findManyFloorPlanIdsByBuildingId(
  buildingId: string
): Promise<Array<{ id: string; floorNumber: number }>> {
  return prisma.floorPlan.findMany({
    where: { buildingId },
    select: { id: true, floorNumber: true }
  });
}

export async function deleteManyFloorPlansByIds(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await prisma.floorPlan.deleteMany({ where: { id: { in: ids } } });
}

export async function deleteManyFloorPlansByBuildingId(
  buildingId: string
): Promise<void> {
  await prisma.floorPlan.deleteMany({ where: { buildingId } });
}

export async function upsertFloorPlan(params: {
  where: { buildingId: string; floorNumber: number };
  create: Prisma.FloorPlanUncheckedCreateInput;
  update: Prisma.FloorPlanUncheckedUpdateInput;
}): Promise<FloorPlan> {
  return prisma.floorPlan.upsert({
    where: {
      buildingId_floorNumber: params.where
    },
    create: params.create,
    update: params.update
  });
}
