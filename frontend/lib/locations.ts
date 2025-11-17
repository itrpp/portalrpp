import { Building } from "@/types/porter";

/**
 * ========================================
 * LOCATION DATA
 * ========================================
 * ข้อมูลสถานที่สำหรับระบบ Porter
 * ตามโครงสร้าง: อาคาร -> ชั้น/หน่วยงาน -> ห้อง/เตียง
 */

export const BUILDINGS: Building[] = [
  {
    id: "building-1",
    name: "อาคารสมเด็จพระสังฆราช",
    floors: [
      {
        id: "floor-1-4",
        name: "ชั้น 4 หอผู้ป่วยพิเศษพรีเมียม",
        departmentType: 2, // หอผู้ป่วย
        rooms: Array.from({ length: 15 }, (_, i) => ({
          id: `room-${401 + i}`,
          name: `ห้อง ${401 + i}`,
        })),
      },
      {
        id: "floor-1-3-male",
        name: "ชั้น 3 หอผู้ป่วยอายุรกรรมชาย",
        departmentType: 2, // หอผู้ป่วย
        rooms: Array.from({ length: 35 }, (_, i) => ({
          id: `bed-${i + 1}-male-med`,
          name: `เตียง ${i + 1}`,
        })),
      },
      {
        id: "floor-1-3-female",
        name: "ชั้น 3 หอผู้ป่วยอายุรกรรมหญิง",
        departmentType: 2, // หอผู้ป่วย
        rooms: Array.from({ length: 35 }, (_, i) => ({
          id: `bed-${i + 1}-female-med`,
          name: `เตียง ${i + 1}`,
        })),
      },
      {
        id: "floor-1-2-male",
        name: "ชั้น 2 หอผู้ป่วยศัลยกรรมชาย",
        departmentType: 2, // หอผู้ป่วย
        rooms: Array.from({ length: 35 }, (_, i) => ({
          id: `bed-${i + 1}-male-surg`,
          name: `เตียง ${i + 1}`,
        })),
      },
      {
        id: "floor-1-2-female",
        name: "ชั้น 2 หอผู้ป่วยศัลยกรรมหญิง",
        departmentType: 2, // หอผู้ป่วย
        rooms: Array.from({ length: 35 }, (_, i) => ({
          id: `bed-${i + 1}-female-surg`,
          name: `เตียง ${i + 1}`,
        })),
      },
      {
        id: "floor-1-1-icu",
        name: "ชั้น 1 หอผู้ป่วยวิกฤต (ICU)",
        departmentType: 2, // หอผู้ป่วย
        rooms: Array.from({ length: 6 }, (_, i) => ({
          id: `bed-${i + 1}-icu`,
          name: `เตียง ${i + 1}`,
        })),
      },
      {
        id: "floor-1-1-niramai",
        name: "ชั้น 1 ห้องนิรมัย",
        departmentType: 1, // คลินิก
        rooms: undefined,
      },
    ],
  },
  {
    id: "building-2",
    name: "อาคารอายุบวร",
    floors: [
      {
        id: "floor-2-elderly-quality",
        name: "คลินิกผู้สูงอายุคุณภาพ(คลินิกสุขใจ สูงวัยประคับประคอง)",
        departmentType: 1, // คลินิก
        rooms: undefined,
      },
      {
        id: "floor-2-elderly-physio",
        name: "คลินิกกายภาพผู้สูงอายุ",
        departmentType: 1, // คลินิก
        rooms: undefined,
      },
      {
        id: "floor-2-traditional-med",
        name: "คลินิกแพทย์แผนไทยและแพทย์ทางเลือก",
        departmentType: 1, // คลินิก
        rooms: undefined,
      },
      {
        id: "floor-2-observation",
        name: "ห้องสังเกตุอาการ",
        departmentType: 2, // หอผู้ป่วย
        rooms: Array.from({ length: 35 }, (_, i) => ({
          id: `bed-${i + 1}-observation`,
          name: `เตียง ${i + 1}`,
        })),
      },
      {
        id: "floor-2-counseling",
        name: "คลินิกให้คำปรึกษา/ARV clinic",
        departmentType: 1, // คลินิก
        rooms: undefined,
      },
    ],
  },
  {
    id: "building-3",
    name: "อาคารเฉลิมพระเกียรติ",
    floors: [
      {
        id: "floor-3-ruen-boon",
        name: "เรือนบุญ",
        departmentType: 1, // คลินิก
        rooms: undefined,
      },
      {
        id: "floor-3-4-premium",
        name: "ชั้น 4 คลินิกพรีเมียม",
        departmentType: 1, // คลินิก
        rooms: undefined,
      },
      {
        id: "floor-3-2-med-tech",
        name: "ชั้น 2 กลุ่มงานเทคนิคการแพทย์ (ห้องเจาะเลือด)",
        departmentType: 1, // คลินิก
        rooms: undefined,
      },
      {
        id: "floor-3-2-radiology",
        name: "ชั้น 2 กลุ่มงานรังสีวิทยา (ห้อง X-RAY)",
        departmentType: 1, // คลินิก
        rooms: undefined,
      },
      {
        id: "floor-3-2-dental",
        name: "ชั้น 2 คลินิกทันตกรรม (ห้องฟัน)",
        departmentType: 1, // คลินิก
        rooms: undefined,
      },
      {
        id: "floor-3-2-pediatric",
        name: "ชั้น 2 คลินิกกุมารเวชกรรม",
        departmentType: 1, // คลินิก
        rooms: undefined,
      },
      {
        id: "floor-3-2-international",
        name: "ชั้น 2 คลินิกต่างชาติ",
        departmentType: 1, // คลินิก
        rooms: undefined,
      },
      {
        id: "floor-3-1-social-security",
        name: "ชั้น 1 คลินิกประกันสังคม",
        departmentType: 1, // คลินิก
        rooms: undefined,
      },
      {
        id: "floor-3-1-direct-reimburse",
        name: "ชั้น 1 คลินิกเบิกได้จ่ายตรง",
        departmentType: 1, // คลินิก
        rooms: undefined,
      },
      {
        id: "floor-3-1-authorization",
        name: "ชั้น 1 อนุมัติสิทธิ – ส่งต่อ",
        departmentType: 1, // คลินิก
        rooms: undefined,
      },
      {
        id: "floor-3-1-general",
        name: "ชั้น 1 คลินิกตรวจโรคทั่วไป",
        departmentType: 1, // คลินิก
        rooms: undefined,
      },
      {
        id: "floor-3-1-ophthalmology",
        name: "ชั้น 1 คลินิกจักษุ",
        departmentType: 1, // คลินิก
        rooms: undefined,
      },
      {
        id: "floor-3-1-ent",
        name: "ชั้น 1 โสต ศอ นาสิก",
        departmentType: 1, // คลินิก
        rooms: undefined,
      },
      {
        id: "floor-3-1-pharmacy",
        name: "ชั้น 1 ห้องจ่ายยาผู้ป่วยนอก",
        departmentType: 1, // คลินิก
        rooms: undefined,
      },
      {
        id: "floor-3-1-disability",
        name: "ชั้น 1 ศูนย์บริการคนพิการแบบเบ็ดเสร็จ",
        departmentType: 1, // คลินิก
        rooms: undefined,
      },
    ],
  },
  {
    id: "building-4",
    name: "อาคารภูมิพิพัฒน์",
    floors: [
      {
        id: "floor-4-7-premium",
        name: "ชั้น 7 หอผู้ป่วยพิเศษพรีเมียม",
        departmentType: 2, // หอผู้ป่วย
        rooms: Array.from({ length: 20 }, (_, i) => ({
          id: `room-${401 + i}`,
          name: `ห้อง ${401 + i}`,
        })),
      },
      {
        id: "floor-4-6-male-ss",
        name: "ชั้น 6 หอผู้ป่วยประกันสังคมชาย",
        departmentType: 2, // หอผู้ป่วย
        rooms: Array.from({ length: 35 }, (_, i) => ({
          id: `bed-${i + 1}-male-ss`,
          name: `เตียง ${i + 1}`,
        })),
      },
      {
        id: "floor-4-6-female-ss",
        name: "ชั้น 6 หอผู้ป่วยประกันสังคมหญิง",
        departmentType: 2, // หอผู้ป่วย
        rooms: Array.from({ length: 36 }, (_, i) => ({
          id: `bed-${i + 1}-female-ss`,
          name: `เตียง ${i + 1}`,
        })),
      },
    ],
  },
];

/**
 * ฟังก์ชันสำหรับค้นหาอาคารตาม ID
 */
export function getBuildingById(buildingId: string): Building | undefined {
  return BUILDINGS.find((b) => b.id === buildingId);
}

/**
 * ฟังก์ชันสำหรับค้นหาชั้น/หน่วยงานตาม ID
 */
export function getFloorDepartmentById(
  buildingId: string,
  floorDepartmentId: string,
) {
  const building = getBuildingById(buildingId);

  return building?.floors.find((f) => f.id === floorDepartmentId);
}

/**
 * ฟังก์ชันสำหรับค้นหาห้อง/เตียงตาม ID
 */
export function getRoomBedById(
  buildingId: string,
  floorDepartmentId: string,
  roomBedId: string,
) {
  const floorDepartment = getFloorDepartmentById(buildingId, floorDepartmentId);

  return floorDepartment?.rooms?.find((r) => r.id === roomBedId);
}
