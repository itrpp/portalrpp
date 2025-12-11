/**
 * ========================================
 * HRD TYPES
 * ========================================
 * Types สำหรับระบบจัดการข้อมูลบุคคล (HRD)
 */

/**
 * กลุ่มภารกิจ
 */
export interface Department {
  id: number;
  name: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * กลุ่มงาน
 */
export interface DepartmentSub {
  id: number;
  name: string;
  departmentId: number;
  departmentName?: string; // สำหรับแสดงผล
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * หน่วยงาน
 */
export interface DepartmentSubSub {
  id: number;
  name: string;
  departmentSubId: number;
  departmentSubName?: string; // สำหรับแสดงผล
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * กลุ่มบุคลากร
 */
export interface PersonType {
  id: number;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * ตำแหน่ง
 */
export interface Position {
  id: number;
  name: string;
  positionSpId?: string;
  createdAt?: string;
  updatedAt?: string;
}

