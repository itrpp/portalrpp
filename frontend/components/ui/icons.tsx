import { Icon as IconifyIcon } from '@iconify/react';

import { cn } from '@/lib/utils';

interface IconProps {
  /** ขนาดของ icon (default: 24) */
  size?: number | string;
  /** สีของ icon */
  color?: string;
  /** CSS class เพิ่มเติม */
  className?: string;
  /** การหมุน icon (degrees) */
  rotate?: number;
  /** การพลิก icon */
  flip?: 'horizontal' | 'vertical' | 'both';
  /** Props อื่นๆ ที่จะส่งต่อให้ IconifyIcon */
  [key: string]: any;
}

// Navigation Icons
export const HomeIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:home"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

export const DashboardIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:dashboard"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

export const SettingsIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:settings"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

export const ProfileIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:user"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

export const GlobeAltIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:world"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

export const UserIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:user"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

// Auth Icons
export const LoginIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:login"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

export const LogoutIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:logout"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

// Arrow Icons
export const ArrowRightIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:arrow-right"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

export const ArrowDownTrayIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:download"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

export const ArrowUpTrayIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:upload"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

export const PlusIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:plus"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

export const ChevronRightIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:chevron-right"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

// Landing Page Icons
export const ShieldCheckIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:shield-check"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

export const UserGroupIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:users"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

export const ChartBarIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:chart-bar"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

export const ClockIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:clock"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

export const ServerIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:server"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

export const DocumentTextIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:file-text"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

export const Bars3Icon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:menu-2"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

export const XMarkIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:x"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

// Contact Icons
export const BuildingOfficeIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:building-hospital"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

export const PhoneIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:phone"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

export const EnvelopeIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:mail"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

export const MapPinIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:map-pin"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

// Login Page Icons
export const LockClosedIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:lock"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

export const ArrowLeftIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:arrow-left"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

export const EyeIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:eye"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

export const EyeSlashIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:eye-off"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

export const TrashIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:trash"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

export const RefreshIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:refresh"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

export const ExclamationTriangleIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:alert-triangle"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

export const BoltIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:bolt"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

export const MinusIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:minus"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

export const TruckIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:truck"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

export const CheckCircleIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:circle-check"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

export const AlertCircleIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:alert-circle"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

export const UploadIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:upload"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

export const ArrowRightOnRectangleIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:login"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

export const ClipboardListIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:clipboard-list"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

export const EmergencyBedIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:emergency-bed"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

export const BedIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:bed"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

export const AmbulanceIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:ambulance"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

export const StretcherIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:wheelchair"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

export const CalendarIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:calendar"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

export const InfoCircleIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:info-circle"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

export const CarIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:car"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

export const MedicalBagIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:medical-cross"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

export const ToolsIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:tools"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

export const BriefcaseIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:briefcase"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

export const PencilIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:pencil"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

export const MagnifyingGlassIcon = (props: IconProps) => (
  <IconifyIcon
    className={cn('inline-block', props.className)}
    color={props.color}
    flip={props.flip}
    height={props.size || 24}
    icon="tabler:search"
    rotate={props.rotate}
    width={props.size || 24}
    {...props}
  />
);

// Backward compatibility - ยังคง export Icons object สำหรับการใช้งานแบบเดิม
