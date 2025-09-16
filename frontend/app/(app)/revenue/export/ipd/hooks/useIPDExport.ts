import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { addToast } from '@heroui/react';
import { api, type UploadBatch } from '@/app/api/client';

export const useIPDExport = () => {
    const { data: session, status } = useSession();
    const [uploadBatches, setUploadBatches] = useState<UploadBatch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // ฟังก์ชันโหลด batches จาก API
    const loadBatches = useCallback(async () => {
        if (!session || !session.accessToken) {
            addToast({
                title: 'Session ไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่',
                color: 'danger',
            });
            return;
        }

        if (!session.user?.id) {
            addToast({
                title: 'ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่',
                color: 'danger',
            });
            return;
        }

        try {
            setIsLoading(true);
            // ส่ง userId เพื่อโหลดเฉพาะข้อมูลของ user ที่ login อยู่
            const response = await api.getRevenueBatches(session, { userId: session.user.id });

            if (response.success && response.data) {
                const allBatches: UploadBatch[] = response.data.batches.map((batch: any) => ({
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
                    processingStatus: batch.processingStatus || 'pending',
                    exportStatus: batch.exportStatus || 'not_exported',
                    files: (batch.files || []).map((f: any) => ({
                        id: f.id,
                        fileName: f.originalName || f.filename || f.filename,
                        fileSize: f.fileSize,
                        uploadDate: new Date(f.uploadDate),
                        status: (f.status === 'validating' ? 'processing' : f.status) as 'pending' | 'success' | 'processing' | 'error',
                        recordsCount: f.totalRecords ?? undefined,
                        errorMessage: f.errorMessage ?? undefined,
                    }))
                }));

                console.log('All batches from API:', allBatches.length, allBatches.map((b) => ({ 
                    id: b.id, 
                    name: b.batchName, 
                    files: b.files?.length || 0 
                })));

                // กรองเฉพาะ IPD batches ที่มีไฟล์ .dbf จริงๆ
                const ipdBatches = allBatches.filter((batch) => {
                    // ตรวจสอบว่ามีไฟล์ .dbf จริงๆ หรือไม่
                    if (batch.files && batch.files.length > 0) {
                        const dbfFileCount = batch.files.filter((file) =>
                            file.fileName.toLowerCase().endsWith('.dbf')
                        ).length;
                        
                        // ต้องมีไฟล์ .dbf อย่างน้อย 1 ไฟล์
                        if (dbfFileCount > 0) {
                            console.log(`Batch ${batch.batchName}: มีไฟล์ .dbf ${dbfFileCount} ไฟล์`);
                            return true;
                        }
                    }
                    
                    // ถ้าไม่มีไฟล์หรือไม่มีไฟล์ .dbf ให้แสดง log
                    console.log(`Batch ${batch.batchName}: ไม่มีไฟล์ .dbf หรือไม่มีไฟล์`);
                    return false;
                });

                console.log('Filtered IPD batches:', ipdBatches.length, ipdBatches.map((b) => ({ 
                    id: b.id, 
                    name: b.batchName 
                })));

                setUploadBatches(ipdBatches);
                setLastUpdated(new Date());
            } else {
                setUploadBatches([]);
            }
        } catch (error: any) {
            if (error.status === 401) {
                addToast({
                    title: 'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่',
                    color: 'danger',
                });
                return;
            }

            addToast({
                title: 'ไม่สามารถโหลดข้อมูล IPD batches ได้ กรุณาลองใหม่อีกครั้ง',
                color: 'danger',
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
        if (status === 'authenticated' && session) {
            loadBatches();
        }
    }, [status, session, loadBatches]);

    // ฟังก์ชันยูทิลิตี้สำหรับตรวจสอบสถานะ
    const isProcessed = useCallback((batch: UploadBatch): boolean => {
        const processingStatus = batch.processingStatus || 'pending';
        return processingStatus.toLowerCase() === 'completed';
    }, []);

    const isExported = useCallback((batch: UploadBatch): boolean => {
        const exportStatus = batch.exportStatus || 'not_exported';
        return exportStatus.toLowerCase() === 'exported';
    }, []);

    const isExporting = useCallback((batch: UploadBatch): boolean => {
        const exportStatus = batch.exportStatus || 'not_exported';
        return exportStatus.toLowerCase() === 'exporting';
    }, []);

    // ฟังก์ชันสำหรับการจัดการข้อมูล
    const handleEdit = useCallback((batchId: string) => {
        const batch = uploadBatches.find((b) => b.id === batchId);
        if (batch && !isProcessed(batch)) {
            addToast({
                title: 'เปิดหน้าปรับปรุงข้อมูล...',
                color: 'success',
            });
        }
    }, [uploadBatches, isProcessed]);

    const handleExport = useCallback(async (batchId: string) => {
        const batch = uploadBatches.find((b) => b.id === batchId);
        if (!batch) {
            addToast({
                title: 'ไม่พบข้อมูล batch',
                color: 'danger',
            });
            return;
        }

        if (isExporting(batch)) {
            addToast({
                title: 'กำลังส่งออกอยู่ กรุณารอสักครู่',
                color: 'danger',
            });
            return;
        }

        try {
            addToast({
                title: 'กำลังส่งออกข้อมูล...',
                color: 'primary',
            });

            const response = await api.exportRevenueBatch(session, batchId, 'ipd');

            if (response.success && response.data) {
                const url = window.URL.createObjectURL(response.data);
                const link = document.createElement('a');
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
                            exportStatus: 'exported' as const
                        }
                        : b
                );
                setUploadBatches(updatedBatches);

                addToast({
                    title: 'ส่งออกข้อมูลสำเร็จ',
                    color: 'success',
                });
            } else {
                addToast({
                    title: response.error || 'เกิดข้อผิดพลาดในการส่งออก',
                    color: 'danger',
                });
            }
        } catch {
            addToast({
                title: 'เกิดข้อผิดพลาดในการส่งออกข้อมูล',
                color: 'danger',
            });
        }
    }, [uploadBatches, session, isExporting]);

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
        isExporting
    };
};
