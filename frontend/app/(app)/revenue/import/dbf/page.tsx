'use client';

import React, { useState, useCallback, useRef } from 'react';
import {
    Card,
    CardBody,
    CardHeader,
    Button,
    Progress,
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
    addToast
} from '@heroui/react';
import {
    UploadIcon,
    FileTextIcon,
    AlertCircleIcon,
    PlusIcon,
    EyeIcon,
    TrashIcon,
    DownloadIcon
} from '@/components/ui/Icons';

interface UploadedFile {
    id: string;
    file: File;
    status: 'pending' | 'uploading' | 'success' | 'error';
    progress: number;
    error?: string;
}

interface UploadHistory {
    id: string;
    fileName: string;
    fileSize: number;
    uploadDate: Date;
    status: 'success' | 'error' | 'processing';
    recordsCount?: number;
    errorMessage?: string;
}

interface UploadBatch {
    id: string;
    batchName: string;
    uploadDate: Date;
    totalFiles: number;
    successFiles: number;
    errorFiles: number;
    processingFiles: number;
    totalRecords: number;
    totalSize: number;
    status: 'success' | 'error' | 'processing' | 'partial';
    files: UploadHistory[];
}

export default function DBFImportPage() {
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [uploadBatches, setUploadBatches] = useState<UploadBatch[]>([
        {
            id: 'batch-1',
            batchName: 'Batch 2024-01-15',
            uploadDate: new Date('2024-01-15T10:30:00'),
            totalFiles: 5,
            successFiles: 4,
            errorFiles: 1,
            processingFiles: 0,
            totalRecords: 6250,
            totalSize: 1250000,
            status: 'partial',
            files: [
                {
                    id: '1',
                    fileName: 'revenue_2024_01.dbf',
                    fileSize: 245760,
                    uploadDate: new Date('2024-01-15T10:30:00'),
                    status: 'success',
                    recordsCount: 1250
                },
                {
                    id: '2',
                    fileName: 'revenue_2024_02.dbf',
                    fileSize: 312000,
                    uploadDate: new Date('2024-01-15T10:31:00'),
                    status: 'success',
                    recordsCount: 1580
                },
                {
                    id: '3',
                    fileName: 'revenue_2024_03.dbf',
                    fileSize: 198000,
                    uploadDate: new Date('2024-01-15T10:32:00'),
                    status: 'error',
                    errorMessage: 'รูปแบบไฟล์ไม่ถูกต้อง'
                },
                {
                    id: '4',
                    fileName: 'revenue_2024_04.dbf',
                    fileSize: 289000,
                    uploadDate: new Date('2024-01-15T10:33:00'),
                    status: 'success',
                    recordsCount: 1420
                },
                {
                    id: '5',
                    fileName: 'revenue_2024_05.dbf',
                    fileSize: 204240,
                    uploadDate: new Date('2024-01-15T10:34:00'),
                    status: 'success',
                    recordsCount: 2000
                }
            ]
        },
        {
            id: 'batch-2',
            batchName: 'Batch 2024-01-20',
            uploadDate: new Date('2024-01-20T14:15:00'),
            totalFiles: 3,
            successFiles: 3,
            errorFiles: 0,
            processingFiles: 0,
            totalRecords: 4800,
            totalSize: 890000,
            status: 'success',
            files: [
                {
                    id: '6',
                    fileName: 'revenue_2024_06.dbf',
                    fileSize: 312000,
                    uploadDate: new Date('2024-01-20T14:15:00'),
                    status: 'success',
                    recordsCount: 1580
                },
                {
                    id: '7',
                    fileName: 'revenue_2024_07.dbf',
                    fileSize: 289000,
                    uploadDate: new Date('2024-01-20T14:16:00'),
                    status: 'success',
                    recordsCount: 1420
                },
                {
                    id: '8',
                    fileName: 'revenue_2024_08.dbf',
                    fileSize: 289000,
                    uploadDate: new Date('2024-01-20T14:17:00'),
                    status: 'success',
                    recordsCount: 1800
                }
            ]
        },
        {
            id: 'batch-3',
            batchName: 'Batch 2024-01-25',
            uploadDate: new Date('2024-01-25T09:45:00'),
            totalFiles: 2,
            successFiles: 0,
            errorFiles: 2,
            processingFiles: 0,
            totalRecords: 0,
            totalSize: 487000,
            status: 'error',
            files: [
                {
                    id: '9',
                    fileName: 'revenue_2024_09.dbf',
                    fileSize: 198000,
                    uploadDate: new Date('2024-01-25T09:45:00'),
                    status: 'error',
                    errorMessage: 'รูปแบบไฟล์ไม่ถูกต้อง'
                },
                {
                    id: '10',
                    fileName: 'revenue_2024_10.dbf',
                    fileSize: 289000,
                    uploadDate: new Date('2024-01-25T09:46:00'),
                    status: 'error',
                    errorMessage: 'ไฟล์เสียหาย'
                }
            ]
        },
        {
            id: 'batch-4',
            batchName: 'Batch 2024-01-30',
            uploadDate: new Date('2024-01-30T16:20:00'),
            totalFiles: 1,
            successFiles: 0,
            errorFiles: 0,
            processingFiles: 1,
            totalRecords: 0,
            totalSize: 289000,
            status: 'processing',
            files: [
                {
                    id: '11',
                    fileName: 'revenue_2024_11.dbf',
                    fileSize: 289000,
                    uploadDate: new Date('2024-01-30T16:20:00'),
                    status: 'processing'
                }
            ]
        }
    ]);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const { isOpen, onOpen, onClose } = useDisclosure();
    const { isOpen: isDetailOpen, onOpen: onDetailOpen, onClose: onDetailClose } = useDisclosure();
    const [selectedBatch, setSelectedBatch] = useState<UploadBatch | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ค่าคงที่สำหรับการจำกัด
    const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB ใน bytes
    const MAX_FILES = 20;

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
    const handleFileSelect = useCallback((files: FileList | null) => {
        if (!files) return;

        const newFiles: UploadedFile[] = [];
        let hasError = false;

        Array.from(files).forEach((file) => {
            if (!validateDBFFile(file)) {
                hasError = true;
                return;
            }

            const newFile: UploadedFile = {
                id: `file-${Date.now()}-${Math.random()}`,
                file,
                status: 'pending',
                progress: 0
            };

            newFiles.push(newFile);
        });

        if (!hasError && newFiles.length > 0) {
            setUploadedFiles((prev) => [...prev, ...newFiles]);
            setErrorMessage('');
        }
    }, [validateDBFFile]);

    // ฟังก์ชันลบไฟล์
    const removeFile = useCallback((fileId: string) => {
        setUploadedFiles((prev) => prev.filter((file) => file.id !== fileId));
    }, []);

    // ฟังก์ชันลบไฟล์ทั้งหมด
    const clearAllFiles = useCallback(() => {
        setUploadedFiles([]);
        setErrorMessage('');
    }, []);

    // ฟังก์ชันอัปโหลดไฟล์
    const uploadFiles = useCallback(async () => {
        if (uploadedFiles.length === 0) {
            setErrorMessage('กรุณาเลือกไฟล์ก่อนอัปโหลด');
            return;
        }

        setIsUploading(true);
        setErrorMessage('');

        try {
            // จำลองการอัปโหลด
            for (let i = 0; i < uploadedFiles.length; i++) {
                const file = uploadedFiles[i];

                if (!file) continue;

                // อัปเดตสถานะเป็น uploading
                setUploadedFiles((prev) => prev.map((f) =>
                    f.id === file.id ? {
                        ...f,
                        status: 'uploading'
                    } : f
                ));

                // จำลองการอัปโหลดแบบ progress
                for (let progress = 0; progress <= 100; progress += 10) {
                    await new Promise((resolve) => setTimeout(resolve, 100));
                    setUploadedFiles((prev) => prev.map((f) =>
                        f.id === file.id ? {
                            ...f,
                            progress
                        } : f
                    ));
                }

                // อัปเดตสถานะเป็น success
                setUploadedFiles((prev) => prev.map((f) =>
                    f.id === file.id ? {
                        ...f,
                        status: 'success',
                        progress: 100
                    } : f
                ));
            }

            // เพิ่ม batch ใหม่
            const newBatch: UploadBatch = {
                id: `batch-${Date.now()}`,
                batchName: `Batch ${formatDate(new Date())}`,
                uploadDate: new Date(),
                totalFiles: uploadedFiles.length,
                successFiles: uploadedFiles.length,
                errorFiles: 0,
                processingFiles: 0,
                totalRecords: uploadedFiles.length * 1000, // จำลองจำนวนรายการ
                totalSize: uploadedFiles.reduce((sum, file) => sum + file.file.size, 0),
                status: 'success',
                files: uploadedFiles.map((file) => ({
                    id: file.id,
                    fileName: file.file.name,
                    fileSize: file.file.size,
                    uploadDate: new Date(),
                    status: 'success' as const,
                    recordsCount: 1000 // จำลองจำนวนรายการ
                }))
            };

            setUploadBatches((prev) => [newBatch, ...prev]);

            // ล้างไฟล์ที่อัปโหลดแล้ว
            setUploadedFiles([]);
            onClose();

            // แสดง toast
            addToast({
                title: 'อัปโหลดสำเร็จ',
                description: `อัปโหลดไฟล์ ${uploadedFiles.length} ไฟล์เรียบร้อยแล้ว`,
                color: 'success'
            });

        } catch (error) {
            // TODO: Implement proper error logging
            setErrorMessage('เกิดข้อผิดพลาดในการอัปโหลด กรุณาลองใหม่อีกครั้ง');

            // อัปเดตสถานะเป็น error
            setUploadedFiles((prev) => prev.map((f) => ({
                ...f,
                status: 'error',
                error: 'เกิดข้อผิดพลาดในการอัปโหลด'
            })));
        } finally {
            setIsUploading(false);
        }
    }, [uploadedFiles, formatDate, onClose]);

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

    return (
        <div className='container mx-auto p-6 space-y-6'>
            {/* Header */}
            <div className='flex items-center justify-between'>
                <div>
                    <h1 className='text-3xl font-bold text-foreground'>นำเข้าไฟล์ DBF</h1>
                    <p className='text-default-600 mt-2'>อัปโหลดและประมวลผลไฟล์ DBF</p>
                </div>
                <Button
                    color='primary'
                    variant='solid'
                    startContent={<PlusIcon className='h-4 w-4' />}
                    onPress={onOpen}
                >
                    อัปโหลดไฟล์ใหม่
                </Button>
            </div>

            {/* Upload History - Batch View */}
            <Card className='w-full bg-default'>
                <CardHeader>
                    <h3 className='text-lg font-medium text-foreground'>ประวัติการอัปโหลด (Batch)</h3>
                </CardHeader>
                <CardBody>
                    <Table aria-label='ประวัติการอัปโหลด Batch'>
                        <TableHeader>
                            <TableColumn>ชื่อ Batch</TableColumn>
                            <TableColumn>วันที่อัปโหลด</TableColumn>
                            <TableColumn>ไฟล์ทั้งหมด</TableColumn>
                            <TableColumn>สำเร็จ</TableColumn>
                            <TableColumn>ผิดพลาด</TableColumn>
                            <TableColumn>กำลังประมวลผล</TableColumn>
                            <TableColumn>รายการทั้งหมด</TableColumn>
                            <TableColumn>ขนาดรวม</TableColumn>
                            <TableColumn>สถานะ</TableColumn>
                            <TableColumn>การดำเนินการ</TableColumn>
                        </TableHeader>
                        <TableBody>
                            {uploadBatches.map((batch) => (
                                <TableRow key={batch.id}>
                                    <TableCell>
                                        <div className='flex items-center space-x-2'>
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
                                        <span className='text-warning-600 font-medium'>{batch.processingFiles}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className='text-default-600'>{batch.totalRecords.toLocaleString()}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className='text-default-600'>{formatFileSize(batch.totalSize)}</span>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            size='sm'
                                            variant='flat'
                                            color={batch.status === 'success' ? 'success' :
                                                batch.status === 'error' ? 'danger' :
                                                    batch.status === 'processing' ? 'warning' : 'warning'}
                                        >
                                            {batch.status === 'success' ? 'สำเร็จทั้งหมด' :
                                                batch.status === 'error' ? 'ผิดพลาดทั้งหมด' :
                                                    batch.status === 'processing' ? 'กำลังประมวลผล' : 'บางส่วนสำเร็จ'}
                                        </Chip>
                                    </TableCell>
                                    <TableCell>
                                        <div className='flex items-center space-x-2'>
                                            <Button
                                                isIconOnly
                                                size='sm'
                                                variant='light'
                                                color='primary'
                                                onPress={() => {
                                                    setSelectedBatch(batch);
                                                    onDetailOpen();
                                                }}
                                            >
                                                <EyeIcon className='h-4 w-4' />
                                            </Button>
                                            <Button
                                                isIconOnly
                                                size='sm'
                                                variant='light'
                                                color='success'
                                                onPress={() => {
                                                    // TODO: Implement download functionality
                                                    // console.log('Download batch:', batch.batchName);
                                                }}
                                            >
                                                <DownloadIcon className='h-4 w-4' />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardBody>
            </Card>

            {/* Upload Modal */}
            <Modal isOpen={isOpen} onClose={onClose} size='2xl'>
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
                                >
                                    {errorMessage}
                                </Alert>
                            )}

                            {/* Upload Area */}
                            <div
                                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragOver
                                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                    : 'border-default-300 dark:border-default-600'
                                    }`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            >
                                <UploadIcon className='h-12 w-12 text-default-400 mx-auto mb-4' />
                                <h4 className='text-lg font-medium text-foreground mb-2'>
                                    ลากไฟล์มาที่นี่หรือคลิกเพื่อเลือกไฟล์
                                </h4>
                                <p className='text-sm text-default-600 mb-4'>
                                    รองรับไฟล์ DBF ขนาดสูงสุด {formatFileSize(MAX_FILE_SIZE)} จำนวนสูงสุด {MAX_FILES} ไฟล์
                                </p>
                                <Button
                                    color='primary'
                                    variant='solid'
                                    startContent={<PlusIcon className='h-4 w-4' />}
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
                                    onChange={(e) => handleFileSelect(e.target.files)}
                                />
                            </div>

                            {/* File List */}
                            {uploadedFiles.length > 0 && (
                                <div className='space-y-2'>
                                    <div className='flex items-center justify-between'>
                                        <h4 className='font-medium text-foreground'>ไฟล์ที่เลือก ({uploadedFiles.length})</h4>
                                        <Button
                                            size='sm'
                                            variant='light'
                                            color='danger'
                                            onPress={clearAllFiles}
                                        >
                                            ลบทั้งหมด
                                        </Button>
                                    </div>
                                    <div className='space-y-2 max-h-60 overflow-y-auto'>
                                        {uploadedFiles.map((file) => (
                                            <div
                                                key={file.id}
                                                className='flex items-center justify-between p-3 bg-default-50 dark:bg-default-900/20 rounded-lg'
                                            >
                                                <div className='flex items-center space-x-3 flex-1'>
                                                    <FileTextIcon className='h-5 w-5 text-primary-600 dark:text-primary-400' />
                                                    <div className='flex-1 min-w-0'>
                                                        <p className='font-medium text-foreground truncate'>{file.file.name}</p>
                                                        <p className='text-sm text-default-600'>{formatFileSize(file.file.size)}</p>
                                                    </div>
                                                </div>
                                                <div className='flex items-center space-x-2'>
                                                    {file.status === 'uploading' && (
                                                        <Progress
                                                            size='sm'
                                                            value={file.progress}
                                                            color='primary'
                                                            className='w-20'
                                                        />
                                                    )}
                                                    {file.status === 'success' && (
                                                        <Chip size='sm' color='success' variant='flat'>
                                                            สำเร็จ
                                                        </Chip>
                                                    )}
                                                    {file.status === 'error' && (
                                                        <Chip size='sm' color='danger' variant='flat'>
                                                            ผิดพลาด
                                                        </Chip>
                                                    )}
                                                    <Button
                                                        isIconOnly
                                                        size='sm'
                                                        variant='light'
                                                        color='danger'
                                                        onPress={() => removeFile(file.id)}
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
                        <Button variant='light' onPress={onClose}>
                            ยกเลิก
                        </Button>
                        <Button
                            color='primary'
                            variant='solid'
                            isLoading={isUploading}
                            isDisabled={uploadedFiles.length === 0 || isUploading}
                            onPress={uploadFiles}
                        >
                            {isUploading ? 'กำลังอัปโหลด...' : 'อัปโหลดไฟล์'}
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Detail Modal */}
            <Modal isOpen={isDetailOpen} onClose={onDetailClose} size='4xl'>
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
                                <div className='grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-default-50 dark:bg-default-900/20 rounded-lg'>
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
                                    <TableBody>
                                        {selectedBatch.files.map((file) => (
                                            <TableRow key={file.id}>
                                                <TableCell>
                                                    <div className='flex items-center space-x-2'>
                                                        <FileTextIcon className='h-4 w-4 text-primary-600 dark:text-primary-400' />
                                                        <span className='font-medium text-foreground'>{file.fileName}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className='text-default-600'>{formatFileSize(file.fileSize)}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        size='sm'
                                                        variant='flat'
                                                        color={file.status === 'success' ? 'success' :
                                                            file.status === 'error' ? 'danger' :
                                                                file.status === 'processing' ? 'warning' : 'default'}
                                                    >
                                                        {file.status === 'success' ? 'สำเร็จ' :
                                                            file.status === 'error' ? 'ผิดพลาด' :
                                                                file.status === 'processing' ? 'กำลังประมวลผล' : 'ไม่ทราบสถานะ'}
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
                                                    <div className='flex items-center space-x-2'>
                                                        <Button
                                                            isIconOnly
                                                            size='sm'
                                                            variant='light'
                                                            color='primary'
                                                            onPress={() => {
                                                                // TODO: Implement view details functionality
                                                                // console.log('View details:', file);
                                                            }}
                                                        >
                                                            <EyeIcon className='h-4 w-4' />
                                                        </Button>
                                                        <Button
                                                            isIconOnly
                                                            size='sm'
                                                            variant='light'
                                                            color='success'
                                                            onPress={() => {
                                                                // TODO: Implement download functionality
                                                                // console.log('Download:', file.fileName);
                                                            }}
                                                        >
                                                            <DownloadIcon className='h-4 w-4' />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <Button variant='light' onPress={onDetailClose}>
                            ปิด
                        </Button>
                        <Button
                            color='success'
                            variant='solid'
                            startContent={<DownloadIcon className='h-4 w-4' />}
                            onPress={() => {
                                // TODO: Implement download all files functionality
                                // console.log('Download all files from batch:', selectedBatch?.batchName);
                            }}
                        >
                            ดาวน์โหลดทั้งหมด
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </div>
    );
} 