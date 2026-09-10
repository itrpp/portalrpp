'use client';

import React, { useMemo } from 'react';
import { Card, CardBody, CardHeader } from '@heroui/react';

import type { PorterStatsHeatmapCell } from '../hooks/usePorterStats';

interface TimeHeatmapProps {
  cells: PorterStatsHeatmapCell[];
}

const DAYS_OF_WEEK = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

function getColorForValue(value: number, maxValue: number): string {
  if (maxValue === 0) return '#f5f5f5';

  const intensity = value / maxValue;

  if (intensity === 0) return '#f5f5f5';
  if (intensity < 0.2) return '#e3f2fd';
  if (intensity < 0.4) return '#bbdefb';
  if (intensity < 0.6) return '#90caf9';
  if (intensity < 0.8) return '#64b5f6';
  if (intensity < 0.95) return '#42a5f5';

  return '#1976d2';
}

export function TimeHeatmap({ cells }: TimeHeatmapProps) {
  const heatmapData = useMemo(() => {
    const cellMap = new Map<string, number>();
    let maxValue = 0;

    for (const cell of cells) {
      const key = `${cell.dayOfWeek}-${cell.hour}`;

      cellMap.set(key, cell.count);
      maxValue = Math.max(maxValue, cell.count);
    }

    const fullCells: PorterStatsHeatmapCell[] = [];

    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const key = `${day}-${hour}`;

        fullCells.push({
          dayOfWeek: day,
          hour,
          count: cellMap.get(key) || 0,
        });
      }
    }

    return { cells: fullCells, maxValue };
  }, [cells]);

  const cellLookupMap = useMemo(() => {
    const map = new Map<string, PorterStatsHeatmapCell>();

    for (const cell of heatmapData.cells) {
      map.set(`${cell.dayOfWeek}-${cell.hour}`, cell);
    }

    return map;
  }, [heatmapData.cells]);

  return (
    <Card className="shadow-md border border-default-200 hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between pr-2 gap-4 w-full flex-wrap">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <div className="w-1 h-6 bg-primary rounded-full" />
            แผนที่ความร้อนตามเวลา
          </h3>
          {heatmapData.maxValue > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-default-600 whitespace-nowrap">น้อย</span>
              <div className="flex h-4 w-48 rounded overflow-hidden border border-default-200">
                {[0, 0.2, 0.4, 0.6, 0.8, 0.95, 1].map((intensity, idx) => (
                  <div
                    key={idx}
                    className="flex-1"
                    style={{
                      backgroundColor: getColorForValue(
                        intensity * heatmapData.maxValue,
                        heatmapData.maxValue,
                      ),
                    }}
                  />
                ))}
              </div>
              <span className="text-xs text-default-600 whitespace-nowrap">มาก</span>
              <span className="text-xs text-default-600 whitespace-nowrap">
                สูงสุด: {heatmapData.maxValue.toLocaleString('th-TH')}
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardBody className="pt-4">
        {heatmapData.maxValue === 0 ? (
          <div className="text-center py-8 text-default-500">
            ยังไม่มีข้อมูลในช่วงวันที่ที่เลือก
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <div className="inline-block min-w-full">
              <div className="border border-default-200 rounded-lg overflow-hidden">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="w-24 p-2 text-xs font-semibold text-default-700 bg-default-100 border-r border-default-300 sticky left-0 z-10">
                        วัน
                      </th>
                      {Array.from({ length: 24 }, (_, i) => (i + 8) % 24).map(
                        (hour, displayIndex) => {
                          const isShiftBoundary = hour === 16 || hour === 0;

                          return (
                            <th
                              key={displayIndex}
                              className={`p-2 text-xs text-center font-semibold text-default-700 bg-default-100 border-r border-default-300 last:border-r-0 min-w-[32px] ${
                                isShiftBoundary ? 'border-l-4 border-l-default-600' : ''
                              }`}
                            >
                              {hour.toString().padStart(2, '0')}
                            </th>
                          );
                        },
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS_OF_WEEK.map((dayName, dayIndex) => (
                      <tr key={dayIndex}>
                        <td className="p-2 text-xs font-semibold text-default-700 bg-default-100 border-r border-t border-default-300 sticky left-0 z-10">
                          {dayName}
                        </td>
                        {Array.from({ length: 24 }, (_, i) => (i + 8) % 24).map(
                          (hour, displayIndex) => {
                            const key = `${dayIndex}-${hour}`;
                            const cell = cellLookupMap.get(key);
                            const count = cell?.count || 0;
                            const color = getColorForValue(count, heatmapData.maxValue);
                            const isShiftBoundary = hour === 16 || hour === 0;

                            return (
                              <td
                                key={displayIndex}
                                className={`p-1 border-r border-t border-default-300 last:border-r-0 relative group cursor-pointer transition-all hover:ring-2 hover:ring-primary-300 hover:ring-offset-1 ${
                                  isShiftBoundary ? 'border-l-4 border-l-default-600' : ''
                                }`}
                                style={{ backgroundColor: color }}
                                title={`${dayName} ${hour.toString().padStart(2, '0')}:00 - ${count.toLocaleString('th-TH')} งาน`}
                              >
                                <div className="w-full h-10 flex items-center justify-center">
                                  {count > 0 && (
                                    <span className="text-xs font-semibold text-default-800 opacity-0 group-hover:opacity-100 transition-opacity">
                                      {count.toLocaleString('th-TH')}
                                    </span>
                                  )}
                                </div>
                              </td>
                            );
                          },
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 text-center text-sm text-default-600">
                แสดงปริมาณงานตามวันในสัปดาห์และชั่วโมงในวัน
              </div>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
