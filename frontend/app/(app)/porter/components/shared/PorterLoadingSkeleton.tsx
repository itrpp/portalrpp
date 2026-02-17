'use client';

import React from 'react';

import { PORTER_DESIGN_TOKENS } from './designTokens';

interface PorterLoadingSkeletonProps {
  variant?: 'table-row' | 'card' | 'form-field';
  rows?: number;
  className?: string;
}

/**
 * Component สำหรับแสดง loading skeleton ที่มีรูปแบบสอดคล้องกัน
 */
export function PorterLoadingSkeleton({
  variant = 'table-row',
  rows = 3,
  className,
}: PorterLoadingSkeletonProps) {
  if (variant === 'table-row') {
    return (
      <>
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={index}
            className={`${PORTER_DESIGN_TOKENS.colors.loadingRow} ${PORTER_DESIGN_TOKENS.spacing.cellPadding} animate-pulse border-b ${PORTER_DESIGN_TOKENS.spacing.gapMedium} ${className ?? ''}`}
          >
            <div className="h-4 bg-default-200 rounded w-3/4 mb-2" />
            <div className="h-4 bg-default-200 rounded w-1/2" />
          </div>
        ))}
      </>
    );
  }

  if (variant === 'card') {
    return (
      <div
        className={`${PORTER_DESIGN_TOKENS.spacing.cardPadding} ${PORTER_DESIGN_TOKENS.borderRadius.md} border border-default-200 animate-pulse ${className ?? ''}`}
      >
        <div className="h-6 bg-default-200 rounded w-1/3 mb-4" />
        <div className="space-y-2">
          {Array.from({ length: rows }).map((_, index) => (
            <div key={index} className="h-4 bg-default-200 rounded w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'form-field') {
    return (
      <div className={`space-y-2 ${className ?? ''}`}>
        <div className="h-4 bg-default-200 rounded w-1/4 animate-pulse" />
        <div className="h-10 bg-default-200 rounded w-full animate-pulse" />
      </div>
    );
  }

  return null;
}
