import React from "react";
import { Session } from "next-auth";

/**
 * ========================================
 * COMMON TYPES
 * ========================================
 * Types ที่ใช้ร่วมกันทั่วทั้งแอปพลิเคชัน
 */

/**
 * โครงสร้างข้อมูล pagination (หลีกเลี่ยงการใช้ any)
 */
export interface Pagination {
  page: number;
  limit: number;
  totalPages: number;
  totalItems: number;
}

/**
 * Props สำหรับ Upload Modal component
 */
export interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileSelect: (files: FileList | null) => void;
  onUpload: () => void;
  onUploadComplete: () => void;
}

/**
 * Props สำหรับ Sidebar component
 */
export interface SidebarProps {
  isOpen?: boolean;
  onToggle?: () => void;
}

/**
 * Item ใน Sidebar navigation
 */
export interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  count?: number;
  isNew?: boolean;
  subItems?: SidebarItem[];
}

/**
 * Section ใน Sidebar navigation
 */
export interface SidebarSection {
  title: string;
  isDisabled: boolean;
  items: SidebarItem[];
}

/**
 * Props สำหรับ Topbar component
 */
export interface TopbarProps {
  session: Session | null;
  pathname: string;
  isNavigating: boolean;
  handleNavigate: (href: string) => void;
  handleLogout: () => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

/**
 * Props สำหรับ ProfileOrgModal component
 */
export interface ProfileOrgModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

/**
 * Breadcrumb item type
 */
export interface BreadcrumbItemType {
  name: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
}

/**
 * Route configuration for breadcrumbs
 */
export interface RouteConfig {
  name: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  parent?: string;
}

/**
 * Required environment variables
 */
export interface RequiredEnvVars {
  NEXTAUTH_URL: string;
  NEXTAUTH_SECRET: string;
  LDAP_URL: string;
  LDAP_BASE_DN: string;
  LDAP_BIND_DN: string;
  LDAP_BIND_PASSWORD: string;
}

/**
 * Optional environment variables
 */
export interface OptionalEnvVars {
  LDAP_SEARCH_FILTER?: string;
  LDAP_ATTRIBUTES?: string;
  LDAP_TIMEOUT?: string;
  LDAP_CONNECT_TIMEOUT?: string;
  LDAP_IDLE_TIMEOUT?: string;
  LDAP_RECONNECT?: string;
  LINE_CLIENT_ID?: string;
  LINE_CLIENT_SECRET?: string;
}
