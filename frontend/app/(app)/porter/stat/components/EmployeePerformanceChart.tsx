'use client';

import React, { useMemo } from 'react';
import { Card, CardBody, CardHeader } from '@heroui/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

import { FilterState } from './StatFilter';

import {
  formatDateRangeThai,
  formatDurationMinutes,
  getDateRangeFromFilter,
  getFiscalYearRange,
  getMonthRange,
} from '@/lib/utils';

export interface EmployeePerformanceItem {
  employeeName: string;
  firstName: string;
  lastName: string;
  assignedJobCount: number;
  averageDuration: number;
}

interface EmployeePerformanceChartProps {
  data: EmployeePerformanceItem[];
  filterState?: FilterState | null;
}

export function EmployeePerformanceChart({
  data,
  filterState,
}: EmployeePerformanceChartProps) {
  const chartData = useMemo(
    () =>
      data.map((employee) => ({
        name: `${employee.firstName} ${employee.lastName}`,
        fullName: `${employee.firstName} ${employee.lastName}`,
        assignedJobCount: employee.assignedJobCount,
        averageDuration: employee.averageDuration,
      })),
    [data],
  );

  const colors = [
    '#0088FE',
    '#00C49F',
    '#FFBB28',
    '#FF8042',
    '#8884d8',
    '#82ca9d',
    '#ffc658',
    '#ff7c7c',
    '#8dd1e1',
    '#d084d0',
    '#a4de6c',
    '#ffb347',
    '#87ceeb',
    '#dda0dd',
    '#f0e68c',
  ];

  const dateRangeSubtitle = useMemo(() => {
    if (!filterState) return '';

    if (filterState.mode === 'date-range' && filterState.dateRange) {
      const { start, end } = filterState.dateRange;

      if (start && end) {
        const startDate = new Date(start.year, start.month - 1, start.day);
        const endDate = new Date(end.year, end.month - 1, end.day);

        return formatDateRangeThai(startDate, endDate);
      }
    }

    if (filterState.mode === 'month' && filterState.month && filterState.year) {
      const { start, end } = getMonthRange(filterState.year, filterState.month);

      return formatDateRangeThai(start, end);
    }

    if (filterState.mode === 'fiscal-year' && filterState.fiscalYear) {
      const { start, end } = getFiscalYearRange(filterState.fiscalYear);

      return formatDateRangeThai(start, end);
    }

    const range = getDateRangeFromFilter(filterState);

    if (range.startDate && range.endDate) {
      return formatDateRangeThai(
        new Date(`${range.startDate}T00:00:00`),
        new Date(`${range.endDate}T00:00:00`),
      );
    }

    return '';
  }, [filterState]);

  // ให้ความสูงพอสำหรับชื่อทุกคน (Recharts จะข้าม label ถ้าแน่นเกิน)
  const chartHeight = Math.max(400, chartData.length * 28);

  return (
    <Card className="shadow-md border border-default-200 hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="pb-0">
        <div className="flex flex-col gap-4 w-full">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <div className="w-1 h-6 bg-primary rounded-full" />
              จำนวนงานรายบุคคล
            </h3>
            {dateRangeSubtitle ? (
              <p className="text-sm text-default-600 whitespace-nowrap">
                ข้อมูลจากช่วงวันที่ : {dateRangeSubtitle}
              </p>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardBody className="pt-4">
        {data.length === 0 ? (
          <div className="text-center py-8 text-default-500">
            ยังไม่มีข้อมูลประสิทธิผลรายบุคคลในช่วงวันที่ที่เลือก
          </div>
        ) : (
          <>
            <div className="mb-4">
              <h4 className="text-sm font-medium text-default-700 mb-2">
                จำนวนงานที่ได้รับมอบหมาย
              </h4>
              <ResponsiveContainer height={chartHeight} width="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 5, right: 40, left: 10, bottom: 5 }}
                  syncId="employeePerformance"
                >
                  <CartesianGrid stroke="#e0e0e0" strokeDasharray="3 3" />
                  <XAxis
                    label={{
                      value: 'จำนวนงาน',
                      position: 'insideBottom',
                      offset: -5,
                      style: { textAnchor: 'middle', fontSize: '12px' },
                    }}
                    stroke="#888"
                    style={{ fontSize: '12px' }}
                    type="number"
                  />
                  <YAxis
                    dataKey="name"
                    interval={0}
                    stroke="#888"
                    style={{ fontSize: '11px' }}
                    type="category"
                    width={140}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const row = payload[0].payload;

                        return (
                          <div
                            style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              border: '1px solid #e0e0e0',
                              borderRadius: '8px',
                              padding: '12px',
                            }}
                          >
                            <p
                              style={{
                                fontWeight: 'bold',
                                fontSize: '12px',
                                marginBottom: '8px',
                              }}
                            >
                              {row.fullName}
                            </p>
                            <div>
                              <span style={{ fontWeight: '600', fontSize: '12px' }}>
                                จำนวนงานที่ได้รับมอบหมาย:{' '}
                              </span>
                              <span style={{ fontWeight: '600', fontSize: '12px' }}>
                                {row.assignedJobCount.toLocaleString('th-TH')}
                              </span>
                            </div>
                          </div>
                        );
                      }

                      return null;
                    }}
                  />
                  <Bar
                    dataKey="assignedJobCount"
                    label={{ position: 'right', style: { fontSize: '10px' } }}
                    name="จำนวนงานที่ได้รับมอบหมาย"
                    radius={[0, 4, 4, 0]}
                  >
                    {chartData.map((_, index) => (
                      <Cell key={`cell-count-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h4 className="text-sm font-medium text-default-700 mb-2">เวลาเฉลี่ยในการทำงาน</h4>
              <ResponsiveContainer height={chartHeight} width="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 5, right: 40, left: 10, bottom: 5 }}
                  syncId="employeePerformance"
                >
                  <CartesianGrid stroke="#e0e0e0" strokeDasharray="3 3" />
                  <XAxis
                    label={{
                      value: 'เวลาเฉลี่ย (นาที)',
                      position: 'insideBottom',
                      offset: -5,
                      style: { textAnchor: 'middle', fontSize: '12px' },
                    }}
                    stroke="#888"
                    style={{ fontSize: '12px' }}
                    type="number"
                  />
                  <YAxis
                    dataKey="name"
                    interval={0}
                    stroke="#888"
                    style={{ fontSize: '11px' }}
                    type="category"
                    width={140}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const row = payload[0].payload;

                        return (
                          <div
                            style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              border: '1px solid #e0e0e0',
                              borderRadius: '8px',
                              padding: '12px',
                            }}
                          >
                            <p
                              style={{
                                fontWeight: 'bold',
                                fontSize: '12px',
                                marginBottom: '8px',
                              }}
                            >
                              {row.fullName}
                            </p>
                            <div>
                              <span style={{ fontWeight: '600', fontSize: '12px' }}>
                                ระยะเวลาเฉลี่ย:{' '}
                              </span>
                              <span style={{ fontWeight: '600', fontSize: '12px' }}>
                                {formatDurationMinutes(row.averageDuration)}
                              </span>
                            </div>
                          </div>
                        );
                      }

                      return null;
                    }}
                  />
                  <Bar
                    dataKey="averageDuration"
                    label={{ position: 'right', style: { fontSize: '10px' } }}
                    name="เวลาเฉลี่ย"
                    radius={[0, 4, 4, 0]}
                  >
                    {chartData.map((_, index) => (
                      <Cell
                        key={`cell-duration-${index}`}
                        fill={colors[index % colors.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="text-center mt-4 text-sm text-default-600">
              เจ้าหน้าที่ทั้งหมด {data.length} คน
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}
