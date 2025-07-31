import * as React from 'react';
import { Icon } from '@iconify/react';

import { IconSvgProps } from '@/types';

// Logo component สำหรับ RPP
export const Logo: React.FC<IconSvgProps> = ({ size = 36, width, height }) => (
  <div
    className='w-12 h-12 bg-gradient-to-br from-green-400 to-yellow-400 rounded-full flex items-center justify-center'
    style={{ width: size || width,
height: size || height }}
  >
    <span className='text-white font-bold text-sm'>RPP</span>
  </div>
);

// Discord Icon
export const DiscordIcon: React.FC<IconSvgProps> = ({
  size = 24,
  width,
  height,
  className,
  ...props
}) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon icon='mdi:discord' className={className} {...iconProps} {...props} />
  );
};

// Twitter Icon
export const TwitterIcon: React.FC<IconSvgProps> = ({
  size = 24,
  width,
  height,
  className,
  ...props
}) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon icon='mdi:twitter' className={className} {...iconProps} {...props} />
  );
};

// Github Icon
export const GithubIcon: React.FC<IconSvgProps> = ({
  size = 24,
  width,
  height,
  className,
  ...props
}) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon icon='mdi:github' className={className} {...iconProps} {...props} />
  );
};

// Moon Icon (Filled)
export const MoonFilledIcon = ({
  size = 24,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:moon-solid'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

// Sun Icon (Filled)
export const SunFilledIcon = ({
  size = 24,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:sun-solid'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

// Heart Icon (Filled)
export const HeartFilledIcon = ({
  size = 24,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:heart-solid'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

// Search Icon
export const SearchIcon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:magnifying-glass'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

// Export iconify icons สำหรับใช้ในโปรเจกต์
export const ShieldCheckIcon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:shield-check'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

export const UserGroupIcon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:user-group'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

export const ChartBarIcon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:chart-bar'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

export const ClockIcon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:clock'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

export const ServerIcon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:server'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

export const CpuChipIcon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:cpu-chip'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

export const SignalIcon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:signal'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

export const HeartIcon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:heart'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

export const BuildingOfficeIcon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:building-office'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

export const Cog6ToothIcon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:cog-6-tooth'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

export const BellIcon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:bell'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

export const MagnifyingGlassIcon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:magnifying-glass'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

export const SunIcon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:sun'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

export const MoonIcon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:moon'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

// เพิ่ม icons สำหรับ navbar
export const UserIcon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:user'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

export const KeyIcon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:key'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

export const ArrowRightOnRectangleIcon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:arrow-right-on-rectangle'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

export const HomeIcon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:home'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

export const UsersIcon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:users'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

// เพิ่ม icons สำหรับ login page
export const LockClosedIcon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:lock-closed'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

export const ArrowLeftIcon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:arrow-left'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

export const EyeIcon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:eye'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

export const EyeSlashIcon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:eye-slash'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

// เพิ่ม icons สำหรับ dashboard page
export const CheckCircleIcon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:check-circle'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

export const ExclamationTriangleIcon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:exclamation-triangle'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

export const ArrowRightIcon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:arrow-right'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

// เพิ่ม icon สำหรับ Theme page
export const PaintBrushIcon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:paint-brush'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

// เพิ่ม icons สำหรับ error page
export const ArrowPathIcon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:arrow-path'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

export const RefreshIcon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:arrow-path'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

// Bars3Icon สำหรับ Sidebar toggle
export const Bars3Icon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:bars-3'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

// XMarkIcon สำหรับปิด modal หรือ menu
export const XMarkIcon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:x-mark'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

// BuildingOffice2Icon สำหรับ footer
export const BuildingOffice2Icon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:building-office-2'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

// PhoneIcon สำหรับ footer
export const PhoneIcon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:phone'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

// EnvelopeIcon สำหรับ footer
export const EnvelopeIcon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:envelope'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

// MapPinIcon สำหรับ footer
export const MapPinIcon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:map-pin'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

// GlobeAltIcon สำหรับ footer
export const GlobeAltIcon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:globe-alt'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

// Clipboard Document List Icon สำหรับ sidebar
export const ClipboardDocumentListIcon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:clipboard-document-list'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

// Gift Icon สำหรับ sidebar
export const GiftIcon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:gift'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

// Document Text Icon สำหรับ sidebar
export const DocumentTextIcon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:document-text'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

// Information Circle Icon สำหรับ sidebar
export const InformationCircleIcon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:information-circle'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

// Plus Icon สำหรับ sidebar
export const PlusIcon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:plus'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

// Squares 2X2 Icon สำหรับ sidebar
export const Squares2X2Icon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:squares-2x2'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

// Chevron Right Icon สำหรับ breadcrumbs
export const ChevronRightIcon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:chevron-right'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

// Arrow Down Tray Icon สำหรับ export/download
export const ArrowDownTrayIcon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:arrow-down-tray'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

// Arrow Up Tray Icon สำหรับ import/upload
export const ArrowUpTrayIcon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:arrow-up-tray'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

// Calendar Icon สำหรับ date picker
export const CalendarIcon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:calendar'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

// Filter Icon สำหรับตัวกรอง
export const FilterIcon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:funnel'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

// Trending Up Icon สำหรับสถิติที่เพิ่มขึ้น
export const TrendingUpIcon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:arrow-trending-up'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

// Currency Dollar Icon สำหรับเงิน
export const CurrencyDollarIcon = ({
  size,
  width,
  height,
  className,
  ...props
}: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon
      icon='heroicons:currency-dollar'
      className={className}
      {...iconProps}
      {...props}
    />
  );
};
