"use client";

import type { PorterJobItem } from "@/types/porter";

import React, { useMemo } from "react";
import {
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Tooltip,
} from "@heroui/react";

import { PORTER_TABLE_STYLES } from "../../components/shared/tableStyles";
import {
  getStatusLabel,
  getStatusColor,
  getUrgencyColor,
} from "../../components/shared/designTokens";
import { PorterEmptyState } from "../../components/shared/PorterEmptyState";
import { PorterLoadingSkeleton } from "../../components/shared/PorterLoadingSkeleton";

import { formatThaiDateTimeShort } from "@/lib/utils";
import { formatLocationString } from "@/lib/porter";
import {
  BuildingOfficeIcon,
  CarIcon,
  ClockIcon,
  MapPinIcon,
  PencilIcon,
  UserIcon,
  XMarkIcon,
} from "@/components/ui/icons";

const COLUMNS = [
  { uid: "status", name: "สถานะงาน", align: "center" as const },
  { uid: "urgency", name: "ความเร่งด่วน", align: "center" as const },
  { uid: "patient", name: "ข้อมูลผู้ป่วย" },
  { uid: "staff", name: "ข้อมูลผู้ปฏิบัติงาน" },
  { uid: "features", name: "อุปกรณ์ที่ต้องการ" },
  { uid: "actions", name: "จัดการ", align: "center" as const },
];

// ใช้ helper functions จาก designTokens แทน

export interface RequestHistoryTableProps {
  items: PorterJobItem[];
  isLoading?: boolean;
  onEdit: (id: string) => void;
  onCancel: (id: string) => void;
  emptyContent?: React.ReactNode;
}

export function RequestHistoryTable({
  items,
  isLoading = false,
  onEdit,
  onCancel,
  emptyContent = "ยังไม่มีประวัติคำขอ",
}: RequestHistoryTableProps) {
  // Memoize formatted data for all items
  const formattedData = useMemo(() => {
    return items.map((item) => ({
      id: item.id,
      pickUpStr: formatLocationString(item.form.pickupLocationDetail),
      deliveryStr: formatLocationString(item.form.deliveryLocationDetail),
      pickupAt: item.pickupAt
        ? formatThaiDateTimeShort(new Date(item.pickupAt))
        : null,
      deliveryAt: item.deliveryAt
        ? formatThaiDateTimeShort(new Date(item.deliveryAt))
        : null,
      createdAt: item.createdAt
        ? formatThaiDateTimeShort(new Date(item.createdAt))
        : null,
      acceptedAt: item.acceptedAt
        ? formatThaiDateTimeShort(new Date(item.acceptedAt))
        : null,
      assignedAt: item.assignedAt
        ? formatThaiDateTimeShort(new Date(item.assignedAt))
        : null,
    }));
  }, [items]);

  const formattedDataMap = useMemo(() => {
    return new Map(formattedData.map((data) => [data.id, data]));
  }, [formattedData]);

  return (
    <Table
      removeWrapper
      aria-label="ตารางประวัติคำขอ"
      classNames={{
        wrapper: PORTER_TABLE_STYLES.wrapper,
        th: PORTER_TABLE_STYLES.th,
        td: PORTER_TABLE_STYLES.td,
        tr: PORTER_TABLE_STYLES.tr,
      }}
    >
      <TableHeader columns={COLUMNS}>
        {(column) => (
          <TableColumn
            key={column.uid}
            align={"align" in column ? column.align : "start"}
          >
            {column.name}
          </TableColumn>
        )}
      </TableHeader>
      <TableBody
        emptyContent={
          typeof emptyContent === "string" ? (
            <PorterEmptyState message={emptyContent} variant="no-data" />
          ) : (
            emptyContent
          )
        }
        isLoading={isLoading}
        items={items}
        loadingContent={<PorterLoadingSkeleton rows={5} variant="table-row" />}
      >
        {(item) => {
          const formatted = formattedDataMap.get(item.id);
          const pickUpStr = formatted?.pickUpStr ?? "-";
          const deliveryStr = formatted?.deliveryStr ?? "-";

          return (
            <TableRow
              key={item.id}
              className={PORTER_TABLE_STYLES.loading.rowClassName}
            >
              <TableCell>
                <div
                  className={`flex items-center justify-center ${PORTER_TABLE_STYLES.spacing.gapSmall}`}
                >
                  <Chip
                    classNames={{ base: "rounded-full" }}
                    color={getStatusColor(item.status)}
                    size="md"
                    variant="flat"
                  >
                    {getStatusLabel(item.status)}
                  </Chip>
                </div>
              </TableCell>
              <TableCell>
                <div
                  className={`flex items-center justify-center ${PORTER_TABLE_STYLES.spacing.gapSmall}`}
                >
                  <Chip
                    classNames={{ base: "rounded-full" }}
                    color={getUrgencyColor(item.form.urgencyLevel ?? "")}
                    size="md"
                    variant="flat"
                  >
                    {item.form.urgencyLevel || "ปกติ"}
                  </Chip>
                </div>
              </TableCell>
              <TableCell>
                <div
                  className={`flex flex-col ${PORTER_TABLE_STYLES.spacing.gapMedium}`}
                >
                  <div
                    className={`${PORTER_TABLE_STYLES.text.base} font-semibold text-primary`}
                  >
                    {item.form.patientHN || "-"}
                    {item.form.patientName ? ` · ${item.form.patientName}` : ""}
                  </div>
                  <div
                    className={`flex items-start ${PORTER_TABLE_STYLES.spacing.gapMedium} ${PORTER_TABLE_STYLES.text.base} ${PORTER_TABLE_STYLES.colors.cellText}`}
                  >
                    <BuildingOfficeIcon
                      className="mt-0.5 shrink-0 text-default-500"
                      size={16}
                    />
                    <div className="min-w-0">
                      <span>{pickUpStr}</span>
                      {formatted?.pickupAt && (
                        <span
                          className={`ml-1 ${PORTER_TABLE_STYLES.colors.secondaryText}`}
                        >
                          {formatted.pickupAt}
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className={`flex items-start ${PORTER_TABLE_STYLES.spacing.gapMedium} ${PORTER_TABLE_STYLES.text.base} ${PORTER_TABLE_STYLES.colors.cellText}`}
                  >
                    <MapPinIcon
                      className="mt-0.5 shrink-0 text-default-500"
                      size={16}
                    />
                    <div className="min-w-0">
                      <span>{deliveryStr}</span>
                      {formatted?.deliveryAt && (
                        <span
                          className={`ml-1 ${PORTER_TABLE_STYLES.colors.secondaryText}`}
                        >
                          {formatted.deliveryAt}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div
                  className={`flex flex-col ${PORTER_TABLE_STYLES.spacing.gapMedium} ${PORTER_TABLE_STYLES.text.base}`}
                >
                  <div
                    className={`flex items-center ${PORTER_TABLE_STYLES.spacing.gapSmall}`}
                  >
                    <UserIcon className="shrink-0 text-default-500" size={16} />
                    <span className={PORTER_TABLE_STYLES.colors.secondaryText}>
                      สร้างคำขอ
                    </span>
                    <ClockIcon
                      className="shrink-0 text-default-500"
                      size={14}
                    />
                    <span className={PORTER_TABLE_STYLES.colors.cellText}>
                      {formatted?.createdAt || "-"}
                    </span>
                  </div>
                  <div
                    className={`flex items-center ${PORTER_TABLE_STYLES.spacing.gapSmall}`}
                  >
                    <UserIcon className="shrink-0 text-default-500" size={16} />
                    <span className={PORTER_TABLE_STYLES.colors.secondaryText}>
                      ศูนย์เปลมอบหมายงาน
                    </span>
                    <ClockIcon
                      className="shrink-0 text-default-500"
                      size={14}
                    />
                    <span className={PORTER_TABLE_STYLES.colors.cellText}>
                      {formatted?.acceptedAt || "-"}
                    </span>
                  </div>
                  <div
                    className={`flex items-center ${PORTER_TABLE_STYLES.spacing.gapSmall}`}
                  >
                    <UserIcon className="shrink-0 text-default-500" size={16} />
                    <span className={PORTER_TABLE_STYLES.colors.secondaryText}>
                      เจ้าหน้าที่เปล
                    </span>
                    <span className={PORTER_TABLE_STYLES.colors.cellText}>
                      {item.assignedToName || "-"}
                    </span>
                    <ClockIcon
                      className="shrink-0 text-default-500"
                      size={14}
                    />
                    <span className={PORTER_TABLE_STYLES.colors.secondaryText}>
                      {formatted?.assignedAt || ""}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div
                  className={`flex flex-col ${PORTER_TABLE_STYLES.spacing.gapMedium}`}
                >
                  {item.form.vehicleType && (
                    <div
                      className={`flex items-center ${PORTER_TABLE_STYLES.spacing.gapSmall} ${PORTER_TABLE_STYLES.text.base}`}
                    >
                      <CarIcon
                        className="shrink-0 text-default-500"
                        size={16}
                      />
                      <span className={PORTER_TABLE_STYLES.colors.cellText}>
                        {item.form.vehicleType}
                      </span>
                    </div>
                  )}
                  {item.form.equipment && item.form.equipment.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.form.equipment.map((eq) => (
                        <Chip
                          key={eq}
                          classNames={{ base: "rounded-full" }}
                          size="sm"
                          variant="bordered"
                        >
                          {eq.length > 20 ? `${eq.slice(0, 18)}…` : eq}
                        </Chip>
                      ))}
                    </div>
                  )}
                  {!item.form.vehicleType &&
                    (!item.form.equipment ||
                      item.form.equipment.length === 0) && (
                      <span
                        className={`${PORTER_TABLE_STYLES.text.base} ${PORTER_TABLE_STYLES.colors.mutedText}`}
                      >
                        -
                      </span>
                    )}
                </div>
              </TableCell>
              <TableCell>
                <div
                  className={`flex items-center justify-center ${PORTER_TABLE_STYLES.spacing.gapSmall}`}
                >
                  <Tooltip content="แก้ไข">
                    <Button
                      isIconOnly
                      aria-label="แก้ไขคำขอ"
                      color="primary"
                      isDisabled={
                        item.status !== "WAITING_CENTER" &&
                        item.status !== "WAITING_ACCEPT"
                      }
                      size="sm"
                      variant="light"
                      onPress={() => onEdit(item.id)}
                    >
                      <PencilIcon className="w-5 h-5" />
                    </Button>
                  </Tooltip>
                  <Tooltip
                    color="danger"
                    content={
                      item.status === "WAITING_CENTER" ||
                      item.status === "WAITING_ACCEPT" ||
                      item.status === "IN_PROGRESS"
                        ? "ยกเลิก"
                        : "ไม่สามารถยกเลิกได้"
                    }
                  >
                    <Button
                      isIconOnly
                      aria-label={
                        item.status === "WAITING_CENTER" ||
                        item.status === "WAITING_ACCEPT" ||
                        item.status === "IN_PROGRESS"
                          ? "ยกเลิกคำขอ"
                          : "ไม่สามารถยกเลิกได้"
                      }
                      color="danger"
                      isDisabled={
                        item.status !== "WAITING_CENTER" &&
                        item.status !== "WAITING_ACCEPT" &&
                        item.status !== "IN_PROGRESS"
                      }
                      size="sm"
                      variant="light"
                      onPress={() => onCancel(item.id)}
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </Button>
                  </Tooltip>
                </div>
              </TableCell>
            </TableRow>
          );
        }}
      </TableBody>
    </Table>
  );
}
