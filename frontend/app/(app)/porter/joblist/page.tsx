'use client';

import type { Selection } from '@react-types/shared';
import type {
  JobListTab,
  PorterJobItem,
  PorterRequestFormData,
} from '@/types/porter';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import {
  Card,
  CardBody,
  Chip,
  Tabs,
  Tab,
  addToast,
} from '@heroui/react';
import { CalendarDate } from '@internationalized/date';
import { RangeValue } from '@react-types/shared';

import { PorterEmptyState } from '../components';
import { CurrentTimeDisplay } from '../components/CurrentTimeDisplay';

const EditableJobDetailDrawer = dynamic(
  () =>
    import('../components').then((m) => ({
      default: m.EditableJobDetailDrawer,
    })),
  { ssr: false },
);

import { JobListFilters, JobListTableCard } from './components';
import { isValidJobListTab } from './constants';
import { useJobListCounts } from './hooks/useJobListCounts';
import { useJobListData } from './hooks/useJobListData';
import { useJobListStream } from './hooks/useJobListStream';

import {
  ClockIcon,
  ClipboardListIcon,
  XMarkIcon,
  CheckCircleIcon,
} from '@/components/ui/icons';
import { CARD_STYLES } from '@/lib/cardStyles';
import { cn } from '@/lib/utils';

export default function JobListClient() {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const initialTab = isValidJobListTab(tabFromUrl) ? tabFromUrl : 'waiting';

  const [selectedTab, setSelectedTab] = useState<JobListTab>(initialTab);

  // Filter states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState<RangeValue<CalendarDate> | null>(
    null,
  );
  const [staffNameFilter, setStaffNameFilter] = useState<string>('');

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [selectedJob, setSelectedJob] = useState<PorterJobItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const counts = useJobListCounts({
    search: searchQuery.trim() || null,
    urgencyLevel: urgencyFilter || null,
    dateRange,
    staffNameFilter: staffNameFilter.trim() || null,
  });
  const jobListData = useJobListData({
    selectedTab,
    search: searchQuery.trim() || null,
    urgencyLevel: urgencyFilter || null,
    dateRange,
    staffNameFilter: staffNameFilter.trim() || null,
  });

  const handleJobDeleted = useCallback((jobId: string) => {
    setSelectedJob((prev) => {
      if (prev?.id === jobId) {
        setIsDrawerOpen(false);

        setSelectedKeys(new Set());

        return null;
      }

      return prev;
    });
  }, []);

  useJobListStream({ onJobDeleted: handleJobDeleted });

  const {
    items,
    sortedJobs,
    total,
    totalPages,
    page,
    pageSize,
    startIndex,
    endIndex,
    isLoading,
    isFetching,
    error,
    refetch,
    onPageChange,
    onPageSizeChange,
  } = jobListData;

  // Sync state from URL when URL changes (e.g. initial load with ?tab=... or browser back/forward).
  // Tab clicks do not update URL; only this effect reads URL → state.
  useEffect(() => {
    if (isValidJobListTab(tabFromUrl)) {
      setSelectedTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const handleTabChange = useCallback((key: React.Key) => {
    const tab = key as JobListTab;

    setSelectedTab(tab);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setUrgencyFilter('');
    setDateRange(null);
    setStaffNameFilter('');
    onPageChange(1);
  }, [onPageChange]);

  const handleSelectionChange = useCallback(
    (keys: Selection) => {
      if (keys === 'all') {
        setSelectedKeys(new Set());
        setSelectedJob(null);
        setIsDrawerOpen(false);

        return;
      }

      const keysSet = keys as Set<string>;

      setSelectedKeys(keysSet);
      if (keysSet.size > 0) {
        const id = Array.from(keysSet)[0];
        const job = items.find((item) => item.id === id);

        if (job) {
          setSelectedJob(job);
          setIsDrawerOpen(true);
        }
      } else {
        setSelectedJob(null);
        setIsDrawerOpen(false);
      }
    },
    [items],
  );

  const handleCloseDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    setSelectedKeys(new Set());
  }, []);

  const handleAssignJob = useCallback(
    async (jobId: string, staffId: string, staffName: string) => {
      try {
        const response = await fetch(`/api/porter/requests/${jobId}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'WAITING_ACCEPT',
            assignedToId: staffId,
          }),
        });
        const result = await response.json();

        if (result.success && result.data) {
          setSelectedJob(result.data);
          await refetch();
          addToast({
            title: 'มอบหมายสำเร็จ',
            description: `มอบหมายให้ ${staffName} แล้ว รอผู้ปฏิบัติรับงาน`,
            color: 'success',
          });
        } else {
          addToast({
            title: 'เกิดข้อผิดพลาด',
            description: result.message || 'ไม่สามารถมอบหมายงานได้',
            color: 'danger',
          });
        }
      } catch {
        addToast({
          title: 'เกิดข้อผิดพลาด',
          description: 'ไม่สามารถมอบหมายงานได้',
          color: 'danger',
        });
      }
    },
    [refetch],
  );

  const handleCancelJob = useCallback(
    async (jobId: string, cancelledReason?: string) => {
      try {
        const response = await fetch(`/api/porter/requests/${jobId}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'CANCELLED',
            cancelledReason: cancelledReason || undefined,
          }),
        });
        const result = await response.json();

        if (result.success && result.data) {
          setSelectedJob(result.data);
          await refetch();
          addToast({
            title: 'ยกเลิกงานสำเร็จ',
            description: 'ยกเลิกงานสำเร็จ',
            color: 'success',
          });
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
      }
    },
    [refetch],
  );

  const handleCompleteJob = useCallback(
    async (jobId: string) => {
      try {
        const response = await fetch(`/api/porter/requests/${jobId}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'COMPLETED' }),
        });
        const result = await response.json();

        if (result.success && result.data) {
          setSelectedJob(result.data);
          await refetch();
          addToast({
            title: 'ทำเสร็จสิ้นงานสำเร็จ',
            description: 'ทำเสร็จสิ้นงานสำเร็จ',
            color: 'success',
          });
        } else {
          addToast({
            title: 'เกิดข้อผิดพลาด',
            description: result.message || 'ไม่สามารถทำเสร็จสิ้นงานได้',
            color: 'danger',
          });
        }
      } catch {
        addToast({
          title: 'เกิดข้อผิดพลาด',
          description: 'ไม่สามารถทำเสร็จสิ้นงานได้',
          color: 'danger',
        });
      }
    },
    [refetch],
  );

  const handleUpdateJob = useCallback(
    (jobId: string, updatedForm: PorterRequestFormData) => {
      setSelectedJob((prev) =>
        prev?.id === jobId ? { ...prev, form: updatedForm } : prev,
      );
    },
    [],
  );

  const emptyContentNode = useMemo(
    () => (
      <PorterEmptyState
        message="ไม่มีรายการคำขอในหมวดนี้"
        variant="no-data"
      />
    ),
    [],
  );

  const tableSectionCommon = useMemo(
    () => ({
      items,
      sortedJobs,
      total,
      totalPages,
      page,
      pageSize,
      startIndex,
      endIndex,
      isLoading,
      isFetching,
      selectedKeys,
      onPageChange,
      onPageSizeChange,
      onSelectionChange: handleSelectionChange,
      onRefresh: refetch,
      emptyContent: emptyContentNode,
    }),
    [
      items,
      sortedJobs,
      total,
      totalPages,
      page,
      pageSize,
      startIndex,
      endIndex,
      isLoading,
      isFetching,
      selectedKeys,
      onPageChange,
      onPageSizeChange,
      handleSelectionChange,
      refetch,
      emptyContentNode,
    ],
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            รายการคำขอรับพนักงานเปล
          </h1>
        </div>
        <div className="flex items-center space-x-2 text-default-600">
          <ClockIcon aria-hidden className="w-5 h-5" />
          <div className="text-sm font-medium">
            <CurrentTimeDisplay />
          </div>
        </div>
      </div>

      <div className="min-w-0 overflow-x-auto">
        <JobListFilters
          dateRange={dateRange}
          searchQuery={searchQuery}
          staffNameFilter={staffNameFilter}
          urgencyFilter={urgencyFilter}
          onClearFilters={handleClearFilters}
          onDateRangeChange={setDateRange}
          onPageReset={() => onPageChange(1)}
          onSearchChange={setSearchQuery}
          onStaffNameChange={setStaffNameFilter}
          onUrgencyChange={setUrgencyFilter}
        />
      </div>

      <div className="mt-8">
        <Card className={CARD_STYLES.highlight}>
          <CardBody>
            {error && !isLoading && (
              <PorterEmptyState
                icon={<XMarkIcon className="w-12 h-12 text-danger" />}
                message={error}
                variant="error"
              />
            )}
            {!error && (
              <>
                <Tabs
                  aria-label="รายการคำขอ"
                  classNames={{
                    tabList: 'w-full',
                    tab: 'data-[selected=true]:bg-primary-500 data-[selected=true]:text-white data-[selected=true]:hover:bg-primary/80',
                  }}
                  color="primary"
                  selectedKey={selectedTab}
                  size="lg"
                  variant="bordered"
                  onSelectionChange={handleTabChange}
                >
                  <Tab
                    key="waiting"
                    title={
                      <div className="flex items-center justify-center space-x-2">
                        <ClipboardListIcon className="w-4 h-4" />
                        <span>รอศูนย์เปลรับงาน</span>
                        <Chip
                          color="danger"
                          size="sm"
                          variant={
                            selectedTab === 'waiting' ? 'solid' : 'bordered'
                          }
                        >
                          {counts.waitingCount}
                        </Chip>
                      </div>
                    }
                  />
                  <Tab
                    key="in-progress"
                    title={
                      <div className="flex items-center justify-center space-x-2">
                        <ClockIcon className="w-4 h-4" />
                        <span>กำลังดำเนินการ</span>
                        <Chip
                          color="warning"
                          size="sm"
                          variant={
                            selectedTab === 'in-progress'
                              ? 'solid'
                              : 'bordered'
                          }
                        >
                          {counts.inProgressCount}
                        </Chip>
                      </div>
                    }
                  />
                  <Tab
                    key="completed"
                    title={
                      <div className="flex items-center justify-center space-x-2">
                        <CheckCircleIcon className="w-4 h-4" />
                        <span>เสร็จสิ้น</span>
                        <Chip
                          color="success"
                          size="sm"
                          variant={
                            selectedTab === 'completed'
                              ? 'solid'
                              : 'bordered'
                          }
                        >
                          {counts.completedCount}
                        </Chip>
                      </div>
                    }
                  />
                  <Tab
                    key="cancelled"
                    title={
                      <div className="flex items-center justify-center space-x-2">
                        <XMarkIcon className="w-4 h-4" />
                        <span>ยกเลิก</span>
                        <Chip
                          color="danger"
                          size="sm"
                          variant={
                            selectedTab === 'cancelled'
                              ? 'solid'
                              : 'bordered'
                          }
                        >
                          {counts.cancelledCount}
                        </Chip>
                      </div>
                    }
                  />
                </Tabs>
                <div className={cn('mt-4', 'space-y-4')}>
                  <JobListTableCard
                    {...tableSectionCommon}
                    paginationId={`rows-per-page-${selectedTab}`}
                  />
                </div>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      <EditableJobDetailDrawer
        isOpen={isDrawerOpen}
        job={selectedJob}
        onAssignJob={handleAssignJob}
        onCancelJob={handleCancelJob}
        onClose={handleCloseDrawer}
        onCompleteJob={handleCompleteJob}
        onUpdateJob={handleUpdateJob}
      />
    </div>
  );
}
