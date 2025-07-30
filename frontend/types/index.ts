import type { ReactElement } from 'react';

export interface User {
  id: string;
  email: string;
  username?: string;
  name?: string;
  role?: string;
  department?: string;
  avatar?: string;
  isActive?: boolean;
  authMethod?: string;
  displayName?: string;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

export interface NavItem {
  title: string;
  href?: string;
  disabled?: boolean;
  external?: boolean;
  icon?: ReactElement;
  label?: string;
  description?: string;
}

export interface NavItemWithChildren extends NavItem {
  items: NavItemWithChildren[];
}

export interface NavItemWithOptionalChildren extends NavItem {
  items?: NavItemWithChildren[];
}

export interface FooterItem {
  title: string;
  items: {
    title: string;
    href: string;
    external?: boolean;
  }[];
}

export type MainNavItem = NavItemWithOptionalChildren;

export type SidebarNavItem = NavItemWithChildren;

// Icon component props
export interface IconSvgProps {
  size?: number;
  width?: number;
  height?: number;
  className?: string;
  [key: string]: unknown;
}
