'use client';

import type { PorterJobItem } from '@/types/porter';

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
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
} from '@heroui/react';
import { QRCodeSVG } from 'qrcode.react';

import { useDepartmentsMap } from '../../hooks/useDepartmentsMap';

import {
  getStatusLabel,
  getStatusColor,
  getUrgencyColor,
} from '@/features/porter/components/shared/designTokens';
import { PorterEmptyState } from '@/features/porter/components/shared/PorterEmptyState';
import { TABLE_STYLES } from '@/lib/tableStyles';
import { formatDateTimeFromString } from '@/lib/utils';
import { formatLocationString } from '@/lib/porter';
import {
  BedIcon,
  BuildingOfficeIcon,
  CarIcon,
  ClockIcon,
  DocumentTextIcon,
  EyeIcon,
  EyeSlashIcon,
  PencilIcon,
  PrinterIcon,
  StretcherIcon,
  UserIcon,
  XMarkIcon,
} from '@/components/ui/icons';

const COLUMNS = [
  { uid: 'status', name: 'สถานะงาน', align: 'center' as const },
  { uid: 'urgency', name: 'ความเร่งด่วน', align: 'center' as const },
  { uid: 'patient', name: 'ข้อมูลผู้ป่วย' },
  { uid: 'staff', name: 'ข้อมูลผู้ปฏิบัติงาน' },
  { uid: 'actions', name: 'จัดการ', align: 'center' as const },
];

const TOTAL_COLUMNS = COLUMNS.length;

/** คลาสเส้นขอบสีฟ้าคลุมทั้ง record (แถวหลัก + ส่วนขยาย) เมื่อ expanded */
const EXPANDED_RECORD_BORDER = {
  /** แถวหลัก: เซลล์แรก - มุมบนซ้าย */
  mainFirst: 'border-t-2 border-l-2 border-primary rounded-tl-lg',
  /** แถวหลัก: เซลล์กลาง */
  mainMiddle: 'border-t-2 border-primary',
  /** แถวหลัก: เซลล์สุดท้าย - มุมบนขวา */
  mainLast: 'border-t-2 border-r-2 border-primary rounded-tr-lg',
  /** แถวขยาย: เซลล์เดียวคลุมทั้งความกว้าง - ด้านล่าง + มุมล่าง */
  expandedCell: 'border-l-2 border-r-2 border-b-2 border-primary rounded-b-lg bg-default-50/70',
} as const;

export type FormattedRow = {
  id: string;
  pickUpStr: string;
  deliveryStr: string;
  pickupAt: string | null;
  deliveryAt: string | null;
  createdAt: string | null;
  acceptedAt: string | null;
  assignedAt: string | null;
  requestedDateTime: string | null;
};

export function ExpandedDetailContent({
  item,
}: {
  item: PorterJobItem;
  formatted: FormattedRow | undefined;
}) {
  const labelClass = TABLE_STYLES.colors.secondaryText;

  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="grid grid-cols-12 gap-4">
        {/* 1. ประเภทรถ และ มีรถแล้วหรือยัง - col-2 */}
        <div className="col-span-2 flex flex-row gap-2 bg-default-50 p-4 border border-default-300 rounded-xl">
          <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <CarIcon aria-hidden className="w-5 h-5 text-primary" />
          </div>
          <div className="flex flex-col items-start text-left min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className={labelClass}>ประเภทรถ</div>
              <div className="flex items-center gap-2">
                {item.form.vehicleType === 'รถนั่ง' && (
                  <StretcherIcon aria-hidden className="w-4 h-4 text-default-400" />
                )}
                {item.form.vehicleType === 'รถนอน' && (
                  <BedIcon aria-hidden className="w-4 h-4 text-default-400" />
                )}
                <p className="text-sm font-medium text-foreground">{item.form.vehicleType}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={labelClass}>มีรถแล้วหรือไม่</div>
              <div className="flex items-center gap-2">
                <p className="text-md font-medium text-foreground">{item.form.hasVehicle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={labelClass}>รถกอล์ฟ</div>
              <div className="flex items-center gap-2">
                <p className="text-md font-medium text-foreground">
                  {item.form.vehicleTypeGolf || 'ไม่ต้องการ'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. เหตุผลการเคลื่อนย้าย - col-5 */}
        <div className="col-span-5 flex flex-row gap-2 bg-default-50 p-4 border border-default-300 rounded-xl">
          <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <DocumentTextIcon aria-hidden className="w-5 h-5 text-primary" />
          </div>
          <div className="flex flex-col text-left">
            <div className={labelClass}>เหตุผลการเคลื่อนย้าย</div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground">{item.form.transportReason}</p>
            </div>
          </div>
        </div>

        {/* 3. อาการ / สภาพผู้ป่วยที่ต้องแจ้งเวรเปล - col-5 */}
        <div className="col-span-5 flex flex-row gap-2 bg-default-50 p-4 border border-default-300 rounded-xl">
          <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <UserIcon aria-hidden className="w-5 h-5 text-primary" />
          </div>
          <div className="flex flex-col text-left">
            <div className={labelClass}>สภาพผู้ป่วยที่ต้องแจ้งเวรเปล</div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground">
                {item.form.patientCondition?.length ? item.form.patientCondition.join(', ') : '-'}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {/* 4. อุปกรณ์ที่ต้องการ */}
        <div className="flex flex-row gap-2 bg-default-50 p-4 border border-default-300 rounded-xl">
          <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <DocumentTextIcon aria-hidden className="w-5 h-5 text-primary" />
          </div>
          <div className="flex flex-col items-start text-left min-w-0 flex-1">
            <div className={labelClass}>อุปกรณ์ที่ต้องการ</div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground">
                {item.form.equipment?.length ? item.form.equipment.join(', ') : '-'}
              </p>
            </div>
          </div>
        </div>

        {/* 5. รายละเอียดเพิ่มเติม */}
        <div className="flex flex-row gap-2 bg-default-50 p-4 border border-default-300 rounded-xl">
          <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <DocumentTextIcon aria-hidden className="w-5 h-5 text-primary" />
          </div>
          <div className="flex flex-col items-start text-left min-w-0 flex-1">
            <div className={labelClass}>รายละเอียดเพิ่มเติม</div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground">{item.form.specialNotes || '-'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export interface RequestHistoryTableProps {
  items: PorterJobItem[];
  isLoading?: boolean;
  onEdit: (id: string) => void;
  onCancel: (id: string) => void;
  emptyContent?: React.ReactNode;
}

function RequestHistoryTableComponent({
  items,
  isLoading = false,
  onEdit,
  onCancel,
  emptyContent = 'ยังไม่มีประวัติคำขอ',
}: RequestHistoryTableProps) {
  // Memoize formatted data for all items
  const formattedData = useMemo(() => {
    return items.map((item) => ({
      id: item.id,
      pickUpStr: formatLocationString(item.form.pickupLocationDetail),
      deliveryStr: formatLocationString(item.form.deliveryLocationDetail),
      pickupAt: item.pickupAt ? formatDateTimeFromString(String(item.pickupAt)) : null,
      deliveryAt: item.deliveryAt ? formatDateTimeFromString(String(item.deliveryAt)) : null,
      createdAt: item.createdAt ? formatDateTimeFromString(String(item.createdAt)) : null,
      acceptedAt: item.acceptedAt ? formatDateTimeFromString(String(item.acceptedAt)) : null,
      assignedAt: item.assignedAt ? formatDateTimeFromString(String(item.assignedAt)) : null,
      requestedDateTime: item.form.requestedDateTime
        ? formatDateTimeFromString(String(item.form.requestedDateTime))
        : null,
    }));
  }, [items]);

  const formattedDataMap = useMemo(() => {
    return new Map(formattedData.map((data) => [data.id, data]));
  }, [formattedData]);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedPrintId, setSelectedPrintId] = useState<string | null>(null);
  const toggleExpanded = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);
  const handlePrint = useCallback((id: string) => {
    setSelectedPrintId(id);
  }, []);

  const requesterDepartmentIds = useMemo(
    () => items.map((item) => item.form.requesterDepartment),
    [items],
  );
  const { data: departmentsMap } = useDepartmentsMap(requesterDepartmentIds);

  const selectedPrintItem = useMemo(
    () => items.find((item) => item.id === selectedPrintId) ?? null,
    [items, selectedPrintId],
  );
  const selectedPrintFormatted = useMemo(
    () => (selectedPrintId ? formattedDataMap.get(selectedPrintId) : undefined),
    [formattedDataMap, selectedPrintId],
  );

  useEffect(() => {
    if (!selectedPrintId) {
      return;
    }

    const printTimer = window.setTimeout(() => {
      window.print();
    }, 50);

    return () => {
      window.clearTimeout(printTimer);
    };
  }, [selectedPrintId]);

  useEffect(() => {
    const handleAfterPrint = () => {
      setSelectedPrintId(null);
    };

    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  const requesterDepartmentName =
    selectedPrintItem?.form.requesterDepartment != null
      ? departmentsMap?.[selectedPrintItem.form.requesterDepartment] ?? '-'
      : '-';
  const createdAtLabel = selectedPrintFormatted?.createdAt ?? '-';
  const createdAtParts = createdAtLabel !== '-' ? createdAtLabel.split(' ') : [];
  const createdAtDateLabel =
    createdAtParts.length >= 3 ? createdAtParts.slice(0, 3).join(' ') : createdAtLabel;
  const createdAtTimeLabel =
    createdAtParts.length >= 4 ? createdAtParts[3] : createdAtLabel;
  const printPickupLabel = selectedPrintFormatted?.pickUpStr ?? '-';
  const printDeliveryLabel = selectedPrintFormatted?.deliveryStr ?? '-';
  const printPatientHN = selectedPrintItem?.form.patientHN?.trim() || '-';
  const printPatientName = selectedPrintItem?.form.patientName?.trim() || '-';
  const printPatientCondition =
    selectedPrintItem?.form.patientCondition?.length
      ? selectedPrintItem.form.patientCondition.join(', ')
      : '-';
  const printEquipment =
    selectedPrintItem?.form.equipment?.length ? selectedPrintItem.form.equipment.join(', ') : '-';
  const printSpecialNotes = selectedPrintItem?.form.specialNotes?.trim() || '-';

  return (
    <>
      <div className="overflow-x-auto print-hidden">
        <Table
          removeWrapper
          aria-label="ตารางประวัติคำขอ"
          classNames={{
            base: 'min-w-max',
            wrapper: TABLE_STYLES.wrapper,
            th: TABLE_STYLES.th,
            td: TABLE_STYLES.td,
            tr: TABLE_STYLES.tr,
          }}
        >
          <TableHeader columns={COLUMNS}>
            {(column) => (
              <TableColumn key={column.uid} align={'align' in column ? column.align : 'start'}>
                {column.name}
              </TableColumn>
            )}
          </TableHeader>
          <TableBody
            emptyContent={
              typeof emptyContent === 'string' ? (
                <PorterEmptyState message={emptyContent} variant="no-data" />
              ) : (
                emptyContent
              )
            }
            isLoading={isLoading}
          >
            {isLoading
              ? []
              : items.flatMap((item) => {
                const formatted = formattedDataMap.get(item.id);
                const pickUpStr = formatted?.pickUpStr ?? '-';
                const deliveryStr = formatted?.deliveryStr ?? '-';
                const isExpanded = expandedId === item.id;
                const rowKey = String(item.id);

                return [
                  <TableRow key={rowKey} className={TABLE_STYLES.loading.rowClassName}>
                    {/* cell status */}
                    <TableCell className={isExpanded ? EXPANDED_RECORD_BORDER.mainFirst : undefined}>
                      <div
                        className={`flex items-center justify-center ${TABLE_STYLES.spacing.gapSmall}`}
                      >
                        <Chip
                          classNames={{ base: 'rounded-full' }}
                          color={getStatusColor(item.status)}
                          size="md"
                          variant="bordered"
                        >
                          {getStatusLabel(item.status)}
                        </Chip>
                      </div>
                    </TableCell>
                    {/* cell urgency */}
                    <TableCell className={isExpanded ? EXPANDED_RECORD_BORDER.mainMiddle : undefined}>
                      <div
                        className={`flex items-center justify-center ${TABLE_STYLES.spacing.gapSmall}`}
                      >
                        <Chip
                          classNames={{ base: 'rounded-full' }}
                          color={getUrgencyColor(item.form.urgencyLevel ?? '')}
                          size="md"
                          variant="dot"
                        >
                          {item.form.urgencyLevel || 'ปกติ'}
                        </Chip>
                      </div>
                    </TableCell>
                    {/* cell patient */}
                    <TableCell className={isExpanded ? EXPANDED_RECORD_BORDER.mainMiddle : undefined}>
                      <div className={`flex flex-col ${TABLE_STYLES.spacing.gapMedium}`}>
                        <div className={`${TABLE_STYLES.text.base} font-semibold text-primary`}>
                          {item.form.patientHN || '-'}
                          {item.form.patientName ? ` · ${item.form.patientName}` : ''}
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <div
                            className={`flex items-center ${TABLE_STYLES.spacing.gapSmall} whitespace-nowrap`}
                          >
                            <BuildingOfficeIcon className="shrink-0 text-default-500" size={16} />
                            <span className={`shrink-0 ${TABLE_STYLES.colors.secondaryText}`}>
                              รับ :{' '}
                            </span>
                            <span className={TABLE_STYLES.colors.cellText}>{pickUpStr || '-'}</span>
                            <div className="ml-2 flex items-center shrink-0">
                              <ClockIcon className="shrink-0 text-default-500" size={14} />
                              <span className="font-semibold text-success-700">
                                {formatted?.pickupAt || ''}
                              </span>
                            </div>
                          </div>

                          <div
                            className={`flex items-center ${TABLE_STYLES.spacing.gapSmall} whitespace-nowrap`}
                          >
                            <BuildingOfficeIcon className="shrink-0 text-default-500" size={16} />
                            <span className={`shrink-0 ${TABLE_STYLES.colors.secondaryText}`}>
                              ส่ง :
                            </span>
                            <span className={TABLE_STYLES.colors.cellText}>{deliveryStr || '-'}</span>
                            <div className="ml-2 flex items-center shrink-0">
                              <ClockIcon className="shrink-0 text-default-500" size={14} />
                              <span className="font-semibold text-success-700">
                                {formatted?.deliveryAt || ''}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    {/* cell staff */}
                    <TableCell className={isExpanded ? EXPANDED_RECORD_BORDER.mainMiddle : undefined}>
                      <div
                        className={`flex flex-col ${TABLE_STYLES.spacing.gapMedium} ${TABLE_STYLES.text.small}`}
                      >
                        <div className={`flex items-center ${TABLE_STYLES.spacing.gapSmall}`}>
                          <UserIcon className="shrink-0 text-default-500" size={16} />
                          <span className={TABLE_STYLES.colors.secondaryText}>เวลานัดหมาย</span>
                          <ClockIcon className="shrink-0 text-default-500" size={14} />
                          <span className="font-semibold text-success-700">
                            {formatted?.requestedDateTime || '-'}
                          </span>
                        </div>
                        <div className={`flex items-center ${TABLE_STYLES.spacing.gapSmall}`}>
                          <UserIcon className="shrink-0 text-default-500" size={16} />
                          <span className={TABLE_STYLES.colors.secondaryText}>
                            ศูนย์เปลมอบหมายงาน
                          </span>
                          <ClockIcon className="shrink-0 text-default-500" size={14} />
                          <span className="font-semibold text-success-700">
                            {formatted?.acceptedAt || '-'}
                          </span>
                        </div>
                        <div className={`flex items-center ${TABLE_STYLES.spacing.gapSmall}`}>
                          <UserIcon className="shrink-0 text-default-500" size={16} />
                          <span className={TABLE_STYLES.colors.secondaryText}>เจ้าหน้าที่เปล</span>
                          <span className={TABLE_STYLES.colors.cellText}>
                            {item.assignedToName || '-'}
                          </span>
                          <ClockIcon className="shrink-0 text-default-500" size={14} />
                          <span className="font-semibold text-success-700">
                            {formatted?.assignedAt || ''}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    {/* cell actions */}
                    <TableCell className={isExpanded ? EXPANDED_RECORD_BORDER.mainLast : undefined}>
                      <div
                        className={`flex items-center justify-center ${TABLE_STYLES.spacing.gapSmall}`}
                      >
                        <Tooltip content="Print doc">
                          <Button
                            isIconOnly
                            aria-label="Print doc"
                            color="secondary"
                            size="sm"
                            variant="bordered"
                            onPress={() => handlePrint(item.id)}
                          >
                          <PrinterIcon className="w-5 h-5" />
                          </Button>
                        </Tooltip>
                        <Tooltip content={isExpanded ? 'ย่อรายละเอียด' : 'ขยายรายละเอียด'}>
                          <Button
                            isIconOnly
                            aria-label={isExpanded ? 'ย่อรายละเอียด' : 'ขยายรายละเอียด'}
                            color="success"
                            size="sm"
                            variant="bordered"
                            onPress={() => toggleExpanded(item.id)}
                          >
                            {isExpanded ? (
                              <EyeSlashIcon className="w-5 h-5" />
                            ) : (
                              <EyeIcon className="w-5 h-5" />
                            )}
                          </Button>
                        </Tooltip>
                        <Tooltip content="แก้ไข">
                          <Button
                            isIconOnly
                            aria-label="แก้ไขคำขอ"
                            color="primary"
                            isDisabled={
                              item.status !== 'WAITING_CENTER' && item.status !== 'WAITING_ACCEPT'
                            }
                            size="sm"
                            variant="bordered"
                            onPress={() => onEdit(item.id)}
                          >
                            <PencilIcon className="w-5 h-5" />
                          </Button>
                        </Tooltip>
                        <Tooltip
                          color="danger"
                          content={
                            item.status === 'WAITING_CENTER' ||
                              item.status === 'WAITING_ACCEPT' ||
                              item.status === 'IN_PROGRESS'
                              ? 'ยกเลิก'
                              : 'ไม่สามารถยกเลิกได้'
                          }
                        >
                          <Button
                            isIconOnly
                            aria-label={
                              item.status === 'WAITING_CENTER' ||
                                item.status === 'WAITING_ACCEPT' ||
                                item.status === 'IN_PROGRESS'
                                ? 'ยกเลิกคำขอ'
                                : 'ไม่สามารถยกเลิกได้'
                            }
                            color="danger"
                            isDisabled={
                              item.status !== 'WAITING_CENTER' &&
                              item.status !== 'WAITING_ACCEPT' &&
                              item.status !== 'IN_PROGRESS'
                            }
                            size="sm"
                            variant="bordered"
                            onPress={() => onCancel(item.id)}
                          >
                            <XMarkIcon className="w-5 h-5" />
                          </Button>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>,
                  ...(isExpanded
                    ? [
                      <TableRow key={`${rowKey}-expanded`}>
                        <TableCell
                          className={`py-4 px-4 align-top ${EXPANDED_RECORD_BORDER.expandedCell}`}
                          colSpan={TOTAL_COLUMNS}
                        >
                          <ExpandedDetailContent
                            formatted={formattedDataMap.get(item.id)}
                            item={item}
                          />
                        </TableCell>
                      </TableRow>,
                    ]
                    : []),
                ];
              })}
          </TableBody>
        </Table>
      </div>
      <div className="porter-print-root" data-print-visible={selectedPrintItem ? 'true' : 'false'}>
        {selectedPrintItem ? (
          <>
            <div className="porter-print-sheet flex min-h-[calc(100vh-14mm)] flex-col gap-3 px-5 py-4 leading-snug text-neutral-900 bg-white">
              {/* Header */}
              <div className="grid grid-cols-2 items-start gap-x-4 pb-2 border-b-2 border-neutral-900">
                {/* Left: logo + title + department */}
                <div className="porter-print-header-left flex items-start gap-3">
                  <Image
                    alt="Ratchaphiphat Hospital Logo"
                    className="porter-print-logo w-[60px] h-[60px] object-contain"
                    height={60}
                    src="/images/logo.png"
                    width={60}
                  />
                  <div className="porter-print-header-text flex flex-col gap-1">
                    <div className="porter-print-title text-3xl font-bold">
                      ส่งย้ายผู้ป่วย/ Patient Transfer
                    </div>
                    <div className="porter-print-subtitle text-xl">
                      {requesterDepartmentName}
                    </div>
                  </div>
                </div>
                {/* Right: date/time */}
                <div className="porter-print-header-right flex items-start justify-end text-xl">
                  <div className="flex flex-col items-start gap-1">
                    <div className="porter-print-header-row flex gap-1.5">
                      <span className="porter-print-header-label font-semibold">วันที่ / Date :</span>
                      <span className="porter-print-header-value break-words min-w-0">
                        {createdAtDateLabel}
                      </span>
                    </div>
                    <div className="porter-print-header-row flex gap-1.5">
                      <span className="porter-print-header-label font-semibold">เวลา / Time :</span>
                      <span className="porter-print-header-value break-words min-w-0">
                        {createdAtTimeLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="porter-print-body flex-1 flex flex-col gap-4 pt-3">
                {/* Patient info — full width, large font */}
                <div className="flex flex-col gap-4 text-3xl">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-2xl">
                      ชื่อผู้ป่วย / Patient Name
                    </span>
                    <span className="font-normal break-words">
                      {'HN : '}{printPatientHN}{' | '}
                      {printPatientName !== '-' ? ` ${printPatientName}` : ''}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-2xl">
                      สถานที่รับ / Pickup Location
                    </span>
                    <span className="font-normal break-words">
                      {printPickupLabel}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-2xl">
                      สถานที่ส่ง / Destination Location
                    </span>
                    <span className="font-normal break-words">
                      {printDeliveryLabel}
                    </span>
                  </div>
                </div>

                {/* Notes + QR — bottom row */}
                <div className="flex flex-col flex-1 items-start gap-4">
                  <span className="font-bold text-2xl">
                    หมายเหตุ / Notes
                  </span>
                  <div className="flex flex-row w-full gap-4">
                    <div className="flex-1 border border-neutral-900 p-3 text-xl">
                      <div className="flex flex-col gap-2">
                        <div>
                          <div className="font-bold">1) อาการ / สภาพผู้ป่วยที่ต้องแจ้งเวรเปล</div>
                          <div className="break-words">{printPatientCondition}</div>
                        </div>
                        <div>
                          <div className="font-bold">2) อุปกรณ์ที่ต้องการ</div>
                          <div className="break-words">{printEquipment}</div>
                        </div>
                        <div>
                          <div className="font-bold">3) รายละเอียดเพิ่มเติม</div>
                          <div className="break-words">{printSpecialNotes}</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 self-end flex flex-col items-center justify-end gap-2">
                      <span className="font-bold text-xl">แสกน QR code เพื่อรับงาน</span>
                      <QRCodeSVG size={250} value={selectedPrintItem.id} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer (outside bordered sheet) */}
            <div className="porter-print-footer mt-2 text-[16px] text-center">
              ติดต่อ ศูนย์เคลื่อนย้ายผู้ป่วย โรงพยาบาลราชพิพัฒน์ โทร 02-421-2222, 02-444-0163, 02-444-0138
              Line ID : @1RPP
            </div>
          </>
        ) : null}
      </div>
      <style global jsx>{`
        @page {
          size: A4 landscape;
          margin: 3mm;
        }

        .porter-print-root {
          display: none;
        }

        @media print {
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          body * {
            visibility: hidden !important;
          }

          .print-hidden {
            display: none !important;
          }

          .porter-print-root[data-print-visible='true'] {
            position: fixed;
            inset: 0;
            z-index: 9999;
            display: block !important;
            visibility: visible !important;
            background: #ffffff;
          }

          .porter-print-root[data-print-visible='true'],
          .porter-print-root[data-print-visible='true'] * {
            visibility: visible !important;
          }
        }
      `}</style>
    </>
  );
}

export const RequestHistoryTable = React.memo(RequestHistoryTableComponent);
