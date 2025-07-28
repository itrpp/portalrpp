import * as React from "react";
import { Icon } from "@iconify/react";

import { IconSvgProps } from "@/types";

// Logo component สำหรับ RPP
export const Logo: React.FC<IconSvgProps> = ({
  size = 36,
  width,
  height,
}) => (
  <div
    className="w-12 h-12 bg-gradient-to-br from-green-400 to-yellow-400 rounded-full flex items-center justify-center"
    style={{ width: size || width,
height: size || height }}
  >
    <span className="text-white font-bold text-sm">RPP</span>
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
    <Icon
      icon="mdi:discord"
      className={className}
      {...iconProps}
      {...props}
    />
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
    <Icon
      icon="mdi:twitter"
      className={className}
      {...iconProps}
      {...props}
    />
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
    <Icon
      icon="mdi:github"
      className={className}
      {...iconProps}
      {...props}
    />
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
      icon="heroicons:moon-solid"
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
      icon="heroicons:sun-solid"
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
      icon="heroicons:heart-solid"
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

// Search Icon
export const SearchIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M11.5 11.5L14 14"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M7 13A6 6 0 1 0 7 1A6 6 0 0 0 7 13Z"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
);

// Export iconify icons สำหรับใช้ในโปรเจกต์
export const ShieldCheckIcon = ({ size, width, height, className, ...props }: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon 
      icon="heroicons:shield-check" 
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

export const UserGroupIcon = ({ size, width, height, className, ...props }: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon 
      icon="heroicons:user-group" 
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

export const ChartBarIcon = ({ size, width, height, className, ...props }: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon 
      icon="heroicons:chart-bar" 
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

export const ClockIcon = ({ size, width, height, className, ...props }: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon 
      icon="heroicons:clock" 
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

export const ServerIcon = ({ size, width, height, className, ...props }: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon 
      icon="heroicons:server" 
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

export const CpuChipIcon = ({ size, width, height, className, ...props }: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon 
      icon="heroicons:cpu-chip" 
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

export const SignalIcon = ({ size, width, height, className, ...props }: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon 
      icon="heroicons:signal" 
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

export const HeartIcon = ({ size, width, height, className, ...props }: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon 
      icon="heroicons:heart" 
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

export const BuildingOfficeIcon = ({ size, width, height, className, ...props }: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon 
      icon="heroicons:building-office" 
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

export const Cog6ToothIcon = ({ size, width, height, className, ...props }: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon 
      icon="heroicons:cog-6-tooth" 
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

export const BellIcon = ({ size, width, height, className, ...props }: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon 
      icon="heroicons:bell" 
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

export const MagnifyingGlassIcon = ({ size, width, height, className, ...props }: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon 
      icon="heroicons:magnifying-glass" 
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

export const SunIcon = ({ size, width, height, className, ...props }: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon 
      icon="heroicons:sun" 
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

export const MoonIcon = ({ size, width, height, className, ...props }: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon 
      icon="heroicons:moon" 
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

// เพิ่ม icons สำหรับ navbar
export const UserIcon = ({ size, width, height, className, ...props }: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon 
      icon="heroicons:user" 
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

export const KeyIcon = ({ size, width, height, className, ...props }: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon 
      icon="heroicons:key" 
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

export const ArrowRightOnRectangleIcon = ({ size, width, height, className, ...props }: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon 
      icon="heroicons:arrow-right-on-rectangle" 
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

export const HomeIcon = ({ size, width, height, className, ...props }: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon 
      icon="heroicons:home" 
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

export const UsersIcon = ({ size, width, height, className, ...props }: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon 
      icon="heroicons:users" 
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

// เพิ่ม icons สำหรับ login page
export const LockClosedIcon = ({ size, width, height, className, ...props }: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon 
      icon="heroicons:lock-closed" 
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

export const ArrowLeftIcon = ({ size, width, height, className, ...props }: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon 
      icon="heroicons:arrow-left" 
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

export const EyeIcon = ({ size, width, height, className, ...props }: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon 
      icon="heroicons:eye" 
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

export const EyeSlashIcon = ({ size, width, height, className, ...props }: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon 
      icon="heroicons:eye-slash" 
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

// เพิ่ม icons สำหรับ dashboard page
export const CheckCircleIcon = ({ size, width, height, className, ...props }: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon 
      icon="heroicons:check-circle" 
      className={className}
      {...iconProps}
      {...props}
    />
  );
};

export const ExclamationTriangleIcon = ({ size, width, height, className, ...props }: IconSvgProps) => {
  const iconHeight = size ?? height;
  const iconWidth = size ?? width;
  const iconProps: any = {};
  if (iconHeight !== undefined) iconProps.height = iconHeight;
  if (iconWidth !== undefined) iconProps.width = iconWidth;
  return (
    <Icon 
      icon="heroicons:exclamation-triangle" 
      className={className}
      {...iconProps}
      {...props}
    />
  );
};
