"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Autocomplete,
  AutocompleteItem,
  Checkbox,
  Avatar,
  addToast,
} from "@heroui/react";

import ImagePreviewModal from "./ImagePreviewModal";

import { EmploymentType, Position, PorterEmployee } from "@/types/porter";

/**
 * Props สำหรับ EmployeeModal
 */
interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (employee: Omit<PorterEmployee, "id"> & { id?: string }) => void;
  employee?: PorterEmployee | null;
  isLoading?: boolean;
  employmentTypes: EmploymentType[];
  positions: Position[];
}

/**
 * Modal สำหรับเพิ่ม/แก้ไขเจ้าหน้าที่เปล
 */
export default function EmployeeModal({
  isOpen,
  onClose,
  onSave,
  employee,
  isLoading = false,
  employmentTypes,
  positions,
}: EmployeeModalProps) {
  const [citizenId, setCitizenId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nickname, setNickname] = useState("");
  const [profileImage, setProfileImage] = useState<string>("");
  const [profileImagePreview, setProfileImagePreview] = useState<string>("");
  const [employmentTypeId, setEmploymentTypeId] = useState<string>("");
  const [positionId, setPositionId] = useState<string>("");
  const [status, setStatus] = useState(true);
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (employee) {
      setCitizenId(employee.citizenId);
      setFirstName(employee.firstName);
      setLastName(employee.lastName);
      setNickname(employee.nickname || "");
      setProfileImage(employee.profileImage || "");
      setProfileImagePreview(employee.profileImage || "");
      // แปลง ID เป็น string สำหรับ Select component
      setEmploymentTypeId(String(employee.employmentTypeId ?? ""));
      setPositionId(String(employee.positionId ?? ""));
      setStatus(employee.status);
    } else {
      setCitizenId("");
      setFirstName("");
      setLastName("");
      setNickname("");
      setProfileImage("");
      setProfileImagePreview("");
      // ตั้งค่า default จากรายการแรก (hrd APIs ไม่มี status field)
      const defaultEmploymentType = employmentTypes[0];
      const defaultPosition = positions[0];

      setEmploymentTypeId(
        defaultEmploymentType ? String(defaultEmploymentType.id) : "",
      );
      setPositionId(defaultPosition ? String(defaultPosition.id) : "");
      setStatus(true);
    }
  }, [employee, isOpen, employmentTypes, positions]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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

    // ตรวจสอบขนาดไฟล์ (สูงสุด 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (file.size > maxSize) {
      addToast({
        title: "ไฟล์ใหญ่เกินไป",
        description: "กรุณาเลือกไฟล์รูปภาพขนาดไม่เกิน 10MB",
        color: "danger",
      });

      return;
    }

    // อ่านไฟล์และ resize ก่อนแปลงเป็น base64
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      const base64String = e.target?.result as string;

      img.onload = () => {
        // สร้าง canvas เพื่อ resize รูปภาพ
        const canvas = document.createElement("canvas");
        const maxWidth = 800; // ขนาดสูงสุดสำหรับ profile image
        const maxHeight = 800;
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

          setProfileImage(resizedBase64);
          setProfileImagePreview(resizedBase64);
        } else {
          // Fallback: ใช้รูปภาพเดิมถ้าไม่สามารถ resize ได้
          setProfileImage(base64String);
          setProfileImagePreview(base64String);
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

  const handleRemoveImage = () => {
    setProfileImage("");
    setProfileImagePreview("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImageClick = () => {
    if (profileImagePreview) {
      setIsImagePreviewOpen(true);
    }
  };

  const handleSave = async () => {
    // Validate citizenId (ต้องเป็น 13 หลัก)
    if (!citizenId.trim()) {
      addToast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณากรอกเลขบัตรประชาชน",
        color: "danger",
      });

      return;
    }

    if (!/^\d{13}$/.test(citizenId.trim())) {
      addToast({
        title: "ข้อมูลไม่ถูกต้อง",
        description: "เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก",
        color: "danger",
      });

      return;
    }

    if (!firstName.trim()) {
      addToast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณากรอกชื่อ",
        color: "danger",
      });

      return;
    }

    if (!lastName.trim()) {
      addToast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณากรอกนามสกุล",
        color: "danger",
      });

      return;
    }

    if (!employmentTypeId) {
      addToast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณาเลือกประเภทการจ้าง",
        color: "danger",
      });

      return;
    }

    if (!positionId) {
      addToast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณาเลือกตำแหน่ง",
        color: "danger",
      });

      return;
    }

    try {
      await onSave({
        id: employee?.id,
        citizenId: citizenId.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        nickname: nickname.trim() || undefined,
        // ส่ง null ถ้าไม่มีรูปภาพ (empty string) เพื่อให้ backend ลบออกจาก database
        profileImage:
          profileImage && profileImage.trim() !== ""
            ? profileImage
            : (null as string | null),
        employmentType: "", // จะถูก populate จาก backend
        employmentTypeId,
        position: "", // จะถูก populate จาก backend
        positionId,
        status,
      });
      onClose();
    } catch {
      // Error handling ถูกจัดการใน handleSaveEmployee แล้ว
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} size="lg" onClose={onClose}>
        <ModalContent>
          <ModalHeader>
            {employee ? "แก้ไขเจ้าหน้าที่เปล" : "เพิ่มเจ้าหน้าที่เปลใหม่"}
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-foreground">
                  รูปภาพโปรไฟล์
                </div>
                <div className="flex items-center gap-4">
                  {profileImagePreview ? (
                    <div className="relative">
                      <div
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        role="button"
                        tabIndex={0}
                        onClick={handleImageClick}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleImageClick();
                          }
                        }}
                      >
                        <Avatar
                          alt={`${firstName} ${lastName}`}
                          className="w-20 h-20"
                          src={profileImagePreview}
                        />
                      </div>
                      <Button
                        isIconOnly
                        className="absolute -top-2 -right-2 min-w-0 w-6 h-6"
                        color="danger"
                        size="sm"
                        variant="solid"
                        onPress={handleRemoveImage}
                      >
                        ×
                      </Button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-default-200 flex items-center justify-center">
                      <span className="text-default-400 text-xs">ไม่มีรูป</span>
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <input
                      ref={fileInputRef}
                      accept="image/*"
                      className="hidden"
                      disabled={isLoading}
                      type="file"
                      onChange={handleImageUpload}
                    />
                    <Button
                      color="default"
                      isDisabled={isLoading}
                      size="sm"
                      variant="bordered"
                      onPress={() => fileInputRef.current?.click()}
                    >
                      {profileImagePreview ? "เปลี่ยนรูปภาพ" : "อัปโหลดรูปภาพ"}
                    </Button>
                    <p className="text-xs text-default-500">
                      รองรับไฟล์รูปภาพขนาดไม่เกิน 10MB
                    </p>
                  </div>
                </div>
              </div>
              <Input
                isRequired
                description={
                  employee
                    ? "ไม่สามารถแก้ไขเลขบัตรประชาชนได้"
                    : "กรุณากรอกเลขบัตรประชาชน 13 หลัก"
                }
                isDisabled={isLoading || !!employee}
                label="เลขบัตรประชาชน"
                maxLength={13}
                placeholder="เช่น 1234567890123"
                value={citizenId}
                variant="bordered"
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");

                  setCitizenId(value);
                }}
              />
              <Input
                isRequired
                isDisabled={isLoading}
                label="ชื่อ"
                placeholder="เช่น สมชาย"
                value={firstName}
                variant="bordered"
                onChange={(e) => setFirstName(e.target.value)}
              />
              <Input
                isRequired
                isDisabled={isLoading}
                label="นามสกุล"
                placeholder="เช่น ใจดี"
                value={lastName}
                variant="bordered"
                onChange={(e) => setLastName(e.target.value)}
              />
              <Input
                isDisabled={isLoading}
                label="ชื่อเล่น"
                placeholder="เช่น หมู (ไม่บังคับ)"
                value={nickname}
                variant="bordered"
                onChange={(e) => setNickname(e.target.value)}
              />

              <Autocomplete
                isRequired
                defaultItems={employmentTypes.map((et) => ({
                  key: String(et.id),
                  label: et.name,
                }))}
                isDisabled={isLoading}
                label="ประเภทการจ้าง"
                placeholder="เลือกประเภทการจ้าง"
                selectedKey={employmentTypeId || undefined}
                variant="bordered"
                onSelectionChange={(key) => {
                  if (key != null) {
                    setEmploymentTypeId(String(key));
                  }
                }}
              >
                {(item) => (
                  <AutocompleteItem key={item.key}>
                    {item.label}
                  </AutocompleteItem>
                )}
              </Autocomplete>
              <Autocomplete
                isRequired
                defaultItems={positions.map((p) => ({
                  key: String(p.id),
                  label: p.name,
                }))}
                isDisabled={isLoading}
                label="ตำแหน่ง"
                placeholder="เลือกตำแหน่ง"
                selectedKey={positionId || undefined}
                variant="bordered"
                onSelectionChange={(key) => {
                  if (key != null) {
                    setPositionId(String(key));
                  }
                }}
              >
                {(item) => (
                  <AutocompleteItem key={item.key}>
                    {item.label}
                  </AutocompleteItem>
                )}
              </Autocomplete>
              <div className="space-y-2">
                <div className="text-sm font-medium text-foreground">
                  สถานะการใช้งาน
                </div>
                <div className="text-xs text-default-500">
                  เปิดใช้งานเมื่อต้องการให้เจ้าหน้าที่คนนี้สามารถรับงานได้
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

      {/* Modal สำหรับแสดงรูปภาพ */}
      <ImagePreviewModal
        alt={`${firstName} ${lastName}`}
        imageUrl={profileImagePreview}
        isOpen={isImagePreviewOpen}
        onClose={() => setIsImagePreviewOpen(false)}
      />
    </>
  );
}
