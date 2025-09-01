import React from 'react';
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
} from '@heroui/react';
import { type UploadedFile } from '@/app/api/client';
import { UploadArea } from './UploadArea';

interface UploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    uploadedFiles: UploadedFile[];
    isDragOver: boolean;
    errorMessage: string;
    isUploading: boolean;
    isUploadCompleted: boolean;
    maxFileSize: number;
    maxFiles: number;
    formatFileSize: (bytes: number) => string;
    fileInputRef: React.RefObject<HTMLInputElement>;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onFileSelect: (files: FileList | null) => void;
    onRemoveFile: (fileId: string) => void;
    onClearAllFiles: () => void;
    onUpload: () => void;
    onUploadComplete: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
    isOpen,
    onClose,
    uploadedFiles,
    isDragOver,
    errorMessage,
    isUploading,
    isUploadCompleted,
    maxFileSize,
    maxFiles,
    formatFileSize,
    fileInputRef,
    onDragOver,
    onDragLeave,
    onDrop,
    onFileSelect,
    onRemoveFile,
    onClearAllFiles,
    onUpload,
    onUploadComplete,
}) => {
    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            size='2xl' 
            isDismissable={false}
            scrollBehavior="inside"
            classNames={{
                base: "max-h-[90vh]",
                body: "max-h-[calc(90vh-120px)] overflow-y-auto"
            }}
        >
            <ModalContent>
                <ModalHeader>
                    <h3 className='text-lg font-medium text-foreground'>อัปโหลดไฟล์ DBF ใหม่</h3>
                </ModalHeader>
                <ModalBody>
                    <UploadArea
                        isDragOver={isDragOver}
                        errorMessage={errorMessage}
                        uploadedFiles={uploadedFiles}
                        maxFileSize={maxFileSize}
                        maxFiles={maxFiles}
                        formatFileSize={formatFileSize}
                        fileInputRef={fileInputRef}
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        onDrop={onDrop}
                        onFileSelect={onFileSelect}
                        onRemoveFile={onRemoveFile}
                        onClearAllFiles={onClearAllFiles}
                    />
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
                                onPress={onUpload}
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
                            onPress={onUploadComplete}
                        >
                            เสร็จสิ้น
                        </Button>
                    )}
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};
