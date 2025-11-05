"use client";

import React from "react";
import { Select, SelectItem } from "@heroui/react";
import { BUILDINGS } from "@/lib/locations";
import { DetailedLocation } from "@/types/porter";

/**
 * Props สำหรับ LocationSelector
 */
interface LocationSelectorProps {
  label: string;
  value: DetailedLocation | null;
  onChange: (location: DetailedLocation | null) => void;
  errorMessage?: string;
  isRequired?: boolean;
}

/**
 * Component สำหรับเลือกสถานที่แบบ 3 ระดับ
 * อาคาร -> ชั้น/หน่วยงาน -> ห้อง/เตียง
 */
export function LocationSelector({
  label,
  value,
  onChange,
  errorMessage,
  isRequired = false,
}: LocationSelectorProps) {
  const [selectedBuildingId, setSelectedBuildingId] = React.useState<string>(
    value?.buildingId || "",
  );
  const [selectedFloorId, setSelectedFloorId] = React.useState<string>(
    value?.floorDepartmentId || "",
  );
  const [selectedRoomBedId, setSelectedRoomBedId] = React.useState<string>(
    value?.roomBedId || "",
  );

  // ดึงข้อมูลอาคารที่เลือก
  const selectedBuilding = BUILDINGS.find((b) => b.id === selectedBuildingId);

  // ดึงข้อมูลชั้น/หน่วยงานที่เลือก
  const selectedFloor = selectedBuilding?.floors.find(
    (f) => f.id === selectedFloorId,
  );

  // เมื่อเลือกอาคาร
  const handleBuildingChange = (buildingId: string) => {
    setSelectedBuildingId(buildingId);
    setSelectedFloorId("");
    setSelectedRoomBedId("");
    onChange(null);
  };

  // เมื่อเลือกชั้น/หน่วยงาน
  const handleFloorChange = (floorId: string) => {
    setSelectedFloorId(floorId);
    setSelectedRoomBedId("");
    updateLocation(selectedBuildingId, floorId, "");
  };

  // เมื่อเลือกห้อง/เตียง
  const handleRoomBedChange = (roomBedId: string) => {
    setSelectedRoomBedId(roomBedId);
    updateLocation(selectedBuildingId, selectedFloorId, roomBedId);
  };

  // อัปเดตข้อมูลสถานที่
  const updateLocation = (
    buildingId: string,
    floorId: string,
    roomBedId: string,
  ) => {
    const building = BUILDINGS.find((b) => b.id === buildingId);
    const floor = building?.floors.find((f) => f.id === floorId);
    const roomBed = floor?.rooms?.find((r) => r.id === roomBedId);

    if (building && floor) {
      const location: DetailedLocation = {
        buildingId: building.id,
        buildingName: building.name,
        floorDepartmentId: floor.id,
        floorDepartmentName: floor.name,
        roomBedId: roomBedId || undefined,
        roomBedName: roomBed?.name || undefined,
      };

      onChange(location);
    } else {
      onChange(null);
    }
  };

  // Sync กับ value prop เมื่อมีการเปลี่ยนแปลงจากภายนอก
  React.useEffect(() => {
    if (value) {
      setSelectedBuildingId(value.buildingId);
      setSelectedFloorId(value.floorDepartmentId);
      setSelectedRoomBedId(value.roomBedId || "");
    } else {
      setSelectedBuildingId("");
      setSelectedFloorId("");
      setSelectedRoomBedId("");
    }
  }, [value]);

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-foreground">
        {label}
        {isRequired && <span className="text-danger ml-1">*</span>}
      </div>
      {errorMessage && (
        <div className="text-sm text-danger">{errorMessage}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* เลือกอาคาร */}
        <Select
          isRequired={isRequired}
          label="อาคาร"
          placeholder="เลือกอาคาร"
          selectedKeys={selectedBuildingId ? [selectedBuildingId] : []}
          variant="bordered"
          onSelectionChange={(keys) => {
            const selected = Array.from(keys)[0] as string;
            if (selected) {
              handleBuildingChange(selected);
            }
          }}
        >
          {BUILDINGS.map((building) => (
            <SelectItem key={building.id}>
              {building.name}
            </SelectItem>
          ))}
        </Select>

        {/* เลือกชั้น/หน่วยงาน */}
        <Select
          isRequired={isRequired && !!selectedBuildingId}
          label="ชั้น/หน่วยงาน"
          placeholder="เลือกชั้น/หน่วยงาน"
          isDisabled={!selectedBuildingId}
          selectedKeys={selectedFloorId ? [selectedFloorId] : []}
          variant="bordered"
          onSelectionChange={(keys) => {
            const selected = Array.from(keys)[0] as string;
            if (selected) {
              handleFloorChange(selected);
            }
          }}
        >
          {(selectedBuilding?.floors ?? []).map((floor) => (
            <SelectItem key={floor.id}>
              {floor.name}
            </SelectItem>
          ))}
        </Select>

        {/* เลือกห้อง/เตียง */}
        <Select
          label="ห้อง/เตียง"
          placeholder={
            selectedFloor?.rooms && selectedFloor.rooms.length > 0
              ? "เลือกห้อง/เตียง"
              : "ไม่มีห้อง/เตียง"
          }
          isDisabled={!selectedFloorId || !selectedFloor?.rooms}
          selectedKeys={selectedRoomBedId ? [selectedRoomBedId] : []}
          variant="bordered"
          onSelectionChange={(keys) => {
            const selected = Array.from(keys)[0] as string;
            if (selected) {
              handleRoomBedChange(selected);
            }
          }}
        >
          {(selectedFloor?.rooms ?? []).map((roomBed) => (
            <SelectItem key={roomBed.id}>
              {roomBed.name}
            </SelectItem>
          ))}
        </Select>
      </div>
    </div>
  );
}
