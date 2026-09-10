import prisma from '../config/database';
import * as buildingRepo from '../repositories/building.repository';
import * as floorDepartmentRepo from '../repositories/floorDepartment.repository';
import * as porterEmployeeRepo from '../repositories/porterEmployee.repository';
import { InvalidArgumentError } from '../utils/grpcError';

export interface GetPorterRequestStatsInput {
  created_after?: string;
  created_before?: string;
}

export interface PorterRequestStatsResult {
  total_jobs: number;
  waiting_jobs: number;
  in_progress_jobs: number;
  completed_jobs: number;
  cancelled_jobs: number;
  daily_jobs: Array<{
    date: string;
    normal: number;
    rush: number;
    emergency: number;
    total: number;
  }>;
  transport_reasons: Array<{ label: string; count: number }>;
  popular_pickup_locations: Array<{ label: string; count: number }>;
  popular_delivery_locations: Array<{ label: string; count: number }>;
  employee_performance: Array<{
    employee_id: string;
    employee_name: string;
    first_name: string;
    last_name: string;
    assigned_job_count: number;
    average_duration: number;
  }>;
  heatmap_cells: Array<{ day_of_week: number; hour: number; count: number }>;
}

function parseCreatedAtBound(raw: string, endOfDay: boolean): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
  const value = dateOnly
    ? new Date(`${trimmed}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`)
    : new Date(trimmed);

  return Number.isNaN(value.getTime()) ? null : value;
}

/** YYYY-MM-DD ตามปฏิทิน local (ไม่ใช้ toISOString — จะเลื่อนวันใน UTC+7) */
function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');

  return `${y}-${m}-${d}`;
}

function eachDateInRange(start: Date, end: Date): string[] {
  const dates: string[] = [];
  const cursor = new Date(start);

  cursor.setHours(0, 0, 0, 0);
  const endDay = new Date(end);

  endDay.setHours(0, 0, 0, 0);

  while (cursor.getTime() <= endDay.getTime()) {
    dates.push(toLocalDateString(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

function splitEmployeeName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };

  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function formatLocationLabel(
  buildingId: string,
  floorId: string,
  buildingMap: Map<string, string>,
  floorMap: Map<string, string>,
): string {
  const parts = [buildingMap.get(buildingId), floorMap.get(floorId)].filter(Boolean);

  return parts.join(' - ') || `${buildingId}/${floorId}`;
}

/**
 * สรุปสถิติ PorterRequest
 * - KPI (total/waiting/...) = COUNT ทั้งฐาน ผ่าน groupBy status (ไม่ดึงแถว)
 * - กราฟ/heatmap/location/employee = aggregate ตาม created_after/before
 */
export async function getPorterRequestStats(
  input: GetPorterRequestStatsInput,
): Promise<PorterRequestStatsResult> {
  const after = input.created_after ? parseCreatedAtBound(input.created_after, false) : null;
  const before = input.created_before ? parseCreatedAtBound(input.created_before, true) : null;

  if (!after || !before) {
    throw new InvalidArgumentError('created_after and created_before are required');
  }
  if (after.getTime() > before.getTime()) {
    throw new InvalidArgumentError('created_after must be <= created_before');
  }

  type DailyRow = { d: Date | string; urgencyLevel: string; c: bigint | number };
  type ReasonRow = { transportReason: string; c: bigint | number };
  type LocRow = {
    buildingId: string;
    floorId: string;
    c: bigint | number;
  };
  type EmpRow = {
    assignedToId: string;
    cnt: bigint | number;
    avg_min: number | null;
  };
  type HeatRow = { dow: number; hr: number; c: bigint | number };

  const [
    statusGroups,
    dailyRows,
    reasonRows,
    pickupRows,
    deliveryRows,
    empRows,
    heatRows,
  ] = await Promise.all([
    // KPI ทั้งระบบ — SQL COUNT/GROUP BY ไม่มี WHERE วันที่ (ไม่ SELECT *)
    prisma.porterRequest.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.$queryRaw<DailyRow[]>`
      SELECT DATE_FORMAT(createdAt, '%Y-%m-%d') AS d, urgencyLevel, COUNT(*) AS c
      FROM PorterRequest
      WHERE createdAt >= ${after} AND createdAt <= ${before}
      GROUP BY DATE_FORMAT(createdAt, '%Y-%m-%d'), urgencyLevel
    `,
    prisma.$queryRaw<ReasonRow[]>`
      SELECT transportReason, COUNT(*) AS c
      FROM PorterRequest
      WHERE createdAt >= ${after} AND createdAt <= ${before}
        AND transportReason IS NOT NULL AND transportReason <> ''
      GROUP BY transportReason
      ORDER BY c DESC
      LIMIT 5
    `,
    prisma.$queryRaw<LocRow[]>`
      SELECT pickupBuildingId AS buildingId, pickupFloorDepartmentId AS floorId, COUNT(*) AS c
      FROM PorterRequest
      WHERE createdAt >= ${after} AND createdAt <= ${before}
      GROUP BY pickupBuildingId, pickupFloorDepartmentId
      ORDER BY c DESC
      LIMIT 10
    `,
    prisma.$queryRaw<LocRow[]>`
      SELECT deliveryBuildingId AS buildingId, deliveryFloorDepartmentId AS floorId, COUNT(*) AS c
      FROM PorterRequest
      WHERE createdAt >= ${after} AND createdAt <= ${before}
      GROUP BY deliveryBuildingId, deliveryFloorDepartmentId
      ORDER BY c DESC
      LIMIT 10
    `,
    prisma.$queryRaw<EmpRow[]>`
      SELECT
        assignedToId,
        COUNT(*) AS cnt,
        AVG(
          CASE
            WHEN completedAt IS NOT NULL
              AND COALESCE(assignedAt, acceptedAt) IS NOT NULL
            THEN TIMESTAMPDIFF(MINUTE, COALESCE(assignedAt, acceptedAt), completedAt)
            ELSE NULL
          END
        ) AS avg_min
      FROM PorterRequest
      WHERE createdAt >= ${after} AND createdAt <= ${before}
        AND assignedToId IS NOT NULL
        AND assignedToId <> ''
      GROUP BY assignedToId
      ORDER BY cnt DESC
    `,
    prisma.$queryRaw<HeatRow[]>`
      SELECT (DAYOFWEEK(createdAt) - 1) AS dow, HOUR(createdAt) AS hr, COUNT(*) AS c
      FROM PorterRequest
      WHERE createdAt >= ${after} AND createdAt <= ${before}
      GROUP BY dow, hr
    `,
  ]);

  let waiting_jobs = 0;
  let in_progress_jobs = 0;
  let completed_jobs = 0;
  let cancelled_jobs = 0;
  let total_jobs = 0;

  for (const row of statusGroups) {
    const count = row._count._all;
    total_jobs += count;
    if (row.status === 'WAITING_CENTER') waiting_jobs += count;
    else if (row.status === 'WAITING_ACCEPT' || row.status === 'IN_PROGRESS')
      in_progress_jobs += count;
    else if (row.status === 'COMPLETED') completed_jobs += count;
    else if (row.status === 'CANCELLED') cancelled_jobs += count;
  }

  const dailyMap = new Map<string, { normal: number; rush: number; emergency: number }>();

  for (const date of eachDateInRange(after, before)) {
    dailyMap.set(date, { normal: 0, rush: 0, emergency: 0 });
  }

  for (const row of dailyRows) {
    const dateStr =
      row.d instanceof Date ? toLocalDateString(row.d) : String(row.d).slice(0, 10);
    const bucket = dailyMap.get(dateStr) ?? { normal: 0, rush: 0, emergency: 0 };
    const count = Number(row.c);
    const urgency = (row.urgencyLevel || 'NORMAL').toUpperCase();

    if (urgency === 'RUSH') bucket.rush += count;
    else if (urgency === 'EMERGENCY') bucket.emergency += count;
    else bucket.normal += count;

    dailyMap.set(dateStr, bucket);
  }

  const daily_jobs = Array.from(dailyMap.entries())
    .map(([date, counts]) => ({
      date,
      normal: counts.normal,
      rush: counts.rush,
      emergency: counts.emergency,
      total: counts.normal + counts.rush + counts.emergency,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const transport_reasons = reasonRows.map((row) => ({
    label: row.transportReason,
    count: Number(row.c),
  }));

  const buildingIds = new Set<string>();
  const floorIds = new Set<string>();

  for (const row of [...pickupRows, ...deliveryRows]) {
    if (row.buildingId) buildingIds.add(row.buildingId);
    if (row.floorId) floorIds.add(row.floorId);
  }

  const employeeIds = empRows.map((r) => r.assignedToId).filter(Boolean);

  const [buildingMap, floorMap, employeeMap] = await Promise.all([
    buildingRepo.findBuildingNamesByIds(Array.from(buildingIds)),
    floorDepartmentRepo.findFloorDepartmentNamesByIds(Array.from(floorIds)),
    porterEmployeeRepo.findPorterEmployeeNamesByIds(employeeIds),
  ]);

  const popular_pickup_locations = pickupRows.map((row) => ({
    label: formatLocationLabel(row.buildingId, row.floorId, buildingMap, floorMap),
    count: Number(row.c),
  }));

  const popular_delivery_locations = deliveryRows.map((row) => ({
    label: formatLocationLabel(row.buildingId, row.floorId, buildingMap, floorMap),
    count: Number(row.c),
  }));

  const employee_performance = empRows.map((row) => {
    const name = employeeMap.get(row.assignedToId) || row.assignedToId;
    const { firstName, lastName } = splitEmployeeName(name);
    const avg = row.avg_min == null ? 0 : Number(row.avg_min);

    return {
      employee_id: row.assignedToId,
      employee_name: name,
      first_name: firstName,
      last_name: lastName,
      assigned_job_count: Number(row.cnt),
      average_duration: Math.round(avg * 100) / 100,
    };
  });

  const heatmap_cells = heatRows.map((row) => ({
    day_of_week: Number(row.dow),
    hour: Number(row.hr),
    count: Number(row.c),
  }));

  return {
    total_jobs,
    waiting_jobs,
    in_progress_jobs,
    completed_jobs,
    cancelled_jobs,
    daily_jobs,
    transport_reasons,
    popular_pickup_locations,
    popular_delivery_locations,
    employee_performance,
    heatmap_cells,
  };
}
