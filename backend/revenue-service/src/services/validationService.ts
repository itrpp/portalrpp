import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import { DBFRecord, DBFField } from '../types/index.js';

export interface ValidationRule {
    fieldName: string;
    ruleType: 'required' | 'format' | 'range' | 'length' | 'custom';
    ruleValue?: any;
    errorMessage: string;
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    validRecords: number;
    invalidRecords: number;
    totalRecords: number;
}

export interface ValidationError {
    rowIndex: number;
    fieldName: string;
    value: any;
    errorMessage: string;
    ruleType: string;
}

export interface FileValidationResult {
    fileId: string;
    validationType: string;
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;
    validationErrors: ValidationError[];
    validationTime: number;
    status: string;
    errorMessage?: string;
}

export class ValidationService {
    /**
       * Validate schema ของไฟล์ DBF
       */
    public static validateSchema(schema: DBFField[], fileType: string): ValidationResult {
        const errors: ValidationError[] = [];
        const requiredFields = this.getRequiredFields(fileType);

        // ตรวจสอบ required fields
        for (const requiredField of requiredFields) {
            const field = schema.find(f => f.name === requiredField.name);
            if (!field) {
                errors.push({
                    rowIndex: -1, // Schema level error
                    fieldName: requiredField.name,
                    value: null,
                    errorMessage: `Required field '${requiredField.name}' is missing`,
                    ruleType: 'required',
                });
            } else if (field.type !== requiredField.type) {
                errors.push({
                    rowIndex: -1,
                    fieldName: requiredField.name,
                    value: field.type,
                    errorMessage: `Field '${requiredField.name}' should be type '${requiredField.type}', got '${field.type}'`,
                    ruleType: 'format',
                });
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            validRecords: 0,
            invalidRecords: 0,
            totalRecords: 0,
        };
    }

    /**
       * Validate ข้อมูลในไฟล์ DBF
       */
    public static validateRecords(
        records: DBFRecord[],
        schema: DBFField[],
        fileType: string,
    ): ValidationResult {
        const errors: ValidationError[] = [];
        const validationRules = this.getValidationRules(fileType);

        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            const rowIndex = i + 1; // 1-based index

            // ตรวจสอบแต่ละ field ตาม validation rules
            for (const rule of validationRules) {
                const value = record[rule.fieldName];
                const field = schema.find(f => f.name === rule.fieldName);

                if (!field) continue;

                const fieldError = this.validateField(value, field, rule, rowIndex);
                if (fieldError) {
                    errors.push(fieldError);
                }
            }

            // ตรวจสอบ business rules ตามประเภทไฟล์
            const businessErrors = this.validateBusinessRules(record, fileType, rowIndex);
            errors.push(...businessErrors);
        }

        const invalidRecords = new Set(errors.map(e => e.rowIndex)).size;
        const validRecords = records.length - invalidRecords;

        return {
            isValid: errors.length === 0,
            errors,
            validRecords,
            invalidRecords,
            totalRecords: records.length,
        };
    }

    /**
       * Validate field เดียว
       */
    private static validateField(
        value: any,
        field: DBFField,
        rule: ValidationRule,
        rowIndex: number,
    ): ValidationError | null {
        if (rule.ruleType === 'required') {
            if (!value || value.toString().trim() === '') {
                return {
                    rowIndex,
                    fieldName: rule.fieldName,
                    value,
                    errorMessage: rule.errorMessage,
                    ruleType: rule.ruleType,
                };
            }
        } else if (rule.ruleType === 'length') {
            if (value && value.toString().length > field.length) {
                return {
                    rowIndex,
                    fieldName: rule.fieldName,
                    value,
                    errorMessage: rule.errorMessage,
                    ruleType: rule.ruleType,
                };
            }
        } else if (rule.ruleType === 'format') {
            if (value && !this.validateFormat(value, rule.ruleValue, field.type)) {
                return {
                    rowIndex,
                    fieldName: rule.fieldName,
                    value,
                    errorMessage: rule.errorMessage,
                    ruleType: rule.ruleType,
                };
            }
        }

        return null;
    }

    /**
       * Validate format ของข้อมูล
       */
    private static validateFormat(value: any, format: string, fieldType: string): boolean {
        if (fieldType === 'D') {
            // Date format validation
            const dateStr = value.toString();
            if (dateStr.length !== 8) return false;

            const year = parseInt(dateStr.substring(0, 4));
            const month = parseInt(dateStr.substring(4, 6));
            const day = parseInt(dateStr.substring(6, 8));

            if (year < 1900 || year > 2100) return false;
            if (month < 1 || month > 12) return false;
            if (day < 1 || day > 31) return false;

            return true;
        } else if (fieldType === 'N') {
            // Numeric format validation
            return !isNaN(Number(value));
        }

        return true;
    }

    /**
       * Validate business rules ตามประเภทไฟล์
       */
    private static validateBusinessRules(
        record: DBFRecord,
        fileType: string,
        rowIndex: number,
    ): ValidationError[] {
        const errors: ValidationError[] = [];

        if (fileType === 'ADP') {
            // Business rules สำหรับไฟล์ ADP
            if (record.ADP && !['15', '16'].includes(record.ADP.toString())) {
                errors.push({
                    rowIndex,
                    fieldName: 'ADP',
                    value: record.ADP,
                    errorMessage: 'ADP field must be 15 or 16',
                    ruleType: 'business_rule',
                });
            }
        } else if (fileType === 'CHT') {
            // Business rules สำหรับไฟล์ CHT
            if (record.SEQ && isNaN(Number(record.SEQ))) {
                errors.push({
                    rowIndex,
                    fieldName: 'SEQ',
                    value: record.SEQ,
                    errorMessage: 'SEQ field must be numeric',
                    ruleType: 'business_rule',
                });
            }
        } else if (fileType === 'CHA') {
            // Business rules สำหรับไฟล์ CHA
            if (record.CHRGITEM && record.CHRGITEM.toString() === '31') {
                if (!record.TOTAL || isNaN(Number(record.TOTAL))) {
                    errors.push({
                        rowIndex,
                        fieldName: 'TOTAL',
                        value: record.TOTAL,
                        errorMessage: 'TOTAL field is required and must be numeric for CHRGITEM=31',
                        ruleType: 'business_rule',
                    });
                }
            }
        }

        return errors;
    }

    /**
       * ดึง required fields ตามประเภทไฟล์
       */
    private static getRequiredFields(fileType: string): { name: string; type: string }[] {
        const requiredFields: Record<string, { name: string; type: string }[]> = {
            ADP: [
                { name: 'ADP', type: 'N' },
                { name: 'HN', type: 'C' },
                { name: 'DATE', type: 'D' },
            ],
            OPD: [
                { name: 'HN', type: 'C' },
                { name: 'DATE', type: 'D' },
                { name: 'OPTYPE', type: 'C' },
            ],
            CHT: [
                { name: 'HN', type: 'C' },
                { name: 'SEQ', type: 'N' },
                { name: 'DATE', type: 'D' },
            ],
            CHA: [
                { name: 'HN', type: 'C' },
                { name: 'CHRGITEM', type: 'C' },
                { name: 'TOTAL', type: 'N' },
            ],
        };

        return requiredFields[fileType] || [];
    }

    /**
       * ดึง validation rules ตามประเภทไฟล์
       */
    private static getValidationRules(fileType: string): ValidationRule[] {
        const baseRules: ValidationRule[] = [
            {
                fieldName: 'HN',
                ruleType: 'required',
                errorMessage: 'HN field is required',
            },
            {
                fieldName: 'DATE',
                ruleType: 'format',
                ruleValue: 'YYYYMMDD',
                errorMessage: 'DATE field must be in YYYYMMDD format',
            },
        ];

        const fileTypeRules: Record<string, ValidationRule[]> = {
            ADP: [
                {
                    fieldName: 'ADP',
                    ruleType: 'required',
                    errorMessage: 'ADP field is required',
                },
            ],
            OPD: [
                {
                    fieldName: 'OPTYPE',
                    ruleType: 'required',
                    errorMessage: 'OPTYPE field is required',
                },
            ],
            CHT: [
                {
                    fieldName: 'SEQ',
                    ruleType: 'required',
                    errorMessage: 'SEQ field is required',
                },
            ],
            CHA: [
                {
                    fieldName: 'CHRGITEM',
                    ruleType: 'required',
                    errorMessage: 'CHRGITEM field is required',
                },
                {
                    fieldName: 'TOTAL',
                    ruleType: 'format',
                    ruleValue: 'numeric',
                    errorMessage: 'TOTAL field must be numeric',
                },
            ],
        };

        return [...baseRules, ...(fileTypeRules[fileType] || [])];
    }

    /**
       * บันทึก validation log
       */
    public static async saveValidationLog(
        fileId: string,
        validationType: string,
        validationRules: ValidationRule[],
        result: ValidationResult,
        validationTime: number,
        userId: string,
        userName: string,
    ): Promise<void> {
        try {
            await prisma.validationLog.create({
                data: {
                    fileId,
                    validationType,
                    validationRules: JSON.stringify(validationRules),
                    totalRecords: result.totalRecords,
                    validRecords: result.validRecords,
                    invalidRecords: result.invalidRecords,
                    validationErrors: JSON.stringify(result.errors),
                    validationTime,
                    status: result.isValid ? 'completed' : 'completed_with_errors',
                    userId,
                    userName,
                },
            });

            logger.info(`บันทึก validation log สำหรับไฟล์ ${fileId}: ${result.validRecords}/${result.totalRecords} records valid`);
        } catch (error) {
            logger.error(`Error saving validation log for file ${fileId}:`, error);
            throw error;
        }
    }

    /**
       * อัปเดตสถานะ validation ของไฟล์
       */
    public static async updateFileValidationStatus(
        fileId: string,
        validationStatus: string,
        validationErrors?: ValidationError[],
    ): Promise<void> {
        try {
            await prisma.file.update({
                where: { id: fileId },
                data: {
                    validationStatus,
                    validationErrors: validationErrors ? JSON.stringify(validationErrors) : null,
                },
            });

            logger.info(`อัปเดตสถานะ validation ของไฟล์ ${fileId} เป็น ${validationStatus}`);
        } catch (error) {
            logger.error(`Error updating file validation status ${fileId}:`, error);
            throw error;
        }
    }

    /**
       * อัปเดตสถานะ validation ของ records
       */
    public static async updateRecordsValidationStatus(
        fileId: string,
        validationErrors: ValidationError[],
    ): Promise<void> {
        try {
            // อัปเดต records ที่มี validation errors
            for (const error of validationErrors) {
                if (error.rowIndex > 0) { // ไม่ใช่ schema level error
                    await prisma.record.updateMany({
                        where: {
                            fileId,
                            rowIndex: error.rowIndex - 1, // Convert to 0-based index
                        },
                        data: {
                            isValid: false,
                            validationErrors: JSON.stringify([error]),
                        },
                    });
                }
            }

            logger.info(`อัปเดตสถานะ validation ของ records ในไฟล์ ${fileId}`);
        } catch (error) {
            logger.error(`Error updating records validation status ${fileId}:`, error);
            throw error;
        }
    }

    /**
       * ดึง validation log ของไฟล์
       */
    public static async getFileValidationLogs(fileId: string): Promise<any[]> {
        try {
            const logs = await prisma.validationLog.findMany({
                where: { fileId },
                orderBy: { createdAt: 'desc' },
            });

            return logs.map(log => ({
                id: log.id,
                validationType: log.validationType,
                totalRecords: log.totalRecords,
                validRecords: log.validRecords,
                invalidRecords: log.invalidRecords,
                validationErrors: log.validationErrors ? JSON.parse(log.validationErrors) : [],
                validationTime: log.validationTime,
                status: log.status,
                createdAt: log.createdAt,
            }));
        } catch (error) {
            logger.error(`Error getting validation logs for file ${fileId}:`, error);
            throw error;
        }
    }
} 
