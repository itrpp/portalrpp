import { useCallback } from 'react';
import { useSession } from 'next-auth/react';
// No direct toast here; feedback is handled by callers via addToast.
import { api, type UploadedFile } from '@/app/api/client';

export const useUploadProcess = () => {
    const { data: session } = useSession();

    // ฟังก์ชันสำหรับจัดรูปแบบวันที่
    const formatDate = useCallback((date: Date): string => {
        return new Intl.DateTimeFormat('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }, []);

    // ฟังก์ชันสำหรับสร้าง batch ใหม่
    const createBatch = useCallback(async (): Promise<string> => {
        const now = new Date();
        const thNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
        const thaiYear = thNow.getFullYear() + 543;
        const yy = String(thaiYear % 100).padStart(2, '0');
        const MM = String(thNow.getMonth() + 1).padStart(2, '0');
        const dd = String(thNow.getDate()).padStart(2, '0');
        const HH = String(thNow.getHours()).padStart(2, '0');
        const mm = String(thNow.getMinutes()).padStart(2, '0');
        const dbfBatchName = `DBF_Batch_${yy}${MM}${dd}_${HH}${mm}`;

        const batchResponse = await api.createRevenueBatch(session, {
            batchName: dbfBatchName,
            userId: session?.user?.email || 'unknown',
            ipAddress: 'unknown',
            userAgent: navigator.userAgent
        });

        if (!batchResponse.success || !batchResponse.data) {
            throw new Error('ไม่สามารถสร้าง batch ได้');
        }

        return batchResponse.data.id;
    }, [session]);

    // ฟังก์ชันอัปโหลดไฟล์เดี่ยวแบบ async พร้อม retry mechanism
    const uploadSingleFile = useCallback(async (
        file: UploadedFile,
        batchId: string,
        updateUploadedFile: (fileId: string, updates: Partial<UploadedFile>) => void,
        retryCount = 0
    ): Promise<{ success: boolean; error?: string }> => {
        const maxRetries = 2;

        try {
            updateUploadedFile(file.id, {
                status: 'uploading',
                progress: 0
            });

            const uploadResponse = await api.uploadRevenueFileWithProgress(
                session,
                file.file,
                batchId,
                (progress) => {
                    updateUploadedFile(file.id, { progress });
                },
                file.checksum
            );

            if (uploadResponse.success) {
                updateUploadedFile(file.id, {
                    status: 'success',
                    progress: 100
                });
                return { success: true };
            } else {
                throw new Error(uploadResponse.data?.message || 'เกิดข้อผิดพลาดในการอัปโหลด');
            }

        } catch {
            if (retryCount < maxRetries) {
                await new Promise((resolve) => setTimeout(resolve, 1000 * (retryCount + 1)));
                return uploadSingleFile(file, batchId, updateUploadedFile, retryCount + 1);
            }

            const errorMessage = 'เกิดข้อผิดพลาดในการอัปโหลด';
            updateUploadedFile(file.id, {
                status: 'error',
                error: errorMessage,
                progress: 100
            });

            return {
                success: false,
                error: errorMessage
            };
        }
    }, [session]);

    // ฟังก์ชันตรวจสอบไฟล์เดี่ยวแบบ async
    const validateSingleFile = useCallback(async (
        uploadedFile: UploadedFile,
        serverFile: any,
        updateUploadedFile: (fileId: string, updates: Partial<UploadedFile>) => void
    ): Promise<{ success: boolean; error?: string }> => {
        try {
            updateUploadedFile(uploadedFile.id, {
                status: 'validating'
            });

            const validateResult = await api.validateRevenueFileById(session, serverFile.id);

            let detailedMessage = '';
            let isValid = false;

            if (validateResult.success && validateResult.data) {
                const { fileSize, isValid: dataIsValid, errors, message } = validateResult.data;

                const actualFileSize = fileSize || uploadedFile.file.size;
                const fileSizeMB = actualFileSize ? (actualFileSize / (1024 * 1024)).toFixed(2) : 'ไม่ทราบ';

                if (dataIsValid !== undefined) {
                    isValid = dataIsValid;
                } else if (message && message.includes('ผ่าน')) {
                    isValid = true;
                } else if (errors && errors.length === 0) {
                    isValid = true;
                } else {
                    isValid = false;
                }

                if (message) {
                    detailedMessage = `ไฟล์ขนาด ${fileSizeMB} MB - ${message}`;
                    if (errors && errors.length > 0) {
                        detailedMessage += ` - ข้อผิดพลาด: ${errors.slice(0, 2).join(', ')}`;
                        if (errors.length > 2) {
                            detailedMessage += ` และอีก ${errors.length - 2} รายการ`;
                        }
                    }
                } else {
                    detailedMessage = `ไฟล์ขนาด ${fileSizeMB} MB - ไม่สามารถดึงรายละเอียดการตรวจสอบได้`;
                }
            } else {
                const errorMsg = validateResult.data?.message || 'เกิดข้อผิดพลาดในการตรวจสอบไฟล์';
                detailedMessage = errorMsg;

                if (validateResult.data?.errors && validateResult.data.errors.length > 0) {
                    detailedMessage += ` - ข้อผิดพลาด: ${validateResult.data.errors.slice(0, 2).join(', ')}`;
                }
            }

            updateUploadedFile(uploadedFile.id, {
                status: isValid ? 'imported' : 'error',
                ...(isValid ? {} : { error: detailedMessage })
            });

            return isValid
                ? { success: true }
                : { success: false,
error: detailedMessage };

        } catch {
            const errorMessage = 'เกิดข้อผิดพลาดในการตรวจสอบไฟล์';

            updateUploadedFile(uploadedFile.id, {
                status: 'error',
                error: errorMessage
            });

            return {
                success: false,
                error: errorMessage
            };
        }
    }, [session]);

    // ฟังก์ชันจับคู่ไฟล์ที่อัปโหลดกับไฟล์บนเซิร์ฟเวอร์
    const matchFilesForValidation = useCallback((serverFiles: any[], uploadedFiles: UploadedFile[]) => {
        const filesToValidate = [];

        for (const uploadedFile of uploadedFiles) {
            const matchingFile = serverFiles.find((f) => {
                const fileName = f.fileName || (f as any).originalName || (f as any).filename || `file-${f.id}`;
                return uploadedFile.file.name === fileName ||
                    uploadedFile.file.name === f.fileName ||
                    uploadedFile.file.name === (f as any).originalName ||
                    uploadedFile.file.name === (f as any).filename;
            });

            if (matchingFile) {
                filesToValidate.push({
                    uploadedFile,
                    serverFile: matchingFile
                });
            }
        }

        return filesToValidate;
    }, []);

    // ฟังก์ชันหลักอัปโหลดไฟล์แบบ async
    const uploadFiles = useCallback(async (
        uploadedFiles: UploadedFile[],
        updateUploadedFile: (fileId: string, updates: Partial<UploadedFile>) => void,
        loadBatches: () => Promise<void>
    ): Promise<{ success: boolean; successCount: number; errorCount: number }> => {
        if (uploadedFiles.length === 0) {
            throw new Error('กรุณาเลือกไฟล์ก่อนอัปโหลด');
        }

        try {
            // ขั้นตอนที่ 1: สร้าง batch
            const batchId = await createBatch();

            // ขั้นตอนที่ 2: อัปโหลดไฟล์แบบ concurrent
            const CONCURRENT_UPLOADS = 3;
            const uploadResults = [];

            for (let i = 0; i < uploadedFiles.length; i += CONCURRENT_UPLOADS) {
                const batch = uploadedFiles.slice(i, i + CONCURRENT_UPLOADS);

                const batchResults = await Promise.allSettled(
                    batch.map((file) => uploadSingleFile(file, batchId, updateUploadedFile))
                );

                uploadResults.push(...batchResults);

                if (i + CONCURRENT_UPLOADS < uploadedFiles.length) {
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                }
            }

            const successCount = uploadResults.filter((result) =>
                result.status === 'fulfilled' && result.value.success
            ).length;
            const errorCount = uploadResults.length - successCount;

            // ขั้นตอนที่ 3: ตรวจสอบไฟล์ที่อัปโหลดสำเร็จ
            if (successCount > 0) {
                const details = await api.getRevenueBatchFiles(session, batchId);
                const serverFiles = details.success ? (details.data?.files || []) : [];

                if (serverFiles.length > 0) {
                    const filesToValidate = matchFilesForValidation(serverFiles, uploadedFiles);

                    for (let i = 0; i < filesToValidate.length; i++) {
                        const fileToValidate = filesToValidate[i];
                        if (!fileToValidate) continue;

                        const { uploadedFile, serverFile } = fileToValidate;
                        await validateSingleFile(uploadedFile, serverFile, updateUploadedFile);

                        if (i < filesToValidate.length - 1) {
                            await new Promise((resolve) => setTimeout(resolve, 1000));
                        }
                    }
                }
            }

            // ขั้นตอนที่ 4: รีเฟรชข้อมูล
            await loadBatches();

            return { success: true,
successCount,
errorCount };

        } catch (error) {
            // อัปเดตสถานะเป็น error สำหรับทุกไฟล์ที่ยังไม่เสร็จ
            uploadedFiles.forEach((file) => {
                if (file.status === 'pending' || file.status === 'uploading') {
                    updateUploadedFile(file.id, {
                        status: 'error',
                        error: 'เกิดข้อผิดพลาดในการอัปโหลด',
                        progress: 100
                    });
                }
            });

            throw error;
        }
    }, [createBatch, uploadSingleFile, validateSingleFile, matchFilesForValidation, session]);

    return {
        formatDate,
        createBatch,
        uploadSingleFile,
        validateSingleFile,
        matchFilesForValidation,
        uploadFiles
    };
};
