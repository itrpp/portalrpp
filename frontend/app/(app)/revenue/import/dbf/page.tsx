"use client";

import React, { useState, useCallback } from "react";
import { addToast, Button } from "@heroui/react";

import { useDBFImport, useFileUpload, useUploadProcess } from "./hooks";
import {
  UploadHistory,
  UploadModal,
  BatchDetailModal,
  ConfirmDeleteModal,
} from "./components";

import { PlusIcon } from "@/components/ui/icons";
import { UploadBatch } from "@/types/revenue";

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
    MAX_FILES,
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
    resetUploadState,
  } = useFileUpload(MAX_FILE_SIZE, MAX_FILES);

  const { formatDate, uploadFiles: processUploadFiles } = useUploadProcess();

  // Local state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] =
    useState(false);
  const [selectedBatch, setSelectedBatch] = useState<UploadBatch | null>(null);
  const [batchToDelete, setBatchToDelete] = useState<UploadBatch | null>(null);

  // Event handlers
  const handleOpenUploadModal = useCallback(() => {
    setUploadedFiles([]);
    setIsUploadCompleted(false);
    setErrorMessage("");
    setIsUploading(false);
    setIsUploadModalOpen(true);
  }, [setUploadedFiles, setIsUploadCompleted, setErrorMessage, setIsUploading]);

  const handleCloseUploadModal = useCallback(() => {
    setIsUploadModalOpen(false);
    resetUploadState();
  }, [resetUploadState]);

  const handleFileSelectCallback = useCallback(
    (files: FileList | null) => {
      handleFileSelect(files, uploadedFiles, setUploadedFiles);
    },
    [uploadedFiles, setUploadedFiles, handleFileSelect],
  );

  const handleRemoveFile = useCallback(
    (fileId: string) => {
      removeFile(fileId, uploadedFiles, setUploadedFiles);
    },
    [uploadedFiles, setUploadedFiles, removeFile],
  );

  const handleClearAllFiles = useCallback(() => {
    clearAllFiles(setUploadedFiles);
  }, [clearAllFiles, setUploadedFiles]);

  const handleDragOverCallback = useCallback(
    (e: React.DragEvent) => {
      handleDragOver(e);
    },
    [handleDragOver],
  );

  const handleDragLeaveCallback = useCallback(
    (e: React.DragEvent) => {
      handleDragLeave(e);
    },
    [handleDragLeave],
  );

  const handleDropCallback = useCallback(
    (e: React.DragEvent) => {
      handleDrop(e, uploadedFiles, setUploadedFiles);
    },
    [uploadedFiles, setUploadedFiles, handleDrop],
  );

  const handleUpload = useCallback(async () => {
    try {
      setIsUploading(true);
      setErrorMessage("");

      const result = await processUploadFiles(
        uploadedFiles,
        updateUploadedFile,
        loadBatches,
      );

      if (result.success) {
        if (result.successCount > 0) {
          addToast({
            title: `อัปโหลดและตรวจสอบไฟล์เสร็จสิ้น! สำเร็จ ${result.successCount} ไฟล์${result.errorCount > 0 ? `, ล้มเหลว ${result.errorCount} ไฟล์` : ""}`,
            color: "success",
          });
        } else {
          addToast({
            title: `อัปโหลดไฟล์ล้มเหลว: ${result.errorCount} ไฟล์`,
            color: "danger",
          });
        }
        setIsUploadCompleted(true);
      }
    } catch {
      setErrorMessage("เกิดข้อผิดพลาดในการอัปโหลด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsUploading(false);
    }
  }, [
    uploadedFiles,
    processUploadFiles,
    updateUploadedFile,
    loadBatches,
    setIsUploading,
    setErrorMessage,
    setIsUploadCompleted,
  ]);

  const handleUploadComplete = useCallback(() => {
    setUploadedFiles([]);
    setIsUploadCompleted(false);
    setErrorMessage("");
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
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">นำเข้าไฟล์ DBF</h1>
          <p className="text-default-600 mt-2">อัปโหลดและประมวลผลไฟล์ DBF</p>
        </div>
        <div className="flex space-x-2">
          <Button
            aria-label="อัปโหลดไฟล์ DBF ใหม่"
            color="primary"
            startContent={<PlusIcon className="h-4 w-4" />}
            variant="solid"
            onPress={handleOpenUploadModal}
          >
            อัปโหลดไฟล์ใหม่
          </Button>
        </div>
      </div>

      {/* Upload History */}
      <UploadHistory
        formatDate={formatDate}
        formatFileSize={formatFileSize}
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        lastUpdated={lastUpdated}
        uploadBatches={uploadBatches}
        onDeleteBatch={handleDeleteBatch}
        onRefresh={handleRefresh}
        onViewDetails={handleViewDetails}
      />

      {/* Upload Modal */}
      <UploadModal
        errorMessage={errorMessage}
        fileInputRef={fileInputRef}
        formatFileSize={formatFileSize}
        isDragOver={isDragOver}
        isOpen={isUploadModalOpen}
        isUploadCompleted={isUploadCompleted}
        isUploading={isUploading}
        maxFileSize={MAX_FILE_SIZE}
        maxFiles={MAX_FILES}
        uploadedFiles={uploadedFiles}
        onClearAllFiles={handleClearAllFiles}
        onClose={handleCloseUploadModal}
        onDragLeave={handleDragLeaveCallback}
        onDragOver={handleDragOverCallback}
        onDrop={handleDropCallback}
        onFileSelect={handleFileSelectCallback}
        onRemoveFile={handleRemoveFile}
        onUpload={handleUpload}
        onUploadComplete={handleUploadComplete}
      />

      {/* Detail Modal */}
      <BatchDetailModal
        formatDate={formatDate}
        formatFileSize={formatFileSize}
        isOpen={isDetailModalOpen}
        selectedBatch={selectedBatch}
        onClose={handleCloseDetailModal}
        onDeleteBatch={handleDeleteBatch}
        onUpdateBatches={loadBatches}
      />

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        batchToDelete={batchToDelete}
        formatDate={formatDate}
        formatFileSize={formatFileSize}
        isOpen={isConfirmDeleteModalOpen}
        onClose={handleCloseConfirmDeleteModal}
        onConfirmDelete={handleConfirmDelete}
      />
    </div>
  );
}
