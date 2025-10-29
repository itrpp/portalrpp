import React from "react";
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
} from "@heroui/react";

import { UploadBatch, ProcessingStatus, ExportStatus } from "@/types/revenue";
import { RefreshIcon } from "@/components/ui/icons";

interface DataManagementTableProps {
  uploadBatches: UploadBatch[];
  isLoading: boolean;
  isRefreshing: boolean;
  lastUpdated: Date | null;
  formatDate: (date: Date) => string;
  onRefresh: () => void;
  onEdit: (batchId: string) => void;
  onView: () => void;
  onExport: (batchId: string) => void;
  isProcessed: (batch: UploadBatch) => boolean;
  isExported: (batch: UploadBatch) => boolean;
  isExporting: (batch: UploadBatch) => boolean;
}

export const DataManagementTable: React.FC<DataManagementTableProps> = ({
  uploadBatches,
  isLoading,
  isRefreshing,
  lastUpdated,
  formatDate,
  onRefresh,
  onEdit,
  onView,
  onExport,
  isProcessed,
  isExported,
  isExporting,
}) => {
  // ฟังก์ชันสำหรับแสดงสถานะการปรับปรุงข้อมูล
  const getProcessingStatusChip = (batch: UploadBatch) => {
    const processingStatus = batch.processingStatus || ProcessingStatus.PENDING;

    switch (processingStatus) {
      case ProcessingStatus.COMPLETED:
        return (
          <Chip color="success" size="sm" variant="flat">
            ปรับปรุงข้อมูลสำเร็จ
          </Chip>
        );
      case ProcessingStatus.PROCESSING:
        return (
          <Chip color="warning" size="sm" variant="flat">
            กำลังปรับปรุง
          </Chip>
        );
      case ProcessingStatus.FAILED:
        return (
          <Chip color="danger" size="sm" variant="flat">
            ปรับปรุงล้มเหลว
          </Chip>
        );
      case ProcessingStatus.PENDING:
      default:
        return (
          <Chip color="default" size="sm" variant="flat">
            ยังไม่ได้ปรับปรุง
          </Chip>
        );
    }
  };

  // ฟังก์ชันสำหรับแสดงสถานะการส่งออก
  const getExportStatusChip = (batch: UploadBatch) => {
    const exportStatus = batch.exportStatus || ExportStatus.NOT_EXPORTED;

    switch (exportStatus) {
      case ExportStatus.EXPORTED:
        return (
          <Chip color="primary" size="sm" variant="flat">
            ส่งออกแล้ว
          </Chip>
        );
      case ExportStatus.EXPORTING:
        return (
          <Chip color="warning" size="sm" variant="flat">
            กำลังส่งออก
          </Chip>
        );
      case ExportStatus.EXPORT_FAILED:
        return (
          <Chip color="danger" size="sm" variant="flat">
            ส่งออกล้มเหลว
          </Chip>
        );
      case ExportStatus.NOT_EXPORTED:
      default:
        return (
          <Chip color="default" size="sm" variant="flat">
            ยังไม่ส่งออก
          </Chip>
        );
    }
  };

  // ฟังก์ชันสำหรับจัดรูปแบบขนาดไฟล์ให้เหมาะสม
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";

    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    // ปรับให้แสดงทศนิยมที่เหมาะสมตามขนาด
    let size: number;

    if (i === 0) {
      size = bytes;
    } else if (i === 1) {
      size = parseFloat((bytes / k).toFixed(1));
    } else {
      size = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
    }

    return `${size} ${sizes[i]}`;
  };

  return (
    <Card className="border-2 border-default-200">
      <CardHeader>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-2">
            {/* <DatabaseIcon className="w-6 h-6" /> */}
            <h2 className="text-xl font-semibold">จัดการข้อมูล 16 แฟ้ม OPD</h2>
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
              color="primary"
              isLoading={isRefreshing}
              size="sm"
              title="รีเฟรชข้อมูล"
              variant="ghost"
              onPress={onRefresh}
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
            {/* <DatabaseIcon className="w-12 h-12 text-default-300" /> */}
            <div className="text-default-600">ไม่พบข้อมูล DBF Batches</div>
            <div className="text-sm text-default-400">
              กรุณาอัปโหลดไฟล์ DBF (16 แฟ้ม) ก่อนเพื่อแสดงข้อมูลที่นี่
            </div>
            <div className="text-xs text-default-300">
              หน้านี้แสดงเฉพาะข้อมูล DBF Files เท่านั้น
            </div>
          </div>
        ) : (
          <Table aria-label="DBF Batches Table" className="w-full">
            <TableHeader>
              <TableColumn>ชื่อ Batch</TableColumn>
              <TableColumn>วันที่อัปโหลด</TableColumn>
              <TableColumn align="center">สถานะปรับปรุง</TableColumn>
              <TableColumn align="center">สถานะส่งออก</TableColumn>
              <TableColumn align="center">จำนวนไฟล์</TableColumn>
              <TableColumn align="center">จำนวน Records</TableColumn>
              <TableColumn align="center">ขนาดรวม</TableColumn>
              <TableColumn align="center">การจัดการ</TableColumn>
            </TableHeader>
            <TableBody>
              {uploadBatches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell className="font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                    {batch.batchName}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDate(batch.uploadDate)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {getProcessingStatusChip(batch)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {getExportStatusChip(batch)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Chip color="default" size="sm" variant="flat">
                      {batch.totalFiles} ไฟล์
                    </Chip>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className="text-xs font-mono">
                      {batch.totalRecords.toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className="font-mono text-xs">
                      {formatFileSize(batch.totalSize)}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex gap-2">
                      <Button
                        color="primary"
                        size="sm"
                        title="ดูรายละเอียด"
                        variant="ghost"
                        onPress={onView}
                      >
                        ดูรายละเอียด
                      </Button>

                      <Button
                        color="warning"
                        size="sm"
                        title="ปรับปรุงข้อมูล"
                        variant="ghost"
                        onPress={() => onEdit(batch.id)}
                      >
                        ปรับปรุงข้อมูล
                      </Button>

                      <Button
                        color="success"
                        isLoading={isExporting(batch)}
                        size="sm"
                        title={
                          !isProcessed(batch)
                            ? "ต้องปรับปรุงข้อมูลก่อน"
                            : isExported(batch)
                              ? "ส่งออกแล้ว"
                              : isExporting(batch)
                                ? "กำลังส่งออก..."
                                : "ส่งออกข้อมูล"
                        }
                        variant="ghost"
                        onPress={() => onExport(batch.id)}
                      >
                        {isExporting(batch) ? "กำลังส่งออก..." : "ส่งออกข้อมูล"}
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
  );
};
