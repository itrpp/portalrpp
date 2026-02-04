import type { Prisma } from '../generated/prisma/client';
import type { PorterRequest } from '../generated/prisma/client';
import prisma from '../config/database';

export async function createPorterRequest(
  data: Prisma.PorterRequestUncheckedCreateInput
): Promise<PorterRequest> {
  return prisma.porterRequest.create({ data });
}

export async function findPorterRequestById(id: string): Promise<PorterRequest | null> {
  return prisma.porterRequest.findUnique({ where: { id } });
}

export async function findManyPorterRequests(params: {
  where: Prisma.PorterRequestWhereInput;
  skip: number;
  take: number;
  orderBy: Prisma.PorterRequestOrderByWithRelationInput;
}): Promise<PorterRequest[]> {
  return prisma.porterRequest.findMany({
    where: params.where,
    skip: params.skip,
    take: params.take,
    orderBy: params.orderBy
  });
}

export async function countPorterRequests(where: Prisma.PorterRequestWhereInput): Promise<number> {
  return prisma.porterRequest.count({ where });
}

export async function updatePorterRequest(
  id: string,
  data: Prisma.PorterRequestUpdateInput
): Promise<PorterRequest> {
  return prisma.porterRequest.update({ where: { id }, data });
}

export async function deletePorterRequest(id: string): Promise<void> {
  await prisma.porterRequest.delete({ where: { id } });
}
