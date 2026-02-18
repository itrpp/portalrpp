'use client';

import type { UrgencyLevel } from '@/types/porter';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { addToast } from '@heroui/react';

import { porterQueryKeys } from '../../lib/queryKeys';

import { getApiGatewayBaseUrl } from '@/lib/env';
import { playNotificationSound, playSirenSound } from '@/lib/porter';


export interface UseJobListStreamOptions {
  /** เรียกเมื่อมีงานถูกลบ (ใช้ปิด drawer ถ้าเป็นงานที่เลือกอยู่) */
  onJobDeleted?: (jobId: string) => void;
}

/**
 * เชื่อมต่อ SSE stream (gRPC) เพื่อรับ real-time updates
 * เมื่อมี CREATED/UPDATED/STATUS_CHANGED/DELETED จะ invalidate React Query
 * ให้ useJobListData และ useJobListCounts โหลดข้อมูลใหม่ และแสดง toast/เสียงแจ้งเตือน
 */
export function useJobListStream(options: UseJobListStreamOptions = {}) {
  const { onJobDeleted } = options;
  const queryClient = useQueryClient();
  const onJobDeletedRef = useRef(onJobDeleted);

  onJobDeletedRef.current = onJobDeleted;

  useEffect(() => {
    let abortController: AbortController | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let isMounted = true;

    const invalidateJobLists = () => {
      void queryClient.invalidateQueries({ queryKey: porterQueryKeys.jobs.all });
    };

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
                  invalidateJobLists();

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
                  invalidateJobLists();

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
                  invalidateJobLists();
                  onJobDeletedRef.current?.(data.id);
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
  }, [queryClient]);
}
