import { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { addToast } from "@heroui/react";

import { UploadBatch, UploadedFile } from "@/types/revenue";
import { api } from "@/app/api/revenue/client";
// import { api, type UploadBatch, type UploadedFile } from '@/app/api/client';

// ค่าคงที่สำหรับการจำกัด
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 1MB ใน bytes
const MAX_FILES = 20;

export const useDBFImport = () => {
  const { data: session, status } = useSession();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadBatches, setUploadBatches] = useState<UploadBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Helper function สำหรับอัปเดต uploadedFiles
  const updateUploadedFile = useCallback(
    (fileId: string, updates: Partial<UploadedFile>) => {
      setUploadedFiles((prev) =>
        prev.map((file) =>
          file.id === fileId
            ? {
                ...file,
                ...updates,
              }
            : file,
        ),
      );
    },
    [],
  );

  // ฟังก์ชันโหลด batches จาก API
  const loadBatches = useCallback(async () => {
    try {
      setIsLoading(true);
      // ส่ง userId เพื่อโหลดเฉพาะข้อมูลของ user ที่ login อยู่
      const response = await api.getRevenueBatches(session, {
        userId: session?.user.id,
      });

      if (response.error === "API_GATEWAY_UNREACHABLE") {
        addToast({
          title: "ไม่สามารถโหลดข้อมูล DBF batches ได้ กรุณาลองใหม่อีกครั้ง",
          color: "danger",
        });

        return;
      }

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
            processingStatus: batch.processingStatus || "pending",
            exportStatus: batch.exportStatus || "not_exported",
            files: (batch.files || []).map((f: any) => ({
              id: f.id,
              fileName: f.originalName || f.filename || f.fileName,
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

        // กรองเฉพาะ DBF batches ที่มีไฟล์ .dbf จริงๆ
        const dbfBatches = allBatches.filter((batch) => {
          // ตรวจสอบว่ามีไฟล์ .dbf จริงๆ หรือไม่
          if (batch.files && batch.files.length > 0) {
            const dbfFileCount = batch.files.filter((file) =>
              file.fileName.toLowerCase().endsWith(".dbf"),
            ).length;

            // ต้องมีไฟล์ .dbf อย่างน้อย 1 ไฟล์
            if (dbfFileCount > 0) {
              // console.log(
              //   `Batch ${batch.batchName}: มีไฟล์ .dbf ${dbfFileCount} ไฟล์`,
              // );

              return true;
            }
          }

          // ถ้าไม่มีไฟล์หรือไม่มีไฟล์ .dbf ให้แสดง log
          // console.log(`Batch ${batch.batchName}: ไม่มีไฟล์ .dbf หรือไม่มีไฟล์`);

          return false;
        });

        // console.log(
        //   "DBF batches:",
        //   dbfBatches.length,
        //   dbfBatches.map((b) => ({
        //     id: b.id,
        //     name: b.batchName,
        //   })),
        // );

        setUploadBatches(dbfBatches);
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
        title: "ไม่สามารถโหลดข้อมูล DBF batches ได้ กรุณาลองใหม่อีกครั้ง",
        color: "danger",
      });
      setUploadBatches([]);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  // ตรวจสอบ session เมื่อ component mount
  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") return;
    // if (!session.accessToken && !session.sessionToken) return;
    loadBatches();
  }, [session, status, loadBatches]);

  // ฟังก์ชัน refresh ข้อมูลแบบ manual
  const handleRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      await loadBatches();
      addToast({ title: "รีเฟรชข้อมูลเรียบร้อย", color: "success" });
    } catch {
      addToast({ title: "เกิดข้อผิดพลาดในการรีเฟรชข้อมูล", color: "danger" });
    } finally {
      setIsRefreshing(false);
    }
  }, [loadBatches]);

  // ฟังก์ชันลบ batch
  const deleteBatch = useCallback(
    async (batchId: string) => {
      try {
        const response = await api.deleteRevenueBatch(session, batchId);

        if (response.success) {
          setUploadBatches((prev) =>
            prev.filter((batch) => batch.id !== batchId),
          );
          addToast({ title: "ลบ batch เรียบร้อยแล้ว", color: "success" });

          return true;
        } else {
          addToast({ title: "ไม่สามารถลบ batch ได้", color: "danger" });

          return false;
        }
      } catch {
        addToast({ title: "ไม่สามารถลบ batch ได้", color: "danger" });

        return false;
      }
    },
    [session],
  );

  return {
    // State
    uploadedFiles,
    setUploadedFiles,
    uploadBatches,
    isLoading,
    isRefreshing,
    lastUpdated,

    // Actions
    updateUploadedFile,
    loadBatches,
    handleRefresh,
    deleteBatch,

    // Constants
    MAX_FILE_SIZE,
    MAX_FILES,
  };
};
