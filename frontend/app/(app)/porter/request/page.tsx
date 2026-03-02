'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardFooter,
  Input,
  Select,
  SelectItem,
  Textarea,
  Chip,
  CheckboxGroup,
  Checkbox,
  RadioGroup,
  Radio,
  Form,
  DatePicker,
  useDisclosure,
  addToast,
  Tabs,
  Tab,
  Pagination,
  Tooltip,
} from '@heroui/react';
import { CalendarDateTime, CalendarDate, parseDate } from '@internationalized/date';
import { RangeValue } from '@react-types/shared';

import { LocationSelector } from '../components/LocationSelector';
import { PorterEmptyState } from '../components/shared/PorterEmptyState';
import { useDepartmentName } from '../hooks/useDepartmentsMap';

const CancelJobModal = dynamic(
  () => import('../components/CancelJobModal').then((m) => m.default),
  { ssr: false },
);
const ReadOnlyJobDetailDrawer = dynamic(
  () => import('../components/ReadOnlyJobDetailDrawer').then((m) => ({ default: m.ReadOnlyJobDetailDrawer })),
  { ssr: false },
);
const EmergencyConfirmationModal = dynamic(
  () => import('../components/EmergencyConfirmationModal').then((m) => m.default),
  { ssr: false },
);

import { RequestHistoryTable } from './components/RequestHistoryTable';
import { RequestHistoryFilters } from './components/RequestHistoryFilters';
import { usePorterRequestForm } from './hooks/usePorterRequestForm';
import { useUserRequests } from './hooks/useUserRequests';

import { CARD_STYLES } from '@/lib/cardStyles';
import { TABLE_STYLES } from '@/lib/tableStyles';
import { cn, getISODatePart } from '@/lib/utils';
import { PorterRequestFormData, VehicleType, EquipmentType, PorterJobItem } from '@/types/porter';
import { getDateTimeLocal } from '@/lib/utils';
import {
  URGENCY_OPTIONS,
  VEHICLE_TYPE_OPTIONS,
  EQUIPMENT_OPTIONS,
  TRANSPORT_REASON_OPTIONS,
  PATIENT_CONDITION_OPTIONS,
} from '@/lib/porter';
import {
  AmbulanceIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  UserIcon,
  PhoneIcon,
  CalendarIcon,
  ClipboardListIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  RefreshIcon,
} from '@/components/ui/icons';

/** แปลง string (YYYY-MM-DDTHH:mm) เป็น CalendarDateTime (hoist เพื่อลดการสร้างฟังก์ชันทุก render) */
function stringToCalendarDateTime(dateString: string): CalendarDateTime {
  try {
    const [datePart, timePart] = dateString.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = (timePart || '00:00').split(':').map(Number);

    return new CalendarDateTime(year, month, day, hour || 0, minute || 0);
  } catch {
    const now = new Date();

    return new CalendarDateTime(
      now.getFullYear(),
      now.getMonth() + 1,
      now.getDate(),
      now.getHours(),
      now.getMinutes(),
    );
  }
}

/** แปลงค่า CalendarDateTime-like เป็น string (hoist) */
function calendarDateTimeToString(date: { year: number; month: number; day: number; hour: number; minute: number }): string {
  const year = date.year.toString().padStart(4, '0');
  const month = date.month.toString().padStart(2, '0');
  const day = date.day.toString().padStart(2, '0');
  const hour = date.hour.toString().padStart(2, '0');
  const minute = date.minute.toString().padStart(2, '0');

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

interface PorterApiResult {
  success: boolean;
  data?: unknown;
  error?: string;
  message?: string;
}

export default function PorterRequestPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // อ่าน filters จาก URL query params
  const urlStatusFilter = searchParams.get('status');
  const urlSearchQuery = searchParams.get('search') ?? '';
  const urlDateFrom = searchParams.get('dateFrom');
  const urlDateTo = searchParams.get('dateTo');
  const urlUrgencyFilter = searchParams.get('urgency');
  const urlPage = searchParams.get('page');

  const [selectedTab, setSelectedTab] = useState<string>('form');

  const {
    formData,
    validationErrors,
    editingRequestId,
    isSubmitting,
    setIsSubmitting,
    setFormField,
    clearFieldError,
    runValidation,
    resetForm,
    loadRequestForEdit,
    cancelEditing,
  } = usePorterRequestForm({
    requesterName: session?.user?.name ?? undefined,
    requesterPhone: session?.user?.phone ?? undefined,
    requesterDepartment: session?.user?.departmentSubSubId ?? undefined,
  });

  // Sync หน่วยงานผู้แจ้งจาก session ให้กับฟอร์มเมื่อ session โหลดแล้ว
  useEffect(() => {
    const departmentSubSubId = session?.user?.departmentSubSubId;

    if (departmentSubSubId && !formData.requesterDepartment) {
      setFormField('requesterDepartment', departmentSubSubId);
    }
  }, [session?.user, formData.requesterDepartment, setFormField]);

  // ดึงชื่อหน่วยงานจาก departmentSubSubId (ใช้ React Query hook)
  const requesterDepartmentName = useDepartmentName(formData.requesterDepartment);

  const {
    userRequests,
    isLoadingRequests,
    refreshUserRequests,
    page,
    pageSize,
    total,
    totalPages,
    statusFilter,
    searchQuery,
    handlePageChange,
    handlePageSizeChange,
    handleStatusFilterChange,
    handleSearchChange,
  } = useUserRequests({
    userId: session?.user?.id,
  });

  // State สำหรับ date filter (เลือกช่วงวันที่)
  const [dateRange, setDateRange] = useState<RangeValue<CalendarDate> | null>(null);

  // State สำหรับ filter ความเร่งด่วน
  const [urgencyFilter, setUrgencyFilter] = useState<string>('');

  // อ่าน date range จาก URL และ sync เมื่อ query params เปลี่ยน
  useEffect(() => {
    if (urlDateFrom && urlDateTo) {
      try {
        const start = parseDate(urlDateFrom);
        const end = parseDate(urlDateTo);

        setDateRange({ start, end });
      } catch {
        // Ignore parse errors เพื่อไม่ให้ blocking การทำงานหลัก
      }
    }
  }, [urlDateFrom, urlDateTo]);

  // Sync initial filters จาก URL และอัปเดตเมื่อ query params เปลี่ยน
  useEffect(() => {
    if (urlStatusFilter && urlStatusFilter !== statusFilter) {
      handleStatusFilterChange(urlStatusFilter);
    }
    if (urlSearchQuery && urlSearchQuery !== searchQuery) {
      handleSearchChange(urlSearchQuery);
    }
    if (urlUrgencyFilter) {
      const valid = URGENCY_OPTIONS.some((o) => o.value === urlUrgencyFilter);

      if (valid && urlUrgencyFilter !== urgencyFilter) {
        setUrgencyFilter(urlUrgencyFilter);
      }
    }
    if (urlPage) {
      const pageNum = Number.parseInt(urlPage, 10);

      if (!Number.isNaN(pageNum) && pageNum > 0 && pageNum !== page) {
        handlePageChange(pageNum);
      }
    }
  }, [
    urlStatusFilter,
    urlSearchQuery,
    urlUrgencyFilter,
    urlPage,
    statusFilter,
    searchQuery,
    urgencyFilter,
    page,
    handleStatusFilterChange,
    handleSearchChange,
    handlePageChange,
  ]);

  // Sync filters กับ URL query params
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    // อัปเดต status filter
    if (statusFilter) {
      params.set('status', statusFilter);
    } else {
      params.delete('status');
    }

    // อัปเดต search query
    if (searchQuery) {
      params.set('search', searchQuery);
    } else {
      params.delete('search');
    }

    // อัปเดต date range
    if (dateRange?.start && dateRange?.end) {
      params.set('dateFrom', dateRange.start.toString());
      params.set('dateTo', dateRange.end.toString());
    } else {
      params.delete('dateFrom');
      params.delete('dateTo');
    }

    // อัปเดต urgency filter
    if (urgencyFilter) {
      params.set('urgency', urgencyFilter);
    } else {
      params.delete('urgency');
    }

    // อัปเดต page
    if (page > 1) {
      params.set('page', String(page));
    } else {
      params.delete('page');
    }

    // อัปเดต URL โดยไม่ scroll
    const newUrl = `${pathname}${params.toString() ? `?${params.toString()}` : ''}`;

    router.replace(newUrl, { scroll: false });
  }, [statusFilter, searchQuery, dateRange, urgencyFilter, page, pathname, router, searchParams]);

  // Filter userRequests ตามช่วงวันที่และความเร่งด่วน (client-side, single pass)
  const filteredUserRequests = useMemo(() => {
    const startStr = dateRange?.start?.toString();
    const endStr = dateRange?.end?.toString();

    return userRequests.filter((request) => {
      if (startStr != null && endStr != null) {
        if (!request.createdAt) return false;
        const requestDateStr = getISODatePart(request.createdAt);

        if (requestDateStr < startStr || requestDateStr > endStr) return false;
      }
      if (urgencyFilter) {
        const level = request.form?.urgencyLevel ?? 'ปกติ';

        if (level !== urgencyFilter) return false;
      }

      return true;
    });
  }, [userRequests, dateRange, urgencyFilter]);

  // State สำหรับค้นหาข้อมูลผู้ป่วย
  const [isLoadingPatient, setIsLoadingPatient] = useState(false);

  // State สำหรับยกเลิกงาน
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [cancelReasonError, setCancelReasonError] = useState<string>('');
  const [isCancelling, setIsCancelling] = useState(false);
  const {
    isOpen: isCancelModalOpen,
    onOpen: onCancelModalOpen,
    onClose: onCancelModalClose,
  } = useDisclosure();

  // State สำหรับ JobDetailDrawer
  const [selectedJob, setSelectedJob] = useState<PorterJobItem | null>(null);
  const { isOpen: isJobDetailDrawerOpen, onClose: onJobDetailDrawerClose } = useDisclosure();

  // State สำหรับ Modal ยืนยันการเลือก "ฉุกเฉิน"
  const {
    isOpen: isEmergencyModalOpen,
    onOpen: onEmergencyModalOpen,
    onClose: onEmergencyModalClose,
  } = useDisclosure();
  const [pendingUrgencyLevel, setPendingUrgencyLevel] = useState<string | null>(null);

  // Scroll behavior handled inside usePorterRequestForm hook

  const handleEditRequest = useCallback(
    (requestId: string) => {
      const request = userRequests.find((r) => r.id === requestId);

      if (!request) {
        addToast({
          title: 'เกิดข้อผิดพลาด',
          description: 'ไม่พบข้อมูลคำขอ',
          color: 'danger',
        });

        return;
      }

      if (request.status !== 'WAITING_CENTER' && request.status !== 'WAITING_ACCEPT') {
        addToast({
          title: 'ไม่สามารถแก้ไขได้',
          description: 'สามารถแก้ไขได้เฉพาะงานที่ยังไม่รับงานเท่านั้น',
          color: 'warning',
        });

        return;
      }

      loadRequestForEdit(request);
      setSelectedTab('form');
      addToast({
        title: 'โหลดข้อมูลสำเร็จ',
        description: 'ข้อมูลคำขอได้ถูกโหลดลงในฟอร์มแล้ว',
        color: 'success',
      });
    },
    [userRequests, loadRequestForEdit],
  );

  const handleCancelEdit = useCallback(() => {
    cancelEditing();
  }, [cancelEditing]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = runValidation();

    if (!validation.isValid) {
      addToast({
        title: 'ข้อมูลไม่ครบถ้วน',
        description: 'กรุณาตรวจสอบข้อมูลที่กรอกแล้วลองอีกครั้ง',
        color: 'danger',
      });

      return;
    }

    setIsSubmitting(true);

    try {
      let response: Response;
      let result: PorterApiResult;

      if (editingRequestId) {
        response = await fetch(`/api/porter/requests/${editingRequestId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        result = (await response.json()) as PorterApiResult;

        if (!response.ok || !result.success) {
          const errorMessage =
            result.error === 'UNAUTHORIZED'
              ? 'กรุณาเข้าสู่ระบบก่อนแก้ไขคำขอ'
              : result.error === 'PORTER_SERVICE_UNAVAILABLE'
                ? 'บริการพนักงานเปลไม่พร้อมใช้งานในขณะนี้'
                : result.message || 'ไม่สามารถแก้ไขคำขอได้ กรุณาลองอีกครั้ง';

          addToast({
            title: 'เกิดข้อผิดพลาด',
            description: errorMessage,
            color: 'danger',
          });

          return;
        }

        addToast({
          title: 'แก้ไขคำขอสำเร็จ',
          description: 'คำขอของคุณได้รับการแก้ไขเรียบร้อยแล้ว',
          color: 'success',
        });
      } else {
        // สร้างคำขอใหม่
        response = await fetch('/api/porter/requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        result = (await response.json()) as PorterApiResult;

        if (!response.ok || !result.success) {
          const errorMessage =
            result.error === 'UNAUTHORIZED'
              ? 'กรุณาเข้าสู่ระบบก่อนส่งคำขอ'
              : result.error === 'PORTER_SERVICE_UNAVAILABLE'
                ? 'บริการพนักงานเปลไม่พร้อมใช้งานในขณะนี้'
                : result.message || 'ไม่สามารถส่งคำขอได้ กรุณาลองอีกครั้ง';

          addToast({
            title: 'เกิดข้อผิดพลาด',
            description: errorMessage,
            color: 'danger',
          });

          return;
        }

        addToast({
          title: 'ส่งคำขอสำเร็จ',
          description: 'คำขอของคุณได้รับการส่งเรียบร้อยแล้ว',
          color: 'success',
        });
      }

      await refreshUserRequests();
      resetForm();
      // ไม่ต้อง switch tab ปล่อยให้ผู้ใช้กรอกต่อหรือกดดูเอง
    } catch {
      addToast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถส่งคำขอได้ กรุณาลองอีกครั้ง',
        color: 'danger',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle input change (useCallback เพื่อลด re-render ของลูก)
  const handleInputChange = useCallback(
    (field: keyof PorterRequestFormData, value: Parameters<typeof setFormField>[1]) => {
      setFormField(field, value);
      clearFieldError(field);
    },
    [setFormField, clearFieldError],
  );

  const handleUrgencyLevelChange = useCallback(
    (urgencyLevel: string) => {
      if (urgencyLevel === 'ฉุกเฉิน') {
        setPendingUrgencyLevel(urgencyLevel);
        onEmergencyModalOpen();
      } else {
        handleInputChange('urgencyLevel', urgencyLevel);
      }
    },
    [onEmergencyModalOpen, handleInputChange],
  );

  const handleConfirmEmergency = useCallback(() => {
    if (pendingUrgencyLevel) {
      handleInputChange('urgencyLevel', pendingUrgencyLevel);
    }
    setPendingUrgencyLevel(null);
    onEmergencyModalClose();
  }, [pendingUrgencyLevel, onEmergencyModalClose, handleInputChange]);

  const handleCancelEmergency = useCallback(() => {
    setPendingUrgencyLevel(null);
    onEmergencyModalClose();
  }, [onEmergencyModalClose]);

  const handleClearPatientHN = useCallback(() => {
    handleInputChange('patientHN', '');
    handleInputChange('patientName', '');
  }, [handleInputChange]);

  const handleSearchPatient = useCallback(async () => {
    if (!formData.patientHN?.trim()) {
      addToast({
        title: 'ข้อมูลไม่ครบถ้วน',
        description: 'กรุณากรอกหมายเลข HN / AN',
        color: 'warning',
      });

      return;
    }

    const trimmedHN = formData.patientHN.trim();

    if (!trimmedHN.includes('/') && !trimmedHN.includes('-')) {
      addToast({
        title: 'ข้อมูลไม่ถูกต้อง',
        description: 'กรุณากรอกรูปแบบ HN (123456/68) หรือ AN (123456-68)',
        color: 'warning',
      });

      return;
    }

    setIsLoadingPatient(true);

    try {
      const response = await fetch('/api/porter/patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientHN: trimmedHN }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { message?: string };

        throw new Error(errorData.message || `HTTP ${response.status} ${response.statusText}`);
      }

      const result = (await response.json()) as { success: boolean; data?: { PNAME?: string; FNAME?: string; LNAME?: string }; message?: string };

      if (result.success && result.data) {
        const patientData = result.data;
        const patientName = [patientData.PNAME || '', patientData.FNAME || '', patientData.LNAME || '']
          .filter(Boolean)
          .join(' ');

        if (patientName) {
          handleInputChange('patientName', patientName);
          addToast({
            title: 'ค้นหาสำเร็จ',
            description: 'พบข้อมูลผู้ป่วยและเติมชื่ออัตโนมัติแล้ว',
            color: 'success',
          });
        } else {
          addToast({
            title: 'ไม่พบข้อมูล',
            description: 'ไม่พบชื่อผู้ป่วยในระบบ',
            color: 'warning',
          });
        }
      } else {
        throw new Error(result.message || 'ไม่พบข้อมูลผู้ป่วย');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'ไม่สามารถค้นหาข้อมูลผู้ป่วยได้ กรุณาลองใหม่อีกครั้ง';

      addToast({
        title: 'เกิดข้อผิดพลาด',
        description: message,
        color: 'danger',
      });
    } finally {
      setIsLoadingPatient(false);
    }
  }, [formData.patientHN, handleInputChange]);

  const getDateTimeValue = useCallback((): CalendarDateTime => {
    return stringToCalendarDateTime(formData.requestedDateTime);
  }, [formData.requestedDateTime]);

  const handleDateTimeChange = useCallback(
    (value: CalendarDateTime | null) => {
      if (value) {
        handleInputChange('requestedDateTime', calendarDateTimeToString(value));
      }
    },
    [handleInputChange],
  );

  const handleClearFilters = useCallback(() => {
    setDateRange(null);
    handleSearchChange('');
    handleStatusFilterChange(null);
    setUrgencyFilter('');
  }, [handleSearchChange, handleStatusFilterChange]);

  const handleJobDetailDrawerClose = useCallback(() => {
    onJobDetailDrawerClose();
    setSelectedJob(null);
  }, [onJobDetailDrawerClose]);

  const handleOpenCancelModal = useCallback((requestId: string) => {
    setSelectedRequestId(requestId);
    setCancelReason('');
    setCancelReasonError('');
    onCancelModalOpen();
  }, [onCancelModalOpen]);

  const handleCancelJob = useCallback(async () => {
    if (!selectedRequestId) return;

    if (!cancelReason.trim()) {
      setCancelReasonError('กรุณาระบุเหตุผลการยกเลิกงาน');

      return;
    }

    setCancelReasonError('');
    setIsCancelling(true);

    try {
      const response = await fetch(`/api/porter/requests/${selectedRequestId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'cancelled',
          cancelledReason: cancelReason.trim() || undefined,
        }),
      });

      const result = (await response.json()) as PorterApiResult;

      if (result.success && result.data) {
        addToast({
          title: 'ยกเลิกงานสำเร็จ',
          description: 'งานนี้ได้ถูกยกเลิกเรียบร้อยแล้ว',
          color: 'success',
        });
        onCancelModalClose();
        setSelectedRequestId(null);
        setCancelReason('');
        setCancelReasonError('');
        await refreshUserRequests();
      } else {
        addToast({
          title: 'เกิดข้อผิดพลาด',
          description: result.message || 'ไม่สามารถยกเลิกงานได้',
          color: 'danger',
        });
      }
    } catch {
      addToast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถยกเลิกงานได้',
        color: 'danger',
      });
    } finally {
      setIsCancelling(false);
    }
  }, [selectedRequestId, cancelReason, onCancelModalClose, refreshUserRequests]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <AmbulanceIcon className="w-8 h-8 text-primary" />
            ขอเปลรับ - ส่งผู้ป่วย
          </h1>
        </div>
      </div>

      <Tabs
        aria-label="Porter Request Options"
        color="primary"
        selectedKey={selectedTab}
        variant="underlined"
        onSelectionChange={(key) => setSelectedTab(key as string)}
      >
        <Tab
          key="form"
          title={
            <div className="flex items-center space-x-2">
              <AmbulanceIcon className="w-4 h-4" />
              <span>กรอกข้อมูลคำขอ</span>
            </div>
          }
        >
          <Form
            className="mt-[-8px]"
            validationBehavior="aria"
            validationErrors={validationErrors}
            onSubmit={handleSubmit}
          >
            {/* การ์ดที่ 1: ข้อมูลหน่วยงานผู้แจ้ง */}
            <Card className={cn(CARD_STYLES.default, 'w-full')}>
              <CardHeader className="pb-0">
                <div className="flex items-center gap-2">
                  <BuildingOfficeIcon className="w-6 h-6 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">ข้อมูลหน่วยงานผู้แจ้ง</h3>
                </div>
              </CardHeader>
              <CardBody className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    readOnly
                    label="หน่วยงานผู้แจ้ง"
                    name="requesterDepartment"
                    placeholder="หน่วยงานผู้แจ้งจากโปรไฟล์"
                    startContent={<BuildingOfficeIcon className="w-4 h-4 text-default-400" />}
                    value={requesterDepartmentName || '-'}
                    variant="bordered"
                  />

                  <Input
                    isRequired
                    autoComplete="name"
                    label="ชื่อผู้แจ้ง"
                    name="requesterName"
                    placeholder="กรอกชื่อผู้แจ้ง"
                    startContent={<UserIcon className="w-4 h-4 text-default-400" />}
                    value={formData.requesterName}
                    variant="bordered"
                    onChange={(e) => {
                      handleInputChange('requesterName', e.target.value);
                    }}
                  />

                  <Input
                    isRequired
                    autoComplete="tel"
                    classNames={{
                      input:
                        '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                    }}
                    label="โทรศัพท์ภายใน"
                    name="requesterPhone"
                    placeholder="IP-Phone / เบอร์ 4 ตัว"
                    startContent={<PhoneIcon className="w-4 h-4 text-default-400" />}
                    type="tel"
                    value={formData.requesterPhone}
                    variant="bordered"
                    onChange={(e) => {
                      handleInputChange('requesterPhone', e.target.value);
                    }}
                  />
                </div>
              </CardBody>
            </Card>

            {/* การ์ดที่ 2: ข้อมูลผู้ป่วย */}
            <Card className={cn(CARD_STYLES.default, 'w-full')}>
              <CardHeader className="pb-0">
                <div className="flex items-center gap-2">
                  <UserIcon className="w-6 h-6 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">ข้อมูลผู้ป่วย</h3>
                </div>
              </CardHeader>
              <CardBody className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Input
                      isRequired
                      description="กรอกหมายเลข HN / AN แล้วกดปุ่มค้นหาเพื่อดึงข้อมูลผู้ป่วย"
                      endContent={
                        <div className="flex items-center gap-1">
                          {formData.patientHN && (
                            <button
                              className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none p-1 rounded-md hover:bg-default-100 transition-colors"
                              disabled={isLoadingPatient}
                              tabIndex={-1}
                              type="button"
                              onClick={handleClearPatientHN}
                            >
                              <XMarkIcon className="w-4 h-4 text-default-400" />
                            </button>
                          )}
                          <button
                            className="focus-visible:ring-2 focus-visible:ring-primary-foreground focus-visible:outline-none p-1.5 rounded-md bg-primary text-white hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isLoadingPatient || !formData.patientHN?.trim()}
                            tabIndex={-1}
                            type="button"
                            onClick={handleSearchPatient}
                          >
                            {isLoadingPatient ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <MagnifyingGlassIcon className="w-4 h-4 text-white" />
                            )}
                          </button>
                        </div>
                      }
                      label="หมายเลข HN / AN"
                      name="patientHN"
                      placeholder="เช่น 123456/68 หรือ 123456-68"
                      value={formData.patientHN}
                      variant="bordered"
                      onChange={(e) => {
                        // อนุญาตเฉพาะตัวเลข, /, และ - เท่านั้น
                        const value = e.target.value;
                        const filteredValue = value.replace(/[^0-9/-]/g, '');

                        handleInputChange('patientHN', filteredValue);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSearchPatient();
                        }
                      }}
                    />
                  </div>

                  <Input
                    isClearable
                    isRequired
                    autoComplete="off"
                    label="ชื่อผู้ป่วย"
                    name="patientName"
                    placeholder="กรอกชื่อผู้ป่วย"
                    value={formData.patientName}
                    variant="bordered"
                    onChange={(e) => {
                      handleInputChange('patientName', e.target.value);
                    }}
                  />
                </div>
                <div className="mt-4">
                  <label
                    className="text-sm font-medium text-foreground mb-2 block"
                    htmlFor="patient-condition-group"
                  >
                    อาการ / สภาพผู้ป่วยที่ต้องแจ้งเวรเปล
                  </label>
                  <CheckboxGroup
                    id="patient-condition-group"
                    value={formData.patientCondition}
                    onValueChange={(values) => {
                      handleInputChange('patientCondition', values as string[]);
                    }}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {PATIENT_CONDITION_OPTIONS.map((condition) => (
                        <Checkbox key={condition} size="sm" value={condition}>
                          {condition}
                        </Checkbox>
                      ))}
                    </div>
                  </CheckboxGroup>
                </div>
              </CardBody>
            </Card>

            {/* การ์ดที่ 3: ข้อมูลการเคลื่อนย้าย */}
            <Card className={cn(CARD_STYLES.default, 'w-full')}>
              <CardHeader className="pb-0">
                <div className="flex items-center gap-2">
                  <MapPinIcon className="w-6 h-6 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">ข้อมูลการเคลื่อนย้าย</h3>
                </div>
              </CardHeader>
              <CardBody className="pt-4 space-y-4">
                <Select
                  isRequired
                  label="รายการเหตุผลการเคลื่อนย้าย"
                  name="transportReason"
                  placeholder="เลือกเหตุผล"
                  selectedKeys={formData.transportReason ? [formData.transportReason] : []}
                  variant="bordered"
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0] as string;

                    handleInputChange('transportReason', selected);
                  }}
                >
                  {TRANSPORT_REASON_OPTIONS.map((r) => (
                    <SelectItem key={r}>{r}</SelectItem>
                  ))}
                </Select>

                <div className="space-y-4">
                  <LocationSelector
                    key="pickup"
                    isRequired
                    errorMessage={validationErrors.pickupLocation}
                    label="สถานที่รับ"
                    showOnlyBeds={true}
                    value={formData.pickupLocationDetail}
                    onChange={(location) => {
                      setFormField('pickupLocationDetail', location);
                    }}
                  />

                  <LocationSelector
                    key="delivery"
                    isRequired
                    errorMessage={validationErrors.deliveryLocation}
                    label="สถานที่ส่ง"
                    value={formData.deliveryLocationDetail}
                    onChange={(location) => {
                      setFormField('deliveryLocationDetail', location);
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <DatePicker
                      isRequired
                      granularity="minute"
                      label="วันที่และเวลาที่ต้องการเคลื่อนย้าย"
                      selectorIcon={<CalendarIcon className="w-4 h-4" />}
                      value={getDateTimeValue()}
                      variant="bordered"
                      onChange={handleDateTimeChange}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="flat"
                        onPress={() => handleInputChange('requestedDateTime', getDateTimeLocal())}
                      >
                        ตอนนี้
                      </Button>
                      <Button
                        size="sm"
                        variant="flat"
                        onPress={() => {
                          const d = new Date();

                          d.setMinutes(d.getMinutes() + 30);
                          handleInputChange('requestedDateTime', getDateTimeLocal(d));
                        }}
                      >
                        +30 นาที
                      </Button>
                      <Button
                        size="sm"
                        variant="flat"
                        onPress={() => {
                          const d = new Date();

                          d.setHours(d.getHours() + 2);
                          handleInputChange('requestedDateTime', getDateTimeLocal(d));
                        }}
                      >
                        +2 ชั่วโมง
                      </Button>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground mb-2 block">
                      ความเร่งด่วน
                      <span className="text-danger ml-1">*</span>
                    </div>
                    {validationErrors.urgencyLevel && (
                      <div className="text-sm text-danger mb-2">
                        {validationErrors.urgencyLevel}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {URGENCY_OPTIONS.map((option) => {
                        const tooltipContent =
                          option.value === 'ปกติ'
                            ? 'เจ้าหน้าที่เปล จะถึงจุดรับภายใน 30 นาที'
                            : option.value === 'ด่วน'
                              ? 'เจ้าหน้าที่เปล จะถึงจุดรับภายใน 15 นาที'
                              : 'เจ้าหน้าที่เปล จะถึงจุดรับภายใน 5 นาที และ จะต้องเป็นเคสฉุกเฉินเท่านั้น';

                        return (
                          <Tooltip key={option.value} content={tooltipContent}>
                            <Chip
                              className="cursor-pointer"
                              color={option.color}
                              startContent={
                                option.value === 'ฉุกเฉิน' || option.value === 'ด่วน' ? (
                                  <AmbulanceIcon className="w-4 h-4" />
                                ) : (
                                  <ClipboardListIcon className="w-4 h-4" />
                                )
                              }
                              variant={
                                formData.urgencyLevel === option.value ? 'solid' : 'bordered'
                              }
                              onClick={() => handleUrgencyLevelChange(option.value)}
                            >
                              {option.label}
                            </Chip>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm font-medium text-foreground mb-2 block">
                      ประเภทรถ
                      <span className="text-danger ml-1">*</span>
                    </div>
                    {validationErrors.vehicleType && (
                      <div className="text-sm text-danger mb-2">{validationErrors.vehicleType}</div>
                    )}
                    <RadioGroup
                      isRequired
                      className="gap-3"
                      name="vehicleType"
                      orientation="horizontal"
                      value={formData.vehicleType}
                      onValueChange={(val) => handleInputChange('vehicleType', val as VehicleType)}
                    >
                      {VEHICLE_TYPE_OPTIONS.map((type) => (
                        <Radio key={type} size="sm" value={type}>
                          {type}
                        </Radio>
                      ))}
                    </RadioGroup>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground mb-2 block">
                      มีรถแล้วหรือยัง
                      <span className="text-danger ml-1">*</span>
                    </div>
                    {validationErrors.hasVehicle && (
                      <div className="text-sm text-danger mb-2">{validationErrors.hasVehicle}</div>
                    )}
                    <RadioGroup
                      isRequired
                      className="gap-3"
                      name="hasVehicle"
                      orientation="horizontal"
                      value={formData.hasVehicle}
                      onValueChange={(val) =>
                        handleInputChange('hasVehicle', val as 'มี' | 'ไม่มี')
                      }
                    >
                      <Radio size="sm" value="มี">
                        มี
                      </Radio>
                      <Radio size="sm" value="ไม่มี">
                        ไม่มี
                      </Radio>
                    </RadioGroup>
                  </div>
                  {/* <div>
                    <div className="text-sm font-medium text-foreground mb-2 block">
                      ส่งกลับหรือไม่
                      <span className="text-danger ml-1">*</span>
                    </div>
                    {validationErrors.returnTrip && (
                      <div className="text-sm text-danger mb-2">{validationErrors.returnTrip}</div>
                    )}
                    <RadioGroup
                      isRequired
                      className="gap-3"
                      name="returnTrip"
                      orientation="horizontal"
                      value={formData.returnTrip}
                      onValueChange={(val) =>
                        handleInputChange('returnTrip', val as 'ไปส่งอย่างเดียว' | 'รับกลับด้วย')
                      }
                    >
                      <Radio size="sm" value="ไปส่งอย่างเดียว">
                        ไปส่งอย่างเดียว
                      </Radio>
                      <Radio size="sm" value="รับกลับด้วย">
                        รับกลับด้วย
                      </Radio>
                    </RadioGroup>
                  </div> */}
                </div>
                <div className="mt-4">
                  <label
                    className="text-sm font-medium text-foreground mb-2 block"
                    htmlFor="equipment-group"
                  >
                    อุปกรณ์ที่ต้องการ
                  </label>
                  <CheckboxGroup
                    id="equipment-group"
                    value={Array.isArray(formData.equipment) ? formData.equipment : []}
                    onValueChange={(values) => {
                      handleInputChange('equipment', values as EquipmentType[]);
                      // ถ้าไม่ได้เลือก "อื่นๆ ระบุ" ให้ล้าง equipmentOther
                      if (!values.includes('อื่นๆ ระบุ')) {
                        handleInputChange('equipmentOther', '');
                      }
                    }}
                  >
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {EQUIPMENT_OPTIONS.map((equipment) => (
                        <Checkbox key={equipment} size="sm" value={equipment}>
                          {equipment}
                        </Checkbox>
                      ))}
                    </div>
                  </CheckboxGroup>
                  {Array.isArray(formData.equipment) &&
                    formData.equipment.includes('อื่นๆ ระบุ') && (
                      <Input
                        className="mt-3"
                        label="ระบุอุปกรณ์อื่นๆ"
                        placeholder="กรุณาระบุอุปกรณ์ที่ต้องการ"
                        value={formData.equipmentOther || ''}
                        variant="bordered"
                        onChange={(e) => {
                          handleInputChange('equipmentOther', e.target.value);
                        }}
                      />
                    )}
                </div>
              </CardBody>
            </Card>

            {/* การ์ดที่ 4: รายละเอียดเพิ่มเติม */}
            <Card className={cn(CARD_STYLES.default, 'w-full')}>
              <CardHeader className="pb-0">
                <div className="flex items-center gap-2">
                  <ClipboardListIcon className="w-6 h-6 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">รายละเอียดเพิ่มเติม</h3>
                </div>
              </CardHeader>
              <CardBody className="pt-4">
                <Textarea
                  classNames={{ input: 'resize-y min-h-[40px]' }}
                  errorMessage={validationErrors.specialNotes}
                  isInvalid={!!validationErrors.specialNotes}
                  isRequired={formData.deliveryLocationDetail?.buildingName === 'โรงพยาบาลอื่น'}
                  label={
                    formData.deliveryLocationDetail?.buildingName === 'โรงพยาบาลอื่น'
                      ? 'ระบุโรงพยาบาลปลายทาง (รายละเอียดเพิ่มเติม)'
                      : 'หมายเหตุ / ข้อมูลเพิ่มเติม'
                  }
                  minRows={3}
                  name="specialNotes"
                  placeholder={
                    formData.deliveryLocationDetail?.buildingName === 'โรงพยาบาลอื่น'
                      ? 'ระบุชื่อโรงพยาบาลปลายทาง'
                      : 'ระบุข้อมูลเพิ่มเติมที่สำคัญ เช่น ข้อควรระวังพิเศษ, โรคประจำตัว, อาการพิเศษ'
                  }
                  value={formData.specialNotes}
                  variant="bordered"
                  onChange={(e) => {
                    handleInputChange('specialNotes', e.target.value);
                  }}
                />
              </CardBody>
            </Card>

            {/* การ์ดปุ่มคำสั่ง */}
            <Card className={cn(CARD_STYLES.default, 'w-full')}>
              <CardFooter className="p-3 flex justify-end gap-4">
                {editingRequestId && (
                  <Button size="md" type="button" variant="flat" onPress={handleCancelEdit}>
                    ยกเลิกการแก้ไข
                  </Button>
                )}
                {!editingRequestId && (
                  <Button size="md" type="button" variant="flat" onPress={resetForm}>
                    ล้างข้อมูล
                  </Button>
                )}
                <Button
                  color="primary"
                  isLoading={isSubmitting}
                  size="md"
                  startContent={!isSubmitting && <AmbulanceIcon className="w-5 h-5" />}
                  type="submit"
                >
                  {isSubmitting
                    ? editingRequestId
                      ? 'กำลังแก้ไขคำขอ...'
                      : 'กำลังส่งคำขอ...'
                    : editingRequestId
                      ? 'แก้ไขคำขอ'
                      : 'ส่งคำขอ'}
                </Button>
              </CardFooter>
            </Card>
          </Form>
        </Tab>
        <Tab
          key="history"
          title={
            <div className="flex items-center space-x-2">
              <ClipboardListIcon className="w-4 h-4" />
              <span>ประวัติคำขอ</span>
              {total > 0 && (
                <Chip size="sm" variant="flat">
                  {total}
                </Chip>
              )}
            </div>
          }
        >
          <div className="mt-[-8px]">
            <RequestHistoryFilters
              dateRange={dateRange}
              searchQuery={searchQuery}
              statusFilter={statusFilter}
              urgencyFilter={urgencyFilter}
              onClearFilters={handleClearFilters}
              onDateRangeChange={setDateRange}
              onSearchChange={handleSearchChange}
              onStatusChange={handleStatusFilterChange}
              onUrgencyChange={setUrgencyFilter}
            />

            {/* Table */}
            <Card className={CARD_STYLES.default}>
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <ClipboardListIcon className="w-6 h-6 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">รายการคำขอ</h2>
                  </div>
                  <Button color="success" size="md" variant="flat" onPress={refreshUserRequests}>
                    <RefreshIcon className="w-5 h-5" />
                    รีเฟรช
                  </Button>
                </div>
              </CardHeader>
              <CardBody className="pt-4">
                {isLoadingRequests ? (
                  <div className="text-center py-8 text-default-500">
                    <p>{TABLE_STYLES.loading.content}</p>
                  </div>
                ) : (
                  <>
                    <RequestHistoryTable
                      emptyContent={
                        <PorterEmptyState
                          icon={<ClipboardListIcon className="w-12 h-12" />}
                          message={
                            dateRange?.start && dateRange?.end
                              ? 'ไม่พบรายการในช่วงวันที่ที่เลือก'
                              : searchQuery.trim()
                                ? 'ไม่พบรายการที่ตรงกับคำค้นหา'
                                : urgencyFilter
                                  ? 'ไม่พบรายการตามความเร่งด่วนที่เลือก'
                                  : 'ยังไม่มีประวัติคำขอ'
                          }
                          variant={
                            (dateRange?.start && dateRange?.end) ||
                            searchQuery.trim() ||
                            urgencyFilter
                              ? 'no-results'
                              : 'no-data'
                          }
                        />
                      }
                      isLoading={isLoadingRequests}
                      items={filteredUserRequests}
                      onCancel={handleOpenCancelModal}
                      onEdit={handleEditRequest}
                    />
                    {/* Pagination */}
                    {filteredUserRequests.length > 0 && (
                      <div className="flex items-center justify-between mt-4 px-2">
                        <div
                          className={`${TABLE_STYLES.text.small} ${TABLE_STYLES.colors.secondaryText}`}
                        >
                          แสดง {filteredUserRequests.length > 0 ? 1 : 0} - {''}
                          {filteredUserRequests.length} จาก {''}
                          {(dateRange?.start && dateRange?.end) || urgencyFilter
                            ? `${filteredUserRequests.length} (กรองแล้ว)`
                            : total}{' '}
                          รายการ
                        </div>
                        {!dateRange && (
                          <Pagination
                            showControls
                            color="primary"
                            initialPage={1}
                            page={page}
                            size="sm"
                            total={totalPages}
                            onChange={handlePageChange}
                          />
                        )}
                        {!dateRange && (
                          <div className={`flex items-center ${TABLE_STYLES.spacing.gapLarge}`}>
                            <div className={`flex items-center ${TABLE_STYLES.spacing.gapMedium}`}>
                              <label
                                className={`${TABLE_STYLES.text.small} ${TABLE_STYLES.colors.secondaryText}`}
                                htmlFor="rows-per-page"
                              >
                                แสดงต่อหน้า:
                              </label>
                              <select
                                className={TABLE_STYLES.pagination.selectClass}
                                id="rows-per-page"
                                value={pageSize}
                                onChange={(e) => {
                                  handlePageSizeChange(Number.parseInt(e.target.value, 10));
                                  handlePageChange(1);
                                }}
                              >
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </CardBody>
            </Card>
          </div>
        </Tab>
      </Tabs>

      {/* Cancel Confirmation Modal */}
      <CancelJobModal
        cancelReason={cancelReason}
        errorMessage={cancelReasonError}
        isOpen={isCancelModalOpen}
        isSubmitting={isCancelling}
        onCancelReasonChange={(reason) => {
          setCancelReason(reason);
          // ล้าง error เมื่อผู้ใช้เริ่มกรอกข้อมูล
          if (cancelReasonError) {
            setCancelReasonError('');
          }
        }}
        onClose={onCancelModalClose}
        onConfirm={handleCancelJob}
      />

      {/* Job Detail Drawer - Read-only variant */}
      <ReadOnlyJobDetailDrawer
        isOpen={isJobDetailDrawerOpen}
        job={selectedJob}
        onClose={handleJobDetailDrawerClose}
      />

      {/* Emergency Confirmation Modal */}
      <EmergencyConfirmationModal
        isOpen={isEmergencyModalOpen}
        onClose={handleCancelEmergency}
        onConfirm={handleConfirmEmergency}
      />
    </div>
  );
}
