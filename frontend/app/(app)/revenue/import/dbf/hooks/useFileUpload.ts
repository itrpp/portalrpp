import React, { useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
// Removed react-hot-toast in favor of HeroUI addToast. No direct toasts here.
import { api, type UploadedFile } from '@/app/api/client';

export const useFileUpload = (maxFileSize: number, maxFiles: number) => {
    const { data: session } = useSession();
    const [isDragOver, setIsDragOver] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [isUploadCompleted, setIsUploadCompleted] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ฟังก์ชันสำหรับการคำนวณและแสดงขนาดไฟล์
    const formatFileSize = useCallback((bytes: number): string => {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
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
                } catch {
                    reject(new Error('Failed to generate checksum'));
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file for checksum'));
            reader.readAsArrayBuffer(file);
        });
    }, []);

    // ฟังก์ชันตรวจสอบไฟล์ DBF
    const validateDBFFile = useCallback((file: File, uploadedFilesCount: number): boolean => {
        const validExtensions = ['.dbf', '.DBF'];
        const fileName = file.name.toLowerCase();
        const hasValidExtension = validExtensions.some((ext) => fileName.endsWith(ext));

        if (!hasValidExtension) {
            setErrorMessage('ไฟล์ต้องเป็นนามสกุล .dbf เท่านั้น');
            return false;
        }

        if (file.size > maxFileSize) {
            setErrorMessage(`ขนาดไฟล์ต้องไม่เกิน ${formatFileSize(maxFileSize)}`);
            return false;
        }

        if (uploadedFilesCount >= maxFiles) {
            setErrorMessage(`สามารถอัปโหลดได้สูงสุด ${maxFiles} ไฟล์`);
            return false;
        }

        return true;
    }, [maxFileSize, maxFiles, formatFileSize]);

    // ฟังก์ชันจัดการการเลือกไฟล์
    const handleFileSelect = useCallback(async (
        files: FileList | null,
        uploadedFiles: UploadedFile[],
        setUploadedFiles: (files: UploadedFile[]) => void
    ) => {
        if (!files) return;

        const newFiles: UploadedFile[] = [];
        let hasError = false;

        setErrorMessage('กำลังตรวจสอบไฟล์และสร้าง checksum...');

        for (const file of Array.from(files)) {
            if (!validateDBFFile(file, uploadedFiles.length)) {
                hasError = true;
                continue;
            }

            try {
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
            } catch {
                setErrorMessage(`ไม่สามารถสร้าง checksum สำหรับไฟล์ ${file.name} ได้`);
                hasError = true;
                break;
            }
        }

        if (!hasError && newFiles.length > 0) {
            setUploadedFiles([...uploadedFiles, ...newFiles]);
            setErrorMessage('');
        } else if (!hasError) {
            setErrorMessage('');
        }
    }, [validateDBFFile, generateFileChecksum]);

    // ฟังก์ชันลบไฟล์
    const removeFile = useCallback((
        fileId: string,
        uploadedFiles: UploadedFile[],
        setUploadedFiles: (files: UploadedFile[]) => void
    ) => {
        setUploadedFiles(uploadedFiles.filter((file) => file.id !== fileId));
    }, []);

    // ฟังก์ชันลบไฟล์ทั้งหมด
    const clearAllFiles = useCallback((
        setUploadedFiles: (files: UploadedFile[]) => void
    ) => {
        setUploadedFiles([]);
        setErrorMessage('');
    }, []);

    // ฟังก์ชันจัดการ drag and drop
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((
        e: React.DragEvent,
        uploadedFiles: UploadedFile[],
        setUploadedFiles: (files: UploadedFile[]) => void
    ) => {
        e.preventDefault();
        setIsDragOver(false);
        handleFileSelect(e.dataTransfer.files, uploadedFiles, setUploadedFiles);
    }, [handleFileSelect]);

    // ฟังก์ชันรีเซ็ต state
    const resetUploadState = useCallback(() => {
        setErrorMessage('');
        setIsUploading(false);
        setIsUploadCompleted(false);
    }, []);

    return {
        // State
        isDragOver,
        isUploading,
        setIsUploading,
        errorMessage,
        setErrorMessage,
        isUploadCompleted,
        setIsUploadCompleted,
        fileInputRef,
        
        // Actions
        formatFileSize,
        validateDBFFile,
        handleFileSelect,
        removeFile,
        clearAllFiles,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        resetUploadState
    };
};
