export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "Portal RPP",
  projectName: "Portal RPP",
  hospitalName: "โรงพยาบาลราชพิพัฒน์",
  description:
    "ระบบจัดการข้อมูลแบบ Digital Transformation สำหรับการให้บริการที่มีคุณภาพและประสิทธิภาพ",
  version: "1.0.0",
  navItems: [
    {
      label: "หน้าแรก",
      href: "/",
    },
    {
      label: "ระบบความปลอดภัย",
      href: "/security",
    },
    {
      label: "จัดการผู้ใช้งาน",
      href: "/users",
    },
    {
      label: "ภาพรวมระบบ",
      href: "/dashboard",
    },
    {
      label: "บริการสุขภาพ",
      href: "/health",
    },
  ],
  navMenuItems: [
    {
      label: "หน้าแรก",
      href: "/",
    },
    {
      label: "ระบบความปลอดภัย",
      href: "/security",
    },
    {
      label: "จัดการผู้ใช้งาน",
      href: "/users",
    },
    {
      label: "ภาพรวมระบบ",
      href: "/dashboard",
    },
    {
      label: "บริการสุขภาพ",
      href: "/health",
    },
  ],
  links: {
    github: "#",
    twitter: "#",
    docs: "#",
    discord: "#",
    sponsor: "#",
    rpp: "https://rpp.go.th",
  },
};
