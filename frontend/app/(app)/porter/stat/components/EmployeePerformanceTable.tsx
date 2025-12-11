"use client";

import React from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Pagination,
} from "@heroui/react";

import { usePagination } from "../../hooks/usePagination";

interface EmployeePerformance {
  employeeName: string;
  firstName: string;
  lastName: string;
  assignedJobCount: number;
  averageDuration: number; // ในหน่วยนาที
}

interface EmployeePerformanceTableProps {
  data: EmployeePerformance[];
}

function formatDuration(minutes: number): string {
  if (minutes === 0) return "-";

  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);

  if (hours > 0) {
    return `${hours} ชม. ${mins} นาที`;
  }

  return `${mins} นาที`;
}

export function EmployeePerformanceTable({
  data,
}: EmployeePerformanceTableProps) {
  const {
    currentPage,
    rowsPerPage,
    totalPages,
    startIndex,
    endIndex,
    paginatedItems,
    setCurrentPage: updateCurrentPage,
    setRowsPerPage: updateRowsPerPage,
  } = usePagination(data, { initialRowsPerPage: 10 });

  const paginatedData = paginatedItems;

  return (
    <Card className="shadow-lg border border-default-200">
      <CardHeader className="pb-0">
        <h3 className="text-lg font-semibold text-foreground">
          ประสิทธิผลรายบุคคล
        </h3>
      </CardHeader>
      <CardBody className="pt-4">
        {data.length === 0 ? (
          <div className="text-center py-8 text-default-500">
            ยังไม่มีข้อมูลประสิทธิผลรายบุคคล
          </div>
        ) : (
          <>
            <Table removeWrapper aria-label="ตารางประสิทธิผลรายบุคคล">
              <TableHeader>
                <TableColumn>ชื่อ - นามสกุล</TableColumn>
                <TableColumn className="text-center">
                  จำนวนงานที่ได้รับมอบหมาย
                </TableColumn>
                <TableColumn className="text-center">
                  ระยะเวลาเฉลี่ย
                </TableColumn>
              </TableHeader>
              <TableBody>
                {paginatedData.map(
                  (employee: EmployeePerformance, index: number) => (
                    <TableRow key={`${employee.employeeName}-${index}`}>
                      <TableCell>
                        <span className="font-medium">
                          {employee.firstName} {employee.lastName}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Chip color="primary" size="sm" variant="flat">
                          {employee.assignedJobCount.toLocaleString("th-TH")}
                        </Chip>
                      </TableCell>
                      <TableCell className="text-center">
                        <Chip color="default" size="sm" variant="flat">
                          {formatDuration(employee.averageDuration)}
                        </Chip>
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>

            {data.length > 0 && (
              <div className="flex items-center justify-between mt-4 px-2">
                <div className="text-sm text-default-600">
                  แสดง {startIndex + 1} - {Math.min(endIndex, data.length)} จาก{" "}
                  {data.length} รายการ
                </div>
                <Pagination
                  showControls
                  color="primary"
                  initialPage={1}
                  page={currentPage}
                  size="sm"
                  total={totalPages}
                  onChange={updateCurrentPage}
                />
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label
                      className="text-sm text-default-600"
                      htmlFor="employee-rows-per-page"
                    >
                      แสดงต่อหน้า:
                    </label>
                    <select
                      className="px-2 py-1 text-sm border border-default-300 rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      id="employee-rows-per-page"
                      value={rowsPerPage}
                      onChange={(e) => {
                        updateRowsPerPage(Number(e.target.value));
                        updateCurrentPage(1);
                      }}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
}
