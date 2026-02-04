import type { Prisma } from '../generated/prisma/client';
import type { PorterEmployee } from '../generated/prisma/client';
import prisma from '../config/database';

export async function createPorterEmployee(
  data: Prisma.PorterEmployeeUncheckedCreateInput
): Promise<PorterEmployee> {
  return prisma.porterEmployee.create({ data });
}

export async function findPorterEmployeeById(id: string): Promise<PorterEmployee | null> {
  return prisma.porterEmployee.findUnique({ where: { id } });
}

export async function findManyPorterEmployees(params: {
  where: Prisma.PorterEmployeeWhereInput;
  skip?: number;
  take?: number;
  orderBy: Prisma.PorterEmployeeOrderByWithRelationInput;
}): Promise<PorterEmployee[]> {
  const { where, orderBy, skip, take } = params;
  const query: Parameters<typeof prisma.porterEmployee.findMany>[0] = {
    where,
    orderBy
  };
  if (skip !== undefined) query.skip = skip;
  if (take !== undefined) query.take = take;
  return prisma.porterEmployee.findMany(query);
}

export async function countPorterEmployees(
  where: Prisma.PorterEmployeeWhereInput
): Promise<number> {
  return prisma.porterEmployee.count({ where });
}

/** คืนค่า Map id -> fullName (firstName + lastName) สำหรับใช้ enrich porter request */
export async function findPorterEmployeeNamesByIds(
  ids: string[]
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const list = await prisma.porterEmployee.findMany({
    where: { id: { in: ids } },
    select: { id: true, firstName: true, lastName: true }
  });
  return new Map(
    list.map((e) => [e.id, `${e.firstName} ${e.lastName}`])
  );
}

/** ใช้ตรวจสอบว่า user นี้ถูกผูกกับ employee อื่นแล้วหรือไม่ (excludeId = employee ปัจจุบันที่กำลังอัปเดต) */
export async function findFirstPorterEmployeeIdByUserId(
  userId: string,
  excludeId?: string
): Promise<{ id: string } | null> {
  return prisma.porterEmployee.findFirst({
    where: { userId, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true }
  });
}

export async function updatePorterEmployee(
  id: string,
  data: Prisma.PorterEmployeeUncheckedUpdateInput
): Promise<PorterEmployee> {
  return prisma.porterEmployee.update({ where: { id }, data });
}

export async function deletePorterEmployee(id: string): Promise<void> {
  await prisma.porterEmployee.delete({ where: { id } });
}
