"use client";

import React, { useState, useCallback } from "react";

import { useOPDExport } from "./hooks";
import {
  DataManagementTable,
  ConditionsTab,
  SolutionsTab,
  TabNavigation,
} from "./components";

export default function RevenueExportPage() {
  const [selectedTab, setSelectedTab] = useState<
    "data-management" | "conditions" | "solutions"
  >("data-management");

  // Custom hooks
  const {
    uploadBatches,
    isLoading,
    isRefreshing,
    lastUpdated,
    handleRefresh,
    handleEdit,
    handleExport,
    isProcessed,
    isExported,
    isExporting,
  } = useOPDExport();

  // Event handlers
  const handleTabChange = useCallback(
    (tab: "data-management" | "conditions" | "solutions") => {
      setSelectedTab(tab);
    },
    [],
  );

  const handleView = useCallback(() => {
    // addToast({ title: "แสดงรายละเอียด batch..." });
  }, []);

  // ฟังก์ชันสำหรับ format วันที่
  const formatDate = useCallback((date: Date) => {
    return date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            ส่งออกข้อมูล 16 แฟ้ม OPD
          </h1>
          <p className="text-default-600 mt-2">
            ปรับปรุงและจัดการข้อมูลก่อนส่งเบิก
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <TabNavigation selectedTab={selectedTab} onTabChange={handleTabChange} />

      {/* Content */}
      {selectedTab === "data-management" && (
        <DataManagementTable
          formatDate={formatDate}
          isExported={isExported}
          isExporting={isExporting}
          isLoading={isLoading}
          isProcessed={isProcessed}
          isRefreshing={isRefreshing}
          lastUpdated={lastUpdated}
          uploadBatches={uploadBatches}
          onEdit={handleEdit}
          onExport={handleExport}
          onRefresh={handleRefresh}
          onView={handleView}
        />
      )}

      {selectedTab === "conditions" && <ConditionsTab />}

      {selectedTab === "solutions" && <SolutionsTab />}
    </div>
  );
}
