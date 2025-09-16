import React from 'react';
import {
    Card,
    CardBody,
    CardHeader,
    Button,
    Chip,
    Table,
    TableHeader,
    TableColumn,
    TableBody,
    TableRow,
    TableCell,
} from '@heroui/react';
import { BatchStatus } from '@/types';
import { type UploadBatch } from '@/app/api/client';
import {
    FileTextIcon,
    EyeIcon,
    TrashIcon,
    RefreshIcon,
} from '@/components/ui/Icons';

interface UploadHistoryProps {
    uploadBatches: UploadBatch[];
    isLoading: boolean;
    isRefreshing: boolean;
    lastUpdated: Date | null;
    formatDate: (date: Date) => string;
    formatFileSize: (bytes: number) => string;
    onRefresh: () => void;
    onViewDetails: (batch: UploadBatch) => void;
    onDeleteBatch: (batch: UploadBatch) => void;
}

export const UploadHistory: React.FC<UploadHistoryProps> = ({
    uploadBatches,
    isLoading,
    isRefreshing,
    lastUpdated,
    formatDate,
    formatFileSize,
    onRefresh,
    onViewDetails,
    onDeleteBatch,
}) => {
    return (
        <Card className='w-full bg-default'>
            <CardHeader>
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center space-x-2">
                        <FileTextIcon className="w-6 h-6" />
                        <h2 className="text-xl font-semibold">ประวัติการอัปโหลด DBF Files</h2>
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
                            onPress={onRefresh}
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
                    <div className='flex items-center justify-center py-8' aria-label="กำลังโหลดข้อมูล">
                        <div className='text-default-600'>กำลังโหลดข้อมูล...</div>
                    </div>
                ) : (
                    <Table aria-label='ประวัติการอัปโหลด Batch'>
                        <TableHeader>
                            <TableColumn width={250}>ชื่อ Batch</TableColumn>
                            <TableColumn width={150}>วันที่อัปโหลด</TableColumn>
                            <TableColumn align="center">ไฟล์ทั้งหมด</TableColumn>
                            <TableColumn align="center">สำเร็จ</TableColumn>
                            <TableColumn align="center">ผิดพลาด</TableColumn>
                            <TableColumn align="center">รายการทั้งหมด</TableColumn>
                            <TableColumn align="center">ขนาดรวม</TableColumn>
                            <TableColumn align="center">สถานะ</TableColumn>
                            <TableColumn align="center">การจัดการ</TableColumn>
                        </TableHeader>
                        <TableBody items={uploadBatches} emptyContent={"ยังไม่มีประวัติการอัปโหลด DBF Files"}>
                            {(batch) => (
                                <TableRow key={batch.id}>
                                    <TableCell className="whitespace-nowrap overflow-hidden text-ellipsis max-w-32">
                                        <div className='flex items-center space-x-2' aria-label={`ชื่อ batch: ${batch.batchName}`}>
                                            {/* <FileTextIcon className='h-4 w-4 text-primary-600 dark:text-primary-400' /> */}
                                            <span className='font-medium text-foreground'>{batch.batchName}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                        <span className='text-default-600'>{formatDate(batch.uploadDate)}</span>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                        <span className='text-foreground font-medium'>{batch.totalFiles}</span>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                        <span className='text-success-600 font-medium'>{batch.successFiles}</span>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                        <span className='text-danger-600 font-medium'>{batch.errorFiles}</span>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                        <span className='text-default-600'>{batch.totalRecords.toLocaleString()}</span>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                        <span className='text-default-600'>{formatFileSize(batch.totalSize)}</span>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
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
                                    <TableCell className="whitespace-nowrap">
                                        <div className="flex gap-2 justify-center">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                color="primary"
                                                onPress={() => onViewDetails(batch)}
                                                title="ดูรายละเอียด"
                                            >
                                                ดูรายละเอียด
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                color="danger"
                                                onPress={() => onDeleteBatch(batch)}
                                                title="ลบ batch"
                                            >
                                                ลบ DBF batch
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
    );
};
