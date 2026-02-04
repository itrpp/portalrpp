import type { Prisma } from '../generated/prisma/client';
import type { Building } from '../generated/prisma/client';
import prisma from '../config/database';

const buildingIncludeWithFloorsAndFloorPlans = {
  floors: true,
  floorPlans: {
    include: {
      stations: true
    }
  }
} as const;

export type BuildingWithFloorsAndFloorPlans = Building & {
  floors: Prisma.BuildingGetPayload<{ include: typeof buildingIncludeWithFloorsAndFloorPlans }>['floors'];
  floorPlans: Prisma.BuildingGetPayload<{ include: typeof buildingIncludeWithFloorsAndFloorPlans }>['floorPlans'];
};

export async function createBuilding(
  data: Prisma.BuildingUncheckedCreateInput
): Promise<BuildingWithFloorsAndFloorPlans> {
  return prisma.building.create({
    data,
    include: buildingIncludeWithFloorsAndFloorPlans
  }) as Promise<BuildingWithFloorsAndFloorPlans>;
}

export async function findBuildingById(
  id: string
): Promise<BuildingWithFloorsAndFloorPlans | null> {
  const building = await prisma.building.findUnique({
    where: { id },
    include: buildingIncludeWithFloorsAndFloorPlans
  });
  return building as BuildingWithFloorsAndFloorPlans | null;
}

export async function findBuildingsList(params: {
  skip: number;
  take: number;
  orderBy: Prisma.BuildingOrderByWithRelationInput;
}): Promise<Array<Building & { floors: unknown[]; floorPlans: never[] }>> {
  const buildings = await prisma.building.findMany({
    skip: params.skip,
    take: params.take,
    select: {
      id: true,
      name: true,
      floorCount: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      floors: true
    },
    orderBy: params.orderBy
  });
  return buildings.map((b) => ({ ...b, floorPlans: [] })) as Array<
    Building & { floors: unknown[]; floorPlans: never[] }
  >;
}

export async function countBuildings(): Promise<number> {
  return prisma.building.count();
}

/** คืนค่า Map id -> name สำหรับใช้ enrich porter request */
export async function findBuildingNamesByIds(
  ids: string[]
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const list = await prisma.building.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true }
  });
  return new Map(list.map((b) => [b.id, b.name]));
}

export async function updateBuilding(
  id: string,
  data: Prisma.BuildingUpdateInput
): Promise<BuildingWithFloorsAndFloorPlans> {
  return prisma.building.update({
    where: { id },
    data,
    include: buildingIncludeWithFloorsAndFloorPlans
  }) as Promise<BuildingWithFloorsAndFloorPlans>;
}

export async function deleteBuilding(id: string): Promise<void> {
  await prisma.building.delete({ where: { id } });
}
