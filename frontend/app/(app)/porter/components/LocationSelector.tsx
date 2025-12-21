"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Select, SelectItem } from "@heroui/react";

import {
  Building,
  FloorDepartment,
  RoomBed,
  DetailedLocation,
} from "@/types/porter";
import { convertBuildingFromProto } from "@/lib/porter";

/**
 * Props สำหรับ LocationSelector
 */
interface LocationSelectorProps {
  label: string;
  value: DetailedLocation | null;
  onChange: (location: DetailedLocation | null) => void;
  errorMessage?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  showOnlyBeds?: boolean; // แสดงเฉพาะเตียง (สำหรับสถานที่รับ)
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
  isDisabled = false,
  showOnlyBeds = false,
}: LocationSelectorProps) {
  // Data State
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<FloorDepartment[]>([]);
  const [roomBeds, setRoomBeds] = useState<RoomBed[]>([]);

  // Loading State
  const [isLoadingBuildings, setIsLoadingBuildings] = useState(false);

  // Selection State
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>("");
  const [selectedFloorId, setSelectedFloorId] = useState<string>("");
  const [selectedRoomBed, setSelectedRoomBed] = useState<string>("");

  // Check if selected building is "โรงพยาบาลอื่น"
  const isOtherHospital = useMemo(() => {
    const building = buildings.find((b) => b.id === selectedBuildingId);

    return building?.name === "โรงพยาบาลอื่น";
  }, [buildings, selectedBuildingId]);

  // Check if selected floor is "หอผู้ป่วย" (departmentType === 2)
  const isWard = useMemo(() => {
    const floor = floors.find((f) => f.id === selectedFloorId);

    return floor?.departmentType === 2;
  }, [floors, selectedFloorId]);

  // Sync state with value prop
  useEffect(() => {
    if (value) {
      setSelectedBuildingId(value.buildingId);
      // Only set floor if it exists (handle optional floor for Other Hospital)
      setSelectedFloorId(value.floorDepartmentId || "");
    } else {
      setSelectedBuildingId("");
      setSelectedFloorId("");
      setSelectedRoomBed("");
    }
  }, [value]);

  // Sync room bed selection when roomBeds are ready and we have a value
  useEffect(() => {
    if (value?.roomBedName && roomBeds.length > 0) {
      const found = roomBeds.find((r) => r.name === value.roomBedName);

      if (found) {
        setSelectedRoomBed(found.id);
      }
    }
  }, [roomBeds, value?.roomBedName]);

  // Fetch buildings on mount
  useEffect(() => {
    const fetchBuildings = async () => {
      try {
        setIsLoadingBuildings(true);
        const response = await fetch("/api/porter/buildings");
        const result = await response.json();

        if (result.success && result.data) {
          const convertedBuildings = result.data
            .map((b: any) => convertBuildingFromProto(b))
            .filter((building: Building) => building.status === true);

          setBuildings(convertedBuildings);
        }
      } catch (error) {
        console.error("Error fetching buildings:", error);
      } finally {
        setIsLoadingBuildings(false);
      }
    };

    fetchBuildings();
  }, []);

  // Update floors when building changes or buildings load
  useEffect(() => {
    if (!selectedBuildingId || buildings.length === 0) {
      setFloors([]);

      return;
    }

    const selectedBuilding = buildings.find((b) => b.id === selectedBuildingId);

    if (selectedBuilding) {
      // Filter active floors
      const activeFloors = selectedBuilding.floors.filter(
        (f) => f.status === true,
      );

      setFloors(activeFloors);
    } else {
      setFloors([]);
    }
  }, [selectedBuildingId, buildings]);

  // Generate room/beds based on selected floor (เฉพาะหอผู้ป่วย)
  useEffect(() => {
    if (!selectedFloorId || !floors.length) {
      setRoomBeds([]);

      return;
    }

    const selectedFloor = floors.find((f) => f.id === selectedFloorId);

    if (!selectedFloor) {
      setRoomBeds([]);

      return;
    }

    // แสดงห้อง/เตียงเฉพาะเมื่อเป็นหอผู้ป่วย (departmentType === 2)
    if (selectedFloor.departmentType !== 2) {
      setRoomBeds([]);

      return;
    }

    const generated: RoomBed[] = [];

    // ถ้า showOnlyBeds === true ให้แสดงเฉพาะเตียง
    if (showOnlyBeds) {
      // Generate beds only
      if (selectedFloor.bedCount && selectedFloor.bedCount > 0) {
        for (let i = 1; i <= selectedFloor.bedCount; i++) {
          generated.push({
            id: `${selectedFloorId}-bed-${i}`,
            name: `เตียง ${i}`,
          });
        }
      }
    } else {
      // Generate rooms
      if (selectedFloor.roomCount && selectedFloor.roomCount > 0) {
        for (let i = 1; i <= selectedFloor.roomCount; i++) {
          generated.push({
            id: `${selectedFloorId}-room-${i}`,
            name: `ห้องพิเศษ ${i}`,
          });
        }
      }

      // Generate beds
      if (selectedFloor.bedCount && selectedFloor.bedCount > 0) {
        for (let i = 1; i <= selectedFloor.bedCount; i++) {
          generated.push({
            id: `${selectedFloorId}-bed-${i}`,
            name: `เตียง ${i}`,
          });
        }
      }
    }

    setRoomBeds(generated);
  }, [selectedFloorId, floors, showOnlyBeds]);

  // Helper to update parent
  const updateLocation = useCallback(
    (buildingId: string, floorId: string, roomBedId: string) => {
      const building = buildings.find((b) => b.id === buildingId);
      const floor = floors.find((f) => f.id === floorId);

      let roomBedName: string | undefined;

      // ส่ง roomBedName เฉพาะเมื่อเป็นหอผู้ป่วย (departmentType === 2)
      if (roomBedId && floor && floor.departmentType === 2) {
        if (roomBedId.includes("-room-")) {
          const num = roomBedId.split("-room-")[1];

          roomBedName = `ห้องพิเศษ ${num}`;
        } else if (roomBedId.includes("-bed-")) {
          const num = roomBedId.split("-bed-")[1];

          roomBedName = `เตียง ${num}`;
        }
      }

      if (building) {
        // Case 1: Normal building with floor selected
        if (floor) {
          const location: DetailedLocation = {
            buildingId: building.id,
            buildingName: building.name,
            floorDepartmentId: floor.id,
            floorDepartmentName: floor.name,
            roomBedName: roomBedName, // จะเป็น undefined ถ้าไม่ใช่หอผู้ป่วย
          };

          onChange(location);

          return;
        }

        // Case 2: "Other Hospital" (no floor required)
        if (building.name === "โรงพยาบาลอื่น") {
          const location: DetailedLocation = {
            buildingId: building.id,
            buildingName: building.name,
            // No floor/room for other hospital
          };

          onChange(location);

          return;
        }
      }

      // Default: incomplete selection
      onChange(null);
    },
    [buildings, floors, onChange],
  );

  // Handlers
  const handleBuildingChange = (keys: any) => {
    const buildingId = Array.from(keys)[0] as string;

    if (!buildingId) return;

    setSelectedBuildingId(buildingId);
    setSelectedFloorId("");
    setSelectedRoomBed("");

    // Check if "Other Hospital" immediately to update parent
    const building = buildings.find((b) => b.id === buildingId);

    if (building && building.name === "โรงพยาบาลอื่น") {
      const location: DetailedLocation = {
        buildingId: building.id,
        buildingName: building.name,
      };

      onChange(location);
    } else {
      onChange(null);
    }
  };

  const handleFloorChange = (keys: any) => {
    const floorId = Array.from(keys)[0] as string;

    if (!floorId) return;

    setSelectedFloorId(floorId);
    setSelectedRoomBed("");

    updateLocation(selectedBuildingId, floorId, "");
  };

  const handleRoomBedChange = (keys: any) => {
    const roomBedName = Array.from(keys)[0] as string;

    if (!roomBedName) return;

    setSelectedRoomBed(roomBedName);
    updateLocation(selectedBuildingId, selectedFloorId, roomBedName);
  };

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-foreground">{label}</div>
      {errorMessage && (
        <div className="text-sm text-danger">{errorMessage}</div>
      )}

      <div
        className={`grid gap-3 ${
          isWard ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2"
        }`}
      >
        {/* เลือกอาคาร */}
        <Select
          isDisabled={isDisabled}
          isLoading={isLoadingBuildings}
          isRequired={isRequired}
          label="อาคาร"
          placeholder="เลือกอาคาร"
          selectedKeys={selectedBuildingId ? [selectedBuildingId] : []}
          variant="bordered"
          onSelectionChange={handleBuildingChange}
        >
          {buildings.map((building) => (
            <SelectItem key={building.id}>{building.name}</SelectItem>
          ))}
        </Select>

        {/* เลือกชั้น/หน่วยงาน */}
        <Select
          isDisabled={
            isDisabled || !selectedBuildingId || (isOtherHospital as boolean)
          }
          isRequired={
            isRequired && !!selectedBuildingId && !(isOtherHospital as boolean)
          }
          label="ชั้น/หน่วยงาน"
          placeholder={
            isOtherHospital ? "ไม่ระบุ (โรงพยาบาลอื่น)" : "เลือกชั้น/หน่วยงาน"
          }
          selectedKeys={selectedFloorId ? [selectedFloorId] : []}
          variant="bordered"
          onSelectionChange={handleFloorChange}
        >
          {floors.map((floor) => {
            const displayName = floor.floorNumber
              ? `ชั้น ${floor.floorNumber} - ${floor.name}`
              : floor.name;

            return <SelectItem key={floor.id}>{displayName}</SelectItem>;
          })}
        </Select>

        {/* เลือกห้อง/เตียง (แสดงเฉพาะหอผู้ป่วย) */}
        {isWard && (
          <Select
            isDisabled={
              isDisabled ||
              !selectedFloorId ||
              roomBeds.length === 0 ||
              (isOtherHospital as boolean)
            }
            isRequired={isRequired && roomBeds.length > 0}
            label="ห้อง/เตียง"
            placeholder={
              roomBeds.length > 0 ? "เลือกห้อง/เตียง" : "ไม่มีห้อง/เตียง"
            }
            selectedKeys={selectedRoomBed ? [selectedRoomBed] : []}
            variant="bordered"
            onSelectionChange={handleRoomBedChange}
          >
            {roomBeds.map((roomBed) => (
              <SelectItem key={roomBed.id}>{roomBed.name}</SelectItem>
            ))}
          </Select>
        )}
      </div>
    </div>
  );
}
