import { z } from 'zod';

/**
 * ========================================
 * SHARED PRIMITIVES
 * ========================================
 */

const DetailedLocationSchema = z
  .object({
    buildingId: z.string().optional().nullable(),
    buildingName: z.string().optional(),
    floorDepartmentId: z.string().optional().nullable(),
    floorDepartmentName: z.string().optional(),
    roomBedId: z.string().optional(),
    roomBedName: z.string().optional().nullable(),
  })
  .nullable()
  .optional();

const UrgencyLevelSchema = z.enum(['ปกติ', 'ด่วน', 'ฉุกเฉิน', '']);
const VehicleTypeSchema = z.enum(['รถนั่ง', 'รถนอน', 'รถกอล์ฟ', '']);
const HasVehicleSchema = z.enum(['มี', 'ไม่มี', '']);
const ReturnTripSchema = z.enum(['ไปส่งอย่างเดียว', 'รับกลับด้วย', '']);

/**
 * ========================================
 * POST /api/porter/requests
 * ========================================
 */
export const CreatePorterRequestSchema = z.object({
  requesterDepartment: z.number().nullable().optional(),
  requesterName: z.string().min(1, 'กรุณากรอกชื่อผู้แจ้ง'),
  requesterPhone: z.string().min(3, 'โทรศัพท์ภายในต้องระบุอย่างน้อย 3 หลัก'),
  patientName: z.string().min(1, 'กรุณากรอกชื่อผู้ป่วย'),
  patientHN: z.string().min(1, 'กรุณากรอกหมายเลข HN / AN'),
  patientCondition: z.array(z.string()).optional().default([]),
  pickupLocationDetail: DetailedLocationSchema,
  deliveryLocationDetail: DetailedLocationSchema,
  requestedDateTime: z.string().min(1, 'กรุณาระบุวันที่และเวลา'),
  urgencyLevel: UrgencyLevelSchema,
  vehicleType: VehicleTypeSchema,
  hasVehicle: HasVehicleSchema,
  returnTrip: ReturnTripSchema.optional().default('ไปส่งอย่างเดียว'),
  transportReason: z.string().min(1, 'กรุณากรอกเหตุผลการเคลื่อนย้าย'),
  equipment: z.array(z.string()).optional().default([]),
  equipmentOther: z.string().nullable().optional(),
  specialNotes: z.string().nullable().optional(),
});

export type CreatePorterRequestInput = z.infer<typeof CreatePorterRequestSchema>;

/**
 * ========================================
 * PUT /api/porter/requests/[id]
 * ทุก field optional — รองรับ partial update
 * ========================================
 */
export const UpdatePorterRequestSchema = CreatePorterRequestSchema.partial();
export type UpdatePorterRequestInput = z.infer<typeof UpdatePorterRequestSchema>;

/**
 * ========================================
 * PUT /api/porter/requests/[id]/status
 * ========================================
 */
export const UpdateStatusSchema = z.object({
  status: z.string().min(1, 'กรุณาระบุสถานะ'),
  assignedToId: z.string().optional(),
  cancelledReason: z.string().optional(),
});
export type UpdateStatusInput = z.infer<typeof UpdateStatusSchema>;

/**
 * ========================================
 * GET /api/porter/requests query params
 * ========================================
 */
export const ListPorterRequestsQuerySchema = z.object({
  status: z.string().optional().nullable(),
  urgency_level: z.string().optional().nullable(),
  requester_user_id: z.string().optional().nullable(),
  assigned_to_id: z.string().optional().nullable(),
  search: z.string().optional().nullable(),
  page: z.string().optional().nullable(),
  page_size: z.string().optional().nullable(),
  created_after: z.string().optional().nullable(),
});
export type ListPorterRequestsQueryInput = z.infer<typeof ListPorterRequestsQuerySchema>;

/**
 * Helper: แปลง Zod error → response ที่ frontend อ่านง่าย
 */
export function formatZodError(error: z.ZodError) {
  return {
    success: false as const,
    error: 'VALIDATION_ERROR',
    message: 'ข้อมูลที่ส่งไม่ถูกต้อง',
    issues: error.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
    })),
  };
}
