/**
 * Enum Mapper Utilities
 * แปลง enum ระหว่าง Proto (number) และ Prisma (string)
 */

/**
 * แปลง Proto Urgency Level เป็น Prisma enum
 */
export const mapUrgencyLevelToPrisma = (protoLevel) => {
  const map = {
    0: 'NORMAL',
    1: 'RUSH',
    2: 'EMERGENCY',
  };
  return map[protoLevel] ?? 'NORMAL';
};

/**
 * แปลง Prisma Urgency Level เป็น Proto enum
 */
export const mapUrgencyLevelToProto = (prismaLevel) => {
  const map = {
    NORMAL: 0,
    RUSH: 1,
    EMERGENCY: 2,
  };
  return map[prismaLevel] ?? 0;
};

/**
 * แปลง Proto Vehicle Type เป็น Prisma enum
 */
export const mapVehicleTypeToPrisma = (protoType) => {
  const map = {
    0: 'SITTING',
    1: 'LYING',
    2: 'GOLF',
  };
  return map[protoType] ?? 'SITTING';
};

/**
 * แปลง Prisma Vehicle Type เป็น Proto enum
 */
export const mapVehicleTypeToProto = (prismaType) => {
  const map = {
    SITTING: 0,
    LYING: 1,
    GOLF: 2,
  };
  return map[prismaType] ?? 0;
};

/**
 * แปลง Proto Has Vehicle เป็น Prisma enum
 */
export const mapHasVehicleToPrisma = (protoValue) => {
  const map = {
    0: 'YES',
    1: 'NO',
  };
  return map[protoValue] ?? 'NO';
};

/**
 * แปลง Prisma Has Vehicle เป็น Proto enum
 */
export const mapHasVehicleToProto = (prismaValue) => {
  const map = {
    YES: 0,
    NO: 1,
  };
  return map[prismaValue] ?? 1;
};

/**
 * แปลง Proto Return Trip เป็น Prisma enum
 */
export const mapReturnTripToPrisma = (protoValue) => {
  const map = {
    0: 'ONE_WAY',
    1: 'ROUND_TRIP',
  };
  return map[protoValue] ?? 'ONE_WAY';
};

/**
 * แปลง Prisma Return Trip เป็น Proto enum
 */
export const mapReturnTripToProto = (prismaValue) => {
  const map = {
    ONE_WAY: 0,
    ROUND_TRIP: 1,
  };
  return map[prismaValue] ?? 0;
};

/**
 * แปลง Proto Status เป็น Prisma enum
 */
export const mapStatusToPrisma = (protoStatus) => {
  const map = {
    0: 'WAITING',
    1: 'IN_PROGRESS',
    2: 'COMPLETED',
    3: 'CANCELLED',
  };
  return map[protoStatus] ?? 'WAITING';
};

/**
 * แปลง Prisma Status เป็น Proto enum
 */
export const mapStatusToProto = (prismaStatus) => {
  const map = {
    WAITING: 0,
    IN_PROGRESS: 1,
    COMPLETED: 2,
    CANCELLED: 3,
  };
  return map[prismaStatus] ?? 0;
};

/**
 * แปลง Proto Equipment array เป็น Prisma enum array
 */
export const mapEquipmentToPrisma = (protoEquipmentArray) => {
  const map = {
    0: 'OXYGEN',
    1: 'TUBE',
    2: 'IV_PUMP',
    3: 'VENTILATOR',
    4: 'MONITOR',
    5: 'SUCTION',
  };
  return protoEquipmentArray.map((eq) => map[eq] ?? 'OXYGEN');
};

/**
 * แปลง Prisma Equipment (JSON string หรือ array) เป็น Proto enum array
 */
export const mapEquipmentToProto = (prismaEquipment) => {
  const reverseMap = {
    OXYGEN: 0,
    TUBE: 1,
    IV_PUMP: 2,
    VENTILATOR: 3,
    MONITOR: 4,
    SUCTION: 5,
  };

  // Prisma เก็บ equipment เป็น JSON อาจเป็น string หรือ array
  let equipmentArray = prismaEquipment;
  if (typeof equipmentArray === 'string') {
    try {
      equipmentArray = JSON.parse(equipmentArray);
    } catch (e) {
      equipmentArray = [];
    }
  }
  if (!Array.isArray(equipmentArray)) {
    equipmentArray = [];
  }
  return equipmentArray.map((eq) => reverseMap[eq] ?? 0);
};

