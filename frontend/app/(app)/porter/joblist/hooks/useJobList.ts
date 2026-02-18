'use client';

import type { CalendarDate } from '@internationalized/date';
import type { Selection } from '@react-types/shared';
import type {
  JobListTab,
  PorterJobItem,
  PorterRequestFormData,
  UrgencyLevel,
} from '@/types/porter';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { addToast } from '@heroui/react';

import { getApiGatewayBaseUrl } from '@/lib/env';
import { sortJobs, playNotificationSound, playSirenSound } from '@/lib/porter';

function toDateOnly(value: CalendarDate | null): Date | null {
  if (!value) return null;

  return new Date(value.year, value.month - 1, value.day);
}

function isWaitingStatus(status: string | undefined | null): boolean {
  return status === 'WAITING_CENTER';
}
function isInProgressStatus(status: string | undefined | null): boolean {
  return status === 'IN_PROGRESS' || status === 'WAITING_ACCEPT';
}
function isCompletedStatus(status: string | undefined | null): boolean {
  return status === 'COMPLETED';
}
function isCancelledStatus(status: string | undefined | null): boolean {
  return status === 'CANCELLED';
}

export interface UseJobListOptions {
  selectedTab: JobListTab;
}

export function useJobList({ selectedTab }: UseJobListOptions) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [selectedJob, setSelectedJob] = useState<PorterJobItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [jobList, setJobList] = useState<PorterJobItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [completedStartDate, setCompletedStartDate] =
    useState<CalendarDate | null>(null);
  const [completedEndDate, setCompletedEndDate] =
    useState<CalendarDate | null>(null);
  const [cancelledStartDate, setCancelledStartDate] =
    useState<CalendarDate | null>(null);
  const [cancelledEndDate, setCancelledEndDate] =
    useState<CalendarDate | null>(null);

  const fetchPorterRequests = useCallback(async (status?: JobListTab) => {
    setIsLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();

      if (status) {
        queryParams.append('status', status);
      }
      queryParams.append('page_size', '1000');

      const response = await fetch(`/api/porter/requests?${queryParams.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();

        throw new Error(
          errorData.message || 'ไม่สามารถโหลดข้อมูลรายการคำขอได้',
        );
      }

      const result = await response.json();

      if (result.success && result.data) {
        setJobList(result.data as PorterJobItem[]);
      } else {
        throw new Error('รูปแบบข้อมูลไม่ถูกต้อง');
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล';

      setError(errorMessage);
      addToast({
        title: 'เกิดข้อผิดพลาด',
        description: errorMessage,
        color: 'danger',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPorterRequests();
  }, [fetchPorterRequests]);

  useEffect(() => {
    let abortController: AbortController | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let isMounted = true;

    const connectSSE = async () => {
      if (!isMounted) return;

      try {
        const params = new URLSearchParams();
        const useDirectConnection =
          process.env.NEXT_PUBLIC_USE_DIRECT_SSE === 'true';
        const apiGatewayUrl = getApiGatewayBaseUrl();

        let streamUrl: string;
        let headers: HeadersInit = {};

        if (useDirectConnection) {
          try {
            const tokenResponse = await fetch('/api/porter/requests/token');
            const tokenData = await tokenResponse.json();

            if (!tokenData.token) throw new Error('Failed to get stream token');
            streamUrl = `${apiGatewayUrl}/api-gateway/porter/requests/stream?${params.toString()}`;
            headers = { Authorization: `Bearer ${tokenData.token}` };
          } catch {
            streamUrl = `/api/porter/requests/stream?${params.toString()}`;
          }
        } else {
          streamUrl = `/api/porter/requests/stream?${params.toString()}`;
        }

        const response = await fetch(streamUrl, {
          signal: abortController?.signal,
          headers,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) throw new Error('No reader available');

        let buffer = '';

        while (isMounted) {
          const { done, value } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');

          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim() || line.startsWith(': ')) continue;

            if (line.startsWith('data: ')) {
              try {
                const jsonData = line.slice(6);

                if (!jsonData.trim()) continue;

                const updateData = JSON.parse(jsonData);

                if (!updateData.type || !updateData.data) continue;

                const { type, data } = updateData;

                if (type === 'CREATED') {
                  setJobList((prevList) => {
                    if (prevList.some((job) => job.id === data.id))
                      return prevList;

                    return [...prevList, data];
                  });

                  const urgencyLevel = data.form?.urgencyLevel as
                    | UrgencyLevel
                    | undefined;

                  if (urgencyLevel === 'ฉุกเฉิน') {
                    playSirenSound();
                    addToast({
                      title: 'มีคำขอใหม่ - ฉุกเฉิน',
                      description: `คำขอฉุกเฉินจาก ${data.form?.requesterName || 'ไม่ระบุ'} (HN: ${data.form?.patientHN || 'ไม่ระบุ'})`,
                      color: 'danger',
                    });
                  } else if (
                    urgencyLevel === 'ด่วน' ||
                    urgencyLevel === 'ปกติ'
                  ) {
                    playNotificationSound();
                    const urgencyText =
                      urgencyLevel === 'ด่วน' ? 'ด่วน' : 'ปกติ';

                    addToast({
                      title: `มีคำขอใหม่ - ${urgencyText}`,
                      description: `คำขอ${urgencyText}จาก ${data.form?.requesterName || 'ไม่ระบุ'} (HN: ${data.form?.patientHN || 'ไม่ระบุ'})`,
                      color: urgencyLevel === 'ด่วน' ? 'warning' : 'success',
                    });
                  } else {
                    playNotificationSound();
                    addToast({
                      title: 'มีคำขอใหม่',
                      description: `คำขอจาก ${data.form?.requesterName || 'ไม่ระบุ'} ได้รับการเพิ่มแล้ว`,
                      color: 'success',
                    });
                  }
                } else if (type === 'UPDATED' || type === 'STATUS_CHANGED') {
                  setJobList((prevList) =>
                    prevList.map((job) => (job.id === data.id ? data : job)),
                  );
                  setSelectedJob((prev) =>
                    prev?.id === data.id ? data : prev,
                  );

                  if (type === 'STATUS_CHANGED') {
                    const statusText =
                      data.status === 'WAITING_CENTER'
                        ? 'รอศูนย์เปลรับงาน'
                        : data.status === 'WAITING_ACCEPT'
                          ? 'รอผู้ปฏิบัติรับงาน'
                          : data.status === 'IN_PROGRESS'
                            ? 'กำลังดำเนินการ'
                            : data.status === 'COMPLETED'
                              ? 'เสร็จสิ้น'
                              : 'ยกเลิก';
                    const urgencyLevel = data.form?.urgencyLevel as
                      | UrgencyLevel
                      | undefined;

                    if (urgencyLevel === 'ฉุกเฉิน') {
                      addToast({
                        title: 'สถานะเปลี่ยน - ฉุกเฉิน',
                        description: `สถานะของคำขอฉุกเฉิน (HN: ${data.form?.patientHN || 'ไม่ระบุ'}) เปลี่ยนเป็น ${statusText}`,
                        color: 'danger',
                      });
                    } else if (
                      urgencyLevel === 'ด่วน' ||
                      urgencyLevel === 'ปกติ'
                    ) {
                      addToast({
                        title: `สถานะเปลี่ยน - ${urgencyLevel === 'ด่วน' ? 'ด่วน' : 'ปกติ'}`,
                        description: `สถานะของคำขอ (HN: ${data.form?.patientHN || 'ไม่ระบุ'}) เปลี่ยนเป็น ${statusText}`,
                        color: urgencyLevel === 'ด่วน' ? 'warning' : 'primary',
                      });
                    } else {
                      addToast({
                        title: 'สถานะเปลี่ยน',
                        description: `สถานะของคำขอ ${data.form?.patientHN || 'ไม่ระบุ'} เปลี่ยนเป็น ${statusText}`,
                        color: 'primary',
                      });
                    }
                  }
                } else if (type === 'DELETED') {
                  setJobList((prev) => prev.filter((job) => job.id !== data.id));
                  if (selectedJob?.id === data.id) {
                    setIsDrawerOpen(false);
                    setSelectedJob(null);
                    setSelectedKeys(new Set());
                  }
                }
              } catch {
                // Skip malformed SSE message
              }
            }
          }
        }

        if (isMounted) {
          reconnectTimeout = setTimeout(() => {
            if (isMounted) connectSSE();
          }, 3000);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        if (isMounted) {
          reconnectTimeout = setTimeout(() => {
            if (isMounted) connectSSE();
          }, 3000);
        }
      }
    };

    abortController = new AbortController();
    connectSSE();

    return () => {
      isMounted = false;
      abortController?.abort();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [selectedJob]);

  const waitingCount = useMemo(
    () => jobList.filter((j) => isWaitingStatus(j.status)).length,
    [jobList],
  );
  const inProgressCount = useMemo(
    () => jobList.filter((j) => isInProgressStatus(j.status)).length,
    [jobList],
  );
  const completedCount = useMemo(
    () => jobList.filter((j) => isCompletedStatus(j.status)).length,
    [jobList],
  );
  const cancelledCount = useMemo(
    () => jobList.filter((j) => isCancelledStatus(j.status)).length,
    [jobList],
  );

  const filteredJobs = useMemo(() => {
    let filtered = jobList.filter((job) => {
      if (selectedTab === 'waiting') return isWaitingStatus(job.status);
      if (selectedTab === 'in-progress') return isInProgressStatus(job.status);
      if (selectedTab === 'completed') return isCompletedStatus(job.status);
      if (selectedTab === 'cancelled') return isCancelledStatus(job.status);

      return false;
    });

    if (selectedTab === 'completed' && (completedStartDate || completedEndDate)) {
      filtered = filtered.filter((job) => {
        if (!job.completedAt) return false;
        const jobDate = new Date(job.completedAt);
        const jobDateOnly = new Date(
          jobDate.getFullYear(),
          jobDate.getMonth(),
          jobDate.getDate(),
        );

        if (completedStartDate) {
          const start = toDateOnly(completedStartDate);

          if (start && jobDateOnly < start) return false;
        }
        if (completedEndDate) {
          const end = toDateOnly(completedEndDate);

          if (end && jobDateOnly > end) return false;
        }

        return true;
      });
    }

    if (selectedTab === 'cancelled' && (cancelledStartDate || cancelledEndDate)) {
      filtered = filtered.filter((job) => {
        if (!job.cancelledAt) return false;
        const jobDate = new Date(job.cancelledAt);
        const jobDateOnly = new Date(
          jobDate.getFullYear(),
          jobDate.getMonth(),
          jobDate.getDate(),
        );

        if (cancelledStartDate) {
          const start = toDateOnly(cancelledStartDate);

          if (start && jobDateOnly < start) return false;
        }
        if (cancelledEndDate) {
          const end = toDateOnly(cancelledEndDate);

          if (end && jobDateOnly > end) return false;
        }

        return true;
      });
    }

    return filtered;
  }, [
    jobList,
    selectedTab,
    completedStartDate,
    completedEndDate,
    cancelledStartDate,
    cancelledEndDate,
  ]);

  const sortedJobs = useMemo(
    () => sortJobs(filteredJobs, selectedTab),
    [filteredJobs, selectedTab],
  );

  const clearCompletedDateFilter = useCallback(() => {
    setCompletedStartDate(null);
    setCompletedEndDate(null);
  }, []);

  const clearCancelledDateFilter = useCallback(() => {
    setCancelledStartDate(null);
    setCancelledEndDate(null);
  }, []);

  const handleRefresh = useCallback(() => {
    fetchPorterRequests();
  }, [fetchPorterRequests]);

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
        const selectedKey = Array.from(keysSet)[0];
        const job = sortedJobs.find((item) => item.id === selectedKey);

        if (job) {
          setSelectedJob(job);
          setIsDrawerOpen(true);
        }
      } else {
        setSelectedJob(null);
        setIsDrawerOpen(false);
      }
    },
    [sortedJobs],
  );

  const handleCloseDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    setSelectedKeys(new Set());
    setSelectedJob(null);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedKeys(new Set());
    setSelectedJob(null);
    setIsDrawerOpen(false);
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
          setJobList((prev) =>
            prev.map((job) => (job.id === jobId ? result.data : job)),
          );
          setSelectedJob((prev) => (prev?.id === jobId ? result.data : prev));
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
    [],
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
          setJobList((prev) =>
            prev.map((job) => (job.id === jobId ? result.data : job)),
          );
          setSelectedJob((prev) => (prev?.id === jobId ? result.data : prev));
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
    [],
  );

  const handleCompleteJob = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/porter/requests/${jobId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      const result = await response.json();

      if (result.success && result.data) {
        setJobList((prev) =>
          prev.map((job) => (job.id === jobId ? result.data : job)),
        );
        setSelectedJob((prev) => (prev?.id === jobId ? result.data : prev));
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
  }, []);

  const handleUpdateJob = useCallback(
    (jobId: string, updatedForm: PorterRequestFormData) => {
      setJobList((prev) =>
        prev.map((job) =>
          job.id === jobId ? { ...job, form: updatedForm } : job,
        ),
      );
      setSelectedJob((prev) =>
        prev?.id === jobId ? { ...prev, form: updatedForm } : prev,
      );
    },
    [],
  );

  return {
    jobList,
    isLoading,
    error,
    selectedJob,
    selectedKeys,
    isDrawerOpen,
    completedStartDate,
    setCompletedStartDate,
    completedEndDate,
    setCompletedEndDate,
    cancelledStartDate,
    setCancelledStartDate,
    cancelledEndDate,
    setCancelledEndDate,
    toDateOnly,
    waitingCount,
    inProgressCount,
    completedCount,
    cancelledCount,
    filteredJobs,
    sortedJobs,
    clearCompletedDateFilter,
    clearCancelledDateFilter,
    handleRefresh,
    handleSelectionChange,
    handleCloseDrawer,
    handleAssignJob,
    handleCancelJob,
    handleCompleteJob,
    handleUpdateJob,
    clearSelection,
  };
}
