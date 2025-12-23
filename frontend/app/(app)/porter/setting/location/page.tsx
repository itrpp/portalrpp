"use client";

import React, { useState, useEffect, useRef } from "react";
import NextImage from "next/image";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Chip,
  addToast,
  RadioGroup,
  Radio,
  Select,
  SelectItem,
  ScrollShadow,
  Checkbox,
} from "@heroui/react";

import {
  BuildingOfficeIcon,
  MapPinIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
} from "@/components/ui/icons";
import {
  Building,
  FloorDepartment,
  // RoomBed, // เลิกใช้งาน room-beds แล้ว
  getDepartmentTypeName,
  DEPARTMENT_TYPES,
  ROOM_TYPES,
} from "@/types/porter";
import { convertBuildingFromProto } from "@/lib/porter";

/**
 * Modal สำหรับเพิ่ม/แก้ไขอาคาร
 */
interface BuildingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    building: Omit<Building, "floors" | "floorPlans"> & {
      floors?: FloorDepartment[];
      floorPlans?: Array<{
        id?: string;
        floor_number: number;
        image_data: string;
      }>;
    },
  ) => void;
  building?: Building | null;
  isLoading?: boolean;
}

function BuildingModal({
  isOpen,
  onClose,
  onSave,
  building,
  isLoading = false,
}: BuildingModalProps) {
  const [name, setName] = useState("");
  const [floorCount, setFloorCount] = useState<string>("");
  const [status, setStatus] = useState<boolean>(true);
  // เก็บ floor plans เป็น Record เพื่อความสะดวกในการจัดการ (key: floorNumber, value: { id?, imageData })
  const [floorPlans, setFloorPlans] = useState<
    Record<number, { id?: string; imageData: string }>
  >({});
  const [floorPlanPreviews, setFloorPlanPreviews] = useState<
    Record<number, string>
  >({});
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  useEffect(() => {
    if (building) {
      setName(building.name);
      setFloorCount(building.floorCount?.toString() || "");
      setStatus(building.status !== undefined ? building.status : true);

      // แปลง floorPlans array เป็น Record
      const floorPlansRecord: Record<
        number,
        { id?: string; imageData: string }
      > = {};
      const previewsRecord: Record<number, string> = {};

      if (building.floorPlans && Array.isArray(building.floorPlans)) {
        building.floorPlans.forEach((fp) => {
          floorPlansRecord[fp.floorNumber] = {
            id: fp.id,
            imageData: fp.imageData,
          };
          previewsRecord[fp.floorNumber] = fp.imageData;
        });
      }
      setFloorPlans(floorPlansRecord);
      setFloorPlanPreviews(previewsRecord);
    } else {
      setName("");
      setFloorCount("");
      setStatus(true);
      setFloorPlans({});
      setFloorPlanPreviews({});
    }
  }, [building, isOpen]);

  const handleFloorPlanUpload = (
    floorNumber: number,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    // ตรวจสอบประเภทไฟล์
    if (!file.type.startsWith("image/")) {
      addToast({
        title: "ประเภทไฟล์ไม่ถูกต้อง",
        description: "กรุณาเลือกไฟล์รูปภาพเท่านั้น",
        color: "danger",
      });

      return;
    }

    // ตรวจสอบขนาดไฟล์ (สูงสุด 5MB สำหรับ floor plan)
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (file.size > maxSize) {
      addToast({
        title: "ไฟล์ใหญ่เกินไป",
        description: "กรุณาเลือกไฟล์รูปภาพขนาดไม่เกิน 5MB",
        color: "danger",
      });

      return;
    }

    // อ่านไฟล์และ resize ก่อนแปลงเป็น base64
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = document.createElement("img");
      const base64String = e.target?.result as string;

      img.onload = () => {
        // สร้าง canvas เพื่อ resize รูปภาพ
        const canvas = document.createElement("canvas");
        const maxWidth = 2000; // ขนาดสูงสุดสำหรับ floor plan
        const maxHeight = 2000;
        let width = img.width;
        let height = img.height;

        // คำนวณขนาดใหม่โดยคงอัตราส่วน
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // วาดรูปภาพใหม่ที่ resize แล้ว
        const ctx = canvas.getContext("2d");

        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);

          // แปลงเป็น base64 (ใช้ quality 0.85 เพื่อลดขนาด)
          const resizedBase64 = canvas.toDataURL("image/jpeg", 0.85);

          setFloorPlans((prev) => ({
            ...prev,
            [floorNumber]: {
              id: prev[floorNumber]?.id, // เก็บ id เดิมถ้ามี (สำหรับ update)
              imageData: resizedBase64,
            },
          }));
          setFloorPlanPreviews((prev) => ({
            ...prev,
            [floorNumber]: resizedBase64,
          }));
        } else {
          // Fallback: ใช้รูปภาพเดิมถ้าไม่สามารถ resize ได้
          setFloorPlans((prev) => ({
            ...prev,
            [floorNumber]: {
              id: prev[floorNumber]?.id, // เก็บ id เดิมถ้ามี (สำหรับ update)
              imageData: base64String,
            },
          }));
          setFloorPlanPreviews((prev) => ({
            ...prev,
            [floorNumber]: base64String,
          }));
        }
      };

      img.onerror = () => {
        addToast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถโหลดรูปภาพได้",
          color: "danger",
        });
      };

      img.src = base64String;
    };

    reader.onerror = () => {
      addToast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอ่านไฟล์รูปภาพได้",
        color: "danger",
      });
    };

    reader.readAsDataURL(file);
  };

  const handleRemoveFloorPlan = (floorNumber: number) => {
    setFloorPlans((prev) => {
      const newPlans = { ...prev };

      delete newPlans[floorNumber];

      return newPlans;
    });
    setFloorPlanPreviews((prev) => {
      const newPreviews = { ...prev };

      delete newPreviews[floorNumber];

      return newPreviews;
    });

    if (fileInputRefs.current[floorNumber]) {
      fileInputRefs.current[floorNumber]!.value = "";
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      addToast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณากรอกชื่ออาคาร",
        color: "danger",
      });

      return;
    }

    const floorCountNum = floorCount ? parseInt(floorCount, 10) : 0;

    // ไม่บังคับให้อัปโหลด floor plan สำหรับทุกชั้น
    // ผู้ใช้สามารถอัปโหลดได้ตามต้องการ

    try {
      // แปลง floorPlans Record เป็น array สำหรับส่งไป backend
      const floorPlansArray =
        Object.keys(floorPlans).length > 0
          ? Object.entries(floorPlans).map(([floorNumber, data]) => ({
              id: data.id, // ถ้ามี id = update, ถ้าไม่มี = create
              floor_number: parseInt(floorNumber, 10),
              image_data: data.imageData,
            }))
          : undefined;

      await onSave({
        id: building?.id || "", // จะถูกสร้างอัตโนมัติใน handleSaveBuilding
        name: name.trim(),
        floorCount: floorCountNum > 0 ? floorCountNum : undefined,
        floorPlans: floorPlansArray,
        status: status,
        floors: building?.floors || [],
      });
      // ปิด modal เมื่อบันทึกสำเร็จ
      onClose();
    } catch {
      // ถ้าเกิด error ไม่ต้องปิด modal ให้ user แก้ไขข้อมูล
      // Error handling ถูกจัดการใน handleSaveBuilding แล้ว
    }
  };

  return (
    <Modal isOpen={isOpen} scrollBehavior="inside" size="2xl" onClose={onClose}>
      <ModalContent>
        <ModalHeader>{building ? "แก้ไขอาคาร" : "เพิ่มอาคารใหม่"}</ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <Input
              isRequired
              isDisabled={isLoading}
              label="ชื่ออาคาร"
              placeholder="เช่น อาคารสมเด็จพระสังฆราช"
              value={name}
              variant="bordered"
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              classNames={{
                input:
                  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
              }}
              isDisabled={isLoading}
              label="จำนวนชั้น"
              min={1}
              placeholder="เช่น 5"
              type="number"
              value={floorCount}
              variant="bordered"
              onChange={(e) => setFloorCount(e.target.value)}
            />
            {floorCount && parseInt(floorCount, 10) > 0 && (
              <div className="space-y-3">
                <div className="text-sm font-medium text-foreground">
                  รูป Floor Plan ของแต่ละชั้น
                </div>
                <div className="text-xs text-default-500 mb-2">
                  สามารถอัปโหลดรูป floor plan ได้ตามต้องการ (ไม่บังคับ)
                </div>
                <ScrollShadow className="max-h-[400px]">
                  <div className="space-y-3">
                    {Array.from(
                      { length: parseInt(floorCount, 10) },
                      (_, i) => {
                        const floorNum = i + 1;
                        const preview = floorPlanPreviews[floorNum];

                        return (
                          <div
                            key={floorNum}
                            className="p-3 border border-default-200 rounded-lg space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-foreground">
                                ชั้น {floorNum}
                              </span>
                              {preview && (
                                <Button
                                  isIconOnly
                                  color="danger"
                                  size="sm"
                                  variant="light"
                                  onPress={() =>
                                    handleRemoveFloorPlan(floorNum)
                                  }
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                            {preview ? (
                              <div className="relative w-full aspect-video">
                                <NextImage
                                  fill
                                  alt={`Floor plan ชั้น ${floorNum}`}
                                  className="rounded-lg border border-default-200 object-contain"
                                  sizes="(max-width: 768px) 100vw, 50vw"
                                  src={preview}
                                />
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <input
                                  ref={(el) => {
                                    fileInputRefs.current[floorNum] = el;
                                  }}
                                  accept="image/*"
                                  className="hidden"
                                  disabled={isLoading}
                                  type="file"
                                  onChange={(e) =>
                                    handleFloorPlanUpload(floorNum, e)
                                  }
                                />
                                <Button
                                  color="default"
                                  isDisabled={isLoading}
                                  size="sm"
                                  variant="bordered"
                                  onPress={() =>
                                    fileInputRefs.current[floorNum]?.click()
                                  }
                                >
                                  อัปโหลดรูป Floor Plan
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      },
                    )}
                  </div>
                </ScrollShadow>
              </div>
            )}
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">
                สถานะการใช้งาน
              </div>
              <div className="text-xs text-default-500">
                เปิดใช้งานเมื่อต้องการให้อาคารนี้สามารถเลือกใช้ได้
              </div>
              <Checkbox
                isDisabled={isLoading}
                isSelected={status}
                onValueChange={setStatus}
              >
                ใช้งาน
              </Checkbox>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={onClose}>
            ยกเลิก
          </Button>
          <Button color="primary" onPress={handleSave}>
            บันทึก
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

/**
 * Modal สำหรับเพิ่ม/แก้ไขคลีนิก/หอผู้ป่วย
 */
interface FloorDepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (floor: FloorDepartment) => void;
  floor?: FloorDepartment | null;
  buildingId: string;
  building?: Building | null; // เพิ่ม building เพื่อดึงข้อมูล floorCount
  isLoading?: boolean;
}

function FloorDepartmentModal({
  isOpen,
  onClose,
  onSave,
  floor,
  buildingId: _buildingId,
  building,
  isLoading = false,
}: FloorDepartmentModalProps) {
  const [name, setName] = useState("");
  const [floorNumber, setFloorNumber] = useState<string>("");
  const [departmentTypeId, setDepartmentTypeId] = useState<number>(1); // 1 = "คลินิก"
  const [roomTypeId, setRoomTypeId] = useState<number>(1); // 1 = "ห้องรวม"
  const [roomCount, setRoomCount] = useState<string>("");
  const [bedCount, setBedCount] = useState<string>("");
  const [status, setStatus] = useState<boolean>(true);

  // สร้างรายการชั้นจากจำนวนชั้นของอาคาร
  const floorOptions = building?.floorCount
    ? Array.from({ length: building.floorCount }, (_, i) => ({
        key: (i + 1).toString(),
        value: `ชั้น ${i + 1}`,
      }))
    : [];

  useEffect(() => {
    if (floor) {
      setName(floor.name);
      setFloorNumber(floor.floorNumber?.toString() || "");
      setDepartmentTypeId(floor.departmentType || 1);
      setRoomTypeId(floor.roomType || 1);
      setRoomCount(floor.roomCount?.toString() || "");
      setBedCount(floor.bedCount?.toString() || "");
      setStatus(floor.status !== undefined ? floor.status : true);
    } else {
      setName("");
      setFloorNumber("");
      setDepartmentTypeId(1);
      setRoomTypeId(1);
      setRoomCount("");
      setBedCount("");
      setStatus(true);
    }
  }, [floor, isOpen]);

  const handleSave = async () => {
    if (!name.trim()) {
      addToast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณากรอกชื่อคลีนิก/หอผู้ป่วย",
        color: "danger",
      });

      return;
    }

    // Validate หอผู้ป่วย
    if (departmentTypeId === 2) {
      // 2 = "หอผู้ป่วย"
      if (!roomTypeId) {
        addToast({
          title: "ข้อมูลไม่ครบถ้วน",
          description: "กรุณาเลือกประเภทห้องพัก",
          color: "danger",
        });

        return;
      }

      // ตรวจสอบจำนวนห้อง/เตียงตามประเภท
      if (roomTypeId === 1 || roomTypeId === 3) {
        // 1 = "ห้องรวม", 3 = "ห้องรวมและห้องพิเศษ"
        const bedCountNum = parseInt(bedCount, 10);

        if (!bedCount || isNaN(bedCountNum) || bedCountNum <= 0) {
          addToast({
            title: "ข้อมูลไม่ครบถ้วน",
            description: "กรุณาระบุจำนวนเตียงห้องรวม",
            color: "danger",
          });

          return;
        }
      }

      if (roomTypeId === 2 || roomTypeId === 3) {
        // 2 = "ห้องพิเศษ", 3 = "ห้องรวมและห้องพิเศษ"
        const roomCountNum = parseInt(roomCount, 10);

        if (!roomCount || isNaN(roomCountNum) || roomCountNum <= 0) {
          addToast({
            title: "ข้อมูลไม่ครบถ้วน",
            description: "กรุณาระบุจำนวนห้องพิเศษ",
            color: "danger",
          });

          return;
        }
      }
    }

    const floorData: FloorDepartment = {
      id: floor?.id || "", // จะถูกสร้างอัตโนมัติใน handleSaveFloor
      name: name.trim(),
      floorNumber: floorNumber ? parseInt(floorNumber, 10) : undefined,
      departmentType: departmentTypeId,
      roomType: departmentTypeId === 2 ? roomTypeId : undefined,
      roomCount:
        departmentTypeId === 2 && (roomTypeId === 2 || roomTypeId === 3)
          ? parseInt(roomCount, 10)
          : undefined,
      bedCount:
        departmentTypeId === 2 && (roomTypeId === 1 || roomTypeId === 3)
          ? parseInt(bedCount, 10)
          : undefined,
      status: status,
      rooms: floor?.rooms || undefined,
    };

    try {
      await onSave(floorData);
      // ปิด modal เมื่อบันทึกสำเร็จ
      onClose();
    } catch {
      // ถ้าเกิด error ไม่ต้องปิด modal ให้ user แก้ไขข้อมูล
      // Error handling ถูกจัดการใน handleSaveFloor แล้ว
    }
  };

  return (
    <Modal isOpen={isOpen} size="lg" onClose={onClose}>
      <ModalContent>
        <ModalHeader>
          {floor ? "แก้ไขคลีนิก/หอผู้ป่วย" : "เพิ่มคลีนิก/หอผู้ป่วยใหม่"}
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            {building?.floorCount && building.floorCount > 1 && (
              <Select
                isRequired
                color="default"
                isDisabled={isLoading}
                label="ชั้น"
                placeholder="เลือกชั้น"
                selectedKeys={floorNumber ? new Set([floorNumber]) : new Set()}
                variant="bordered"
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as string;

                  setFloorNumber(selected || "");
                }}
              >
                {floorOptions.map((floor) => (
                  <SelectItem key={floor.key}>{floor.value}</SelectItem>
                ))}
              </Select>
            )}
            <Input
              isRequired
              color="default"
              isDisabled={isLoading}
              label="ชื่อคลีนิก/หอผู้ป่วย"
              placeholder="เช่น ชั้น 4 หอผู้ป่วยพิเศษพรีเมียม"
              value={name}
              variant="bordered"
              onChange={(e) => setName(e.target.value)}
            />

            <div>
              <div className="text-sm font-medium text-foreground mb-2">
                ประเภทหน่วยงาน
                <span className="text-danger ml-1">*</span>
              </div>
              <RadioGroup
                isRequired
                isDisabled={isLoading}
                orientation="horizontal"
                value={departmentTypeId.toString()}
                onValueChange={(val) => {
                  const id = parseInt(val, 10);

                  setDepartmentTypeId(id);
                  // Reset room type และจำนวนเมื่อเปลี่ยนประเภท
                  if (id === 1) {
                    // 1 = "คลินิก"
                    setRoomTypeId(1);
                    setRoomCount("");
                    setBedCount("");
                  }
                }}
              >
                {Object.entries(DEPARTMENT_TYPES).map(([id, name]) => (
                  <Radio key={id} value={id}>
                    {name}
                  </Radio>
                ))}
              </RadioGroup>
            </div>

            {departmentTypeId === 2 && (
              // 2 = "หอผู้ป่วย"
              <>
                <div>
                  <div className="text-sm font-medium text-foreground mb-2">
                    ประเภทห้องพัก
                    <span className="text-danger ml-1">*</span>
                  </div>
                  <RadioGroup
                    isRequired
                    isDisabled={isLoading}
                    orientation="horizontal"
                    value={roomTypeId.toString()}
                    onValueChange={(val) => {
                      const id = parseInt(val, 10);

                      setRoomTypeId(id);
                      // Reset จำนวนเมื่อเปลี่ยนประเภทห้องพัก
                      if (id === 1) {
                        // 1 = "ห้องรวม" - ต้องลบจำนวนห้องพิเศษออก
                        setRoomCount("");
                      } else if (id === 2) {
                        // 2 = "ห้องพิเศษ" - ต้องลบจำนวนเตียงห้องรวมออก
                        setBedCount("");
                      }
                      // id === 3 = "ห้องรวมและห้องพิเศษ" - ไม่ต้อง reset อะไร
                    }}
                  >
                    {Object.entries(ROOM_TYPES).map(([id, name]) => (
                      <Radio key={id} value={id}>
                        {name}
                      </Radio>
                    ))}
                  </RadioGroup>
                </div>

                {(roomTypeId === 1 || roomTypeId === 3) && (
                  // 1 = "ห้องรวม", 3 = "ห้องรวมและห้องพิเศษ"
                  <Input
                    isRequired
                    classNames={{
                      input:
                        "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                    }}
                    isDisabled={isLoading}
                    label="จำนวนเตียงห้องรวม"
                    min={1}
                    placeholder="เช่น 35 เตียง"
                    type="number"
                    value={bedCount}
                    variant="bordered"
                    onChange={(e) => setBedCount(e.target.value)}
                  />
                )}

                {(roomTypeId === 2 || roomTypeId === 3) && (
                  // 2 = "ห้องพิเศษ", 3 = "ห้องรวมและห้องพิเศษ"
                  <Input
                    isRequired
                    classNames={{
                      input:
                        "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                    }}
                    isDisabled={isLoading}
                    label="จำนวนห้องพิเศษ"
                    min={1}
                    placeholder="เช่น 15"
                    type="number"
                    value={roomCount}
                    variant="bordered"
                    onChange={(e) => setRoomCount(e.target.value)}
                  />
                )}
              </>
            )}
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">
                สถานะการใช้งาน
              </div>
              <div className="text-xs text-default-500">
                เปิดใช้งานเมื่อต้องการให้คลีนิก/หอผู้ป่วยนี้สามารถเลือกใช้ได้
              </div>
              <Checkbox
                isDisabled={isLoading}
                isSelected={status}
                onValueChange={setStatus}
              >
                ใช้งาน
              </Checkbox>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button isDisabled={isLoading} variant="flat" onPress={onClose}>
            ยกเลิก
          </Button>
          <Button
            color="primary"
            isDisabled={isLoading}
            isLoading={isLoading}
            onPress={handleSave}
          >
            บันทึก
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default function LocationSettingsPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingBuilding, setIsSavingBuilding] = useState(false);
  const [isDeletingBuilding, setIsDeletingBuilding] = useState<string | null>(
    null,
  );
  const [isSavingFloor, setIsSavingFloor] = useState(false);
  const [isDeletingFloor, setIsDeletingFloor] = useState<string | null>(null);
  // const [isSavingRoomBed, setIsSavingRoomBed] = useState(false); // เลิกใช้งาน room-beds แล้ว
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(
    null,
  );
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(
    null,
  );
  // const [selectedFloor] = useState<FloorDepartment | null>(null); // เลิกใช้งาน room-beds แล้ว

  // Fetch buildings from API
  useEffect(() => {
    const fetchBuildings = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/porter/buildings");
        const result = await response.json();

        if (result.success && result.data) {
          const convertedBuildings = result.data.map((b: any) =>
            convertBuildingFromProto(b),
          );

          setBuildings(convertedBuildings);
        } else {
          addToast({
            title: "เกิดข้อผิดพลาด",
            description: result.message || "ไม่สามารถดึงข้อมูลได้",
            color: "danger",
          });
        }
      } catch {
        addToast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถดึงข้อมูลอาคารได้",
          color: "danger",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchBuildings();
  }, []);

  // Modals
  const {
    isOpen: isBuildingModalOpen,
    onOpen: onBuildingModalOpen,
    onClose: onBuildingModalClose,
  } = useDisclosure();
  const {
    isOpen: isFloorModalOpen,
    onOpen: onFloorModalOpen,
    onClose: onFloorModalClose,
  } = useDisclosure();

  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [editingFloor, setEditingFloor] = useState<FloorDepartment | null>(
    null,
  );

  // จัดการอาคาร
  const handleAddBuilding = () => {
    setEditingBuilding(null);
    onBuildingModalOpen();
  };

  const handleEditBuilding = async (building: Building) => {
    try {
      // ดึง building ใหม่จาก API เพื่อให้ได้ floorPlans ครบถ้วน
      // เพราะ listBuildings exclude floorPlans ออกเพื่อลด memory usage
      const response = await fetch(`/api/porter/buildings/${building.id}`);
      const result = await response.json();

      if (result.success && result.data) {
        const fullBuilding = convertBuildingFromProto(result.data);

        setEditingBuilding(fullBuilding);
        onBuildingModalOpen();
      } else {
        // ถ้าดึงข้อมูลไม่ได้ ให้ใช้ building จาก list แทน
        setEditingBuilding(building);
        onBuildingModalOpen();
        addToast({
          title: "คำเตือน",
          description:
            "ไม่สามารถดึงข้อมูล floor plans ได้ ใช้ข้อมูลจากรายการแทน",
          color: "warning",
        });
      }
    } catch {
      // ถ้าเกิด error ให้ใช้ building จาก list แทน
      setEditingBuilding(building);
      onBuildingModalOpen();
      addToast({
        title: "คำเตือน",
        description: "ไม่สามารถดึงข้อมูล floor plans ได้ ใช้ข้อมูลจากรายการแทน",
        color: "warning",
      });
    }
  };

  const handleDeleteBuilding = async (buildingId: string) => {
    if (
      !confirm(
        "คุณแน่ใจหรือไม่ว่าต้องการลบอาคารนี้? การลบจะทำให้ข้อมูลคลีนิก/หอผู้ป่วยและห้อง/เตียงทั้งหมดถูกลบด้วย",
      )
    ) {
      return;
    }

    try {
      setIsDeletingBuilding(buildingId);
      const response = await fetch(`/api/porter/buildings/${buildingId}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (result.success) {
        setBuildings((prev) => prev.filter((b) => b.id !== buildingId));
        if (selectedBuildingId === buildingId) {
          setSelectedBuildingId(null);
          setSelectedBuilding(null);
        }
        addToast({
          title: "ลบอาคารสำเร็จ",
          description: "อาคารถูกลบออกจากระบบแล้ว",
          color: "success",
        });
      } else {
        addToast({
          title: "เกิดข้อผิดพลาด",
          description: result.message || "ไม่สามารถลบอาคารได้",
          color: "danger",
        });
      }
    } catch {
      addToast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบอาคารได้",
        color: "danger",
      });
    } finally {
      setIsDeletingBuilding(null);
    }
  };

  const handleSaveBuilding = async (
    buildingData: Omit<Building, "floors" | "floorPlans"> & {
      floors?: FloorDepartment[];
      floorPlans?: Array<{
        id?: string;
        floor_number: number;
        image_data: string;
      }>;
    },
  ) => {
    try {
      setIsSavingBuilding(true);
      if (editingBuilding) {
        // แก้ไขอาคาร
        const response = await fetch(
          `/api/porter/buildings/${editingBuilding.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
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
            title: "แก้ไขอาคารสำเร็จ",
            description: "ข้อมูลอาคารถูกอัปเดตแล้ว",
            color: "success",
          });
        } else {
          addToast({
            title: "เกิดข้อผิดพลาด",
            description: result.message || "ไม่สามารถแก้ไขอาคารได้",
            color: "danger",
          });
          throw new Error(result.message || "ไม่สามารถแก้ไขอาคารได้");
        }
      } else {
        // เพิ่มอาคารใหม่ (ไม่ต้องระบุ id - ให้ backend สร้าง cuid อัตโนมัติ)
        const requestBody: any = { name: buildingData.name };

        if (buildingData.floorCount !== undefined) {
          requestBody.floorCount = buildingData.floorCount;
        }
        if (buildingData.floorPlans !== undefined) {
          requestBody.floorPlans = buildingData.floorPlans;
        }
        if (buildingData.status !== undefined) {
          requestBody.status = buildingData.status;
        }

        const response = await fetch("/api/porter/buildings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });
        const result = await response.json();

        if (result.success && result.data) {
          const newBuilding = convertBuildingFromProto(result.data);

          setBuildings((prev) => [...prev, newBuilding]);
          addToast({
            title: "เพิ่มอาคารสำเร็จ",
            description: "อาคารใหม่ถูกเพิ่มเข้าไปในระบบแล้ว",
            color: "success",
          });
        } else {
          addToast({
            title: "เกิดข้อผิดพลาด",
            description: result.message || "ไม่สามารถเพิ่มอาคารได้",
            color: "danger",
          });
          throw new Error(result.message || "ไม่สามารถเพิ่มอาคารได้");
        }
      }
      setEditingBuilding(null);
    } catch (error) {
      addToast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกอาคารได้",
        color: "danger",
      });
      throw error; // Re-throw เพื่อให้ modal ไม่ปิด
    } finally {
      setIsSavingBuilding(false);
    }
  };

  // เมื่อเลือกอาคาร
  const handleSelectBuilding = (building: Building) => {
    setSelectedBuildingId(building.id);
    setSelectedBuilding(building);
  };

  // อัปเดต selectedBuilding เมื่อ buildings เปลี่ยน
  useEffect(() => {
    if (selectedBuildingId) {
      const building = buildings.find((b) => b.id === selectedBuildingId);

      if (building) {
        // เพื่อให้ข้อมูล sync กับข้อมูลล่าสุด
        setSelectedBuilding(building);
      } else {
        // ถ้าไม่เจอ building ให้ clear selection
        setSelectedBuildingId(null);
        setSelectedBuilding(null);
      }
    }
  }, [buildings, selectedBuildingId]);

  // จัดการคลีนิก/หอผู้ป่วย
  const handleAddFloor = (building: Building) => {
    setSelectedBuilding(building);
    setSelectedBuildingId(building.id);
    setEditingFloor(null);
    onFloorModalOpen();
  };

  const handleEditFloor = (building: Building, floor: FloorDepartment) => {
    setSelectedBuilding(building);
    setSelectedBuildingId(building.id);
    setEditingFloor(floor);
    onFloorModalOpen();
  };

  const handleDeleteFloor = async (buildingId: string, floorId: string) => {
    if (
      !confirm(
        "คุณแน่ใจหรือไม่ว่าต้องการลบคลีนิก/หอผู้ป่วยนี้? การลบจะทำให้ข้อมูลห้อง/เตียงทั้งหมดถูกลบด้วย",
      )
    ) {
      return;
    }

    try {
      setIsDeletingFloor(floorId);
      const response = await fetch(`/api/porter/floor-departments/${floorId}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (result.success) {
        // Refresh buildings to get updated data
        const buildingsResponse = await fetch("/api/porter/buildings");
        const buildingsResult = await buildingsResponse.json();

        if (buildingsResult.success && buildingsResult.data) {
          const convertedBuildings = buildingsResult.data.map((b: any) =>
            convertBuildingFromProto(b),
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
          title: "ลบคลีนิก/หอผู้ป่วยสำเร็จ",
          description: "คลีนิก/หอผู้ป่วยถูกลบออกจากระบบแล้ว",
          color: "success",
        });
      } else {
        addToast({
          title: "เกิดข้อผิดพลาด",
          description: result.message || "ไม่สามารถลบคลีนิก/หอผู้ป่วยได้",
          color: "danger",
        });
      }
    } catch {
      addToast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบคลีนิก/หอผู้ป่วยได้",
        color: "danger",
      });
    } finally {
      setIsDeletingFloor(null);
    }
  };

  const handleSaveFloor = async (floorData: FloorDepartment) => {
    if (!selectedBuilding) return;

    try {
      setIsSavingFloor(true);
      if (editingFloor) {
        // แก้ไขคลีนิก/หอผู้ป่วย
        // ส่ง null สำหรับค่าที่ต้องลบออก (แทน undefined)
        const requestBody: any = {
          name: floorData.name,
          floorNumber: floorData.floorNumber,
          departmentType: floorData.departmentType,
          roomType: floorData.roomType,
          status: floorData.status,
        };

        // ส่ง roomCount เป็น null ถ้าไม่ใช้ (เพื่อให้ backend ลบค่าเก่าออก)
        if (floorData.roomCount !== undefined) {
          requestBody.roomCount = floorData.roomCount;
        } else if (floorData.departmentType === 2) {
          // ถ้าเป็นหอผู้ป่วย แต่ roomCount เป็น undefined ให้ส่ง null เพื่อลบค่าเก่า
          requestBody.roomCount = null;
        }

        // ส่ง bedCount เป็น null ถ้าไม่ใช้ (เพื่อให้ backend ลบค่าเก่าออก)
        if (floorData.bedCount !== undefined) {
          requestBody.bedCount = floorData.bedCount;
        } else if (floorData.departmentType === 2) {
          // ถ้าเป็นหอผู้ป่วย แต่ bedCount เป็น undefined ให้ส่ง null เพื่อลบค่าเก่า
          requestBody.bedCount = null;
        }

        const response = await fetch(
          `/api/porter/floor-departments/${editingFloor.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
          },
        );
        const result = await response.json();

        if (result.success) {
          // Refresh buildings to get updated data
          const buildingsResponse = await fetch("/api/porter/buildings");
          const buildingsResult = await buildingsResponse.json();

          if (buildingsResult.success && buildingsResult.data) {
            const convertedBuildings = buildingsResult.data.map((b: any) =>
              convertBuildingFromProto(b),
            );

            setBuildings(convertedBuildings);
            // อัปเดต selectedBuilding โดยใช้ selectedBuildingId เพื่อให้แน่ใจว่า sync
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
            title: "แก้ไขคลีนิก/หอผู้ป่วยสำเร็จ",
            description: "ข้อมูลคลีนิก/หอผู้ป่วยถูกอัปเดตแล้ว",
            color: "success",
          });
        } else {
          addToast({
            title: "เกิดข้อผิดพลาด",
            description: result.message || "ไม่สามารถแก้ไขคลีนิก/หอผู้ป่วยได้",
            color: "danger",
          });
          throw new Error(
            result.message || "ไม่สามารถแก้ไขคลีนิก/หอผู้ป่วยได้",
          );
        }
      } else {
        // เพิ่มคลีนิก/หอผู้ป่วยใหม่
        const requestBody: any = {
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

        // ไม่ต้องระบุ id - ให้ backend สร้าง cuid อัตโนมัติ

        const response = await fetch("/api/porter/floor-departments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });
        const result = await response.json();

        if (result.success) {
          // Refresh buildings to get updated data
          const buildingsResponse = await fetch("/api/porter/buildings");
          const buildingsResult = await buildingsResponse.json();

          if (buildingsResult.success && buildingsResult.data) {
            const convertedBuildings = buildingsResult.data.map((b: any) =>
              convertBuildingFromProto(b),
            );

            setBuildings(convertedBuildings);
            // อัปเดต selectedBuilding โดยใช้ selectedBuildingId เพื่อให้แน่ใจว่า sync
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
            title: "เพิ่มคลีนิก/หอผู้ป่วยสำเร็จ",
            description: "คลีนิก/หอผู้ป่วยใหม่ถูกเพิ่มเข้าไปในระบบแล้ว",
            color: "success",
          });
        } else {
          addToast({
            title: "เกิดข้อผิดพลาด",
            description: result.message || "ไม่สามารถเพิ่มคลีนิก/หอผู้ป่วยได้",
            color: "danger",
          });
          throw new Error(
            result.message || "ไม่สามารถเพิ่มคลีนิก/หอผู้ป่วยได้",
          );
        }
      }
      // ไม่ต้อง setSelectedBuilding(null) เพื่อให้ Column 2 ยังแสดงข้อมูล
      setEditingFloor(null);
    } catch (error) {
      addToast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกคลีนิก/หอผู้ป่วยได้",
        color: "danger",
      });
      throw error; // Re-throw เพื่อให้ modal ไม่ปิด
    } finally {
      setIsSavingFloor(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <MapPinIcon className="w-8 h-8 text-primary" />
            ตั้งค่าสถานที่รับ - ส่ง
          </h1>
          <p className="text-default-600 mt-2">
            จัดการข้อมูลอาคาร, คลีนิก/หอผู้ป่วย, และห้อง/เตียงสำหรับระบบ Porter
          </p>
        </div>
        <Button
          color="primary"
          isDisabled={isLoading || isSavingBuilding}
          startContent={<PlusIcon className="w-5 h-5" />}
          onPress={handleAddBuilding}
        >
          เพิ่มอาคาร
        </Button>
      </div>

      {/* 2 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column 1: รายการอาคาร */}
        <Card className="shadow-lg border border-default-200">
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <BuildingOfficeIcon className="w-6 h-6 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">
                  รายการอาคาร
                </h2>
              </div>
            </div>
          </CardHeader>
          <CardBody className="pt-4">
            {isLoading ? (
              <div className="text-center py-8 text-default-500">
                <p>กำลังโหลดข้อมูล...</p>
              </div>
            ) : (
              <ScrollShadow className="h-[600px]">
                <div className="space-y-2 pb-2">
                  {buildings.map((building) => (
                    <div
                      key={building.id}
                      className={`cursor-pointer transition-all border rounded-lg ${
                        selectedBuildingId === building.id
                          ? "border-primary bg-primary-50 dark:bg-primary-900/20"
                          : "border-default-200 hover:border-primary-300"
                      }`}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectBuilding(building)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleSelectBuilding(building);
                        }
                      }}
                    >
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <BuildingOfficeIcon
                                className={`w-5 h-5 ${
                                  selectedBuildingId === building.id
                                    ? "text-primary"
                                    : "text-default-500"
                                }`}
                              />
                              <span
                                className={`font-medium ${
                                  selectedBuildingId === building.id
                                    ? "text-primary"
                                    : "text-foreground"
                                }`}
                              >
                                {building.name}
                              </span>
                              <Chip
                                color={building.status ? "success" : "default"}
                                size="sm"
                                variant="flat"
                              >
                                {building.status ? "ใช้งาน" : "ไม่ใช้งาน"}
                              </Chip>
                            </div>
                          </div>
                          <div className="flex gap-1" role="group">
                            <Button
                              isIconOnly
                              color="primary"
                              isDisabled={
                                isDeletingBuilding === building.id ||
                                isSavingBuilding
                              }
                              size="sm"
                              variant="light"
                              onPress={() => handleEditBuilding(building)}
                            >
                              <PencilIcon className="w-4 h-4" />
                            </Button>
                            <Button
                              isIconOnly
                              color="danger"
                              isDisabled={isDeletingBuilding === building.id}
                              isLoading={isDeletingBuilding === building.id}
                              size="sm"
                              variant="light"
                              onPress={() => handleDeleteBuilding(building.id)}
                            >
                              <TrashIcon className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {buildings.length === 0 && (
                    <div className="text-center py-8 text-default-500">
                      <BuildingOfficeIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>ยังไม่มีข้อมูลอาคาร</p>
                      <p className="text-sm">
                        คลิกปุ่ม &quot;เพิ่มอาคาร&quot; เพื่อเพิ่มข้อมูล
                      </p>
                    </div>
                  )}
                </div>
              </ScrollShadow>
            )}
          </CardBody>
        </Card>

        {/* Column 2: รายการคลีนิก/หอผู้ป่วยภายในอาคาร */}
        <Card className="shadow-lg border border-default-200">
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <MapPinIcon className="w-6 h-6 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">
                  {selectedBuilding ? `รายการ คลีนิก/หอผู้ป่วย` : "เลือกอาคาร"}
                </h2>
                {selectedBuilding && (
                  <Chip color="secondary" size="sm" variant="flat">
                    {selectedBuilding.floors.reduce((total, floor) => {
                      if (floor.departmentType === 2) {
                        // 2 = "หอผู้ป่วย"
                        const roomCount = floor.roomCount || 0;
                        const bedCount = floor.bedCount || 0;

                        return total + roomCount + bedCount;
                      }

                      return total;
                    }, 0)}{" "}
                    เตียง
                  </Chip>
                )}
              </div>
              {selectedBuilding && (
                <Button
                  color="success"
                  isDisabled={isSavingFloor || isDeletingFloor !== null}
                  size="sm"
                  startContent={<PlusIcon className="w-4 h-4" />}
                  variant="flat"
                  onPress={() => handleAddFloor(selectedBuilding)}
                >
                  เพิ่มคลีนิก/หอผู้ป่วย
                </Button>
              )}
            </div>
          </CardHeader>
          <CardBody className="pt-4">
            {selectedBuilding ? (
              <ScrollShadow className="h-[600px]">
                <div className="space-y-2 pb-2">
                  {[...selectedBuilding.floors]
                    .sort((a, b) => {
                      // เรียงตาม floorNumber จากมากไปน้อย
                      // ถ้า floorNumber เป็น null หรือ undefined ให้อยู่ท้ายสุด
                      const aFloor = a.floorNumber ?? -1;
                      const bFloor = b.floorNumber ?? -1;

                      return bFloor - aFloor;
                    })
                    .map((floor) => (
                      <div
                        key={floor.id}
                        className="flex items-center justify-between p-3 border border-default-200 rounded-lg hover:bg-default-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <MapPinIcon className="w-4 h-4 text-default-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {floor.floorNumber && (
                                <span className="text-sm font-medium">
                                  ชั้น {floor.floorNumber}
                                </span>
                              )}
                              <span className="font-medium text-sm text-foreground">
                                {floor.name}
                              </span>
                              <Chip
                                color={
                                  floor.departmentType === 2
                                    ? "primary"
                                    : "secondary"
                                }
                                size="sm"
                                variant="flat"
                              >
                                {getDepartmentTypeName(floor.departmentType) ||
                                  "คลินิก"}
                              </Chip>
                              <Chip
                                color={floor.status ? "success" : "default"}
                                size="sm"
                                variant="flat"
                              >
                                {floor.status ? "ใช้งาน" : "ไม่ใช้งาน"}
                              </Chip>
                              {floor.departmentType === 2 && (
                                // 2 = "หอผู้ป่วย"
                                <span className="text-xs text-default-500">
                                  {floor.roomCount && floor.bedCount
                                    ? `ห้องรวม ${floor.bedCount} เตียง, ${floor.roomCount} ห้องพิเศษ`
                                    : floor.bedCount
                                      ? `ห้องรวม ${floor.bedCount} เตียง`
                                      : floor.roomCount
                                        ? `${floor.roomCount} ห้องพิเศษ`
                                        : ""}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            isIconOnly
                            color="primary"
                            isDisabled={
                              isDeletingFloor === floor.id || isSavingFloor
                            }
                            size="sm"
                            variant="light"
                            onPress={() =>
                              handleEditFloor(selectedBuilding, floor)
                            }
                          >
                            <PencilIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            isIconOnly
                            color="danger"
                            isDisabled={isDeletingFloor === floor.id}
                            isLoading={isDeletingFloor === floor.id}
                            size="sm"
                            variant="light"
                            onPress={() =>
                              handleDeleteFloor(selectedBuilding.id, floor.id)
                            }
                          >
                            <TrashIcon className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  {selectedBuilding.floors.length === 0 && (
                    <div className="text-center py-8 text-default-500">
                      <MapPinIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>ยังไม่มีข้อมูลคลีนิก/หอผู้ป่วย</p>
                      <p className="text-sm">
                        คลิกปุ่ม &quot;เพิ่มคลีนิก/หอผู้ป่วย&quot;
                        เพื่อเพิ่มข้อมูล
                      </p>
                    </div>
                  )}
                </div>
              </ScrollShadow>
            ) : (
              <div className="text-center py-12 text-default-500">
                <BuildingOfficeIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">กรุณาเลือกอาคาร</p>
                <p className="text-sm">
                  เลือกอาคารจากคอลัมน์ซ้ายเพื่อดูรายการคลีนิก/หอผู้ป่วย
                </p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Modals */}
      <BuildingModal
        building={editingBuilding}
        isLoading={isSavingBuilding}
        isOpen={isBuildingModalOpen}
        onClose={() => {
          onBuildingModalClose();
          setEditingBuilding(null);
        }}
        onSave={handleSaveBuilding}
      />

      <FloorDepartmentModal
        building={selectedBuilding}
        buildingId={selectedBuilding?.id || ""}
        floor={editingFloor}
        isLoading={isSavingFloor}
        isOpen={isFloorModalOpen}
        onClose={() => {
          onFloorModalClose();
          // ไม่ต้อง setSelectedBuilding(null) เพื่อให้ Column 2 ยังแสดงข้อมูล
          setEditingFloor(null);
        }}
        onSave={handleSaveFloor}
      />

      {/* เลิกใช้งาน room-beds API แล้ว */}
      {/* <RoomBedModal
        floorId={selectedFloor?.id || ""}
        isLoading={isSavingRoomBed}
        isOpen={isRoomBedModalOpen}
        roomBed={editingRoomBed}
        onClose={() => {
          onRoomBedModalClose();
          // ไม่ต้อง setSelectedBuilding(null) และ setSelectedFloor(null) เพื่อให้ Column 2 ยังแสดงข้อมูล
          setEditingRoomBed(null);
        }}
        onSave={handleSaveRoomBed}
      /> */}
    </div>
  );
}
