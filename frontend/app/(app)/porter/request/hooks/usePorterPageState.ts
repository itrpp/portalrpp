import { useCallback, useState } from 'react';
import { useDisclosure } from '@heroui/react';

import { PorterJobItem } from '@/types/porter';

/**
 * รวม UI state ที่ไม่เกี่ยวกับฟอร์ม: tab, modals, selected items
 */
export function usePorterPageState() {
  const [selectedTab, setSelectedTab] = useState<string>('form');

  // Cancel job state
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [cancelReasonError, setCancelReasonError] = useState<string>('');
  const [isCancelling, setIsCancelling] = useState(false);
  const cancelModal = useDisclosure();

  // Job detail drawer
  const [selectedJob, setSelectedJob] = useState<PorterJobItem | null>(null);
  const jobDetailDrawer = useDisclosure();

  // Emergency confirmation
  const [pendingUrgencyLevel, setPendingUrgencyLevel] = useState<string | null>(null);
  const emergencyModal = useDisclosure();

  const openCancelModal = useCallback(
    (requestId: string) => {
      setSelectedRequestId(requestId);
      setCancelReason('');
      setCancelReasonError('');
      cancelModal.onOpen();
    },
    [cancelModal],
  );

  const closeJobDetailDrawer = useCallback(() => {
    jobDetailDrawer.onClose();
    setSelectedJob(null);
  }, [jobDetailDrawer]);

  return {
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
    setSelectedJob,
    closeJobDetailDrawer,

    emergencyModal,
    pendingUrgencyLevel,
    setPendingUrgencyLevel,
  };
}
