import {
  EQUIPMENT_VALUES,
  HAS_VEHICLE_VALUES,
  PORTER_STATUSES,
  RETURN_TRIP_VALUES,
  URGENCY_LEVELS,
  VEHICLE_TYPES,
  type Equipment,
  type HasVehicle,
  type PorterStatus,
  type ReturnTrip,
  type UrgencyLevel,
  type VehicleType
} from '../types/porter';

const validateValue = <T extends string>(value: string | undefined | null, validValues: readonly T[], fallback: T): T => {
  if (typeof value === 'string' && validValues.includes(value as T)) {
    return value as T;
  }
  return fallback;
};

export const mapUrgencyLevelToPrisma = (protoLevel?: string | number | null): UrgencyLevel => {
  if (typeof protoLevel === 'number') {
    const map: Record<number, UrgencyLevel> = { 0: 'NORMAL', 1: 'RUSH', 2: 'EMERGENCY' };
    return map[protoLevel] ?? 'NORMAL';
  }
  return validateValue(protoLevel ?? undefined, URGENCY_LEVELS, 'NORMAL');
};

export const mapUrgencyLevelToProto = (prismaLevel?: string | null): UrgencyLevel => {
  return validateValue(prismaLevel ?? undefined, URGENCY_LEVELS, 'NORMAL');
};

export const mapVehicleTypeToPrisma = (protoType?: string | number | null): VehicleType => {
  if (typeof protoType === 'number') {
    const map: Record<number, VehicleType> = { 0: 'SITTING', 1: 'LYING', 2: 'GOLF' };
    return map[protoType] ?? 'SITTING';
  }
  return validateValue(protoType ?? undefined, VEHICLE_TYPES, 'SITTING');
};

export const mapVehicleTypeToProto = (prismaType?: string | null): VehicleType => {
  return validateValue(prismaType ?? undefined, VEHICLE_TYPES, 'SITTING');
};

export const mapHasVehicleToPrisma = (protoValue?: string | number | null): HasVehicle => {
  if (typeof protoValue === 'number') {
    const map: Record<number, HasVehicle> = { 0: 'YES', 1: 'NO' };
    return map[protoValue] ?? 'NO';
  }
  return validateValue(protoValue ?? undefined, HAS_VEHICLE_VALUES, 'NO');
};

export const mapHasVehicleToProto = (prismaValue?: string | null): HasVehicle => {
  return validateValue(prismaValue ?? undefined, HAS_VEHICLE_VALUES, 'NO');
};

export const mapReturnTripToPrisma = (protoValue?: string | number | null): ReturnTrip => {
  if (typeof protoValue === 'number') {
    const map: Record<number, ReturnTrip> = { 0: 'ONE_WAY', 1: 'ROUND_TRIP' };
    return map[protoValue] ?? 'ONE_WAY';
  }
  return validateValue(protoValue ?? undefined, RETURN_TRIP_VALUES, 'ONE_WAY');
};

export const mapReturnTripToProto = (prismaValue?: string | null): ReturnTrip => {
  return validateValue(prismaValue ?? undefined, RETURN_TRIP_VALUES, 'ONE_WAY');
};

export const mapStatusToPrisma = (protoStatus?: string | number | null): PorterStatus => {
  if (typeof protoStatus === 'number') {
    const map: Record<number, PorterStatus> = {
      0: 'WAITING_CENTER',
      1: 'WAITING_ACCEPT',
      2: 'IN_PROGRESS',
      3: 'COMPLETED',
      4: 'CANCELLED'
    };
    return map[protoStatus] ?? 'WAITING_CENTER';
  }
  const s = (protoStatus ?? '').trim();
  if (s === 'WAITING') return 'WAITING_CENTER';
  return validateValue(s || undefined, PORTER_STATUSES, 'WAITING_CENTER');
};

export const mapStatusToProto = (prismaStatus?: string | null): PorterStatus => {
  return validateValue(prismaStatus ?? undefined, PORTER_STATUSES, 'WAITING_CENTER');
};

export const mapEquipmentToPrisma = (protoEquipmentArray?: Array<string | number> | null): Equipment[] => {
  if (!Array.isArray(protoEquipmentArray) || protoEquipmentArray.length === 0) {
    return [];
  }

  if (typeof protoEquipmentArray[0] === 'string') {
    return (protoEquipmentArray as string[]).filter((eq) => EQUIPMENT_VALUES.includes(eq as Equipment)) as Equipment[];
  }

  const map: Record<number, Equipment | null> = {
    0: 'OXYGEN',
    1: 'SALINE_POLE',
    2: 'ICD_BOX',
    3: 'CLOTH_TIED',
    4: 'OTHER',
    5: 'SUCTION'
  };

  return (protoEquipmentArray as number[])
    .map((eq) => map[eq])
    .filter((eq): eq is Equipment => Boolean(eq));
};

export const mapEquipmentToProto = (prismaEquipment?: string | Equipment[] | null): Equipment[] => {
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

  return (equipmentArray as string[]).filter((eq) => EQUIPMENT_VALUES.includes(eq as Equipment)) as Equipment[];
};


