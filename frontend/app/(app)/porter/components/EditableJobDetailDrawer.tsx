'use client';

import React from 'react';

import JobDetailDrawer from './JobDetailDrawer';

import { PorterJobItem, PorterRequestFormData } from '@/types/porter';

interface EditableJobDetailDrawerProps {
  isOpen: boolean;
  job: PorterJobItem | null;
  onClose: () => void;
  onAssignJob?: (jobId: string, staffId: string, staffName: string) => void;
  onCancelJob?: (jobId: string, cancelledReason?: string) => void;
  onCompleteJob?: (jobId: string) => void;
  onUpdateJob?: (jobId: string, updatedForm: PorterRequestFormData) => void;
  onAfterSaveSuccess?: () => void | Promise<void>;
}

/**
 * Editable variant ของ JobDetailDrawer
 * ใช้สำหรับแสดงและแก้ไขรายละเอียดงาน (สามารถมอบหมายงาน, ยกเลิก, อัปเดตได้)
 */
export function EditableJobDetailDrawer({
  isOpen,
  job,
  onClose,
  onAssignJob,
  onCancelJob,
  onCompleteJob,
  onUpdateJob,
  onAfterSaveSuccess,
}: EditableJobDetailDrawerProps) {
  return (
    <JobDetailDrawer
      isOpen={isOpen}
      job={job}
      readOnly={false}
      onAssignJob={onAssignJob}
      onCancelJob={onCancelJob}
      onClose={onClose}
      onCompleteJob={onCompleteJob}
      onUpdateJob={onUpdateJob}
      onAfterSaveSuccess={onAfterSaveSuccess}
    />
  );
}
