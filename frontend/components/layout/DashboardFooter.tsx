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

export default function DashboardFooter() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-background border-t border-divider mt-auto">
            <div className="max-w-7xl mx-auto px-4 py-6">

                {/* Bottom Section */}
                <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
                    <div className="text-sm text-foreground-400">
                        © {currentYear} โรงพยาบาลราชพิพัฒน์. สงวนลิขสิทธิ์ทั้งหมด.
                    </div>
                    <div className="flex space-x-4 text-sm">
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