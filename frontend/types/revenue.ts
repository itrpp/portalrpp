export enum BatchStatus {
  SUCCESS = "success",
  COMPLETED = "completed",
  ERROR = "error",
  PROCESSING = "processing",
  PARTIAL = "partial",
  PARTIAL_SUCCESS = "partial_success",
}

export interface ValidationSteps {
  running: boolean;
  completed: boolean;
  passed: boolean;
  skipped?: boolean;
  error?: string;
}

export interface FileUploadResult {
  success: boolean;
  message: string;
  filename?: string;
  fileId?: string;
  fileSize?: number;
  uploadDate?: Date;
  errors?: string[];
}

export interface UploadBatch {
  id: string;
  batchName: string;
  uploadDate: Date;
  totalFiles: number;
  successFiles: number;
  errorFiles: number;
  processingFiles: number;
  totalRecords: number;
  totalSize: number;
  status: "success" | "error" | "processing" | "partial";
  processingStatus: "pending" | "processing" | "completed" | "failed";
  exportStatus: "not_exported" | "exporting" | "exported" | "export_failed";
  processingStatusIpd?: "pending" | "processing" | "completed" | "failed";
  processingStatusOpd?: "pending" | "processing" | "completed" | "failed";
  exportStatusIpd?: "not_exported" | "exporting" | "exported" | "export_failed";
  exportStatusOpd?: "not_exported" | "exporting" | "exported" | "export_failed";
  files?: UploadHistory[];
}

export interface UploadedFile {
  id: string;
  file: File;
  status:
    | "pending"
    | "uploading"
    | "success"
    | "validating"
    | "processing"
    | "imported"
    | "error"
    | "completed"
    | "failed";
  progress: number;
  error?: string;
  checksum?: string;
  fileSize?: number;
  validationSteps?: ValidationSteps;
  validationProgress?: number;
  recordsCount?: number;
}

export interface UploadHistory {
  id: string;
  fileName: string;
  fileSize: number;
  uploadDate: Date;
  status: "success" | "error" | "processing" | "pending";
  recordsCount?: number;
  errorMessage?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface BatchesResponse {
  batches: UploadBatch[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalItems: number;
  };
}

export enum ProcessingStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}

export enum ExportStatus {
  NOT_EXPORTED = "not_exported",
  EXPORTING = "exporting",
  EXPORTED = "exported",
  EXPORT_FAILED = "export_failed",
}
