// DBF File Types
export interface DBFField {
    name: string;
    type: string;
    length: number;
    decimalPlaces: number;
}

export interface DBFHeader {
    version: number;
    year: number;
    month: number;
    day: number;
    recordCount: number;
    headerLength: number;
    recordLength: number;
    fields: DBFField[];
}

export interface DBFRecord {
    [key: string]: any;
}

// Upload Types
export interface UploadedFile {
    id: string;
    filename: string;
    originalName: string;
    size: number;
    status: 'uploaded' | 'processing' | 'completed' | 'error';
    userId: string;
    userName: string;
    filePath: string;
    createdAt: string;
    error?: string;
}

export interface UploadResponse {
    message: string;
    files: UploadedFile[];
    totalProcessed: number;
    totalFiles: number;
    processingTime: string;
    userDir: string;
    uploadInfo: {
        ipAddress: string;
        ipFolder: string;
        uploadPath: string;
    };
}

// Process Types
export interface ProcessedFile {
    id?: string;
    filename: string;
    originalName?: string;
    status: 'processing' | 'completed' | 'error';
    schema?: DBFField[];
    records?: DBFRecord[];
    recordCount: number;
    processingTime?: string;
    processingDetails?: string;
    error?: string;
}

export interface ProcessResponse {
    message: string;
    files: ProcessedFile[];
    totalProcessed: number;
    processingTime: string;
}

// Export Types
export interface ExportCondition {
    name: string;
    description: string;
    allowedCodes: string[];
    newCode: string;
    newQty: string;
    newRate: string;
    newTotal: string;
    minSeqCount: number;
}

export interface ExportRequest {
    userId: string;
    userName: string;
    conditions?: ExportCondition[];
    includeOriginal?: boolean;
}

export interface ExportResponse {
    message: string;
    downloadUrl: string;
    filename: string;
    fileSize: number;
    recordCount: number;
    processingTime: string;
}

// Authentication Types
export interface AuthUser {
    userId: string;
    userName: string;
    role: string;
}

// Error Types
export interface ApiError {
    error: string;
    details?: string;
    status: number;
}

// File Processing Types
export interface FileProcessingOptions {
    validateSchema?: boolean;
    processConditions?: boolean;
    updateFields?: boolean;
    encoding?: string;
}

export interface ProcessingResult {
    success: boolean;
    records: DBFRecord[];
    originalCount: number;
    processedCount: number;
    processingTime: string;
    filename: string;
    message?: string;
    error?: string;
}

// Export Types
export interface ExportResult {
    success: boolean;
    filename: string;
    filePath: string;
    recordCount: number;
    processingTime: string;
    format: string;
    message?: string;
    error?: string;
} 
