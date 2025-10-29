import React from "react";

import { CogIcon, FileTextIcon } from "@/components/ui/icons";

interface TabNavigationProps {
  selectedTab: "data-management" | "conditions" | "solutions";
  onTabChange: (tab: "data-management" | "conditions" | "solutions") => void;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  selectedTab,
  onTabChange,
}) => {
  return (
    <div className="flex space-x-1 bg-default-100 p-1 rounded-lg w-fit">
      <button
        className={`px-4 py-2 rounded-md transition-all ${
          selectedTab === "data-management"
            ? "bg-white shadow text-primary font-medium"
            : "text-default-600 hover:text-default-900"
        }`}
        onClick={() => onTabChange("data-management")}
      >
        <div className="flex items-center space-x-2">
          {/* <DatabaseIcon className="w-4 h-4" /> */}
          <span>จัดการข้อมูล</span>
        </div>
      </button>
      <button
        className={`px-4 py-2 rounded-md transition-all ${
          selectedTab === "conditions"
            ? "bg-white shadow text-primary font-medium"
            : "text-default-600 hover:text-default-900"
        }`}
        onClick={() => onTabChange("conditions")}
      >
        <div className="flex items-center space-x-2">
          <CogIcon className="w-4 h-4" />
          <span>เงื่อนไขการทำงาน</span>
        </div>
      </button>
      <button
        className={`px-4 py-2 rounded-md transition-all ${
          selectedTab === "solutions"
            ? "bg-white shadow text-primary font-medium"
            : "text-default-600 hover:text-default-900"
        }`}
        onClick={() => onTabChange("solutions")}
      >
        <div className="flex items-center space-x-2">
          <FileTextIcon className="w-4 h-4" />
          <span>การแก้ปัญหา</span>
        </div>
      </button>
    </div>
  );
};
