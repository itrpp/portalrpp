'use client';

import type { Building, FloorDepartment } from '@/types/porter';

import { useState, useEffect, useCallback } from 'react';
import { addToast } from '@heroui/react';

import { convertBuildingFromProto } from '@/lib/porter';

export type BuildingSavePayload = Omit<
  Building,
  'floors' | 'floorPlans'
> & {
  floors?: FloorDepartment[];
  floorPlans?: Array<{
    id?: string;
    floor_number: number;
    image_data: string;
  }>;
};

export function useBuildings() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingBuilding, setIsSavingBuilding] = useState(false);
  const [isDeletingBuilding, setIsDeletingBuilding] = useState<string | null>(
    null,
  );
  const [isSavingFloor, setIsSavingFloor] = useState(false);
  const [isDeletingFloor, setIsDeletingFloor] = useState<string | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(
    null,
  );
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(
    null,
  );
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [editingFloor, setEditingFloor] = useState<FloorDepartment | null>(null);

  const fetchBuildings = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/porter/buildings');
      const result = await response.json();

      if (result.success && result.data) {
        const convertedBuildings = result.data.map((b: unknown) =>
          convertBuildingFromProto(b),
        );

        setBuildings(convertedBuildings);
      } else {
        addToast({
          title: 'เกิดข้อผิดพลาด',
          description: result.message || 'ไม่สามารถดึงข้อมูลได้',
          color: 'danger',
        });
      }
    } catch {
      addToast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถดึงข้อมูลอาคารได้',
        color: 'danger',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBuildings();
  }, [fetchBuildings]);

  useEffect(() => {
    if (selectedBuildingId) {
      const building = buildings.find((b) => b.id === selectedBuildingId);

      if (building) {
        setSelectedBuilding(building);
      } else {
        setSelectedBuildingId(null);
        setSelectedBuilding(null);
      }
    }
  }, [buildings, selectedBuildingId]);

  const handleEditBuilding = useCallback(async (building: Building) => {
    try {
      const response = await fetch(`/api/porter/buildings/${building.id}`);
      const result = await response.json();

      if (result.success && result.data) {
        const fullBuilding = convertBuildingFromProto(result.data);

        setEditingBuilding(fullBuilding);
      } else {
        setEditingBuilding(building);
        addToast({
          title: 'คำเตือน',
          description:
            'ไม่สามารถดึงข้อมูล floor plans ได้ ใช้ข้อมูลจากรายการแทน',
          color: 'warning',
        });
      }
    } catch {
      setEditingBuilding(building);
      addToast({
        title: 'คำเตือน',
        description:
          'ไม่สามารถดึงข้อมูล floor plans ได้ ใช้ข้อมูลจากรายการแทน',
        color: 'warning',
      });
    }
  }, []);

  const handleDeleteBuilding = useCallback(
    async (buildingId: string) => {
      if (
        !confirm(
          'คุณแน่ใจหรือไม่ว่าต้องการลบอาคารนี้? การลบจะทำให้ข้อมูลคลีนิก/หอผู้ป่วยและห้อง/เตียงทั้งหมดถูกลบด้วย',
        )
      ) {
        return;
      }

      try {
        setIsDeletingBuilding(buildingId);
        const response = await fetch(`/api/porter/buildings/${buildingId}`, {
          method: 'DELETE',
        });
        const result = await response.json();

        if (result.success) {
          setBuildings((prev) => prev.filter((b) => b.id !== buildingId));
          if (selectedBuildingId === buildingId) {
            setSelectedBuildingId(null);
            setSelectedBuilding(null);
          }
          addToast({
            title: 'ลบอาคารสำเร็จ',
            description: 'อาคารถูกลบออกจากระบบแล้ว',
            color: 'success',
          });
        } else {
          addToast({
            title: 'เกิดข้อผิดพลาด',
            description: result.message || 'ไม่สามารถลบอาคารได้',
            color: 'danger',
          });
        }
      } catch {
        addToast({
          title: 'เกิดข้อผิดพลาด',
          description: 'ไม่สามารถลบอาคารได้',
          color: 'danger',
        });
      } finally {
        setIsDeletingBuilding(null);
      }
    },
    [selectedBuildingId],
  );

  const handleSaveBuilding = useCallback(
    async (buildingData: BuildingSavePayload) => {
      try {
        setIsSavingBuilding(true);

        if (editingBuilding) {
          const response = await fetch(
            `/api/porter/buildings/${editingBuilding.id}`,
            {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: buildingData.name,
                floorCount: buildingData.floorCount,
                floorPlans: buildingData.floorPlans,
                status: buildingData.status,
              }),
            },
          );
          const result = await response.json();

          if (result.success && result.data) {
            const updatedBuilding = convertBuildingFromProto(result.data);

            setBuildings((prev) =>
              prev.map((b) =>
                b.id === editingBuilding.id ? updatedBuilding : b,
              ),
            );
            if (selectedBuildingId === editingBuilding.id) {
              setSelectedBuilding(updatedBuilding);
            }
            addToast({
              title: 'แก้ไขอาคารสำเร็จ',
              description: 'ข้อมูลอาคารถูกอัปเดตแล้ว',
              color: 'success',
            });
          } else {
            addToast({
              title: 'เกิดข้อผิดพลาด',
              description:
                result.message || 'ไม่สามารถแก้ไขอาคารได้',
              color: 'danger',
            });
            throw new Error(
              result.message || 'ไม่สามารถแก้ไขอาคารได้',
            );
          }
        } else {
          const requestBody: Record<string, unknown> = {
            name: buildingData.name,
          };

          if (buildingData.floorCount !== undefined) {
            requestBody.floorCount = buildingData.floorCount;
          }
          if (buildingData.floorPlans !== undefined) {
            requestBody.floorPlans = buildingData.floorPlans;
          }
          if (buildingData.status !== undefined) {
            requestBody.status = buildingData.status;
          }

          const response = await fetch('/api/porter/buildings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          });
          const result = await response.json();

          if (result.success && result.data) {
            const newBuilding = convertBuildingFromProto(result.data);

            setBuildings((prev) => [...prev, newBuilding]);
            addToast({
              title: 'เพิ่มอาคารสำเร็จ',
              description: 'อาคารใหม่ถูกเพิ่มเข้าไปในระบบแล้ว',
              color: 'success',
            });
          } else {
            addToast({
              title: 'เกิดข้อผิดพลาด',
              description:
                result.message || 'ไม่สามารถเพิ่มอาคารได้',
              color: 'danger',
            });
            throw new Error(
              result.message || 'ไม่สามารถเพิ่มอาคารได้',
            );
          }
        }

        setEditingBuilding(null);
      } catch (error) {
        addToast({
          title: 'เกิดข้อผิดพลาด',
          description: 'ไม่สามารถบันทึกอาคารได้',
          color: 'danger',
        });
        throw error;
      } finally {
        setIsSavingBuilding(false);
      }
    },
    [editingBuilding, selectedBuildingId],
  );

  const handleSelectBuilding = useCallback((building: Building) => {
    setSelectedBuildingId(building.id);
    setSelectedBuilding(building);
  }, []);

  const handleAddFloor = useCallback(
    (building: Building) => {
      setSelectedBuilding(building);
      setSelectedBuildingId(building.id);
      setEditingFloor(null);
    },
    [],
  );

  const handleEditFloor = useCallback(
    (building: Building, floor: FloorDepartment) => {
      setSelectedBuilding(building);
      setSelectedBuildingId(building.id);
      setEditingFloor(floor);
    },
    [],
  );

  const handleDeleteFloor = useCallback(
    async (buildingId: string, floorId: string) => {
      if (
        !confirm(
          'คุณแน่ใจหรือไม่ว่าต้องการลบคลีนิก/หอผู้ป่วยนี้? การลบจะทำให้ข้อมูลห้อง/เตียงทั้งหมดถูกลบด้วย',
        )
      ) {
        return;
      }

      try {
        setIsDeletingFloor(floorId);
        const response = await fetch(
          `/api/porter/floor-departments/${floorId}`,
          {
            method: 'DELETE',
          },
        );
        const result = await response.json();

        if (result.success) {
          const buildingsResponse = await fetch('/api/porter/buildings');
          const buildingsResult = await buildingsResponse.json();

          if (buildingsResult.success && buildingsResult.data) {
            const convertedBuildings = buildingsResult.data.map(
              (b: unknown) => convertBuildingFromProto(b),
            );

            setBuildings(convertedBuildings);
            if (selectedBuildingId === buildingId) {
              const updatedBuilding = convertedBuildings.find(
                (b: Building) => b.id === buildingId,
              );

              setSelectedBuilding(updatedBuilding || null);
            }
          }
          addToast({
            title: 'ลบคลีนิก/หอผู้ป่วยสำเร็จ',
            description: 'คลีนิก/หอผู้ป่วยถูกลบออกจากระบบแล้ว',
            color: 'success',
          });
        } else {
          addToast({
            title: 'เกิดข้อผิดพลาด',
            description:
              result.message || 'ไม่สามารถลบคลีนิก/หอผู้ป่วยได้',
            color: 'danger',
          });
        }
      } catch {
        addToast({
          title: 'เกิดข้อผิดพลาด',
          description: 'ไม่สามารถลบคลีนิก/หอผู้ป่วยได้',
          color: 'danger',
        });
      } finally {
        setIsDeletingFloor(null);
      }
    },
    [selectedBuildingId],
  );

  const handleSaveFloor = useCallback(
    async (floorData: FloorDepartment) => {
      if (!selectedBuilding) return;

      try {
        setIsSavingFloor(true);

        if (editingFloor) {
          const requestBody: Record<string, unknown> = {
            name: floorData.name,
            floorNumber: floorData.floorNumber,
            departmentType: floorData.departmentType,
            roomType: floorData.roomType,
            status: floorData.status,
          };

          if (floorData.roomCount !== undefined) {
            requestBody.roomCount = floorData.roomCount;
          } else if (floorData.departmentType === 2) {
            requestBody.roomCount = null;
          }

          if (floorData.bedCount !== undefined) {
            requestBody.bedCount = floorData.bedCount;
          } else if (floorData.departmentType === 2) {
            requestBody.bedCount = null;
          }

          const response = await fetch(
            `/api/porter/floor-departments/${editingFloor.id}`,
            {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestBody),
            },
          );
          const result = await response.json();

          if (result.success) {
            const buildingsResponse = await fetch('/api/porter/buildings');
            const buildingsResult = await buildingsResponse.json();

            if (buildingsResult.success && buildingsResult.data) {
              const convertedBuildings = buildingsResult.data.map(
                (b: unknown) => convertBuildingFromProto(b),
              );

              setBuildings(convertedBuildings);
              if (selectedBuildingId) {
                const updatedBuilding = convertedBuildings.find(
                  (b: Building) => b.id === selectedBuildingId,
                );

                if (updatedBuilding) {
                  setSelectedBuilding(updatedBuilding);
                }
              }
            }
            addToast({
              title: 'แก้ไขคลีนิก/หอผู้ป่วยสำเร็จ',
              description: 'ข้อมูลคลีนิก/หอผู้ป่วยถูกอัปเดตแล้ว',
              color: 'success',
            });
          } else {
            addToast({
              title: 'เกิดข้อผิดพลาด',
              description:
                result.message || 'ไม่สามารถแก้ไขคลีนิก/หอผู้ป่วยได้',
              color: 'danger',
            });
            throw new Error(
              result.message || 'ไม่สามารถแก้ไขคลีนิก/หอผู้ป่วยได้',
            );
          }
        } else {
          const requestBody: Record<string, unknown> = {
            name: floorData.name,
            buildingId: selectedBuilding.id,
            departmentType: floorData.departmentType,
            status: floorData.status,
          };

          if (floorData.floorNumber !== undefined) {
            requestBody.floorNumber = floorData.floorNumber;
          }
          if (floorData.roomType) {
            requestBody.roomType = floorData.roomType;
          }
          if (floorData.roomCount !== undefined) {
            requestBody.roomCount = floorData.roomCount;
          }
          if (floorData.bedCount !== undefined) {
            requestBody.bedCount = floorData.bedCount;
          }

          const response = await fetch('/api/porter/floor-departments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          });
          const result = await response.json();

          if (result.success) {
            const buildingsResponse = await fetch('/api/porter/buildings');
            const buildingsResult = await buildingsResponse.json();

            if (buildingsResult.success && buildingsResult.data) {
              const convertedBuildings = buildingsResult.data.map(
                (b: unknown) => convertBuildingFromProto(b),
              );

              setBuildings(convertedBuildings);
              if (selectedBuildingId) {
                const updatedBuilding = convertedBuildings.find(
                  (b: Building) => b.id === selectedBuildingId,
                );

                if (updatedBuilding) {
                  setSelectedBuilding(updatedBuilding);
                }
              }
            }
            addToast({
              title: 'เพิ่มคลีนิก/หอผู้ป่วยสำเร็จ',
              description:
                'คลีนิก/หอผู้ป่วยใหม่ถูกเพิ่มเข้าไปในระบบแล้ว',
              color: 'success',
            });
          } else {
            addToast({
              title: 'เกิดข้อผิดพลาด',
              description:
                result.message || 'ไม่สามารถเพิ่มคลีนิก/หอผู้ป่วยได้',
              color: 'danger',
            });
            throw new Error(
              result.message || 'ไม่สามารถเพิ่มคลีนิก/หอผู้ป่วยได้',
            );
          }
        }

        setEditingFloor(null);
      } catch (error) {
        addToast({
          title: 'เกิดข้อผิดพลาด',
          description: 'ไม่สามารถบันทึกคลีนิก/หอผู้ป่วยได้',
          color: 'danger',
        });
        throw error;
      } finally {
        setIsSavingFloor(false);
      }
    },
    [
      selectedBuilding,
      editingFloor,
      selectedBuildingId,
    ],
  );

  return {
    buildings,
    isLoading,
    isSavingBuilding,
    isDeletingBuilding,
    isSavingFloor,
    isDeletingFloor,
    selectedBuildingId,
    selectedBuilding,
    editingBuilding,
    setEditingBuilding,
    editingFloor,
    setEditingFloor,
    handleEditBuilding,
    handleDeleteBuilding,
    handleSaveBuilding,
    handleSelectBuilding,
    handleAddFloor,
    handleEditFloor,
    handleDeleteFloor,
    handleSaveFloor,
  };
}
