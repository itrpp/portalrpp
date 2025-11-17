/**
 * Enum Mapper Utilities
 * แปลงค่า string ระหว่าง Proto และ Prisma (ตอนนี้ใช้ string ทั้งคู่แล้ว)
 * ฟังก์ชันเหล่านี้ยังคงมีไว้เพื่อ validate และ normalize ค่า
 */

/**
 * Validate และ normalize Urgency Level
 */
export const mapUrgencyLevelToPrisma = (protoLevel) => {
  // ถ้าเป็น string อยู่แล้ว ให้ return โดยตรง
  if (typeof protoLevel === 'string') {
    const validValues = ['NORMAL', 'RUSH', 'EMERGENCY'];
    return validValues.includes(protoLevel) ? protoLevel : 'NORMAL';
  }
  // ถ้าเป็น number (backward compatibility) ให้แปลง
  const map = {
    0: 'NORMAL',
    1: 'RUSH',
    2: 'EMERGENCY',
  };
  return map[protoLevel] ?? 'NORMAL';
};

/**
 * Validate และ normalize Urgency Level สำหรับ Proto
 */
export const mapUrgencyLevelToProto = (prismaLevel) => {
  // ตอนนี้ใช้ string โดยตรง
  const validValues = ['NORMAL', 'RUSH', 'EMERGENCY'];
  return validValues.includes(prismaLevel) ? prismaLevel : 'NORMAL';
};

/**
 * Validate และ normalize Vehicle Type
 */
export const mapVehicleTypeToPrisma = (protoType) => {
  if (typeof protoType === 'string') {
    const validValues = ['SITTING', 'LYING', 'GOLF'];
    return validValues.includes(protoType) ? protoType : 'SITTING';
  }
  const map = {
    0: 'SITTING',
    1: 'LYING',
    2: 'GOLF',
  };
  return map[protoType] ?? 'SITTING';
};

/**
 * Validate และ normalize Vehicle Type สำหรับ Proto
 */
export const mapVehicleTypeToProto = (prismaType) => {
  const validValues = ['SITTING', 'LYING', 'GOLF'];
  return validValues.includes(prismaType) ? prismaType : 'SITTING';
};

/**
 * Validate และ normalize Has Vehicle
 */
export const mapHasVehicleToPrisma = (protoValue) => {
  if (typeof protoValue === 'string') {
    const validValues = ['YES', 'NO'];
    return validValues.includes(protoValue) ? protoValue : 'NO';
  }
  const map = {
    0: 'YES',
    1: 'NO',
  };
  return map[protoValue] ?? 'NO';
};

/**
 * Validate และ normalize Has Vehicle สำหรับ Proto
 */
export const mapHasVehicleToProto = (prismaValue) => {
  const validValues = ['YES', 'NO'];
  return validValues.includes(prismaValue) ? prismaValue : 'NO';
};

/**
 * Validate และ normalize Return Trip
 */
export const mapReturnTripToPrisma = (protoValue) => {
  if (typeof protoValue === 'string') {
    const validValues = ['ONE_WAY', 'ROUND_TRIP'];
    return validValues.includes(protoValue) ? protoValue : 'ONE_WAY';
  }
  const map = {
    0: 'ONE_WAY',
    1: 'ROUND_TRIP',
  };
  return map[protoValue] ?? 'ONE_WAY';
};

/**
 * Validate และ normalize Return Trip สำหรับ Proto
 */
export const mapReturnTripToProto = (prismaValue) => {
  const validValues = ['ONE_WAY', 'ROUND_TRIP'];
  return validValues.includes(prismaValue) ? prismaValue : 'ONE_WAY';
};

/**
 * Validate และ normalize Status
 */
export const mapStatusToPrisma = (protoStatus) => {
  if (typeof protoStatus === 'string') {
    const validValues = ['WAITING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    return validValues.includes(protoStatus) ? protoStatus : 'WAITING';
  }
  const map = {
    0: 'WAITING',
    1: 'IN_PROGRESS',
    2: 'COMPLETED',
    3: 'CANCELLED',
  };
  return map[protoStatus] ?? 'WAITING';
};

/**
 * Validate และ normalize Status สำหรับ Proto
 */
export const mapStatusToProto = (prismaStatus) => {
  const validValues = ['WAITING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
  return validValues.includes(prismaStatus) ? prismaStatus : 'WAITING';
};

/**
 * Validate และ normalize Equipment array
 */
export const mapEquipmentToPrisma = (protoEquipmentArray) => {
  if (!Array.isArray(protoEquipmentArray)) {
    return [];
  }
  
  const validValues = ['OXYGEN', 'SALINE_POLE', 'ICD_BOX', 'CLOTH_TIED', 'OTHER', 'TUBE', 'IV_PUMP', 'VENTILATOR', 'MONITOR', 'SUCTION'];
  
  // ถ้าเป็น string array อยู่แล้ว ให้ validate และ return
  if (protoEquipmentArray.length > 0 && typeof protoEquipmentArray[0] === 'string') {
    return protoEquipmentArray.filter((eq) => validValues.includes(eq));
  }
  
  // ถ้าเป็น number array (backward compatibility) ให้แปลง
  const map = {
    0: 'OXYGEN',
    1: 'SALINE_POLE',
    2: 'ICD_BOX',
    3: 'CLOTH_TIED',
    4: 'OTHER',
    // Backward compatibility
    5: 'SUCTION',
  };
  return protoEquipmentArray
    .map((eq) => map[eq] ?? null)
    .filter((eq) => eq !== null);
};

/**
 * Validate และ normalize Equipment สำหรับ Proto
 */
export const mapEquipmentToProto = (prismaEquipment) => {
  const validValues = ['OXYGEN', 'SALINE_POLE', 'ICD_BOX', 'CLOTH_TIED', 'OTHER', 'TUBE', 'IV_PUMP', 'VENTILATOR', 'MONITOR', 'SUCTION'];

  // Prisma เก็บ equipment เป็น JSON อาจเป็น string หรือ array
  let equipmentArray = prismaEquipment;
  if (typeof equipmentArray === 'string') {
    try {
      equipmentArray = JSON.parse(equipmentArray);
    } catch (_e) {
      equipmentArray = [];
    }
  }
  if (!Array.isArray(equipmentArray)) {
    equipmentArray = [];
  }
  
  // Filter เฉพาะค่าที่ valid
  return equipmentArray.filter((eq) => validValues.includes(eq));
};

