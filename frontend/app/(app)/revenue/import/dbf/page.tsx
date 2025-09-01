'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { BatchStatus } from '@/types';
import {
    Card,
    CardBody,
    CardHeader,
    Button,
    Chip,
    Alert,
    Table,
    TableHeader,
    TableColumn,
    TableBody,
    TableRow,
    TableCell,
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    useDisclosure,
} from '@heroui/react';
import { toast } from 'react-hot-toast';
import {
    UploadIcon,
    FileTextIcon,
    AlertCircleIcon,
    PlusIcon,
    EyeIcon,
    TrashIcon,
    RefreshIcon,
    CheckCircleIcon,
    ClockIcon,
    CogIcon,
    DocumentCheckIcon
} from '@/components/ui/Icons';
import { useSession } from 'next-auth/react';
import { api, type UploadBatch, type UploadedFile } from '@/app/api/client';

export default function DBFImportPage() {
    const { data: session, status } = useSession();
    // const router = useRouter();
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [uploadBatches, setUploadBatches] = useState<UploadBatch[]>([]);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [isUploadCompleted, setIsUploadCompleted] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const { isOpen, onOpen, onClose } = useDisclosure();
    const { isOpen: isDetailOpen, onOpen: onDetailOpen, onClose: onDetailClose } = useDisclosure();
    const { isOpen: isConfirmOpen, onOpen: onConfirmOpen, onClose: onConfirmClose } = useDisclosure();
    const [selectedBatch, setSelectedBatch] = useState<UploadBatch | null>(null);
    const [batchToDelete, setBatchToDelete] = useState<UploadBatch | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ค่าคงที่สำหรับการจำกัด
    const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB ใน bytes
    const MAX_FILES = 20;

    // Helper function สำหรับอัปเดต uploadedFiles
    const updateUploadedFile = useCallback((fileId: string, updates: Partial<UploadedFile>) => {
        setUploadedFiles((prev) => prev.map((file) =>
            file.id === fileId ? {
                ...file,
                ...updates
            } : file
        ));
    }, []);

    // ฟังก์ชันโหลด batches จาก API
    const loadBatches = useCallback(async () => {
        // ตรวจสอบ session ก่อนเรียก API
        if (!session || !session.accessToken) {
            toast.error('Session ไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่');
            return;
        }

        // สร้าง headers สำหรับ API call
        const headers = {
            'Authorization': session.accessToken ? `Bearer ${session.accessToken}` : undefined,
            'x-session-token': session.sessionToken,
            'X-Session-Token': session.sessionToken,
        };

        try {
            setIsLoading(true);
            const response = await api.getRevenueBatches(session);

            if (response.success && response.data) {
                // แปลงข้อมูลจาก API ให้ตรงกับ interface และกรองเฉพาะ DBF batches
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
                        fileName: f.originalName || f.filename || f.fileName,
                        fileSize: f.fileSize,
                        uploadDate: new Date(f.uploadDate),
                        status: (f.status === 'validating' ? 'processing' : f.status) as 'pending' | 'success' | 'processing' | 'error',
                        recordsCount: f.totalRecords ?? undefined,
                        errorMessage: f.errorMessage ?? undefined,
                    }))
                }));

                // กรองเฉพาะ DBF batches เท่านั้น - ใช้ชื่อ batch และไฟล์เป็นหลัก
                const dbfBatches = allBatches.filter((batch) => {
                    // วิธีที่ 1: ตรวจสอบจากชื่อ batch
                    const batchNameLower = batch.batchName.toLowerCase();
                    if (batchNameLower.includes('dbf files upload') || batchNameLower.startsWith('dbf ')) {
                        return true;
                    }
                    
                    // วิธีที่ 2: ตรวจสอบจากไฟล์ใน batch - ต้องมีไฟล์ .dbf
                    if (batch.files && batch.files.length > 0) {
                        const hasDbfFiles = batch.files.some((file) => 
                            file.fileName.toLowerCase().endsWith('.dbf')
                        );
                        
                        // ต้องมีไฟล์ .dbf และไม่มีไฟล์ REP/STM
                        const hasRepFiles = batch.files.some((file) => {
                            const fileName = file.fileName.toLowerCase();
                            return (fileName.includes('rep') && (fileName.endsWith('.xls') || fileName.endsWith('.xlsx'))) ||
                                   (fileName.includes('statement') || fileName.includes('stm')) && (fileName.endsWith('.xls') || fileName.endsWith('.xlsx'));
                        });
                        
                        return hasDbfFiles && !hasRepFiles;
                    }
                    
                    return false;
                });

                setUploadBatches(dbfBatches);
                setLastUpdated(new Date());
            } else {
                // ไม่แสดง toast error เมื่อไม่สามารถโหลดข้อมูลได้
                // เพราะอาจเป็นเพราะยังไม่มีข้อมูล
                setUploadBatches([]);
            }
        } catch (error: any) {

            // ตรวจสอบ authentication error
            if (error.status === 401) {
                toast.error('Session หมดอายุ กรุณาเข้าสู่ระบบใหม่');
                // ไม่ต้อง redirect ตรงนี้ ให้ ProtectedRoute จัดการ
                return;
            }

            // สำหรับ error อื่นๆ ให้แสดงข้อความที่เหมาะสม
            toast.error('ไม่สามารถโหลดข้อมูล DBF batches ได้ กรุณาลองใหม่อีกครั้ง');

            // ตั้งค่า batches เป็น array ว่าง
            setUploadBatches([]);
        } finally {
            setIsLoading(false);
        }
    }, [session]);

    // ตรวจสอบ session เมื่อ component mount
    useEffect(() => {
        // รอให้ session โหลดเสร็จก่อน
        if (status === 'loading') return;

        // ถ้าไม่มี session ให้ ProtectedRoute จัดการเอง
        if (!session) {
            return;
        }

        // ตรวจสอบว่า session มีข้อมูลที่จำเป็นหรือไม่
        if (!session.accessToken && !session.sessionToken) {
            // ไม่มี access token หรือ session token - ให้ ProtectedRoute จัดการ
            return;
        }

        // โหลดข้อมูล batches เมื่อ session ถูกต้อง
        loadBatches();
    }, [session, status, loadBatches]);

    // ฟังก์ชันสำหรับการคำนวณและแสดงขนาดไฟล์
    const formatFileSize = useCallback((bytes: number): string => {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    }, []);

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

    // ฟังก์ชันสร้าง checksum จากไฟล์
    const generateFileChecksum = useCallback(async (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const arrayBuffer = event.target?.result as ArrayBuffer;
                    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
                    const hashArray = Array.from(new Uint8Array(hashBuffer));
                    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
                    resolve(hashHex);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file for checksum'));
            reader.readAsArrayBuffer(file);
        });
    }, []);

    // ฟังก์ชันตรวจสอบไฟล์ DBF
    const validateDBFFile = useCallback((file: File): boolean => {
        // ตรวจสอบนามสกุลไฟล์
        const validExtensions = ['.dbf', '.DBF'];
        const fileName = file.name.toLowerCase();
        const hasValidExtension = validExtensions.some((ext) => fileName.endsWith(ext));

        if (!hasValidExtension) {
            setErrorMessage('ไฟล์ต้องเป็นนามสกุล .dbf เท่านั้น');
            return false;
        }

        // ตรวจสอบขนาดไฟล์
        if (file.size > MAX_FILE_SIZE) {
            setErrorMessage(`ขนาดไฟล์ต้องไม่เกิน ${formatFileSize(MAX_FILE_SIZE)}`);
            return false;
        }

        // ตรวจสอบจำนวนไฟล์
        if (uploadedFiles.length >= MAX_FILES) {
            setErrorMessage(`สามารถอัปโหลดได้สูงสุด ${MAX_FILES} ไฟล์`);
            return false;
        }

        return true;
    }, [uploadedFiles.length, formatFileSize, MAX_FILE_SIZE]);

    // ฟังก์ชันจัดการการเลือกไฟล์
    const handleFileSelect = useCallback(async (files: FileList | null) => {
        if (!files) return;

        const newFiles: UploadedFile[] = [];
        let hasError = false;

        // แสดง loading สำหรับการสร้าง checksum
        setErrorMessage('กำลังตรวจสอบไฟล์และสร้าง checksum...');

        for (const file of Array.from(files)) {
            if (!validateDBFFile(file)) {
                hasError = true;
                continue;
            }

            try {
                // สร้าง checksum สำหรับไฟล์
                const checksum = await generateFileChecksum(file);

                const newFile: UploadedFile = {
                    id: `file-${Date.now()}-${Math.random()}`,
                    file,
                    status: 'pending',
                    progress: 0,
                    checksum,
                    fileSize: file.size
                };

                newFiles.push(newFile);
            } catch (error) {
                console.error('Error generating checksum for file:', file.name, error);
                setErrorMessage(`ไม่สามารถสร้าง checksum สำหรับไฟล์ ${file.name} ได้`);
                hasError = true;
                break;
            }
        }

        if (!hasError && newFiles.length > 0) {
            setUploadedFiles((prev) => [...prev, ...newFiles]);
            setErrorMessage('');
        } else if (!hasError) {
            setErrorMessage('');
        }
    }, [validateDBFFile, generateFileChecksum]);

    // ฟังก์ชันลบไฟล์
    const removeFile = useCallback((fileId: string) => {
        setUploadedFiles((prev) => prev.filter((file) => file.id !== fileId));
    }, []);

    // ฟังก์ชันลบไฟล์ทั้งหมด
    const clearAllFiles = useCallback(() => {
        setUploadedFiles([]);
        setErrorMessage('');
    }, []);

    // ฟังก์ชันแสดง modal ยืนยันการลบ batch
    const confirmDeleteBatch = useCallback((batch: UploadBatch) => {
        setBatchToDelete(batch);
        onConfirmOpen();
    }, [onConfirmOpen]);

    // ฟังก์ชันลบ batch
    const deleteBatch = useCallback(async (batchId: string) => {
        try {
            const response = await api.deleteRevenueBatch(session, batchId);

            if (response.success) {
                setUploadBatches((prev) => prev.filter((batch) => batch.id !== batchId));

                toast.success('ลบ batch เรียบร้อยแล้ว');
            } else {
                toast.error('ไม่สามารถลบ batch ได้');
            }
        } catch (error) {
            console.error('Error deleting batch:', error);
            toast.error('ไม่สามารถลบ batch ได้');
        } finally {
            onConfirmClose();
        }
    }, [session, onConfirmClose]);

    // 🚀 ฟังก์ชันสำหรับสร้าง batch ใหม่
    const createBatch = useCallback(async (): Promise<string> => {
        const batchResponse = await api.createRevenueBatch(session, {
            batchName: `Batch ${formatDate(new Date())}`,
            userId: session?.user?.email || 'unknown',
            ipAddress: 'unknown',
            userAgent: navigator.userAgent
        });

        if (!batchResponse.success || !batchResponse.data) {
            throw new Error('ไม่สามารถสร้าง batch ได้');
        }

        return batchResponse.data.id;
    }, [session, formatDate]);

    // 📤 ฟังก์ชันอัปโหลดไฟล์เดี่ยวแบบ async พร้อม retry mechanism
    const uploadSingleFile = useCallback(async (
        file: typeof uploadedFiles[0],
        batchId: string,
        retryCount = 0
    ): Promise<{ success: boolean; error?: string }> => {
        const maxRetries = 2;

        try {
            // อัปเดตสถานะเป็น uploading
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

        } catch (error: any) {
            // ลอง retry หากไม่เกิน maxRetries
            if (retryCount < maxRetries) {
                console.log(`🔄 ลองอัปโหลดใหม่ครั้งที่ ${retryCount + 1} สำหรับไฟล์: ${file.file.name}`);
                await new Promise((resolve) => setTimeout(resolve, 1000 * (retryCount + 1))); // เพิ่มเวลารอแต่ละครั้ง
                return uploadSingleFile(file, batchId, retryCount + 1);
            }

            const errorMessage = error.message || 'เกิดข้อผิดพลาดในการอัปโหลด';
            updateUploadedFile(file.id, {
                status: 'error',
                error: errorMessage,
                progress: 100
            });

            console.error(`❌ อัปโหลดไฟล์ ${file.file.name} ล้มเหลว:`, errorMessage);
            return { success: false,
error: errorMessage };
        }
    }, [session, updateUploadedFile]);

    // 🔍 ฟังก์ชันตรวจสอบไฟล์เดี่ยวแบบ async
    const validateSingleFile = useCallback(async (
        uploadedFile: typeof uploadedFiles[0],
        serverFile: any
    ): Promise<{ success: boolean; error?: string }> => {
        try {
            console.log(`🔍 เริ่มตรวจสอบไฟล์: ${uploadedFile.file.name}`);

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

                // ตรวจสอบ isValid จากหลายแหล่ง
                if (dataIsValid !== undefined) {
                    isValid = dataIsValid;
                } else if (message && message.includes('ผ่าน')) {
                    isValid = true;
                } else if (errors && errors.length === 0) {
                    isValid = true;
                } else {
                    isValid = false;
                }

                // สร้างข้อความแสดงผลลัพธ์
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

            console.log(`✅ ตรวจสอบไฟล์ ${uploadedFile.file.name} เสร็จสิ้น: ${isValid ? 'สำเร็จ' : 'ล้มเหลว'}`);
            return isValid 
                ? { 
                    success: true 
                } 
                : { 
                    success: false, 
                    error: detailedMessage 
                };

        } catch (error: any) {
            const errorMessage = error.message || 'เกิดข้อผิดพลาดในการตรวจสอบไฟล์';
            console.error(`❌ เกิดข้อผิดพลาดในการตรวจสอบไฟล์ ${uploadedFile.file.name}:`, error);

            updateUploadedFile(uploadedFile.id, {
                status: 'error',
                error: errorMessage
            });

            return { 
                success: false,
                error: errorMessage 
            };
        }
    }, [session, updateUploadedFile]);

    // 📋 ฟังก์ชันจับคู่ไฟล์ที่อัปโหลดกับไฟล์บนเซิร์ฟเวอร์
    const matchFilesForValidation = useCallback((serverFiles: any[]) => {
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
    }, [uploadedFiles]);

    // 🚀 ฟังก์ชันหลักอัปโหลดไฟล์แบบ async ที่ปรับปรุงแล้ว
    const uploadFiles = useCallback(async () => {
        if (uploadedFiles.length === 0) {
            setErrorMessage('กรุณาเลือกไฟล์ก่อนอัปโหลด');
            return;
        }

        setIsUploading(true);
        setErrorMessage('');

        try {
            // ขั้นตอนที่ 1: สร้าง batch
            console.log('🚀 เริ่มต้นกระบวนการอัปโหลด...');
            const batchId = await createBatch();
            console.log(`📦 สร้าง batch สำเร็จ: ${batchId}`);

            // ขั้นตอนที่ 2: อัปโหลดไฟล์แบบ concurrent (จำกัดจำนวนพร้อมกัน)
            console.log(`📤 เริ่มอัปโหลดไฟล์ ${uploadedFiles.length} ไฟล์...`);

            const CONCURRENT_UPLOADS = 3; // อัปโหลดพร้อมกันสูงสุด 3 ไฟล์
            const uploadResults = [];

            // แบ่งไฟล์เป็น batch ย่อยๆ เพื่อไม่ให้โหลดเซิร์ฟเวอร์มากเกินไป
            for (let i = 0; i < uploadedFiles.length; i += CONCURRENT_UPLOADS) {
                const batch = uploadedFiles.slice(i, i + CONCURRENT_UPLOADS);
                console.log(`📤 อัปโหลด batch ที่ ${Math.floor(i / CONCURRENT_UPLOADS) + 1}: ${batch.length} ไฟล์`);

                // อัปโหลดไฟล์ใน batch นี้พร้อมกัน
                const batchResults = await Promise.allSettled(
                    batch.map((file) => uploadSingleFile(file, batchId))
                );

                uploadResults.push(...batchResults);

                // รอระหว่าง batch (ให้เซิร์ฟเวอร์พักหายใจ)
                if (i + CONCURRENT_UPLOADS < uploadedFiles.length) {
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                }
            }

            // นับผลลัพธ์การอัปโหลด
            const successCount = uploadResults.filter((result) =>
                result.status === 'fulfilled' && result.value.success
            ).length;
            const errorCount = uploadResults.length - successCount;

            console.log(`📤 อัปโหลดเสร็จสิ้น: สำเร็จ ${successCount} ไฟล์, ล้มเหลว ${errorCount} ไฟล์`);

            // ขั้นตอนที่ 3: ตรวจสอบไฟล์ที่อัปโหลดสำเร็จ
            if (successCount > 0) {
                console.log('🔍 เริ่มกระบวนการตรวจสอบไฟล์...');

                // ดึงรายชื่อไฟล์ใน batch
                const details = await api.getRevenueBatchFiles(session, batchId);
                const serverFiles = details.success ? (details.data?.files || []) : [];

                if (serverFiles.length > 0) {
                    // จับคู่ไฟล์และตรวจสอบแบบ sequential (เพื่อไม่ให้โหลดเซิร์ฟเวอร์)
                    const filesToValidate = matchFilesForValidation(serverFiles);
                    console.log(`📋 ไฟล์ที่จะตรวจสอบ: ${filesToValidate.length} ไฟล์`);

                    for (let i = 0; i < filesToValidate.length; i++) {
                        const fileToValidate = filesToValidate[i];
                        if (!fileToValidate) continue;
                        
                        const { uploadedFile, serverFile } = fileToValidate;

                        console.log(`🔍 ตรวจสอบไฟล์ที่ ${i + 1}/${filesToValidate.length}: ${uploadedFile.file.name}`);
                        await validateSingleFile(uploadedFile, serverFile);

                        // รอระหว่างการตรวจสอบแต่ละไฟล์
                        if (i < filesToValidate.length - 1) {
                            await new Promise((resolve) => setTimeout(resolve, 1000));
                        }
                    }
                }
            }

            // ขั้นตอนที่ 4: รีเฟรชข้อมูลและแสดงผลลัพธ์
            await loadBatches();

            // แสดงผลลัพธ์สุดท้าย
            if (successCount > 0) {
                toast.success(`อัปโหลดและตรวจสอบไฟล์เสร็จสิ้น! สำเร็จ ${successCount} ไฟล์${errorCount > 0 ? `, ล้มเหลว ${errorCount} ไฟล์` : ''}`);
            } else {
                toast.error(`อัปโหลดไฟล์ล้มเหลว: ${errorCount} ไฟล์`);
            }

            setIsUploadCompleted(true);

        } catch (error: any) {
            console.error('❌ เกิดข้อผิดพลาดในกระบวนการอัปโหลด:', error);
            setErrorMessage(error.message || 'เกิดข้อผิดพลาดในการอัปโหลด กรุณาลองใหม่อีกครั้ง');

            // อัปเดตสถานะเป็น error สำหรับทุกไฟล์ที่ยังไม่เสร็จ
            uploadedFiles.forEach((file) => {
                if (file.status === 'pending' || file.status === 'uploading') {
                    updateUploadedFile(file.id, {
                        status: 'error',
                        error: error.message || 'เกิดข้อผิดพลาดในการอัปโหลด',
                        progress: 100
                    });
                }
            });

        } finally {
            setIsUploading(false);
        }
    }, [
        uploadedFiles,
        createBatch,
        uploadSingleFile,
        validateSingleFile,
        matchFilesForValidation,
        session,
        loadBatches,
        setErrorMessage,
        setIsUploading,
        setIsUploadCompleted
    ]);

    // ฟังก์ชันจัดการปุ่ม "เสร็จสิ้น"
    const handleUploadComplete = useCallback(() => {
        setUploadedFiles([]);
        setIsUploadCompleted(false);
        setErrorMessage('');
        // รีเฟรชข้อมูลก่อนปิด modal
        // loadBatches();
        onClose();
    }, [onClose, loadBatches]);

    // ฟังก์ชันเปิด modal และรีเซ็ต state
    const handleOpenModal = useCallback(() => {
        setUploadedFiles([]);
        setIsUploadCompleted(false);
        setErrorMessage('');
        setIsUploading(false);
        onOpen();
    }, [onOpen]);

    // ฟังก์ชัน refresh ข้อมูลแบบ manual
    const handleRefresh = useCallback(async () => {
        try {
            setIsRefreshing(true);
            // รีเฟรชข้อมูล
            await loadBatches();
            toast.success('รีเฟรชข้อมูลเรียบร้อย');
        } catch (error) {
            toast.error('เกิดข้อผิดพลาดในการรีเฟรชข้อมูล');
            console.error('Refresh error:', error);
        } finally {
            setIsRefreshing(false);
        }
    }, [loadBatches]);

    // ฟังก์ชันจัดการ drag and drop
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        handleFileSelect(e.dataTransfer.files);
    }, [handleFileSelect]);

    // ฟังก์ชันโหลดรายละเอียด batch
    const loadBatchDetails = useCallback(async (batchId: string) => {
        try {
            const response = await api.getRevenueBatchFiles(session, batchId);

            if (response.success && response.data) {
                const { batch, files } = response.data;

                setSelectedBatch({
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
                    files: files.map((file: any) => ({
                        id: file.id,
                        fileName: file.originalName || file.filename || file.fileName,
                        fileSize: file.fileSize,
                        uploadDate: new Date(file.uploadDate),
                        status: (file.status === 'validating' ? 'processing' : file.status) as 'pending' | 'success' | 'processing' | 'error',
                        recordsCount: file.totalRecords ?? undefined,
                        errorMessage: file.errorMessage ?? undefined,
                    }))
                });
            }
        } catch (error) {
            console.error('Error loading batch details:', error);
            toast.error('ไม่สามารถโหลดรายละเอียด batch ได้');
        }
    }, [session]);

    return (
        <div className='container mx-auto p-6 space-y-6'>
            {/* Header */}
            <div className='flex items-center justify-between'>
                <div>
                    <h1 className='text-3xl font-bold text-foreground'>นำเข้าไฟล์ DBF</h1>
                    <p className='text-default-600 mt-2'>อัปโหลดและประมวลผลไฟล์ DBF</p>
                </div>
                <div className="flex space-x-2">
                    <Button
                        color='default'
                        variant='bordered'
                        startContent={<RefreshIcon className='h-4 w-4' />}
                        aria-label="รีเฟรชข้อมูล"
                        onPress={handleRefresh}
                        isLoading={isRefreshing}
                    >
                        รีเฟรช
                    </Button>
                    <Button
                        color='primary'
                        variant='solid'
                        startContent={<PlusIcon className='h-4 w-4' />}
                        aria-label="อัปโหลดไฟล์ DBF ใหม่"
                        onPress={handleOpenModal}
                    >
                        อัปโหลดไฟล์ใหม่
                    </Button>
                </div>
            </div>

            {/* Upload History - Batch View */}
            <Card className='w-full bg-default'>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className='text-lg font-medium text-foreground'>ประวัติการอัปโหลด DBF Files</h3>
                            <p className='text-sm text-default-500 mt-1'>แสดงเฉพาะ DBF batches เท่านั้น</p>
                        </div>
                        {lastUpdated && (
                            <div className="text-sm text-default-500 pl-2">
                                อัปเดตล่าสุด : {lastUpdated.toLocaleTimeString('th-TH', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit'
                                })}
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardBody>
                    {isLoading ? (
                        <div className='flex items-center justify-center py-8' aria-label="กำลังโหลดข้อมูล">
                            <div className='text-default-600'>กำลังโหลดข้อมูล...</div>
                        </div>
                    ) : (
                        <Table aria-label='ประวัติการอัปโหลด Batch'>
                            <TableHeader>
                                <TableColumn>ชื่อ Batch</TableColumn>
                                <TableColumn>วันที่อัปโหลด</TableColumn>
                                <TableColumn>ไฟล์ทั้งหมด</TableColumn>
                                <TableColumn>สำเร็จ</TableColumn>
                                <TableColumn>ผิดพลาด</TableColumn>
                                <TableColumn>รายการทั้งหมด</TableColumn>
                                <TableColumn>ขนาดรวม</TableColumn>
                                <TableColumn>สถานะ</TableColumn>
                                <TableColumn>การดำเนินการ</TableColumn>
                            </TableHeader>
                            <TableBody items={uploadBatches} emptyContent={"ยังไม่มีประวัติการอัปโหลด DBF Files"}>
                                {(batch) => (
                                    <TableRow key={batch.id}>
                                        <TableCell>
                                            <div className='flex items-center space-x-2' aria-label={`ชื่อ batch: ${batch.batchName}`}>
                                                <FileTextIcon className='h-4 w-4 text-primary-600 dark:text-primary-400' />
                                                <span className='font-medium text-foreground'>{batch.batchName}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className='text-default-600'>{formatDate(batch.uploadDate)}</span>
                                        </TableCell>
                                        <TableCell>
                                            <span className='text-foreground font-medium'>{batch.totalFiles}</span>
                                        </TableCell>
                                        <TableCell>
                                            <span className='text-success-600 font-medium'>{batch.successFiles}</span>
                                        </TableCell>
                                        <TableCell>
                                            <span className='text-danger-600 font-medium'>{batch.errorFiles}</span>
                                        </TableCell>
                                        <TableCell>
                                            <span className='text-default-600'>{batch.totalRecords.toLocaleString()}</span>
                                        </TableCell>
                                        <TableCell>
                                            <span className='text-default-600'>{formatFileSize(batch.totalSize)}</span>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                className={
                                                    batch.status === BatchStatus.SUCCESS ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300' :
                                                        batch.status === BatchStatus.ERROR ? 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-300' :
                                                            batch.status === BatchStatus.PROCESSING ? 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300' :
                                                                batch.status === BatchStatus.PARTIAL ? 'bg-secondary-100 text-secondary-700 dark:bg-secondary-900/30 dark:text-secondary-300' :
                                                                    'bg-default-100 text-default-700 dark:bg-default-900/30 dark:text-default-300'
                                                }
                                                aria-label={`สถานะ batch: ${batch.status === BatchStatus.SUCCESS ? 'นำเข้าไฟล์เสร็จสิ้น' :
                                                    batch.status === BatchStatus.ERROR ? 'ผิดพลาดทั้งหมด' :
                                                        batch.status === BatchStatus.PROCESSING ? 'กำลังประมวลผล' :
                                                            batch.status === BatchStatus.PARTIAL ? 'บางส่วนสำเร็จ' :
                                                                'ไม่ทราบสถานะ'
                                                    }`}
                                            >
                                                {batch.status === BatchStatus.SUCCESS ? 'นำเข้าไฟล์เสร็จสิ้น' :
                                                    batch.status === BatchStatus.ERROR ? 'ผิดพลาดทั้งหมด' :
                                                        batch.status === BatchStatus.PROCESSING ? 'กำลังประมวลผล' :
                                                            batch.status === BatchStatus.PARTIAL ? 'บางส่วนสำเร็จ' :
                                                                'ไม่ทราบสถานะ'}
                                            </Chip>
                                        </TableCell>
                                        <TableCell>
                                            <div className='flex items-center space-x-2' aria-label="การดำเนินการกับ batch">
                                                <Button
                                                    isIconOnly
                                                    size='sm'
                                                    variant='light'
                                                    color='primary'
                                                    aria-label="ดูรายละเอียด batch"
                                                    onPress={() => {
                                                        loadBatchDetails(batch.id);
                                                        onDetailOpen();
                                                    }}
                                                >
                                                    <EyeIcon className='h-4 w-4' />
                                                </Button>
                                                <Button
                                                    isIconOnly
                                                    size='sm'
                                                    variant='light'
                                                    color='danger'
                                                    aria-label="ลบ batch"
                                                    onPress={() => confirmDeleteBatch(batch)}
                                                >
                                                    <TrashIcon className='h-4 w-4' />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardBody>
            </Card>

            {/* Upload Modal */}
            <Modal isOpen={isOpen} onClose={onClose} size='xl' isDismissable={false}>
                <ModalContent>
                    <ModalHeader>
                        <h3 className='text-lg font-medium text-foreground'>อัปโหลดไฟล์ DBF ใหม่</h3>
                    </ModalHeader>
                    <ModalBody>
                        <div className='space-y-4'>
                            {/* Error Message */}
                            {errorMessage && (
                                <Alert
                                    color='danger'
                                    variant='flat'
                                    startContent={<AlertCircleIcon className='h-4 w-4' />}
                                    aria-label="ข้อความแจ้งเตือน"
                                >
                                    {errorMessage}
                                </Alert>
                            )}

                            {/* Upload Area */}
                            <div
                                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${isDragOver
                                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                    : 'border-default-300 dark:border-default-600'
                                    }`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                aria-label="พื้นที่อัปโหลดไฟล์ DBF"
                            >
                                <UploadIcon className='h-10 w-10 text-default-400 mx-auto mb-3' />
                                <h4 className='text-lg font-medium text-foreground mb-2'>
                                    ลากไฟล์มาที่นี่หรือคลิกเพื่อเลือกไฟล์
                                </h4>
                                <p className='text-sm text-default-600 mb-3'>
                                    รองรับไฟล์ DBF ขนาดสูงสุด {formatFileSize(MAX_FILE_SIZE)} จำนวนสูงสุด {MAX_FILES} ไฟล์
                                </p>
                                <Button
                                    color='primary'
                                    variant='solid'
                                    startContent={<PlusIcon className='h-4 w-4' />}
                                    aria-label="เลือกไฟล์ DBF"
                                    onPress={() => fileInputRef.current?.click()}
                                >
                                    เลือกไฟล์
                                </Button>
                                <input
                                    ref={fileInputRef}
                                    type='file'
                                    multiple
                                    accept='.dbf,.DBF'
                                    className='hidden'
                                    aria-label="เลือกไฟล์ DBF"
                                    onChange={(e) => handleFileSelect(e.target.files)}
                                />
                            </div>

                            {/* File List */}
                            {uploadedFiles.length > 0 && (
                                <div className='space-y-2'>
                                    <div className='flex items-center justify-between'>
                                        <div className='flex items-center space-x-3'>
                                            <h4 className='font-medium text-foreground'>ไฟล์ที่เลือก ({uploadedFiles.length})</h4>
                                        </div>
                                        <Button
                                            size='sm'
                                            variant='light'
                                            color='danger'
                                            aria-label="ลบไฟล์ทั้งหมด"
                                            onPress={clearAllFiles}
                                        >
                                            ลบทั้งหมด
                                        </Button>
                                    </div>
                                    <div className='space-y-2 max-h-60 overflow-y-auto' aria-label="รายการไฟล์ที่เลือก">
                                        {uploadedFiles.map((file, index) => (
                                            <div
                                                key={file.id}
                                                className='flex items-center justify-between p-3 bg-default-50 dark:bg-default-900/20 rounded-lg'
                                                aria-label={`ไฟล์ที่ ${index + 1}: ${file.file.name}`}
                                            >
                                                <div className='flex items-center space-x-3 flex-1' aria-label={`ข้อมูลไฟล์: ${file.file.name}`}>
                                                    <FileTextIcon className='h-5 w-5 text-primary-600 dark:text-primary-400' />
                                                    <div className='flex-1 min-w-0'>
                                                        <p className='font-medium text-foreground truncate'>{file.file.name}</p>
                                                        <p className='text-sm text-default-600'>{formatFileSize(file.file.size)}</p>
                                                        {file.checksum && (
                                                            <p className='text-xs text-default-500 truncate' title={`Checksum: ${file.checksum}`}>
                                                                SHA256: {file.checksum.substring(0, 16)}...
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className='flex items-center space-x-2' aria-label="การดำเนินการกับไฟล์">
                                                    {/* สถานะการอัปโหลด */}
                                                    {file.status === 'uploading' && (
                                                        <div className="flex items-center space-x-2" aria-label={`กำลังอัปโหลด ${file.file.name}: ${file.progress}%`}>
                                                            <UploadIcon className='h-4 w-4 text-primary-500 animate-pulse' />
                                                            <div className='w-20 h-2 bg-default-200 rounded overflow-hidden'>
                                                                <div className='h-2 bg-primary-500' style={{ width: `${file.progress}%` }} />
                                                            </div>
                                                            <span className="text-xs text-default-600">{file.progress}%</span>
                                                        </div>
                                                    )}

                                                    {/* สถานะอัปโหลดสำเร็จ */}
                                                    {file.status === 'success' && (
                                                        <div className="flex items-center space-x-2">
                                                            <CheckCircleIcon className='h-4 w-4 text-success-600' />
                                                            <Chip className='bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300' aria-label="อัปโหลดสำเร็จ">
                                                                อัปโหลดสำเร็จ
                                                            </Chip>
                                                        </div>
                                                    )}

                                                    {/* สถานะกำลังตรวจสอบไฟล์ */}
                                                    {file.status === 'validating' && (
                                                        <div className="space-y-2">
                                                            <div className="flex items-center space-x-2">
                                                                <ClockIcon className='h-4 w-4 text-warning-500 animate-spin' />
                                                                <Chip className='bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300' aria-label="กำลังตรวจสอบไฟล์">
                                                                    กำลังตรวจสอบไฟล์
                                                                </Chip>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* สถานะกำลังประมวลผล */}
                                                    {file.status === 'processing' && (
                                                        <div className="flex items-center space-x-2">
                                                            <CogIcon className='h-4 w-4 text-blue-500 animate-spin' />
                                                            <Chip className='bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' aria-label="กำลังประมวลผล">
                                                                กำลังประมวลผล
                                                            </Chip>
                                                        </div>
                                                    )}

                                                    {/* สถานะนำเข้าไฟล์เรียบร้อย */}
                                                    {file.status === 'imported' && (
                                                        <div className="flex items-center space-x-2">
                                                            <DocumentCheckIcon className='h-4 w-4 text-green-600' />
                                                            <Chip className='bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' aria-label="นำเข้าไฟล์เรียบร้อย">
                                                                นำเข้าไฟล์เรียบร้อย
                                                            </Chip>
                                                            {/* แสดงจำนวน records ถ้ามี */}
                                                            {file.recordsCount && file.recordsCount > 0 && (
                                                                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                                                                    {file.recordsCount.toLocaleString()} รายการ
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* สถานะผิดพลาด */}
                                                    {file.status === 'error' && (
                                                        <div className="flex flex-col space-y-1">
                                                            <div className="flex items-center space-x-2">
                                                                <AlertCircleIcon className='h-4 w-4 text-danger-600' />
                                                                <Chip className='bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-300' aria-label="สถานะผิดพลาด">
                                                                    ผิดพลาด
                                                                </Chip>
                                                            </div>
                                                            {file.error && (
                                                                <div className="text-xs text-danger-600 max-w-xs truncate" title={file.error}>
                                                                    {file.error}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* สถานะรอการประมวลผล */}
                                                    {file.status === 'pending' && (
                                                        <div className="flex items-center space-x-2">
                                                            <ClockIcon className='h-4 w-4 text-default-400' />
                                                            <Chip className='bg-default-100 text-default-700 dark:bg-default-900/30 dark:text-default-300' aria-label="รอการประมวลผล">
                                                                รอการประมวลผล
                                                            </Chip>
                                                        </div>
                                                    )}

                                                    <Button
                                                        isIconOnly
                                                        size='sm'
                                                        variant='light'
                                                        color='danger'
                                                        aria-label="ลบไฟล์"
                                                        onPress={() => removeFile(file.id)}
                                                        isDisabled={file.status === 'uploading' || file.status === 'validating' || file.status === 'processing'}
                                                    >
                                                        <TrashIcon className='h-4 w-4' />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        {!isUploadCompleted ? (
                            <>
                                <Button variant='light' aria-label="ยกเลิกการอัปโหลด" onPress={onClose}>
                                    ยกเลิก
                                </Button>
                                <Button
                                    color='primary'
                                    variant='solid'
                                    isLoading={isUploading}
                                    isDisabled={
                                        uploadedFiles.length === 0 ||
                                        isUploading ||
                                        uploadedFiles.some((f) => (f.status as string) === 'uploading' || (f.status as string) === 'validating' || (f.status as string) === 'processing')
                                    }
                                    aria-label="อัปโหลดไฟล์ DBF"
                                    onPress={uploadFiles}
                                >
                                    {isUploading ? 'กำลังประมวลผล...' : 'อัปโหลดไฟล์'}
                                </Button>
                            </>
                        ) : (
                            <Button
                                color='success'
                                variant='solid'
                                className='w-full'
                                aria-label="เสร็จสิ้นการอัปโหลด"
                                onPress={handleUploadComplete}
                            >
                                เสร็จสิ้น
                            </Button>
                        )}
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Detail Modal */}
            <Modal isOpen={isDetailOpen} onClose={onDetailClose} size='4xl' aria-label="รายละเอียด batch">
                <ModalContent>
                    <ModalHeader>
                        <div className='flex items-center space-x-2'>
                            <FileTextIcon className='h-5 w-5 text-primary-600 dark:text-primary-400' />
                            <div>
                                <h3 className='text-lg font-medium text-foreground'>
                                    รายละเอียดไฟล์ใน {selectedBatch?.batchName}
                                </h3>
                                <p className='text-sm text-default-600'>
                                    อัปโหลดเมื่อ {selectedBatch ? formatDate(selectedBatch.uploadDate) : ''}
                                </p>
                            </div>
                        </div>
                    </ModalHeader>
                    <ModalBody>
                        {selectedBatch && (
                            <div className='space-y-4'>
                                {/* Batch Summary */}
                                <div className='grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-default-50 dark:bg-default-900/20 rounded-lg' aria-label="สรุปข้อมูล batch">
                                    <div className='text-center'>
                                        <div className='text-lg font-semibold text-foreground'>{selectedBatch.totalFiles}</div>
                                        <div className='text-xs text-default-600'>ไฟล์ทั้งหมด</div>
                                    </div>
                                    <div className='text-center'>
                                        <div className='text-lg font-semibold text-success-600'>{selectedBatch.successFiles}</div>
                                        <div className='text-xs text-default-600'>สำเร็จ</div>
                                    </div>
                                    <div className='text-center'>
                                        <div className='text-lg font-semibold text-danger-600'>{selectedBatch.errorFiles}</div>
                                        <div className='text-xs text-default-600'>ผิดพลาด</div>
                                    </div>
                                    <div className='text-center'>
                                        <div className='text-lg font-semibold text-foreground'>{selectedBatch.totalRecords.toLocaleString()}</div>
                                        <div className='text-xs text-default-600'>รายการทั้งหมด</div>
                                    </div>
                                </div>

                                {/* Files Table */}
                                <Table aria-label={`รายละเอียดไฟล์ ${selectedBatch.batchName}`}>
                                    <TableHeader>
                                        <TableColumn>ชื่อไฟล์</TableColumn>
                                        <TableColumn>ขนาดไฟล์</TableColumn>
                                        <TableColumn>สถานะ</TableColumn>
                                        <TableColumn>จำนวนรายการ</TableColumn>
                                        <TableColumn>ข้อผิดพลาด</TableColumn>
                                        <TableColumn>การดำเนินการ</TableColumn>
                                    </TableHeader>
                                    <TableBody items={selectedBatch?.files ?? []}>
                                        {(file) => (
                                            <TableRow key={file.id}>
                                                <TableCell>
                                                    <div className='flex items-center space-x-2' aria-label={`ชื่อไฟล์: ${file.fileName}`}>
                                                        <FileTextIcon className='h-4 w-4 text-primary-600 dark:text-primary-400' />
                                                        <span className='font-medium text-foreground'>{file.fileName}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className='text-default-600'>{formatFileSize(file.fileSize)}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        className={
                                                            (file.status as string) === 'success' || (file.status as string) === 'completed' || (file.status as string) === 'imported'
                                                                ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300'
                                                                : (file.status as string) === 'error' || (file.status as string) === 'failed'
                                                                    ? 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-300'
                                                                    : (file.status as string) === 'processing' || (file.status as string) === 'validating'
                                                                        ? 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300'
                                                                        : 'bg-default-100 text-default-700 dark:bg-default-900/30 dark:text-default-300'
                                                        }
                                                        aria-label={`สถานะไฟล์ ${file.fileName}: ${(file.status as string) === 'success' || (file.status as string) === 'completed' || (file.status as string) === 'imported' ? 'สำเร็จ' :
                                                            (file.status as string) === 'error' || (file.status as string) === 'failed' ? 'ผิดพลาด' :
                                                                (file.status as string) === 'processing' ? 'กำลังประมวลผล' :
                                                                    (file.status as string) === 'validating' ? 'กำลังตรวจสอบไฟล์' :
                                                                        (file.status as string) === 'pending' ? 'รอตรวจสอบไฟล์' :
                                                                            (file.status as string) === 'uploading' ? 'กำลังอัปโหลด' : 'ไม่ทราบสถานะ'
                                                            }`}
                                                    >
                                                        {(file.status as string) === 'success' || (file.status as string) === 'completed' || (file.status as string) === 'imported' ? 'สำเร็จ' :
                                                            (file.status as string) === 'error' || (file.status as string) === 'failed' ? 'ผิดพลาด' :
                                                                (file.status as string) === 'processing' ? 'กำลังประมวลผล' :
                                                                    (file.status as string) === 'validating' ? 'กำลังตรวจสอบไฟล์' :
                                                                        (file.status as string) === 'pending' ? 'รอตรวจสอบไฟล์' :
                                                                            (file.status as string) === 'uploading' ? 'กำลังอัปโหลด' : 'ไม่ทราบสถานะ'}
                                                    </Chip>
                                                </TableCell>
                                                <TableCell>
                                                    {file.recordsCount ? (
                                                        <span className='text-default-600'>{file.recordsCount.toLocaleString()} รายการ</span>
                                                    ) : (
                                                        <span className='text-default-400'>-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {file.errorMessage ? (
                                                        <span className='text-danger-600 text-sm'>{file.errorMessage}</span>
                                                    ) : (
                                                        <span className='text-default-400'>-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className='flex items-center space-x-2' aria-label="การดำเนินการกับไฟล์">
                                                        <Button
                                                            isIconOnly
                                                            size='sm'
                                                            variant='light'
                                                            color='primary'
                                                            aria-label="ดูรายละเอียดไฟล์"
                                                            onPress={() => {
                                                                // TODO: Implement view details functionality
                                                                // ดูรายละเอียดไฟล์
                                                            }}
                                                        >
                                                            <EyeIcon className='h-4 w-4' />
                                                        </Button>
                                                        {/* ปุ่มดูข้อมูล DBF Records (เฉพาะไฟล์ DBF ที่ประมวลผลแล้ว) */}
                                                        {file.fileName.toLowerCase().endsWith('.dbf') &&
                                                            file.status === 'success' && (
                                                                <Button
                                                                    isIconOnly
                                                                    size='sm'
                                                                    variant='light'
                                                                    color='secondary'
                                                                    aria-label="ดูข้อมูล DBF Records"
                                                                    onPress={() => {
                                                                        // TODO: Implement view DBF records functionality
                                                                        // ดูข้อมูล DBF records จากฐานข้อมูล
                                                                        toast('ฟีเจอร์ดูข้อมูล DBF Records กำลังพัฒนา');
                                                                    }}
                                                                >
                                                                    <FileTextIcon className='h-4 w-4' />
                                                                </Button>
                                                            )}
                                                        <Button
                                                            isIconOnly
                                                            size='sm'
                                                            variant='light'
                                                            color='danger'
                                                            aria-label="ลบไฟล์"
                                                            onPress={async () => {
                                                                try {
                                                                    const res = await api.deleteRevenueFile(session, file.id);
                                                                    if (res.success) {
                                                                        // ลบออกจาก state ของ modal ที่เปิดอยู่
                                                                        setSelectedBatch((prev) => {
                                                                            if (!prev) return prev;
                                                                            return {
                                                                                ...prev,
                                                                                files: prev.files?.filter((f) => f.id !== file.id) || [],
                                                                                totalFiles: Math.max(0, prev.totalFiles - 1),
                                                                            };
                                                                        });
                                                                        // อัปเดตรายการ batch หลักให้ลดจำนวนไฟล์ลง
                                                                        setUploadBatches((prev) => prev.map((b) => {
                                                                            if (b.id !== selectedBatch?.id) return b;
                                                                            return {
                                                                                ...b,
                                                                                totalFiles: Math.max(0, b.totalFiles - 1),
                                                                            };
                                                                        }));

                                                                        toast.success(`${file.fileName} ถูกลบแล้ว`);
                                                                    } else {
                                                                        toast.error('เกิดข้อผิดพลาดในการลบไฟล์');
                                                                    }
                                                                } catch (err) {
                                                                    console.error('Delete file error:', err);
                                                                    toast.error('เกิดข้อผิดพลาดในการลบไฟล์');
                                                                }
                                                            }}
                                                        >
                                                            <TrashIcon className='h-4 w-4' />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <Button variant='light' aria-label="ปิดรายละเอียด batch" onPress={onDetailClose}>
                            ปิด
                        </Button>
                        <Button
                            color='danger'
                            variant='solid'
                            startContent={<TrashIcon className='h-4 w-4' />}
                            aria-label="ลบ batch ทั้งหมด"
                            onPress={() => {
                                if (selectedBatch) {
                                    confirmDeleteBatch(selectedBatch);
                                    onDetailClose();
                                }
                            }}
                        >
                            ลบทั้งหมด
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Confirm Delete Modal */}
            <Modal isOpen={isConfirmOpen} onClose={onConfirmClose} size='md' aria-label="ยืนยันการลบ batch">
                <ModalContent>
                    <ModalHeader>
                        <div className='flex items-center space-x-2'>
                            <AlertCircleIcon className='h-5 w-5 text-danger-600' />
                            <h3 className='text-lg font-medium text-foreground'>ยืนยันการลบ</h3>
                        </div>
                    </ModalHeader>
                    <ModalBody>
                        <div className='space-y-4'>
                            <p className='text-default-600'>
                                คุณต้องการลบ batch <span className='font-semibold text-foreground'>{batchToDelete?.batchName || 'Unknown'}</span> ใช่หรือไม่?
                            </p>
                            <div className='bg-warning-50 dark:bg-warning-900/20 p-4 rounded-lg' aria-label="คำเตือนการลบ">
                                <div className='flex items-start space-x-2'>
                                    <AlertCircleIcon className='h-5 w-5 text-warning-600 mt-0.5' />
                                    <div className='text-sm text-warning-800 dark:text-warning-200'>
                                        <p className='font-medium mb-1'>คำเตือน:</p>
                                        <ul className='list-disc list-inside space-y-1'>
                                            <li>การลบจะไม่สามารถกู้คืนได้</li>
                                            <li>ไฟล์ทั้งหมดใน batch นี้จะถูกลบออก</li>
                                            <li>ข้อมูลที่ประมวลผลแล้วจะหายไป</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                            {batchToDelete && (
                                <div className='bg-default-50 dark:bg-default-900/20 p-4 rounded-lg' aria-label="รายละเอียด batch">
                                    <h4 className='font-medium text-foreground mb-2'>รายละเอียด Batch:</h4>
                                    <div className='grid grid-cols-2 gap-4 text-sm'>
                                        <div>
                                            <span className='text-default-600'>ไฟล์ทั้งหมด:</span>
                                            <span className='ml-2 font-medium'>{batchToDelete.totalFiles}</span>
                                        </div>
                                        <div>
                                            <span className='text-default-600'>รายการทั้งหมด:</span>
                                            <span className='ml-2 font-medium'>{batchToDelete.totalRecords.toLocaleString()}</span>
                                        </div>
                                        <div>
                                            <span className='text-default-600'>ขนาดรวม:</span>
                                            <span className='ml-2 font-medium'>{formatFileSize(batchToDelete.totalSize)}</span>
                                        </div>
                                        <div>
                                            <span className='text-default-600'>วันที่อัปโหลด:</span>
                                            <span className='ml-2 font-medium'>{formatDate(batchToDelete.uploadDate)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant='light' aria-label="ยกเลิกการลบ batch" onPress={onConfirmClose}>
                            ยกเลิก
                        </Button>
                        <Button
                            color='danger'
                            variant='solid'
                            startContent={<TrashIcon className='h-4 w-4' />}
                            aria-label="ยืนยันการลบ batch"
                            onPress={() => {
                                if (batchToDelete) {
                                    deleteBatch(batchToDelete.id);
                                }
                            }}
                        >
                            ลบ Batch
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </div>
    );
} 