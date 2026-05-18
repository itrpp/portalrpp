'use client';

import React, { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Chip, Tab, Tabs, addToast } from '@heroui/react';
import { useSession } from 'next-auth/react';

import { useDepartmentName } from '../hooks/useDepartmentsMap';

import { PorterRequestForm } from './components/PorterRequestForm';
import { RequestHistoryTab } from './components/RequestHistoryTab';
import { useDateRangeFilter } from './hooks/useDateRangeFilter';
import { usePorterPageState } from './hooks/usePorterPageState';
import { usePorterRequestForm } from './hooks/usePorterRequestForm';
import { usePorterUrlSync } from './hooks/usePorterUrlSync';
import { useUserRequests } from './hooks/useUserRequests';

import { getApiErrorMessage } from '@/lib/errorMessages';
import { EDITABLE_STATUSES, PORTER_STATUS, URGENCY_OPTIONS } from '@/lib/porter';
import { PorterRequestFormData } from '@/types/porter';
import { AmbulanceIcon, ClipboardListIcon } from '@/components/ui/icons';

const CancelJobModal = dynamic(
  () => import('../components/CancelJobModal').then((m) => m.default),
  { ssr: false },
);
const ReadOnlyJobDetailDrawer = dynamic(
  () =>
    import('../components/ReadOnlyJobDetailDrawer').then((m) => ({
      default: m.ReadOnlyJobDetailDrawer,
    })),
  { ssr: false },
);
const EmergencyConfirmationModal = dynamic(
  () => import('../components/EmergencyConfirmationModal').then((m) => m.default),
  { ssr: false },
);

interface PorterApiResult {
  success: boolean;
  data?: unknown;
  error?: string;
  message?: string;
}

export default function PorterRequestPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();

  // อ่าน URL params เป็น initial values เท่านั้น (ผ่าน ref เพื่อไม่ trigger re-render)
  const initialUrlValuesRef = React.useRef({
    status: searchParams.get('status'),
    search: searchParams.get('search') ?? '',
    dateFrom: searchParams.get('dateFrom'),
    dateTo: searchParams.get('dateTo'),
    urgency: searchParams.get('urgency'),
    page: searchParams.get('page'),
  });
  const initialUrlValues = initialUrlValuesRef.current;

  const form = usePorterRequestForm({
    requesterName: session?.user?.name ?? undefined,
    requesterPhone: session?.user?.phone ?? undefined,
    requesterDepartment: session?.user?.departmentSubSubId ?? undefined,
  });
  const { formData, setFormField, loadRequestForEdit } = form;

  // Sync หน่วยงานจาก session
  useEffect(() => {
    const departmentSubSubId = session?.user?.departmentSubSubId;

    if (departmentSubSubId && !formData.requesterDepartment) {
      setFormField('requesterDepartment', departmentSubSubId);
    }
  }, [session?.user, formData.requesterDepartment, setFormField]);

  const requesterDepartmentName = useDepartmentName(formData.requesterDepartment);

  const initialPage = (() => {
    if (!initialUrlValues.page) return undefined;
    const n = Number.parseInt(initialUrlValues.page, 10);

    return Number.isNaN(n) || n <= 0 ? undefined : n;
  })();

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
    debouncedSearchQuery,
    handlePageChange,
    handlePageSizeChange,
    handleStatusFilterChange,
    handleSearchChange,
  } = useUserRequests({
    userId: session?.user?.id,
    initialPage,
    initialStatus: initialUrlValues.status ?? undefined,
    initialSearch: initialUrlValues.search,
  });

  const { dateRange, setDateRange } = useDateRangeFilter({
    initialFrom: initialUrlValues.dateFrom,
    initialTo: initialUrlValues.dateTo,
  });

  const [urgencyFilter, setUrgencyFilter] = useState<string>(() => {
    const v = initialUrlValues.urgency;

    return v && URGENCY_OPTIONS.some((o) => o.value === v) ? v : '';
  });

  usePorterUrlSync({
    statusFilter,
    debouncedSearchQuery,
    dateRange,
    urgencyFilter,
    page,
  });

  const pageState = usePorterPageState();
  const {
    selectedTab,
    setSelectedTab,
    cancelModal,
    selectedRequestId,
    setSelectedRequestId,
    cancelReason,
    setCancelReason,
    cancelReasonError,
    setCancelReasonError,
    isCancelling,
    setIsCancelling,
    openCancelModal,
    jobDetailDrawer,
    selectedJob,
    closeJobDetailDrawer,
    emergencyModal,
    pendingUrgencyLevel,
    setPendingUrgencyLevel,
  } = pageState;

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

      if (!EDITABLE_STATUSES.includes(request.status)) {
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
    [userRequests, loadRequestForEdit, setSelectedTab],
  );

  const handleEmergencyConfirm = useCallback(
    (urgencyLevel: string) => {
      setPendingUrgencyLevel(urgencyLevel);
      emergencyModal.onOpen();
    },
    [emergencyModal, setPendingUrgencyLevel],
  );

  const confirmEmergency = useCallback(() => {
    if (pendingUrgencyLevel) {
      setFormField(
        'urgencyLevel',
        pendingUrgencyLevel as PorterRequestFormData['urgencyLevel'],
      );
    }
    setPendingUrgencyLevel(null);
    emergencyModal.onClose();
  }, [pendingUrgencyLevel, setPendingUrgencyLevel, setFormField, emergencyModal]);

  const cancelEmergency = useCallback(() => {
    setPendingUrgencyLevel(null);
    emergencyModal.onClose();
  }, [emergencyModal, setPendingUrgencyLevel]);

  const handleClearFilters = useCallback(() => {
    setDateRange(null);
    handleSearchChange('');
    handleStatusFilterChange(null);
    setUrgencyFilter('');
  }, [setDateRange, handleSearchChange, handleStatusFilterChange]);

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
          status: PORTER_STATUS.CANCELLED,
          cancelledReason: cancelReason.trim() || undefined,
        }),
      });
      const result = (await response.json()) as PorterApiResult;

      if (result.success) {
        addToast({
          title: 'ยกเลิกงานสำเร็จ',
          description: 'งานนี้ได้ถูกยกเลิกเรียบร้อยแล้ว',
          color: 'success',
        });
        cancelModal.onClose();
        setSelectedRequestId(null);
        setCancelReason('');
        await refreshUserRequests();
      } else {
        addToast({
          title: 'เกิดข้อผิดพลาด',
          description: getApiErrorMessage(result.error, result.message),
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
  }, [
    selectedRequestId,
    cancelReason,
    cancelModal,
    refreshUserRequests,
    setIsCancelling,
    setSelectedRequestId,
    setCancelReason,
    setCancelReasonError,
  ]);

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
          <PorterRequestForm
            form={form}
            requesterDepartmentName={requesterDepartmentName ?? undefined}
            onEmergencyConfirm={handleEmergencyConfirm}
            onSubmitted={async () => {
              await refreshUserRequests();
            }}
          />
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
          <RequestHistoryTab
            dateRange={dateRange}
            isLoadingRequests={isLoadingRequests}
            page={page}
            pageSize={pageSize}
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            total={total}
            totalPages={totalPages}
            urgencyFilter={urgencyFilter}
            userRequests={userRequests}
            onCancel={openCancelModal}
            onClearFilters={handleClearFilters}
            onDateRangeChange={setDateRange}
            onEdit={handleEditRequest}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onRefresh={refreshUserRequests}
            onSearchChange={handleSearchChange}
            onStatusChange={handleStatusFilterChange}
            onUrgencyChange={setUrgencyFilter}
          />
        </Tab>
      </Tabs>

      <CancelJobModal
        cancelReason={cancelReason}
        errorMessage={cancelReasonError}
        isOpen={cancelModal.isOpen}
        isSubmitting={isCancelling}
        onCancelReasonChange={(reason) => {
          setCancelReason(reason);
          if (cancelReasonError) setCancelReasonError('');
        }}
        onClose={cancelModal.onClose}
        onConfirm={handleCancelJob}
      />

      <ReadOnlyJobDetailDrawer
        isOpen={jobDetailDrawer.isOpen}
        job={selectedJob}
        onClose={closeJobDetailDrawer}
      />

      <EmergencyConfirmationModal
        isOpen={emergencyModal.isOpen}
        onClose={cancelEmergency}
        onConfirm={confirmEmergency}
      />
    </div>
  );
}
