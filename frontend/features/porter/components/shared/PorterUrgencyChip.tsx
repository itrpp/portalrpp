'use client';

import React from 'react';
import { Chip } from '@heroui/react';

import { getUrgencyColor } from './designTokens';

interface PorterUrgencyChipProps {
  urgencyLevel: string;
  size?: 'sm' | 'md';
  variant?: 'flat' | 'bordered';
  className?: string;
}

export function PorterUrgencyChip({
  urgencyLevel,
  size = 'sm',
  variant = 'flat',
  className,
}: PorterUrgencyChipProps) {
  const color = getUrgencyColor(urgencyLevel);
  const displayLabel = urgencyLevel || 'ปกติ';

  return (
    <Chip className={className} color={color} size={size} variant={variant}>
      {displayLabel}
    </Chip>
  );
}
