"use client";

import Link from "next/link";
import Image from "next/image";
import { 
  BuildingOffice2Icon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  GlobeAltIcon
} from "../icons";

export default function LandingFooter() {
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { 
      name: "หน้าแรก", 
      href: "#" 
    },
    { 
      name: "แดชบอร์ด", 
      href: "#" 
    },
    { 
      name: "เกี่ยวกับเรา", 
      href: "#" 
    },
    { 
      name: "ติดต่อเรา", 
      href: "#" 
    },
  ];

  const supportLinks = [
    { 
      name: "คู่มือการใช้งาน", 
      href: "#" 
    },
    { 
      name: "คำถามที่พบบ่อย", 
      href: "#" 
    },
    { 
      name: "นโยบายความเป็นส่วนตัว", 
      href: "#" 
    },
    { 
      name: "เงื่อนไขการใช้งาน", 
      href: "#" 
    },
  ];

  const contactInfo = [
    {
      icon: BuildingOffice2Icon,
      text: "โรงพยาบาลราชพิพัฒน์",
    },
    {
      icon: MapPinIcon,
      text: "เลขที่ 18 ถนนพุทธมณฑลสาย 3 ซอย 10 แขวงบางไผ่ เขตบางแค กทม. 10160",
    },
    {
      icon: PhoneIcon,
      text: "02 102 4222, 02 421 2222",
    },
    {
      icon: EnvelopeIcon,
      text: "saraban.msd.rpphosp@bangkok.go.th",
    },
  ];

  return (
    <footer className="bg-background border-t border-divider">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Image
                src="/images/logo.png"
                alt="Portal RPP Logo"
                width={32}
                height={32}
                className="w-8 h-8 object-contain"
                priority
              />
              <span className="font-bold text-xl text-foreground">
                Portal RPP
              </span>
            </div>
            <p className="text-sm text-foreground-400 max-w-xs">
              ระบบจัดการข้อมูลและบริการออนไลน์ของโรงพยาบาลราชพิพัฒน์ 
              เพื่อให้บริการประชาชนอย่างมีประสิทธิภาพและสะดวกสบาย
            </p>
            <div className="flex space-x-4">
              <span 
                className="text-foreground-400 hover:text-primary cursor-pointer"
              >
                <GlobeAltIcon className="w-5 h-5" />
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              ลิงก์ด่วน
            </h3>
            <div className="flex flex-col space-y-2">
              {quickLinks.map((link, index) => (
                <Link 
                  key={`quick-${index}`} 
                  href={link.href}
                  className="text-foreground-400 hover:text-primary"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Support Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              การสนับสนุน
            </h3>
            <div className="flex flex-col space-y-2">
              {supportLinks.map((link, index) => (
                <Link 
                  key={`support-${index}`} 
                  href={link.href}
                  className="text-foreground-400 hover:text-primary"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              ข้อมูลติดต่อ
            </h3>
            <div className="space-y-3">
              {contactInfo.map((info, index) => (
                <div key={`contact-${index}`} className="flex items-start space-x-2">
                  <info.icon className="w-4 h-4 text-foreground-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-foreground-400">
                    {info.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-divider my-6" />

        {/* Bottom Section */}
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          <div className="text-sm text-foreground-400">
            © {currentYear} โรงพยาบาลราชพิพัฒน์. สงวนลิขสิทธิ์ทั้งหมด.
          </div>
          <div className="flex space-x-6 text-sm">
            <span 
              key="privacy"
              className="text-foreground-400 hover:text-primary cursor-pointer"
            >
              นโยบายความเป็นส่วนตัว
            </span>
            <span 
              key="terms"
              className="text-foreground-400 hover:text-primary cursor-pointer"
            >
              เงื่อนไขการใช้งาน
            </span>
            <span 
              key="sitemap"
              className="text-foreground-400 hover:text-primary cursor-pointer"
            >
              แผนผังเว็บไซต์
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
} 