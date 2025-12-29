import {
  HomeIcon,
  ChartBarIcon,
  EmergencyBedIcon,
  ClipboardListIcon,
  SettingsIcon,
  UserIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  UserGroupIcon,
  BriefcaseIcon,
} from "@/components/ui/icons";
import { BreadcrumbItemType, RouteConfig } from "@/types";

// Mapping ของ routes ทั้งหมดพร้อมชื่อภาษาไทยและ icon
const routeMap: Record<string, RouteConfig> = {
  "/home": {
    name: "หน้าแรก",
    href: "/home",
    icon: HomeIcon,
  },
  "/profile": {
    name: "โปรไฟล์",
    href: "/profile",
    icon: UserIcon,
  },
  "/porter/stat": {
    name: "สถิติการดำเนินการ",
    href: "/porter/stat",
    icon: ChartBarIcon,
    parent: "/porter",
  },
  "/porter/request": {
    name: "ขอเปล",
    href: "/porter/request",
    icon: EmergencyBedIcon,
    parent: "/porter",
  },
  "/porter/joblist": {
    name: "รายการคำขอ",
    href: "/porter/joblist",
    icon: ClipboardListIcon,
    parent: "/porter",
  },
  "/porter/setting/location": {
    name: "จุดรับ - ส่ง",
    href: "/porter/setting/location",
    icon: SettingsIcon,
    parent: "/porter/setting",
  },
  "/porter/setting/employee": {
    name: "รายชื่อเจ้าหน้าที่เปล",
    href: "/porter/setting/employee",
    icon: UserIcon,
    parent: "/porter/setting",
  },
  "/revenue/import/dbf": {
    name: "DBF",
    href: "/revenue/import/dbf",
    icon: DocumentTextIcon,
    parent: "/revenue/import",
  },
  "/revenue/export/ipd": {
    name: "ข้อมูล 16 แฟ้ม IPD",
    href: "/revenue/export/ipd",
    icon: DocumentTextIcon,
    parent: "/revenue/export",
  },
  "/revenue/export/opd": {
    name: "ข้อมูล 16 แฟ้ม OPD",
    href: "/revenue/export/opd",
    icon: DocumentTextIcon,
    parent: "/revenue/export",
  },
  "/setting/users": {
    name: "จัดการผู้ใช้",
    href: "/setting/users",
    icon: UserIcon,
  },
  "/setting/departments": {
    name: "กลุ่มภารกิจ",
    href: "/setting/departments",
    icon: BriefcaseIcon,
    parent: "/setting",
  },
  "/setting/department-subs": {
    name: "กลุ่มงาน",
    href: "/setting/department-subs",
    icon: BriefcaseIcon,
    parent: "/setting",
  },
  "/setting/department-sub-subs": {
    name: "หน่วยงาน",
    href: "/setting/department-sub-subs",
    icon: BriefcaseIcon,
    parent: "/setting",
  },
  "/setting/person-types": {
    name: "กลุ่มบุคลากร",
    href: "/setting/person-types",
    icon: UserGroupIcon,
    parent: "/setting",
  },
  "/setting/positions": {
    name: "ตำแหน่ง",
    href: "/setting/positions",
    icon: UserGroupIcon,
    parent: "/setting",
  },
};

// Parent routes ที่ไม่มีหน้าเอง แต่เป็น parent ของ routes อื่น
// ใช้ href="#" สำหรับ routes ที่ไม่มี path จริงใน Sidebar
const parentRouteMap: Record<string, RouteConfig> = {
  "/porter": {
    name: "ศูนย์เคลื่อนย้ายผู้ป่วย",
    href: "#",
    icon: EmergencyBedIcon,
  },
  "/porter/setting": {
    name: "ตั้งค่า",
    href: "#",
    icon: SettingsIcon,
    parent: "/porter",
  },
  "/revenue": {
    name: "ระบบงานจัดเก็บรายได้",
    href: "#",
    icon: ChartBarIcon,
  },
  "/revenue/import": {
    name: "นำเข้าไฟล์",
    href: "#",
    icon: ArrowDownTrayIcon,
    parent: "/revenue",
  },
  "/revenue/export": {
    name: "ส่งออกข้อมูล",
    href: "#",
    icon: ArrowUpTrayIcon,
    parent: "/revenue",
  },
  "/setting": {
    name: "ตั้งค่าข้อมูลบุคลากร",
    href: "#",
    icon: UserGroupIcon,
  },
};

/**
 * แปลง pathname เป็น breadcrumbs items
 * @param pathname - pathname ปัจจุบัน
 * @returns array ของ BreadcrumbItemType
 */
export function generateBreadcrumbs(pathname: string): BreadcrumbItemType[] {
  const breadcrumbs: BreadcrumbItemType[] = [];

  // เพิ่มหน้าแรกเสมอ
  breadcrumbs.push({
    name: "หน้าแรก",
    href: "/home",
    icon: HomeIcon,
  });

  // ถ้าเป็นหน้าแรกแล้ว ให้ return แค่หน้าแรก
  if (pathname === "/home" || pathname === "/") {
    return breadcrumbs;
  }

  // ค้นหา route ที่ตรงกับ pathname
  let currentRoute = routeMap[pathname];

  // ถ้าไม่เจอ exact match ให้ลองหา parent route
  if (!currentRoute) {
    // ลองหา parent route จาก parentRouteMap
    const parentRoute = parentRouteMap[pathname];

    if (parentRoute) {
      currentRoute = parentRoute;
    } else {
      // ถ้ายังไม่เจอ ให้ลองหา route ที่ pathname เริ่มต้นด้วย
      const matchingRoute = Object.keys(routeMap).find((route) =>
        pathname.startsWith(route),
      );

      if (matchingRoute) {
        currentRoute = routeMap[matchingRoute];
      }
    }
  }

  // ถ้าไม่เจอ route ให้ return แค่หน้าแรก
  if (!currentRoute) {
    return breadcrumbs;
  }

  // สร้าง breadcrumbs hierarchy โดยเริ่มจาก parent
  const buildBreadcrumbPath = (route: RouteConfig): void => {
    if (route.parent) {
      // หา parent route
      const parentRoute =
        routeMap[route.parent] || parentRouteMap[route.parent];

      if (parentRoute) {
        buildBreadcrumbPath(parentRoute);
      }
    }

    // เพิ่ม route นี้เข้าไป
    breadcrumbs.push({
      name: route.name,
      href: route.href,
      icon: route.icon,
    });
  };

  buildBreadcrumbPath(currentRoute);

  return breadcrumbs;
}
