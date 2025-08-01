'use client';

import React, { useState, useEffect } from 'react';
import {
    Card,
    CardBody,
    CardHeader,
    Button,
    Input,
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
    Chip,
    Spinner,
    Progress,
    Tabs,
    Tab,
    Select,
    SelectItem,
    ButtonGroup,
} from '@heroui/react';
import {
    UploadIcon,
    DownloadIcon,
    SettingsIcon,
    CheckCircleIcon,
    XCircleIcon,
    AlertCircleIcon,
} from '@/components/ui/Icons';

interface DBFFile {
    id: string;
    filename: string;
    originalName: string;
    size: number;
    status: string;
    createdAt: string;
    schema?: string;
}

interface DBFCondition {
    id: string;
    name: string;
    description?: string;
    rules: string;
    isActive: boolean;
    createdAt: string;
}

interface DBFExport {
    id: string;
    filename: string;
    format: string;
    status: string;
    downloadUrl?: string;
    recordCount: number;
    updatedRecordCount: number;
    createdAt: string;
}

interface ExportResult {
    originalFile: string;
    exportedFile: string | null;
    recordCount: number;
    updatedRecordCount?: number;
    downloadUrl: string | null;
    status: string;
    reason?: string;
    error?: string;
}

export default function DBFManager() {
    const [files, setFiles] = useState<DBFFile[]>([]);
    const [conditions, setConditions] = useState<DBFCondition[]>([]);
    const [exports, setExports] = useState<DBFExport[]>([]);
    const [loading, setLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [exportResults, setExportResults] = useState<ExportResult[]>([]);
    const [showConditions, setShowConditions] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [exportFormat, setExportFormat] = useState('dbf');

    useEffect(() => {
        fetchDBFData();
    }, []);

    const fetchDBFData = async () => {
        try {
            setLoading(true);

            // จำลองการโหลดข้อมูล
            const mockFiles: DBFFile[] = [
                {
                    id: '1',
                    filename: 'sample_adp_001.dbf',
                    originalName: 'ADP_SAMPLE_001.DBF',
                    size: 1024,
                    status: 'uploaded',
                    createdAt: '2024-01-15T10:30:00Z',
                    schema: JSON.stringify([
                        {
                            name: 'CODE',
                            type: 'Character',
                            length: 5
                        },
                        {
                            name: 'QTY',
                            type: 'Numeric',
                            length: 3
                        },
                        {
                            name: 'RATE',
                            type: 'Numeric',
                            length: 6
                        },
                        {
                            name: 'TOTAL',
                            type: 'Numeric',
                            length: 8
                        },
                        {
                            name: 'DATE',
                            type: 'Date',
                            length: 8
                        }
                    ])
                },
                {
                    id: '2',
                    filename: 'sample_opd_001.dbf',
                    originalName: 'OPD_SAMPLE_001.DBF',
                    size: 2048,
                    status: 'uploaded',
                    createdAt: '2024-01-15T11:00:00Z',
                    schema: JSON.stringify([
                        {
                            name: 'PATIENT_ID',
                            type: 'Character',
                            length: 10
                        },
                        {
                            name: 'DIAGNOSIS',
                            type: 'Character',
                            length: 50
                        },
                        {
                            name: 'TREATMENT',
                            type: 'Character',
                            length: 100
                        },
                        {
                            name: 'COST',
                            type: 'Numeric',
                            length: 8
                        }
                    ])
                }
            ];

            const mockConditions: DBFCondition[] = [
                {
                    id: '1',
                    name: 'ADP Update Condition 1',
                    description: 'กลุ่มที่ 1 - อัปเดต CODE: 32501-32504',
                    rules: JSON.stringify({
                        codeRange: ['32501', '32502', '32503', '32504'],
                        updates: {
                            CODE: '32004',
                            QTY: '1',
                            RATE: '200',
                            TOTAL: '200'
                        },
                        dateFormat: 'd/m/yyyy'
                    }),
                    isActive: true,
                    createdAt: '2024-01-15T09:00:00Z'
                },
                {
                    id: '2',
                    name: 'ADP Update Condition 2',
                    description: 'กลุ่มที่ 2 - อัปเดต CODE: 32102-32105',
                    rules: JSON.stringify({
                        codeRange: ['32102', '32103', '32104', '32105'],
                        updates: {
                            CODE: '32004',
                            QTY: '1',
                            RATE: '200',
                            TOTAL: '200'
                        },
                        dateFormat: 'd/m/yyyy'
                    }),
                    isActive: true,
                    createdAt: '2024-01-15T09:30:00Z'
                }
            ];

            const mockExports: DBFExport[] = [
                {
                    id: '1',
                    filename: 'export_adp_001.dbf',
                    format: 'dbf',
                    status: 'completed',
                    downloadUrl: '/exports/export_adp_001.dbf',
                    recordCount: 150,
                    updatedRecordCount: 120,
                    createdAt: '2024-01-15T14:00:00Z'
                }
            ];

            setTimeout(() => {
                setFiles(mockFiles);
                setConditions(mockConditions);
                setExports(mockExports);
                setLoading(false);
            }, 1000);
        } catch (error) {
            console.error('Error fetching DBF data:', error);
            setLoading(false);
        }
    };

    const handleFileUpload = async () => {
        if (!uploadFile) return;

        try {
            // จำลองการอัปโหลด
            const newFile: DBFFile = {
                id: Date.now().toString(),
                filename: uploadFile.name,
                originalName: uploadFile.name,
                size: uploadFile.size,
                status: 'uploaded',
                createdAt: new Date().toISOString()
            };

            setFiles([newFile, ...files]);
            setShowUploadModal(false);
            setUploadFile(null);
        } catch (error) {
            console.error('Error uploading file:', error);
        }
    };

    const handleExport = async () => {
        if (selectedFiles.length === 0) return;

        try {
            setIsExporting(true);

            // จำลองการส่งออก
            const mockResults: ExportResult[] = selectedFiles.map((fileId) => {
                const file = files.find((f) => f.id === fileId);
                return {
                    originalFile: file?.originalName || '',
                    exportedFile: `export_${file?.filename}`,
                    recordCount: Math.floor(Math.random() * 200) + 50,
                    updatedRecordCount: Math.floor(Math.random() * 150) + 30,
                    downloadUrl: `/exports/export_${file?.filename}`,
                    status: 'completed'
                };
            });

            setTimeout(() => {
                setExportResults(mockResults);
                setIsExporting(false);
                setShowExportModal(true);
            }, 2000);
        } catch (error) {
            console.error('Error exporting files:', error);
            setIsExporting(false);
        }
    };

    const getStatusChip = (status: string) => {
        const statusConfig = {
            uploaded: {
                color: 'success',
                text: 'อัปโหลดแล้ว'
            },
            processing: {
                color: 'warning',
                text: 'กำลังประมวลผล'
            },
            completed: {
                color: 'success',
                text: 'เสร็จสิ้น'
            },
            error: {
                color: 'danger',
                text: 'เกิดข้อผิดพลาด'
            }
        };
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.uploaded;
        return <Chip color={config.color as 'success' | 'warning' | 'danger'}>{config.text}</Chip>;
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    };

    if (loading) {
        return (
            <div className='flex items-center justify-center min-h-screen'>
                <Spinner size='lg' />
            </div>
        );
    }

    return (
        <div className='space-y-6'>
            {/* Header */}
            <div className='flex justify-between items-center'>
                <div>
                    <h2 className='text-2xl font-bold'>จัดการไฟล์ DBF</h2>
                    <p className='text-gray-600'>อัปโหลดและประมวลผลไฟล์ DBF</p>
                </div>
                <ButtonGroup>
                    <Button
                        color='primary'
                        startContent={<UploadIcon />}
                        onPress={() => setShowUploadModal(true)}
                    >
                        อัปโหลดไฟล์
                    </Button>
                    <Button
                        variant='bordered'
                        startContent={<SettingsIcon />}
                        onPress={() => setShowConditions(true)}
                    >
                        จัดการเงื่อนไข
                    </Button>
                </ButtonGroup>
            </div>

            {/* Main Content */}
            <Tabs aria-label='DBF Management tabs'>
                <Tab key='files' title='ไฟล์ DBF'>
                    <Card>
                        <CardHeader>
                            <div className='flex justify-between items-center'>
                                <div>
                                    <h3>ไฟล์ DBF</h3>
                                    <p className='text-sm text-gray-600'>
                                        แสดงไฟล์ DBF ทั้งหมด {files.length} ไฟล์
                                    </p>
                                </div>
                                <Button
                                    color='primary'
                                    startContent={<DownloadIcon />}
                                    onPress={() => setShowExportModal(true)}
                                    isDisabled={selectedFiles.length === 0}
                                >
                                    ส่งออกไฟล์ที่เลือก ({selectedFiles.length})
                                </Button>
                            </div>
                        </CardHeader>
                        <CardBody>
                            <Table aria-label='DBF files table'>
                                <TableHeader>
                                    <TableColumn>เลือก</TableColumn>
                                    <TableColumn>ชื่อไฟล์</TableColumn>
                                    <TableColumn>ขนาด</TableColumn>
                                    <TableColumn>สถานะ</TableColumn>
                                    <TableColumn>วันที่อัปโหลด</TableColumn>
                                    <TableColumn>การดำเนินการ</TableColumn>
                                </TableHeader>
                                <TableBody>
                                    {files.map((file) => (
                                        <TableRow key={file.id}>
                                            <TableCell>
                                                <input
                                                    type='checkbox'
                                                    checked={selectedFiles.includes(file.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedFiles([...selectedFiles, file.id]);
                                                        } else {
                                                            setSelectedFiles(selectedFiles.filter((id) => id !== file.id));
                                                        }
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <div className='font-medium'>{file.originalName}</div>
                                                    <div className='text-sm text-gray-500'>{file.filename}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>{formatFileSize(file.size)}</TableCell>
                                            <TableCell>{getStatusChip(file.status)}</TableCell>
                                            <TableCell>
                                                {new Date(file.createdAt).toLocaleDateString('th-TH')}
                                            </TableCell>
                                            <TableCell>
                                                <ButtonGroup size='sm'>
                                                    <Button variant='bordered'>ดูรายละเอียด</Button>
                                                    <Button variant='bordered' color='danger'>ลบ</Button>
                                                </ButtonGroup>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardBody>
                    </Card>
                </Tab>

                <Tab key='conditions' title='เงื่อนไขการประมวลผล'>
                    <Card>
                        <CardHeader>
                            <h3>เงื่อนไขการประมวลผล</h3>
                            <p className='text-sm text-gray-600'>
                                จัดการเงื่อนไขการอัปเดตข้อมูลในไฟล์ DBF
                            </p>
                        </CardHeader>
                        <CardBody>
                            <div className='space-y-4'>
                                {conditions.map((condition) => (
                                    <Card key={condition.id} variant='bordered'>
                                        <CardBody>
                                            <div className='flex justify-between items-start'>
                                                <div>
                                                    <h4 className='font-medium'>{condition.name}</h4>
                                                    <p className='text-sm text-gray-600'>{condition.description}</p>
                                                    <div className='mt-2'>
                                                        <Chip
                                                            color={condition.isActive ? 'success' : 'default'}
                                                            size='sm'
                                                        >
                                                            {condition.isActive ? 'ใช้งาน' : 'ไม่ใช้งาน'}
                                                        </Chip>
                                                    </div>
                                                </div>
                                                <ButtonGroup size='sm'>
                                                    <Button variant='bordered'>แก้ไข</Button>
                                                    <Button variant='bordered' color='danger'>ลบ</Button>
                                                </ButtonGroup>
                                            </div>
                                        </CardBody>
                                    </Card>
                                ))}
                            </div>
                        </CardBody>
                    </Card>
                </Tab>

                <Tab key='exports' title='การส่งออก'>
                    <Card>
                        <CardHeader>
                            <h3>ประวัติการส่งออก</h3>
                            <p className='text-sm text-gray-600'>
                                แสดงประวัติการส่งออกไฟล์ DBF
                            </p>
                        </CardHeader>
                        <CardBody>
                            <Table aria-label='DBF exports table'>
                                <TableHeader>
                                    <TableColumn>ชื่อไฟล์</TableColumn>
                                    <TableColumn>รูปแบบ</TableColumn>
                                    <TableColumn>สถานะ</TableColumn>
                                    <TableColumn>จำนวนรายการ</TableColumn>
                                    <TableColumn>วันที่ส่งออก</TableColumn>
                                    <TableColumn>การดำเนินการ</TableColumn>
                                </TableHeader>
                                <TableBody>
                                    {exports.map((exportItem) => (
                                        <TableRow key={exportItem.id}>
                                            <TableCell>{exportItem.filename}</TableCell>
                                            <TableCell>
                                                <Chip variant='flat' color='secondary'>
                                                    {exportItem.format.toUpperCase()}
                                                </Chip>
                                            </TableCell>
                                            <TableCell>{getStatusChip(exportItem.status)}</TableCell>
                                            <TableCell>
                                                <div>
                                                    <div>{exportItem.recordCount} รายการ</div>
                                                    <div className='text-sm text-gray-500'>
                                                        อัปเดต {exportItem.updatedRecordCount} รายการ
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {new Date(exportItem.createdAt).toLocaleDateString('th-TH')}
                                            </TableCell>
                                            <TableCell>
                                                <ButtonGroup size='sm'>
                                                    {exportItem.downloadUrl && (
                                                        <Button
                                                            variant='bordered'
                                                            startContent={<DownloadIcon />}
                                                            onPress={() => window.open(exportItem.downloadUrl, '_blank')}
                                                        >
                                                            ดาวน์โหลด
                                                        </Button>
                                                    )}
                                                    <Button variant='bordered'>ดูรายละเอียด</Button>
                                                </ButtonGroup>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardBody>
                    </Card>
                </Tab>
            </Tabs>

            {/* Upload Modal */}
            <Modal isOpen={showUploadModal} onOpenChange={setShowUploadModal}>
                <ModalContent>
                    <ModalHeader>
                        <h3>อัปโหลดไฟล์ DBF</h3>
                    </ModalHeader>
                    <ModalBody>
                        <div className='space-y-4'>
                            <div>
                                <label className='text-sm font-medium'>เลือกไฟล์ DBF</label>
                                <Input
                                    type='file'
                                    accept='.dbf'
                                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                />
                            </div>
                            {uploadFile && (
                                <div className='p-4 bg-gray-50 rounded-lg'>
                                    <p className='text-sm'>
                                        <strong>ชื่อไฟล์:</strong> {uploadFile.name}
                                    </p>
                                    <p className='text-sm'>
                                        <strong>ขนาด:</strong> {formatFileSize(uploadFile.size)}
                                    </p>
                                </div>
                            )}
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant='bordered' onPress={() => setShowUploadModal(false)}>
                            ยกเลิก
                        </Button>
                        <Button
                            color='primary'
                            onPress={handleFileUpload}
                            isDisabled={!uploadFile}
                        >
                            อัปโหลด
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Export Modal */}
            <Modal isOpen={showExportModal} onOpenChange={setShowExportModal} size='2xl'>
                <ModalContent>
                    <ModalHeader>
                        <h3>ส่งออกไฟล์ DBF</h3>
                    </ModalHeader>
                    <ModalBody>
                        {isExporting ? (
                            <div className='space-y-4'>
                                <div className='text-center'>
                                    <Spinner size='lg' />
                                    <p className='mt-2'>กำลังประมวลผลไฟล์...</p>
                                </div>
                                <Progress
                                    value={75}
                                    color='primary'
                                    className='w-full'
                                />
                            </div>
                        ) : (
                            <div className='space-y-4'>
                                <div>
                                    <label className='text-sm font-medium'>รูปแบบการส่งออก</label>
                                    <Select
                                        value={exportFormat}
                                        onChange={(e) => setExportFormat(e.target.value)}
                                    >
                                        <SelectItem key='dbf' textValue='dbf'>DBF</SelectItem>
                                        <SelectItem key='csv' textValue='csv'>CSV</SelectItem>
                                        <SelectItem key='json' textValue='json'>JSON</SelectItem>
                                    </Select>
                                </div>

                                {exportResults.length > 0 && (
                                    <div className='space-y-2'>
                                        <h4 className='font-medium'>ผลการส่งออก</h4>
                                        {exportResults.map((result, index) => (
                                            <div key={index} className='p-3 bg-gray-50 rounded-lg'>
                                                <div className='flex items-center justify-between'>
                                                    <div>
                                                        <p className='font-medium'>{result.originalFile}</p>
                                                        <p className='text-sm text-gray-600'>
                                                            {result.recordCount} รายการ → {result.updatedRecordCount} รายการ
                                                        </p>
                                                    </div>
                                                    <Chip
                                                        color={result.status === 'completed' ? 'success' : 'danger'}
                                                        startContent={result.status === 'completed' ? <CheckCircleIcon /> : <XCircleIcon />}
                                                    >
                                                        {result.status === 'completed' ? 'สำเร็จ' : 'ล้มเหลว'}
                                                    </Chip>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <Button variant='bordered' onPress={() => setShowExportModal(false)}>
                            ปิด
                        </Button>
                        {!isExporting && exportResults.length > 0 && (
                            <Button
                                color='primary'
                                startContent={<DownloadIcon />}
                                onPress={() => {
                                    // ดาวน์โหลดไฟล์ทั้งหมด
                                    exportResults.forEach((result) => {
                                        if (result.downloadUrl) {
                                            window.open(result.downloadUrl, '_blank');
                                        }
                                    });
                                }}
                            >
                                ดาวน์โหลดทั้งหมด
                            </Button>
                        )}
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </div>
    );
} 