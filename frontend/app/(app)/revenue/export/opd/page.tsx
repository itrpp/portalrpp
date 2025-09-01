'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardBody, CardHeader, Button, Chip, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@heroui/react';
import {
    FileTextIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon,
    DocumentTextIcon,
    CogIcon,
    DatabaseIcon,
    RefreshIcon
} from '@/components/ui/Icons';
import { useSession } from 'next-auth/react';
import { api, type UploadBatch } from '@/app/api/client';
import { toast } from 'react-hot-toast';

// ข้อมูลเงื่อนไขการทำงาน
const conditionsData = {
    critical: [
        {
            file: 'OPD',
            title: 'อัปเดต OPTYPE และ CLINIC',
            conditions: [
                'อัปเดต OPTYPE จาก 5 เป็น 7',
                'อัปเดต OPD field CLINIC 09900,01400 → OPTYPE = 9',
                'ตรวจสอบไฟล์ INS field DOCNO ถ้าไม่มีข้อมูล → OPTYPE = 3 (เฉพาะ OPTYPE=1)'
            ],
            purpose: 'ปรับประเภทการเบิกให้ถูกต้องตามเงื่อนไขของสปสช.'
        },
        {
            file: 'ADP',
            title: 'อัปเดตรหัสและประเภทการเบิก',
            conditions: [
                'อัปเดต CODE "TELMED Telel" เป็น "TELMED"',
                'อัปเดต TYPE=20/19 และ CLINIC=01300 เป็น TYPE=20, CODE=H9339, QTY=1, RATE=150, TOTAL=150 (เฉพาะกลุ่ม SEQ ที่มี OPTYPE=7)',
                'รวม records TYPE=15 ตามกลุ่ม CODE: 32501-32504→32004, 32102-32105→32001, 32208-32311→32003'
            ],
            purpose: 'แก้ไขรหัสการเบิกและรวมกลุ่ม Lab ให้ถูกต้อง'
        }
    ],
    important: [
        {
            file: 'CHT',
            title: 'รวมรายการซ้ำตาม HN, DATE',
            conditions: [
                'ตรวจสอบกลุ่ม HN,DATE ถ้ามีรายการซ้ำ',
                'รวม TOTAL จาก record SEQ มากกว่า → SEQ น้อยกว่า',
                'ลบ record ที่มี SEQ มากกว่า'
            ],
            purpose: 'รวมค่าใช้จ่าย visit ที่มีการปิดสิทธิมากกว่า 1 รอบ'
        },
        {
            file: 'CHA',
            title: 'รวม AMOUNT ตาม HN, DATE',
            conditions: [
                'ตรวจสอบกลุ่ม HN,DATE',
                'นำ AMOUNT จาก record SEQ มากกว่า → รวมกับ SEQ น้อยกว่า',
                'อัปเดต SEQ เป็น SEQ น้อยกว่า'
            ],
            purpose: 'รวมค่าใช้จ่ายที่มีการบันทึกหลายครั้ง'
        },
        {
            file: 'DRU',
            title: 'จัดการข้อมูลยา',
            conditions: [
                'ตรวจสอบกลุ่ม HN,DATE → อัปเดต SEQ เป็น SEQ น้อยกว่า',
                'ลบรายการที่ field TOTAL = 0'
            ],
            purpose: 'ตัดค่ายาที่เป็น 0 ออก และจัดลำดับ SEQ'
        }
    ],
    standard: [
        {
            file: 'INS',
            title: 'ลบ record ตาม CHT และ CHA',
            conditions: [
                'ลบ record ที่มี SEQ ที่ถูกลบออกในไฟล์ CHT และ CHA'
            ],
            purpose: 'ทำความสะอาดข้อมูลให้สอดคล้องกัน'
        },
        {
            file: 'ODX',
            title: 'จัดการรหัสโรค',
            conditions: [
                'ตรวจสอบกลุ่ม HN,DATE → อัปเดต SEQ เป็น SEQ น้อยกว่า',
                'ตรวจสอบ DXTYPE = 1 ถ้ามีมากกว่า 1 record → แก้เป็น DXTYPE = 2',
                'หากโรคซ้ำกัน (field DIAG) → ลบ record DXTYPE = 2'
            ],
            purpose: 'แก้ปัญหารหัสโรคออกไม่ครบ 2 คลินิก'
        }
    ]
};

const problemSolutions = [
    {
        problem: 'รวมค่าใช้จ่าย visit ที่มีการปิดสิทธิมากกว่า 1 รอบ',
        solution: 'เนื่องจากมีคนไข้มารับบริการเพิ่มหลังจากปิดสิทธิ',
        files: ['CHT', 'CHA']
    },
    {
        problem: 'รวมรายการ lab เป็นกลุ่ม 3 กลุ่ม ทุกประเภทการเบิกบัตรทอง',
        solution: 'เนื่องจากไม่ได้คีย์ lab กลุ่ม',
        files: ['ADP']
    },
    {
        problem: 'ปรับรายการเบิกค่ากายภาพทุกรายการเป็น H9339 ในประเภทการเบิก TYPE 7',
        solution: 'ประเภทการเบิกอื่น ใช้รหัส 5 หลัก ส่งปกติ',
        files: ['ADP']
    },
    {
        problem: 'รายการ TELMED และค่าบริการส่งยากลับบ้านไม่ขึ้น',
        solution: 'รหัสที่ส่งออกมาไม่ถูกต้อง',
        files: ['ADP']
    },
    {
        problem: 'บัตรทอง (รพ.อื่นในกทม.106): ไม่มีเลขหนังสือส่งตัว',
        solution: 'ให้เบิก TYPE 3',
        files: ['OPD']
    },
    {
        problem: 'คลินิกแพทย์แผนไทย สิทธิ 210,200',
        solution: 'ให้นำเข้าเป็น type 9 บริการแพทย์แผนไทย (คลินิก 1405,30067 ส่งออกมาเป็น type 7)',
        files: ['OPD']
    }
];

export default function RevenueExportPage() {
    const { data: session, status } = useSession();
    const [selectedTab, setSelectedTab] = useState<'data-management' | 'conditions' | 'solutions'>('data-management');
    const [selectedConditionTab, setSelectedConditionTab] = useState<'critical' | 'important' | 'standard'>('critical');

    // State สำหรับจัดการข้อมูล
    const [uploadBatches, setUploadBatches] = useState<UploadBatch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // ฟังก์ชันโหลด batches จาก API
    const loadBatches = useCallback(async () => {
        // ตรวจสอบ session ก่อนเรียก API
        if (!session || !session.accessToken) {
            toast.error('Session ไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่');
            return;
        }

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
                setUploadBatches([]);
            }
        } catch (error: any) {
            // ตรวจสอบ authentication error
            if (error.status === 401) {
                toast.error('Session หมดอายุ กรุณาเข้าสู่ระบบใหม่');
                return;
            }

            // สำหรับ error อื่นๆ ให้แสดงข้อความที่เหมาะสม
            toast.error('ไม่สามารถโหลดข้อมูล DBF batches ได้ กรุณาลองใหม่อีกครั้ง');
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



    // ฟังก์ชันสำหรับแสดงสถานะการปรับปรุงข้อมูล
    const getProcessingStatusChip = (batch: UploadBatch) => {
        // ใช้ processingStatus จาก database แทน batch.status
        const processingStatus = batch.processingStatus || 'pending';

        switch (processingStatus.toLowerCase()) {
            case 'completed':
                return <Chip color="success" variant="flat" size="sm">ปรับปรุงข้อมูลสำเร็จ</Chip>;
            case 'processing':
                return <Chip color="warning" variant="flat" size="sm">กำลังปรับปรุง</Chip>;
            case 'failed':
                return <Chip color="danger" variant="flat" size="sm">ปรับปรุงล้มเหลว</Chip>;
            case 'pending':
            default:
                return <Chip color="default" variant="flat" size="sm">ยังไม่ได้ปรับปรุง</Chip>;
        }
    };

    // ฟังก์ชันสำหรับแสดงสถานะการส่งออก
    const getExportStatusChip = (batch: UploadBatch) => {
        // ใช้ exportStatus จาก database
        const exportStatus = batch.exportStatus || 'not_exported';

        switch (exportStatus.toLowerCase()) {
            case 'exported':
                return <Chip color="primary" variant="flat" size="sm">ส่งออกแล้ว</Chip>;
            case 'exporting':
                return <Chip color="warning" variant="flat" size="sm">กำลังส่งออก</Chip>;
            case 'export_failed':
                return <Chip color="danger" variant="flat" size="sm">ส่งออกล้มเหลว</Chip>;
            case 'not_exported':
            default:
                return <Chip color="default" variant="flat" size="sm">ยังไม่ส่งออก</Chip>;
        }
    };

    // ฟังก์ชันสำหรับ format วันที่
    const formatDate = (date: Date) => {
        return date.toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // ฟังก์ชันยูทิลิตี้สำหรับตรวจสอบสถานะ
    const isProcessed = (batch: UploadBatch): boolean => {
        const processingStatus = batch.processingStatus || 'pending';
        return processingStatus.toLowerCase() === 'completed';
    };

    const isExported = (batch: UploadBatch): boolean => {
        const exportStatus = batch.exportStatus || 'not_exported';
        return exportStatus.toLowerCase() === 'exported';
    };

    const isProcessing = (batch: UploadBatch): boolean => {
        const processingStatus = batch.processingStatus || 'pending';
        return processingStatus.toLowerCase() === 'processing';
    };

    const isExporting = (batch: UploadBatch): boolean => {
        const exportStatus = batch.exportStatus || 'not_exported';
        return exportStatus.toLowerCase() === 'exporting';
    };

    // ฟังก์ชันสำหรับการจัดการข้อมูล
    const handleEdit = (batchId: string) => {
        console.log('Edit batch:', batchId);
        // TODO: เปิด modal สำหรับแก้ไขข้อมูล
        // ควรตรวจสอบก่อนว่า batch นี้ยังไม่ได้ปรับปรุง
        const batch = uploadBatches.find((b) => b.id === batchId);
        if (batch && !isProcessed(batch)) {
            // เปิด modal หรือ redirect ไปหน้าแก้ไข
            toast.success('เปิดหน้าปรับปรุงข้อมูล...');
        }
    };

    const handleExport = (batchId: string) => {
        console.log('Export batch:', batchId);
        // TODO: ดำเนินการส่งออกข้อมูล
        // ควรตรวจสอบก่อนว่า batch นี้ปรับปรุงแล้วและยังไม่ได้ส่งออก
        const batch = uploadBatches.find((b) => b.id === batchId);
        if (batch && isProcessed(batch) && !isExported(batch)) {
            // ดำเนินการส่งออก
            toast.success('เริ่มกระบวนการส่งออกข้อมูล...');
        }
    };

    const handleView = (batchId: string) => {
        console.log('View batch:', batchId);
        // TODO: แสดงรายละเอียดข้อมูล
        toast('แสดงรายละเอียด batch...');
    };

    return (
        <div className='container mx-auto p-6 space-y-6'>
            {/* Header */}
            <div className='flex items-center justify-between'>
                <div>
                    <h1 className='text-3xl font-bold text-foreground'>ส่งออกข้อมูล 16 แฟ้ม OPD</h1>
                    <p className='text-default-600 mt-2'>ปรับปรุงและจัดการข้อมูลก่อนส่งเบิก</p>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-default-100 p-1 rounded-lg w-fit">
                <button
                    onClick={() => setSelectedTab('data-management')}
                    className={`px-4 py-2 rounded-md transition-all ${selectedTab === 'data-management'
                        ? 'bg-white shadow text-primary font-medium'
                        : 'text-default-600 hover:text-default-900'
                        }`}
                >
                    <div className="flex items-center space-x-2">
                        <DatabaseIcon className="w-4 h-4" />
                        <span>จัดการข้อมูล</span>
                    </div>
                </button>
                <button
                    onClick={() => setSelectedTab('conditions')}
                    className={`px-4 py-2 rounded-md transition-all ${selectedTab === 'conditions'
                        ? 'bg-white shadow text-primary font-medium'
                        : 'text-default-600 hover:text-default-900'
                        }`}
                >
                    <div className="flex items-center space-x-2">
                        <CogIcon className="w-4 h-4" />
                        <span>เงื่อนไขการทำงาน</span>
                    </div>
                </button>
                <button
                    onClick={() => setSelectedTab('solutions')}
                    className={`px-4 py-2 rounded-md transition-all ${selectedTab === 'solutions'
                        ? 'bg-white shadow text-primary font-medium'
                        : 'text-default-600 hover:text-default-900'
                        }`}
                >
                    <div className="flex items-center space-x-2">
                        <FileTextIcon className="w-4 h-4" />
                        <span>การแก้ปัญหา</span>
                    </div>
                </button>
            </div>

            {/* Content */}
            {selectedTab === 'data-management' && (
                <Card className="border-2 border-default-200">
                    <CardHeader>
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center space-x-2">
                                <DatabaseIcon className="w-6 h-6" />
                                <h2 className="text-xl font-semibold">จัดการข้อมูล DBF</h2>
                            </div>
                            <div className="flex items-center space-x-4">
                                <div className="text-sm text-default-600">
                                    DBF Batches ทั้งหมด {uploadBatches.length} รายการ
                                    {lastUpdated && (
                                        <span className="ml-2">
                                            อัปเดตล่าสุด: {formatDate(lastUpdated)}
                                        </span>
                                    )}
                                </div>
                                <Button
                                    isIconOnly
                                    size="sm"
                                    variant="ghost"
                                    color="primary"
                                    onPress={handleRefresh}
                                    isLoading={isRefreshing}
                                    title="รีเฟรชข้อมูล"
                                >
                                    <RefreshIcon className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardBody>
                        {isLoading ? (
                            <div className="flex justify-center items-center py-8">
                                <div className="text-default-600">กำลังโหลดข้อมูล...</div>
                            </div>
                        ) : uploadBatches.length === 0 ? (
                            <div className="flex flex-col justify-center items-center py-8 space-y-2">
                                <DatabaseIcon className="w-12 h-12 text-default-300" />
                                <div className="text-default-600">ไม่พบข้อมูล DBF Batches</div>
                                <div className="text-sm text-default-400">กรุณาอัปโหลดไฟล์ DBF (16 แฟ้ม) ก่อนเพื่อแสดงข้อมูลที่นี่</div>
                                <div className="text-xs text-default-300">หน้านี้แสดงเฉพาะข้อมูล DBF Files เท่านั้น</div>
                            </div>
                        ) : (
                            <Table aria-label="DBF Batches Table" className="w-full">
                                <TableHeader>
                                    <TableColumn>ชื่อ Batch</TableColumn>
                                    <TableColumn>วันที่อัปโหลด</TableColumn>
                                    <TableColumn>สถานะปรับปรุง</TableColumn>
                                    <TableColumn>สถานะส่งออก</TableColumn>
                                    <TableColumn>จำนวนไฟล์</TableColumn>
                                    <TableColumn>จำนวน Records</TableColumn>
                                    <TableColumn>ขนาดรวม</TableColumn>
                                    <TableColumn>การจัดการ</TableColumn>
                                </TableHeader>
                                <TableBody>
                                    {uploadBatches.map((batch) => (
                                        <TableRow key={batch.id}>
                                            <TableCell className="font-medium">{batch.batchName}</TableCell>
                                            <TableCell>{formatDate(batch.uploadDate)}</TableCell>
                                            <TableCell>{getProcessingStatusChip(batch)}</TableCell>
                                            <TableCell>{getExportStatusChip(batch)}</TableCell>
                                            <TableCell>
                                                <Chip variant="flat" size="sm" color="default">
                                                    {batch.totalFiles} ไฟล์
                                                </Chip>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm font-mono">
                                                    {batch.totalRecords.toLocaleString()}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm">
                                                    {(batch.totalSize / (1024 * 1024)).toFixed(2)} MB
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        color="warning"
                                                        onPress={() => handleEdit(batch.id)}
                                                        title="ปรับปรุงข้อมูล"
                                                    >
                                                        ปรับปรุงข้อมูล
                                                    </Button>

                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        color="primary"
                                                        onPress={() => handleView(batch.id)}
                                                        title="ดูรายละเอียด"
                                                    >
                                                        ดูรายละเอียด
                                                    </Button>

                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        color="success"
                                                        onPress={() => handleExport(batch.id)}
                                                        title={
                                                            !isProcessed(batch) ? "ต้องปรับปรุงข้อมูลก่อน" :
                                                                isExported(batch) ? "ส่งออกแล้ว" :
                                                                    "ส่งออกข้อมูล"
                                                        }
                                                        isDisabled={
                                                            isProcessing(batch) ||
                                                            isExporting(batch) ||
                                                            batch.status === 'error' ||
                                                            !isProcessed(batch)
                                                        }
                                                    >
                                                        ส่งออกข้อมูล
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardBody>
                </Card>
            )}

            {selectedTab === 'conditions' && (
                <Card className="border-2 border-default-200">
                    <CardHeader>
                        <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                                <CogIcon className="w-6 h-6" />
                                <h2 className="text-xl font-semibold">เงื่อนไขการทำงานทั้งหมด</h2>
                            </div>
                            {/* Sub-Tab Navigation */}
                            <div className="flex space-x-1 bg-default-100 p-1 rounded-lg w-fit">
                                <button
                                    onClick={() => setSelectedConditionTab('critical')}
                                    className={`px-3 py-2 rounded-md transition-all text-sm ${selectedConditionTab === 'critical'
                                        ? 'bg-white shadow text-danger font-medium'
                                        : 'text-default-600 hover:text-default-900'
                                        }`}
                                >
                                    <div className="flex items-center space-x-2">
                                        <ExclamationTriangleIcon className="w-4 h-4" />
                                        <span>เงื่อนไขสำคัญมาก</span>
                                    </div>
                                </button>
                                <button
                                    onClick={() => setSelectedConditionTab('important')}
                                    className={`px-3 py-2 rounded-md transition-all text-sm ${selectedConditionTab === 'important'
                                        ? 'bg-white shadow text-warning font-medium'
                                        : 'text-default-600 hover:text-default-900'
                                        }`}
                                >
                                    <div className="flex items-center space-x-2">
                                        <InformationCircleIcon className="w-4 h-4" />
                                        <span>เงื่อนไขสำคัญ</span>
                                    </div>
                                </button>
                                <button
                                    onClick={() => setSelectedConditionTab('standard')}
                                    className={`px-3 py-2 rounded-md transition-all text-sm ${selectedConditionTab === 'standard'
                                        ? 'bg-white shadow text-success font-medium'
                                        : 'text-default-600 hover:text-default-900'
                                        }`}
                                >
                                    <div className="flex items-center space-x-2">
                                        <CheckCircleIcon className="w-4 h-4" />
                                        <span>เงื่อนไขมาตรฐาน</span>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardBody className="space-y-6">
                        {/* Critical Conditions */}
                        {selectedConditionTab === 'critical' && (
                            <div className="space-y-4">
                                <div className="flex items-center space-x-2 pb-2 border-b border-danger-200">
                                    <ExclamationTriangleIcon className="w-5 h-5 text-danger" />
                                    <h3 className="text-lg font-semibold text-danger">เงื่อนไขสำคัญมาก (Critical)</h3>
                                </div>
                                {conditionsData.critical.map((condition, conditionIndex) => (
                                    <div key={conditionIndex} className="space-y-2">
                                        <div className="flex items-center space-x-2">
                                            <DocumentTextIcon className="w-4 h-4 text-danger" />
                                            <span className="font-medium text-danger">ไฟล์ {condition.file}</span>
                                            <span className="text-default-600">- {condition.title}</span>
                                        </div>
                                        <ul className="ml-6 space-y-1">
                                            {condition.conditions.map((cond, idx) => (
                                                <li key={idx} className="flex items-start space-x-2 text-sm">
                                                    <span className="text-danger mt-1">•</span>
                                                    <span className="text-default-700">{cond}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="ml-6 p-2 bg-danger-50 rounded border-l-4 border-danger">
                                            <p className="text-xs text-default-600">
                                                <strong>วัตถุประสงค์:</strong> {condition.purpose}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Important Conditions */}
                        {selectedConditionTab === 'important' && (
                            <div className="space-y-4">
                                <div className="flex items-center space-x-2 pb-2 border-b border-warning-200">
                                    <InformationCircleIcon className="w-5 h-5 text-warning" />
                                    <h3 className="text-lg font-semibold text-warning">เงื่อนไขสำคัญ (Important)</h3>
                                </div>
                                {conditionsData.important.map((condition, conditionIndex) => (
                                    <div key={conditionIndex} className="space-y-2">
                                        <div className="flex items-center space-x-2">
                                            <DocumentTextIcon className="w-4 h-4 text-warning" />
                                            <span className="font-medium text-warning">ไฟล์ {condition.file}</span>
                                            <span className="text-default-600">- {condition.title}</span>
                                        </div>
                                        <ul className="ml-6 space-y-1">
                                            {condition.conditions.map((cond, idx) => (
                                                <li key={idx} className="flex items-start space-x-2 text-sm">
                                                    <span className="text-warning mt-1">•</span>
                                                    <span className="text-default-700">{cond}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="ml-6 p-2 bg-warning-50 rounded border-l-4 border-warning">
                                            <p className="text-xs text-default-600">
                                                <strong>วัตถุประสงค์:</strong> {condition.purpose}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Standard Conditions */}
                        {selectedConditionTab === 'standard' && (
                            <div className="space-y-4">
                                <div className="flex items-center space-x-2 pb-2 border-b border-success-200">
                                    <CheckCircleIcon className="w-5 h-5 text-success" />
                                    <h3 className="text-lg font-semibold text-success">เงื่อนไขมาตรฐาน (Standard)</h3>
                                </div>
                                {conditionsData.standard.map((condition, conditionIndex) => (
                                    <div key={conditionIndex} className="space-y-2">
                                        <div className="flex items-center space-x-2">
                                            <DocumentTextIcon className="w-4 h-4 text-success" />
                                            <span className="font-medium text-success">ไฟล์ {condition.file}</span>
                                            <span className="text-default-600">- {condition.title}</span>
                                        </div>
                                        <ul className="ml-6 space-y-1">
                                            {condition.conditions.map((cond, idx) => (
                                                <li key={idx} className="flex items-start space-x-2 text-sm">
                                                    <span className="text-success mt-1">•</span>
                                                    <span className="text-default-700">{cond}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="ml-6 p-2 bg-success-50 rounded border-l-4 border-success">
                                            <p className="text-xs text-default-600">
                                                <strong>วัตถุประสงค์:</strong> {condition.purpose}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardBody>
                </Card>
            )}

            {selectedTab === 'solutions' && (
                <Card className="border-2 border-default-200">
                    <CardHeader>
                        <div className="flex items-center space-x-2">
                            <FileTextIcon className="w-6 h-6" />
                            <h2 className="text-xl font-semibold">การแก้ปัญหาทั้งหมด</h2>
                        </div>
                    </CardHeader>
                    <CardBody className="space-y-4">
                        {problemSolutions.map((solution, index) => (
                            <Card key={index} className="border-2 border-primary-200 bg-default-50">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center space-x-3">
                                        <span className="flex-shrink-0 w-6 h-6 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                                            {index + 1}
                                        </span>
                                        <h3 className="font-semibold">แก้ไขปัญหา : {solution.problem}</h3>
                                    </div>
                                </CardHeader>
                                <CardBody className="pt-0 space-y-4">
                                    {/* การแก้ไข */}
                                    <div className="space-y-2">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-success font-bold">💡</span>
                                            <h4 className="font-medium text-success">การแก้ไข:</h4>
                                            <p className="text-default-700 text-sm leading-relaxed">
                                                {solution.solution}
                                            </p>
                                        </div>

                                    </div>

                                    {/* ไฟล์ที่เกี่ยวข้อง */}
                                    <div className="space-y-2">
                                        <div className="flex items-center space-x-2">
                                            <DocumentTextIcon className="w-4 h-4 text-primary" />
                                            <h4 className="font-medium text-primary">ไฟล์ที่เกี่ยวข้อง:</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {solution.files.map((file, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="px-3 py-1 bg-primary text-white text-xs rounded-full font-medium shadow-sm"
                                                    >
                                                        {file}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                    </div>
                                </CardBody>
                            </Card>
                        ))}
                    </CardBody>
                </Card>
            )}
        </div>
    );
} 