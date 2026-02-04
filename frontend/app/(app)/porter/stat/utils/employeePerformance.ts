import type { PorterJobItem } from "@/types/porter";

import { getISODatePart, parseFullName } from "@/lib/utils";

export interface EmployeePerformanceResult {
  employeeName: string;
  firstName: string;
  lastName: string;
  assignedJobCount: number;
  averageDuration: number; // ในหน่วยนาที
}

/**
 * คำนวณประสิทธิผลรายบุคคลจาก jobs (filter ตาม date range, aggregate ตามคน)
 */
export function calculateEmployeePerformance(
  jobs: PorterJobItem[],
  startDate?: string,
  endDate?: string,
): EmployeePerformanceResult[] {
  const employeeMap = new Map<
    string,
    {
      firstName: string;
      lastName: string;
      jobs: Array<{
        acceptedAt?: string;
        completedAt?: string;
      }>;
    }
  >();

  const filteredJobs: Array<{
    job: PorterJobItem;
    acceptedDateStr: string;
  }> = [];

  for (const job of jobs) {
    if (!job.assignedToName || !job.acceptedAt) continue;
    const acceptedDateStr = getISODatePart(job.acceptedAt);

    if (startDate && acceptedDateStr < startDate) continue;
    if (endDate && acceptedDateStr > endDate) continue;
    filteredJobs.push({ job, acceptedDateStr });
  }

  for (const { job } of filteredJobs) {
    const employeeName = job.assignedToName!;

    if (!employeeMap.has(employeeName)) {
      const { firstName, lastName } = parseFullName(employeeName);

      employeeMap.set(employeeName, { firstName, lastName, jobs: [] });
    }
    const employee = employeeMap.get(employeeName)!;

    employee.jobs.push({
      acceptedAt: job.acceptedAt,
      completedAt: job.completedAt,
    });
  }

  const result: EmployeePerformanceResult[] = [];

  for (const [employeeName, data] of employeeMap.entries()) {
    const assignedJobCount = data.jobs.length;
    let totalDuration = 0;
    let completedCount = 0;

    for (const job of data.jobs) {
      if (job.acceptedAt && job.completedAt) {
        const acceptedTime = new Date(job.acceptedAt).getTime();
        const completedTime = new Date(job.completedAt).getTime();

        totalDuration += (completedTime - acceptedTime) / (1000 * 60);
        completedCount++;
      }
    }

    const averageDuration =
      completedCount > 0
        ? Math.round((totalDuration / completedCount) * 100) / 100
        : 0;

    result.push({
      employeeName,
      firstName: data.firstName,
      lastName: data.lastName,
      assignedJobCount,
      averageDuration,
    });
  }

  result.sort((a, b) => b.assignedJobCount - a.assignedJobCount);

  return result;
}
