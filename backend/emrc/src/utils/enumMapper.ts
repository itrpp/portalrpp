import {
  BOOKING_PURPOSES,
  CONDITION_TYPES,
  EMRC_STATUSES,
  INFECTION_STATUS_VALUES,
  REQUIRED_EQUIPMENT_VALUES,
  type BookingPurpose,
  type ConditionType,
  type EMRCStatus,
  type InfectionStatus,
  type RequiredEquipment
} from '../types/emrc';

const validateValue = <T extends string>(value: string | undefined | null, validValues: readonly T[], fallback: T): T => {
  if (typeof value === 'string' && validValues.includes(value as T)) {
    return value as T;
  }
  return fallback;
};

export const mapBookingPurposeToPrisma = (protoPurpose?: string | number | null): BookingPurpose => {
  if (typeof protoPurpose === 'number') {
    const map: Record<number, BookingPurpose> = {
      0: 'SEND_HOME',
      1: 'TRANSFER_WARD',
      2: 'SEND_EXAM',
      3: 'REFER_IN',
      4: 'REFER_OUT',
      5: 'CT',
      6: 'DIALYSIS',
      7: 'OTHER'
    };
    return map[protoPurpose] ?? 'SEND_HOME';
  }
  return validateValue(protoPurpose ?? undefined, BOOKING_PURPOSES, 'SEND_HOME');
};

export const mapBookingPurposeToProto = (prismaPurpose?: string | null): BookingPurpose => {
  return validateValue(prismaPurpose ?? undefined, BOOKING_PURPOSES, 'SEND_HOME');
};

export const mapStatusToPrisma = (protoStatus?: string | number | null): EMRCStatus => {
  if (typeof protoStatus === 'number') {
    const map: Record<number, EMRCStatus> = {
      0: 'WAITING',
      1: 'IN_PROGRESS',
      2: 'COMPLETED',
      3: 'CANCELLED'
    };
    return map[protoStatus] ?? 'WAITING';
  }
  return validateValue(protoStatus ?? undefined, EMRC_STATUSES, 'WAITING');
};

export const mapStatusToProto = (prismaStatus?: string | null): EMRCStatus => {
  return validateValue(prismaStatus ?? undefined, EMRC_STATUSES, 'WAITING');
};

export const mapRequiredEquipmentToPrisma = (protoEquipmentArray?: Array<string | number> | null): RequiredEquipment[] => {
  if (!Array.isArray(protoEquipmentArray) || protoEquipmentArray.length === 0) {
    return [];
  }

  if (typeof protoEquipmentArray[0] === 'string') {
    return (protoEquipmentArray as string[]).filter((eq) => REQUIRED_EQUIPMENT_VALUES.includes(eq as RequiredEquipment)) as RequiredEquipment[];
  }

  const map: Record<number, RequiredEquipment | null> = {
    0: 'ROOM_AIR',
    1: 'IV',
    2: 'OXYGEN',
    3: 'HFNC',
    4: 'VENTILATOR',
    5: 'MONITOR',
    6: 'DEFIBRILLATOR'
  };

  return (protoEquipmentArray as number[])
    .map((eq) => map[eq])
    .filter((eq): eq is RequiredEquipment => Boolean(eq));
};

export const mapRequiredEquipmentToProto = (prismaEquipment?: string | RequiredEquipment[] | null): RequiredEquipment[] => {
  let equipmentArray: unknown = prismaEquipment;

  if (typeof equipmentArray === 'string') {
    try {
      equipmentArray = JSON.parse(equipmentArray);
    } catch {
      equipmentArray = [];
    }
  }

  if (!Array.isArray(equipmentArray)) {
    equipmentArray = [];
  }

  return (equipmentArray as string[]).filter((eq) => REQUIRED_EQUIPMENT_VALUES.includes(eq as RequiredEquipment)) as RequiredEquipment[];
};

export const mapInfectionStatusToPrisma = (protoStatus?: string | number | null): InfectionStatus => {
  if (typeof protoStatus === 'number') {
    const map: Record<number, InfectionStatus> = {
      0: 'DRUG_RESISTANT',
      1: 'TB',
      2: 'COVID_19',
      3: 'FLU_AB',
      4: 'RSV',
      5: 'NONE',
      6: 'OTHER'
    };
    return map[protoStatus] ?? 'NONE';
  }
  return validateValue(protoStatus ?? undefined, INFECTION_STATUS_VALUES, 'NONE');
};

export const mapInfectionStatusToProto = (prismaStatus?: string | null): InfectionStatus => {
  return validateValue(prismaStatus ?? undefined, INFECTION_STATUS_VALUES, 'NONE');
};

export const mapConditionTypeToPrisma = (protoType?: string | number | null): ConditionType => {
  if (typeof protoType === 'number') {
    const map: Record<number, ConditionType> = {
      0: 'ELDERLY',
      1: 'DISABLED'
    };
    return map[protoType] ?? 'ELDERLY';
  }
  return validateValue(protoType ?? undefined, CONDITION_TYPES, 'ELDERLY');
};

export const mapConditionTypeToProto = (prismaType?: string | null): ConditionType => {
  return validateValue(prismaType ?? undefined, CONDITION_TYPES, 'ELDERLY');
};

