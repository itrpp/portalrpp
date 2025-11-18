"use client";

import React, { useEffect, useState } from "react";
import { Select, SelectItem } from "@heroui/react";

import {
  Building,
  FloorDepartment,
  RoomBed,
  DetailedLocation,
} from "@/types/porter";
import {
  convertBuildingFromProto,
  convertFloorDepartmentFromProto,
} from "@/lib/porter";

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
}: LocationSelectorProps) {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<FloorDepartment[]>([]);
  const [roomBeds, setRoomBeds] = useState<RoomBed[]>([]);
  const [isLoadingBuildings, setIsLoadingBuildings] = useState(true);
  const [isLoadingFloors, setIsLoadingFloors] = useState(false);
  const [isLoadingRoomBeds, setIsLoadingRoomBeds] = useState(false);

  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(
    value?.buildingId || "",
  );
  const [selectedFloorId, setSelectedFloorId] = useState<string>(
    value?.floorDepartmentId || "",
  );
  const [selectedRoomBedId, setSelectedRoomBedId] = useState<string>(
    value?.roomBedId || "",
  );

  // ดึงข้อมูลอาคารทั้งหมด
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

  // ดึงข้อมูลชั้น/หน่วยงานเมื่อเลือกอาคาร
  useEffect(() => {
    if (!selectedBuildingId) {
      setFloors([]);
      setRoomBeds([]);

      return;
    }

    const fetchFloors = async () => {
      try {
        setIsLoadingFloors(true);
        const response = await fetch(
          `/api/porter/floor-departments?building_id=${selectedBuildingId}`,
        );
        const result = await response.json();

        if (result.success && result.data) {
          const convertedFloors = result.data
            .map((f: any) => convertFloorDepartmentFromProto(f))
            .filter((floor: FloorDepartment) => floor.status === true);

          setFloors(convertedFloors);
        }
      } catch (error) {
        console.error("Error fetching floor departments:", error);
      } finally {
        setIsLoadingFloors(false);
      }
    };

    fetchFloors();
  }, [selectedBuildingId]);

  // Generate รายการห้อง/เตียงจาก roomCount และ bedCount ของ FloorDepartment
  useEffect(() => {
    if (!selectedFloorId) {
      setRoomBeds([]);

      return;
    }

    const generateRoomBeds = () => {
      try {
        setIsLoadingRoomBeds(true);

        // หา FloorDepartment ที่เลือก
        const selectedFloor = floors.find((f) => f.id === selectedFloorId);

        if (!selectedFloor) {
          setRoomBeds([]);
          setIsLoadingRoomBeds(false);

          return;
        }

        const generatedRoomBeds: RoomBed[] = [];

        // Generate รายการห้องจาก roomCount
        if (selectedFloor.roomCount && selectedFloor.roomCount > 0) {
          for (let i = 1; i <= selectedFloor.roomCount; i++) {
            generatedRoomBeds.push({
              id: `${selectedFloorId}-room-${i}`,
              name: `ห้องพิเศษ ${i}`,
            });
          }
        }

        // Generate รายการเตียงจาก bedCount
        if (selectedFloor.bedCount && selectedFloor.bedCount > 0) {
          for (let i = 1; i <= selectedFloor.bedCount; i++) {
            generatedRoomBeds.push({
              id: `${selectedFloorId}-bed-${i}`,
              name: `เตียง ${i}`,
            });
          }
        }

        setRoomBeds(generatedRoomBeds);
      } catch (error) {
        console.error("Error generating room beds:", error);
        setRoomBeds([]);
      } finally {
        setIsLoadingRoomBeds(false);
      }
    };

    generateRoomBeds();
  }, [selectedFloorId, floors]);

  // เมื่อเลือกอาคาร
  const handleBuildingChange = (buildingId: string) => {
    setSelectedBuildingId(buildingId);
    setSelectedFloorId("");
    setSelectedRoomBedId("");
    setFloors([]);
    setRoomBeds([]);
    onChange(null);
  };

  // เมื่อเลือกชั้น/หน่วยงาน
  const handleFloorChange = (floorId: string) => {
    setSelectedFloorId(floorId);
    setSelectedRoomBedId("");
    setRoomBeds([]);
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
    const building = buildings.find((b) => b.id === buildingId);
    const floor = floors.find((f) => f.id === floorId);
    const roomBed = roomBeds.find((r) => r.id === roomBedId);

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
  useEffect(() => {
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
      <div className="text-sm font-medium text-foreground">{label}</div>
      {errorMessage && (
        <div className="text-sm text-danger">{errorMessage}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* เลือกอาคาร */}
        <Select
          isDisabled={isDisabled}
          isLoading={isLoadingBuildings}
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
          {buildings.map((building) => (
            <SelectItem key={building.id}>{building.name}</SelectItem>
          ))}
        </Select>

        {/* เลือกชั้น/หน่วยงาน */}
        <Select
          isDisabled={isDisabled || !selectedBuildingId}
          isLoading={isLoadingFloors}
          isRequired={isRequired && !!selectedBuildingId}
          label="ชั้น/หน่วยงาน"
          placeholder="เลือกชั้น/หน่วยงาน"
          selectedKeys={selectedFloorId ? [selectedFloorId] : []}
          variant="bordered"
          onSelectionChange={(keys) => {
            const selected = Array.from(keys)[0] as string;

            if (selected) {
              handleFloorChange(selected);
            }
          }}
        >
          {floors.map((floor) => {
            // สร้างชื่อที่แสดง โดยรวมชั้นและชื่อหน่วยงาน
            const displayName = floor.floorNumber
              ? `ชั้น ${floor.floorNumber} - ${floor.name}`
              : floor.name;

            return <SelectItem key={floor.id}>{displayName}</SelectItem>;
          })}
        </Select>

        {/* เลือกห้อง/เตียง */}
        <Select
          isDisabled={isDisabled || !selectedFloorId || roomBeds.length === 0}
          isLoading={isLoadingRoomBeds}
          label="ห้อง/เตียง"
          placeholder={
            roomBeds.length > 0 ? "เลือกห้อง/เตียง" : "ไม่มีห้อง/เตียง"
          }
          selectedKeys={selectedRoomBedId ? [selectedRoomBedId] : []}
          variant="bordered"
          onSelectionChange={(keys) => {
            const selected = Array.from(keys)[0] as string;

            if (selected) {
              handleRoomBedChange(selected);
            }
          }}
        >
          {roomBeds.map((roomBed) => (
            <SelectItem key={roomBed.id}>{roomBed.name}</SelectItem>
          ))}
        </Select>
      </div>
    </div>
  );
}
