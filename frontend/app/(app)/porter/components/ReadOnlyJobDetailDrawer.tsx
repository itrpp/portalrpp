'use client';

import React from 'react';

import JobDetailDrawer from './JobDetailDrawer';

import { PorterJobItem } from '@/types/porter';

interface ReadOnlyJobDetailDrawerProps {
  isOpen: boolean;
  job: PorterJobItem | null;
  onClose: () => void;
}

/**
 * Read-only variant ของ JobDetailDrawer
 * ใช้สำหรับแสดงรายละเอียดงานแบบอ่านอย่างเดียว (ไม่สามารถแก้ไขได้)
 */
export function ReadOnlyJobDetailDrawer({ isOpen, job, onClose }: ReadOnlyJobDetailDrawerProps) {
  return <JobDetailDrawer isOpen={isOpen} job={job} readOnly={true} onClose={onClose} />;
}
