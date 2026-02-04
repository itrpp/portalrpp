import type { Prisma } from '../generated/prisma/client';
import type { BleStation } from '../generated/prisma/client';
import prisma from '../config/database';

export async function createBleStation(
  data: Prisma.BleStationUncheckedCreateInput
): Promise<BleStation> {
  return prisma.bleStation.create({ data });
}

export async function findBleStationById(id: string): Promise<BleStation | null> {
  return prisma.bleStation.findUnique({ where: { id } });
}

export async function findBleStationByMacAddress(
  macAddress: string
): Promise<BleStation | null> {
  return prisma.bleStation.findUnique({ where: { macAddress } });
}

export async function findManyBleStations(params: {
  where: Prisma.BleStationWhereInput;
  skip: number;
  take: number;
  orderBy: Prisma.BleStationOrderByWithRelationInput;
}): Promise<BleStation[]> {
  return prisma.bleStation.findMany({
    where: params.where,
    skip: params.skip,
    take: params.take,
    orderBy: params.orderBy
  });
}

export async function countBleStations(
  where: Prisma.BleStationWhereInput
): Promise<number> {
  return prisma.bleStation.count({ where });
}

export async function updateBleStation(
  id: string,
  data: Prisma.BleStationUpdateInput
): Promise<BleStation> {
  return prisma.bleStation.update({ where: { id }, data });
}

export async function deleteBleStation(id: string): Promise<void> {
  await prisma.bleStation.delete({ where: { id } });
}
