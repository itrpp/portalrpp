'use client';

import React from 'react';
import { Button, ButtonProps } from '@heroui/react';

interface PorterActionButtonProps extends Omit<ButtonProps, 'color' | 'variant'> {
  actionType?: 'primary' | 'danger' | 'secondary';
  ariaLabel: string; // Required สำหรับ accessibility
}

/**
 * Component สำหรับปุ่ม action ที่มีรูปแบบสอดคล้องกัน
 * ใช้ design tokens และบังคับให้มี aria-label
 */
export function PorterActionButton({
  actionType = 'secondary',
  ariaLabel,
  children,
  className,
  ...props
}: PorterActionButtonProps) {
  const colorMap = {
    primary: 'primary',
    danger: 'danger',
    secondary: 'default',
  } as const;

  const variantMap = {
    primary: 'solid',
    danger: 'solid',
    secondary: 'light',
  } as const;

  return (
    <Button
      aria-label={ariaLabel}
      className={className}
      color={colorMap[actionType]}
      variant={variantMap[actionType]}
      {...props}
    >
      {children}
    </Button>
  );
}

/**
 * Component สำหรับ icon-only button ที่มีรูปแบบสอดคล้องกัน
 */
export function PorterIconButton({
  actionType = 'secondary',
  ariaLabel,
  icon,
  ...props
}: Omit<PorterActionButtonProps, 'children'> & {
  icon: React.ReactNode;
}) {
  return (
    <PorterActionButton
      isIconOnly
      actionType={actionType}
      ariaLabel={ariaLabel}
      size="sm"
      {...props}
    >
      {icon}
    </PorterActionButton>
  );
}
