'use client';

import React, { useState, useCallback } from 'react';
import { Button, addToast } from '@heroui/react';
import {
    PlusIcon,
} from '@/components/ui/Icons';
import { type UploadBatch } from '@/app/api/client';
import { useDBFImport, useFileUpload, useUploadProcess } from './hooks';
import {
    UploadHistory,
    UploadModal,
    BatchDetailModal,
    ConfirmDeleteModal,
} from './components';

export default function DBFImportPage() {
    // Custom hooks
    const {
        uploadedFiles,
        setUploadedFiles,
        uploadBatches,
        isLoading,
        isRefreshing,
        lastUpdated,
        updateUploadedFile,
        loadBatches,
        handleRefresh,
        deleteBatch,
        MAX_FILE_SIZE,
        MAX_FILES
    } = useDBFImport();

    const {
        isDragOver,
        isUploading,
        setIsUploading,
        errorMessage,
        setErrorMessage,
        isUploadCompleted,
        setIsUploadCompleted,
        fileInputRef,
        formatFileSize,
        handleFileSelect,
        removeFile,
        clearAllFiles,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        resetUploadState
    } = useFileUpload(MAX_FILE_SIZE, MAX_FILES);

    const {
        formatDate,
        uploadFiles: processUploadFiles
    } = useUploadProcess();

    // Local state
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState<UploadBatch | null>(null);
    const [batchToDelete, setBatchToDelete] = useState<UploadBatch | null>(null);

    // Event handlers
    const handleOpenUploadModal = useCallback(() => {
        setUploadedFiles([]);
        setIsUploadCompleted(false);
        setErrorMessage('');
        setIsUploading(false);
        setIsUploadModalOpen(true);
    }, [setUploadedFiles, setIsUploadCompleted, setErrorMessage, setIsUploading]);

    const handleCloseUploadModal = useCallback(() => {
        setIsUploadModalOpen(false);
        resetUploadState();
    }, [resetUploadState]);

    const handleFileSelectCallback = useCallback((files: FileList | null) => {
        handleFileSelect(files, uploadedFiles, setUploadedFiles);
    }, [uploadedFiles, setUploadedFiles, handleFileSelect]);

    const handleRemoveFile = useCallback((fileId: string) => {
        removeFile(fileId, uploadedFiles, setUploadedFiles);
    }, [uploadedFiles, setUploadedFiles, removeFile]);

    const handleClearAllFiles = useCallback(() => {
        clearAllFiles(setUploadedFiles);
    }, [clearAllFiles, setUploadedFiles]);

    const handleDragOverCallback = useCallback((e: React.DragEvent) => {
        handleDragOver(e);
    }, [handleDragOver]);

    const handleDragLeaveCallback = useCallback((e: React.DragEvent) => {
        handleDragLeave(e);
    }, [handleDragLeave]);

    const handleDropCallback = useCallback((e: React.DragEvent) => {
        handleDrop(e, uploadedFiles, setUploadedFiles);
    }, [uploadedFiles, setUploadedFiles, handleDrop]);

    const handleUpload = useCallback(async () => {
        try {
            setIsUploading(true);
            setErrorMessage('');

            const result = await processUploadFiles(uploadedFiles, updateUploadedFile, loadBatches);

            if (result.success) {
                if (result.successCount > 0) {
                    addToast({ title: `อัปโหลดและตรวจสอบไฟล์เสร็จสิ้น! สำเร็จ ${result.successCount} ไฟล์${result.errorCount > 0 ? `, ล้มเหลว ${result.errorCount} ไฟล์` : ''}`, color: 'success' });
                } else {
                    addToast({ title: `อัปโหลดไฟล์ล้มเหลว: ${result.errorCount} ไฟล์`, color: 'danger' });
                }
                setIsUploadCompleted(true);
            }
        } catch (error) {
            setErrorMessage('เกิดข้อผิดพลาดในการอัปโหลด กรุณาลองใหม่อีกครั้ง');
        } finally {
            setIsUploading(false);
        }
    }, [uploadedFiles, processUploadFiles, updateUploadedFile, loadBatches, setIsUploading, setErrorMessage, setIsUploadCompleted]);

    const handleUploadComplete = useCallback(() => {
        setUploadedFiles([]);
        setIsUploadCompleted(false);
        setErrorMessage('');
        setIsUploadModalOpen(false);
    }, [setUploadedFiles, setIsUploadCompleted, setErrorMessage]);

    const handleViewDetails = useCallback((batch: UploadBatch) => {
        setSelectedBatch(batch);
        setIsDetailModalOpen(true);
    }, []);

    const handleCloseDetailModal = useCallback(() => {
        setIsDetailModalOpen(false);
        setSelectedBatch(null);
    }, []);

    const handleDeleteBatch = useCallback((batch: UploadBatch) => {
        setBatchToDelete(batch);
        setIsConfirmDeleteModalOpen(true);
    }, []);

    const handleCloseConfirmDeleteModal = useCallback(() => {
        setIsConfirmDeleteModalOpen(false);
        setBatchToDelete(null);
    }, []);

    const handleConfirmDelete = useCallback(async () => {
        if (batchToDelete) {
            const success = await deleteBatch(batchToDelete.id);
            if (success) {
                handleCloseConfirmDeleteModal();
            }
        }
    }, [batchToDelete, deleteBatch, handleCloseConfirmDeleteModal]);

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
                        color='primary'
                        variant='solid'
                        startContent={<PlusIcon className='h-4 w-4' />}
                        aria-label="อัปโหลดไฟล์ DBF ใหม่"
                        onPress={handleOpenUploadModal}
                    >
                        อัปโหลดไฟล์ใหม่
                    </Button>
                </div>
            </div>

            {/* Upload History */}
            <UploadHistory
                uploadBatches={uploadBatches}
                isLoading={isLoading}
                isRefreshing={isRefreshing}
                lastUpdated={lastUpdated}
                formatDate={formatDate}
                formatFileSize={formatFileSize}
                onRefresh={handleRefresh}
                onViewDetails={handleViewDetails}
                onDeleteBatch={handleDeleteBatch}
            />

            {/* Upload Modal */}
            <UploadModal
                isOpen={isUploadModalOpen}
                onClose={handleCloseUploadModal}
                uploadedFiles={uploadedFiles}
                isDragOver={isDragOver}
                errorMessage={errorMessage}
                isUploading={isUploading}
                isUploadCompleted={isUploadCompleted}
                maxFileSize={MAX_FILE_SIZE}
                maxFiles={MAX_FILES}
                formatFileSize={formatFileSize}
                fileInputRef={fileInputRef}
                onDragOver={handleDragOverCallback}
                onDragLeave={handleDragLeaveCallback}
                onDrop={handleDropCallback}
                onFileSelect={handleFileSelectCallback}
                onRemoveFile={handleRemoveFile}
                onClearAllFiles={handleClearAllFiles}
                onUpload={handleUpload}
                onUploadComplete={handleUploadComplete}
            />

            {/* Detail Modal */}
            <BatchDetailModal
                isOpen={isDetailModalOpen}
                onClose={handleCloseDetailModal}
                selectedBatch={selectedBatch}
                formatDate={formatDate}
                formatFileSize={formatFileSize}
                onDeleteBatch={handleDeleteBatch}
                onUpdateBatches={loadBatches}
            />

            {/* Confirm Delete Modal */}
            <ConfirmDeleteModal
                isOpen={isConfirmDeleteModalOpen}
                onClose={handleCloseConfirmDeleteModal}
                batchToDelete={batchToDelete}
                formatDate={formatDate}
                formatFileSize={formatFileSize}
                onConfirmDelete={handleConfirmDelete}
            />
        </div>
    );
} 