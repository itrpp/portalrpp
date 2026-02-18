'use client';

import type { Building, FloorDepartment } from '@/types/porter';

import React, { useState, useEffect, useRef } from 'react';
import NextImage from 'next/image';
import {
  Button,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  addToast,
  ScrollShadow,
  Checkbox,
} from '@heroui/react';

import { TrashIcon } from '@/components/ui/icons';

export interface BuildingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    building: Omit<Building, 'floors' | 'floorPlans'> & {
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

export function BuildingModal({
  isOpen,
  onClose,
  onSave,
  building,
  isLoading = false,
}: BuildingModalProps) {
  const [name, setName] = useState('');
  const [floorCount, setFloorCount] = useState<string>('');
  const [status, setStatus] = useState<boolean>(true);
  const [floorPlans, setFloorPlans] = useState<
    Record<number, { id?: string; imageData: string }>
  >({});
  const [floorPlanPreviews, setFloorPlanPreviews] =
    useState<Record<number, string>>({});
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  useEffect(() => {
    if (building) {
      setName(building.name);
      setFloorCount(building.floorCount?.toString() || '');
      setStatus(building.status !== undefined ? building.status : true);

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
      setName('');
      setFloorCount('');
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

    if (!file.type.startsWith('image/')) {
      addToast({
        title: 'ประเภทไฟล์ไม่ถูกต้อง',
        description: 'กรุณาเลือกไฟล์รูปภาพเท่านั้น',
        color: 'danger',
      });

      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB

    if (file.size > maxSize) {
      addToast({
        title: 'ไฟล์ใหญ่เกินไป',
        description: 'กรุณาเลือกไฟล์รูปภาพขนาดไม่เกิน 5MB',
        color: 'danger',
      });

      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      const img = document.createElement('img');
      const base64String = e.target?.result as string;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxWidth = 2000;
        const maxHeight = 2000;
        let width = img.width;
        let height = img.height;

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

        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const resizedBase64 = canvas.toDataURL('image/jpeg', 0.85);

          setFloorPlans((prev) => ({
            ...prev,
            [floorNumber]: {
              id: prev[floorNumber]?.id,
              imageData: resizedBase64,
            },
          }));
          setFloorPlanPreviews((prev) => ({
            ...prev,
            [floorNumber]: resizedBase64,
          }));
        } else {
          setFloorPlans((prev) => ({
            ...prev,
            [floorNumber]: {
              id: prev[floorNumber]?.id,
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
          title: 'เกิดข้อผิดพลาด',
          description: 'ไม่สามารถโหลดรูปภาพได้',
          color: 'danger',
        });
      };

      img.src = base64String;
    };

    reader.onerror = () => {
      addToast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถอ่านไฟล์รูปภาพได้',
        color: 'danger',
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
      fileInputRefs.current[floorNumber]!.value = '';
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      addToast({
        title: 'ข้อมูลไม่ครบถ้วน',
        description: 'กรุณากรอกชื่ออาคาร',
        color: 'danger',
      });

      return;
    }

    const floorCountNum = floorCount ? parseInt(floorCount, 10) : 0;

    try {
      const floorPlansArray =
        Object.keys(floorPlans).length > 0
          ? Object.entries(floorPlans).map(([floorNumber, data]) => ({
              id: data.id,
              floor_number: parseInt(floorNumber, 10),
              image_data: data.imageData,
            }))
          : undefined;

      await onSave({
        id: building?.id || '',
        name: name.trim(),
        floorCount: floorCountNum > 0 ? floorCountNum : undefined,
        floorPlans: floorPlansArray,
        status: status,
        floors: building?.floors || [],
      });
      onClose();
    } catch {
      // Error handling ถูกจัดการใน handleSaveBuilding แล้ว
    }
  };

  return (
    <Modal isOpen={isOpen} scrollBehavior="inside" size="2xl" onClose={onClose}>
      <ModalContent>
        <ModalHeader>{building ? 'แก้ไขอาคาร' : 'เพิ่มอาคารใหม่'}</ModalHeader>
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
                  '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
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
