const toObjectOptions = {
  longs: String,
  enums: String,
  defaults: true,
  arrays: true,
  objects: true,
  oneofs: true,
} as const;

/** protobufjs toJSON/toObject มักเป็น camelCase — porter.service ใช้ snake_case ตาม .proto */
const UPDATE_PORTER_REQUEST_FIELD_ALIASES: [string, string][] = [
  ['requester_department', 'requesterDepartment'],
  ['requester_name', 'requesterName'],
  ['requester_phone', 'requesterPhone'],
  ['patient_name', 'patientName'],
  ['patient_hn', 'patientHn'],
  ['patient_condition', 'patientCondition'],
  ['pickup_building_id', 'pickupBuildingId'],
  ['pickup_floor_department_id', 'pickupFloorDepartmentId'],
  ['pickup_room_bed_name', 'pickupRoomBedName'],
  ['delivery_building_id', 'deliveryBuildingId'],
  ['delivery_floor_department_id', 'deliveryFloorDepartmentId'],
  ['delivery_room_bed_name', 'deliveryRoomBedName'],
  ['requested_date_time', 'requestedDateTime'],
  ['urgency_level', 'urgencyLevel'],
  ['vehicle_type', 'vehicleType'],
  ['has_vehicle', 'hasVehicle'],
  ['vehicle_type_golf', 'vehicleTypeGolf'],
  ['return_trip', 'returnTrip'],
  ['transport_reason', 'transportReason'],
  ['equipment_other', 'equipmentOther'],
  ['special_notes', 'specialNotes'],
];

/**
 * แปลง gRPC request เป็น plain object
 *
 * protobufjs `Message` ใช้ getter เก็บค่า — property ส่วนใหญ่ไม่ enumerable
 * การทำ `const { id, ...rest } = call.request` จึงได้ `rest` ว่าง ทำให้ update ไม่เขียนลง DB
 */
export function toPlainGrpcRequest<T extends object>(req: T): T {
  if (req == null || typeof req !== 'object') {
    return req;
  }

  const withToObject = req as T & { toObject?: (o: object) => T };
  if (typeof withToObject.toObject === 'function') {
    return withToObject.toObject(toObjectOptions as unknown as object);
  }

  const withJson = req as T & { toJSON?: () => T };
  if (typeof withJson.toJSON === 'function') {
    return withJson.toJSON();
  }

  try {
    return structuredClone(req);
  } catch {
    return JSON.parse(JSON.stringify(req)) as T;
  }
}

export function applyUpdatePorterRequestFieldAliases(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...obj };
  for (const [snake, camel] of UPDATE_PORTER_REQUEST_FIELD_ALIASES) {
    if (out[snake] === undefined && camel in out) {
      out[snake] = out[camel];
    }
  }
  return out;
}
