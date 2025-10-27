import { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { addToast } from "@heroui/react";

import { UploadBatch } from "@/types/revenue";
import { api } from "@/app/api/revenue/client";

export const useIPDExport = () => {
  const { data: session, status } = useSession();
  const [uploadBatches, setUploadBatches] = useState<UploadBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // ฟังก์ชันโหลด batches จาก API
  const loadBatches = useCallback(async () => {
    try {
      setIsLoading(true);
      // ส่ง userId เพื่อโหลดเฉพาะข้อมูลของ user ที่ login อยู่
      const response = await api.getRevenueBatches(session, {
        userId: session?.user.id,
      });

      if (response.success && response.data) {
        const allBatches: UploadBatch[] = response.data.batches.map(
          (batch: any) => ({
            id: batch.id,
            batchName: batch.batchName,
            uploadDate: new Date(batch.uploadDate),
            totalFiles: batch.totalFiles,
            successFiles: batch.successFiles,
            errorFiles: batch.errorFiles,
            processingFiles: batch.processingFiles,
            totalRecords: batch.totalRecords,
            totalSize: batch.totalSize,
            status: batch.status,
            processingStatus:
              batch.processingStatusIpd || batch.processingStatus || "pending",
            exportStatus:
              batch.exportStatusIpd || batch.exportStatus || "not_exported",
            files: (batch.files || []).map((f: any) => ({
              id: f.id,
              fileName: f.originalName || f.filename || f.filename,
              fileSize: f.fileSize,
              uploadDate: new Date(f.uploadDate),
              status: (f.status === "validating" ? "processing" : f.status) as
                | "pending"
                | "success"
                | "processing"
                | "error",
              recordsCount: f.totalRecords ?? undefined,
              errorMessage: f.errorMessage ?? undefined,
            })),
          }),
        );

        // กรองเฉพาะ IPD batches ที่มีไฟล์ .dbf จริงๆ
        const ipdBatches = allBatches.filter((batch) => {
          // ตรวจสอบว่ามีไฟล์ .dbf จริงๆ หรือไม่
          if (batch.files && batch.files.length > 0) {
            const dbfFileCount = batch.files.filter((file) =>
              file.fileName.toLowerCase().endsWith(".dbf"),
            ).length;

            // ต้องมีไฟล์ .dbf อย่างน้อย 1 ไฟล์
            if (dbfFileCount > 0) {
              return true;
            }
          }

          return false;
        });

        setUploadBatches(ipdBatches);
        setLastUpdated(new Date());
      } else {
        setUploadBatches([]);
      }
    } catch (error: any) {
      if (error.status === 401) {
        addToast({
          title: "Session หมดอายุ กรุณาเข้าสู่ระบบใหม่",
          color: "danger",
        });

        return;
      }

      addToast({
        title: "ไม่สามารถโหลดข้อมูล IPD batches ได้ กรุณาลองใหม่อีกครั้ง",
        color: "danger",
      });
      setUploadBatches([]);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  // ฟังก์ชันสำหรับ refresh ข้อมูล
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadBatches();
    setIsRefreshing(false);
  }, [loadBatches]);

  // โหลดข้อมูลเมื่อ component mount หรือ session เปลี่ยน
  useEffect(() => {
    if (status === "authenticated" && session) {
      loadBatches();
    }
  }, [status, session, loadBatches]);

  // ฟังก์ชันยูทิลิตี้สำหรับตรวจสอบสถานะ
  const isProcessed = useCallback((batch: UploadBatch): boolean => {
    const processingStatus =
      (batch as any).processingStatusIpd || batch.processingStatus || "pending";

    return processingStatus.toLowerCase() === "completed";
  }, []);

  const isExported = useCallback((batch: UploadBatch): boolean => {
    const exportStatus =
      (batch as any).exportStatusIpd || batch.exportStatus || "not_exported";

    return exportStatus.toLowerCase() === "exported";
  }, []);

  const isExporting = useCallback((batch: UploadBatch): boolean => {
    const exportStatus =
      (batch as any).exportStatusIpd || batch.exportStatus || "not_exported";

    return exportStatus.toLowerCase() === "exporting";
  }, []);

  // ฟังก์ชันสำหรับการจัดการข้อมูล
  const handleEdit = useCallback(
    async (batchId: string) => {
      const batch = uploadBatches.find((b) => b.id === batchId);

      if (!batch) {
        addToast({ title: "ไม่พบข้อมูล batch", color: "danger" });

        return;
      }

      try {
        addToast({ title: "เริ่มปรับปรุงข้อมูล IPD...", color: "primary" });

        const resp = await api.processRevenueBatchIPD(session, batchId);

        if (!resp.success) {
          addToast({ title: "ปรับปรุงข้อมูล IPD ล้มเหลว", color: "danger" });

          return;
        }

        // อัปเดตสถานะใน UI ว่า processing เสร็จสิ้น
        const updated = uploadBatches.map((b) =>
          b.id === batchId
            ? {
                ...b,
                processingStatus: "completed" as const,
                processingStatusIpd: "completed" as const,
              }
            : b,
        );

        setUploadBatches(updated);

        addToast({ title: "ปรับปรุงข้อมูล IPD สำเร็จ", color: "success" });
      } catch {
        addToast({
          title: "เกิดข้อผิดพลาดระหว่างปรับปรุงข้อมูล IPD",
          color: "danger",
        });
      }
    },
    [uploadBatches, session],
  );

  const handleExport = useCallback(
    async (batchId: string) => {
      const batch = uploadBatches.find((b) => b.id === batchId);

      if (!batch) {
        addToast({
          title: "ไม่พบข้อมูล batch",
          color: "danger",
        });

        return;
      }

      if (isExporting(batch)) {
        addToast({
          title: "กำลังส่งออกอยู่ กรุณารอสักครู่",
          color: "danger",
        });

        return;
      }

      try {
        addToast({
          title: "กำลังส่งออกข้อมูล...",
          color: "primary",
        });

        // อัปเดตสถานะเป็นกำลังส่งออก
        const exportingBatches = uploadBatches.map((b) =>
          b.id === batchId
            ? {
                ...b,
                exportStatus: "exporting" as const,
                exportStatusIpd: "exporting" as const,
              }
            : b,
        );

        setUploadBatches(exportingBatches);

        const response = await api.exportRevenueBatch(session, batchId, "ipd");

        if (response.success && response.data) {
          const url = window.URL.createObjectURL(response.data);
          const link = document.createElement("a");

          link.href = url;

          if (batch) {
            const zipFileName = `${batch.batchName}_IPD.zip`;

            link.download = zipFileName;
          } else {
            link.download = `IPD_Batch_${batchId}_IPD.zip`;
          }

          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);

          const updatedBatches = uploadBatches.map((b) =>
            b.id === batchId
              ? {
                  ...b,
                  exportStatus: "exported" as const,
                  exportStatusIpd: "exported" as const,
                }
              : b,
          );

          setUploadBatches(updatedBatches);

          addToast({
            title: "ส่งออกข้อมูลสำเร็จ",
            color: "success",
          });
        } else {
          const failedBatches = uploadBatches.map((b) =>
            b.id === batchId
              ? {
                  ...b,
                  exportStatus: "export_failed" as const,
                  exportStatusIpd: "export_failed" as const,
                }
              : b,
          );

          setUploadBatches(failedBatches);
          addToast({
            // title: response.error || "เกิดข้อผิดพลาดในการส่งออก",
            title: "เกิดข้อผิดพลาดในการส่งออก",
            color: "danger",
          });
        }
      } catch {
        const failedBatches = uploadBatches.map((b) =>
          b.id === batchId
            ? {
                ...b,
                exportStatus: "export_failed" as const,
                exportStatusIpd: "export_failed" as const,
              }
            : b,
        );

        setUploadBatches(failedBatches);
        addToast({
          title: "เกิดข้อผิดพลาดในการส่งออกข้อมูล",
          color: "danger",
        });
      }
    },
    [uploadBatches, session, isExporting],
  );

  return {
    // State
    uploadBatches,
    isLoading,
    isRefreshing,
    lastUpdated,

    // Actions
    loadBatches,
    handleRefresh,
    handleEdit,
    handleExport,

    // Utility functions
    isProcessed,
    isExported,
    isExporting,
  };
};
