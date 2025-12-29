"use client";

import type { UserDTO, UserUpdatePayload } from "@/types/user";

import React, { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Select,
  SelectItem,
  Autocomplete,
  AutocompleteItem,
  Divider,
  Chip,
  addToast,
} from "@heroui/react";

import {
  UserIcon,
  BriefcaseIcon,
  BuildingOfficeIcon,
  LockClosedIcon,
} from "@/components/ui/icons";

const ROLE_OPTIONS = [
  { value: "user", label: "ผู้ใช้งาน" },
  { value: "admin", label: "ผู้ดูแลระบบ" },
] as const;

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (userId: string, payload: UserUpdatePayload) => Promise<boolean>;
  user: UserDTO | null;
  isLoading?: boolean;
  isCurrentUser?: boolean;
}

type HrdOption = {
  key: string;
  label: string;
};

export function UserModal({
  isOpen,
  onClose,
  onSave,
  user,
  isLoading = false,
  isCurrentUser = false,
}: UserModalProps) {
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [mobile, setMobile] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [personTypeId, setPersonTypeId] = useState<string | null>(null);
  const [positionId, setPositionId] = useState<string | null>(null);
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [departmentSubId, setDepartmentSubId] = useState<string | null>(null);
  const [departmentSubSubId, setDepartmentSubSubId] = useState<string | null>(
    null,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isUnlinking, setIsUnlinking] = useState(false);

  // HRD Options
  const [personTypeOptions, setPersonTypeOptions] = useState<HrdOption[]>([]);
  const [positionOptions, setPositionOptions] = useState<HrdOption[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<HrdOption[]>([]);
  const [departmentSubOptions, setDepartmentSubOptions] = useState<HrdOption[]>(
    [],
  );
  const [departmentSubSubOptions, setDepartmentSubSubOptions] = useState<
    HrdOption[]
  >([]);

  // Loading states
  const [isLoadingPersonTypes, setIsLoadingPersonTypes] = useState(false);
  const [isLoadingPositions, setIsLoadingPositions] = useState(false);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);
  const [isLoadingDepartmentSubs, setIsLoadingDepartmentSubs] = useState(false);
  const [isLoadingDepartmentSubSubs, setIsLoadingDepartmentSubSubs] =
    useState(false);

  // Fetch HRD data functions
  async function fetchPersonTypes() {
    try {
      setIsLoadingPersonTypes(true);
      const response = await fetch("/api/hrd/person-types");
      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "ไม่สามารถโหลดกลุ่มบุคลากรได้");
      }

      setPersonTypeOptions(
        (payload.data as Array<{ id: number; name: string }>).map((item) => ({
          key: String(item.id),
          label: item.name,
        })),
      );
    } catch {
      // เงียบไว้ก่อน
    } finally {
      setIsLoadingPersonTypes(false);
    }
  }

  async function fetchPositions() {
    try {
      setIsLoadingPositions(true);
      const response = await fetch("/api/hrd/positions");
      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "ไม่สามารถโหลดตำแหน่งได้");
      }

      setPositionOptions(
        (payload.data as Array<{ id: number; name: string }>).map((item) => ({
          key: String(item.id),
          label: item.name,
        })),
      );
    } catch {
      // เงียบไว้ก่อน
    } finally {
      setIsLoadingPositions(false);
    }
  }

  async function fetchDepartments() {
    try {
      setIsLoadingDepartments(true);
      const response = await fetch("/api/hrd/departments");
      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "ไม่สามารถโหลดกลุ่มภารกิจได้");
      }

      setDepartmentOptions(
        (payload.data as Array<{ id: number; name: string }>).map((item) => ({
          key: String(item.id),
          label: item.name,
        })),
      );
    } catch {
      // เงียบไว้ก่อน
    } finally {
      setIsLoadingDepartments(false);
    }
  }

  async function fetchDepartmentSubs(departmentId: string | null) {
    if (!departmentId) {
      setDepartmentSubOptions([]);

      return;
    }

    try {
      setIsLoadingDepartmentSubs(true);
      const response = await fetch(
        `/api/hrd/department-subs?departmentId=${encodeURIComponent(
          departmentId,
        )}`,
      );
      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "ไม่สามารถโหลดกลุ่มงานได้");
      }

      setDepartmentSubOptions(
        (payload.data as Array<{ id: number; name: string }>).map((item) => ({
          key: String(item.id),
          label: item.name,
        })),
      );
    } catch {
      // เงียบไว้ก่อน
    } finally {
      setIsLoadingDepartmentSubs(false);
    }
  }

  async function fetchDepartmentSubSubs(departmentSubId: string | null) {
    if (!departmentSubId) {
      setDepartmentSubSubOptions([]);

      return;
    }

    try {
      setIsLoadingDepartmentSubSubs(true);
      const response = await fetch(
        `/api/hrd/department-sub-subs?departmentSubId=${encodeURIComponent(
          departmentSubId,
        )}`,
      );
      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "ไม่สามารถโหลดหน่วยงานได้");
      }

      setDepartmentSubSubOptions(
        (payload.data as Array<{ id: number; name: string }>).map((item) => ({
          key: String(item.id),
          label: item.name,
        })),
      );
    } catch {
      // เงียบไว้ก่อน
    } finally {
      setIsLoadingDepartmentSubSubs(false);
    }
  }

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setPhone(user.phone || "");
      setMobile(user.mobile || "");
      setRole((user.role as "admin" | "user") || "user");
      setPersonTypeId(user.personTypeId ? String(user.personTypeId) : null);
      setPositionId(user.positionId ? String(user.positionId) : null);
      setDepartmentId(user.departmentId ? String(user.departmentId) : null);
      setDepartmentSubId(
        user.departmentSubId ? String(user.departmentSubId) : null,
      );
      setDepartmentSubSubId(
        user.departmentSubSubId ? String(user.departmentSubSubId) : null,
      );
      setErrors({});
    } else {
      setDisplayName("");
      setPhone("");
      setMobile("");
      setRole("user");
      setPersonTypeId(null);
      setPositionId(null);
      setDepartmentId(null);
      setDepartmentSubId(null);
      setDepartmentSubSubId(null);
      setErrors({});
    }
  }, [user, isOpen]);

  // โหลดข้อมูลพื้นฐานสำหรับ Autocomplete เมื่อ modal เปิด
  useEffect(() => {
    if (isOpen) {
      void fetchPersonTypes();
      void fetchPositions();
      void fetchDepartments();
    }
  }, [isOpen]);

  // เมื่อมี departmentId ให้โหลดกลุ่มงาน
  useEffect(() => {
    if (departmentId) {
      void fetchDepartmentSubs(departmentId);
    } else {
      setDepartmentSubOptions([]);
    }
  }, [departmentId]);

  // เมื่อมี departmentSubId ให้โหลดหน่วยงาน
  useEffect(() => {
    if (departmentSubId) {
      void fetchDepartmentSubSubs(departmentSubId);
    } else {
      setDepartmentSubSubOptions([]);
    }
  }, [departmentSubId]);

  // โหลดข้อมูลกลุ่มงานและหน่วยงานเมื่อ user data ถูก set และ modal เปิด
  // ใช้เพื่อให้แน่ใจว่าข้อมูลจะถูกโหลดหลังจากที่ state ถูก update แล้ว
  useEffect(() => {
    if (isOpen && user) {
      // ใช้ setTimeout เพื่อให้แน่ใจว่า state ถูก update แล้ว
      const timer = setTimeout(() => {
        // ถ้ามี departmentId ให้โหลดกลุ่มงาน
        if (user.departmentId) {
          const deptId = String(user.departmentId);

          void fetchDepartmentSubs(deptId);
        }
        // ถ้ามี departmentSubId ให้โหลดหน่วยงาน
        if (user.departmentSubId) {
          const deptSubId = String(user.departmentSubId);

          void fetchDepartmentSubSubs(deptSubId);
        }
      }, 0);

      return () => clearTimeout(timer);
    }
  }, [isOpen, user]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate displayName
    if (!displayName.trim()) {
      newErrors.displayName = "กรุณากรอกชื่อ-นามสกุล";
    } else if (displayName.trim().length < 2) {
      newErrors.displayName = "ชื่อ-นามสกุลต้องมีอย่างน้อย 2 ตัวอักษร";
    } else if (displayName.trim().length > 100) {
      newErrors.displayName = "ชื่อ-นามสกุลต้องไม่เกิน 100 ตัวอักษร";
    }

    // Validate phone
    if (!phone.trim()) {
      newErrors.phone = "กรุณากรอกโทรศัพท์ภายใน";
    } else {
      const digitCount = (phone.match(/\d/g) || []).length;

      if (digitCount < 3) {
        newErrors.phone = "โทรศัพท์ภายในต้องมีตัวเลขอย่างน้อย 3 หลัก";
      } else if (!/^[0-9+\-\s]{3,20}$/.test(phone)) {
        newErrors.phone = "รูปแบบโทรศัพท์ภายในไม่ถูกต้อง";
      }
    }

    // Validate mobile (optional)
    if (mobile.trim()) {
      if (!/^[0-9+\-\s]{3,20}$/.test(mobile)) {
        newErrors.mobile = "รูปแบบเบอร์มือถือไม่ถูกต้อง";
      }
    }

    // Validate organization fields
    if (!personTypeId) {
      newErrors.personTypeId = "กรุณาเลือกกลุ่มบุคลากร";
    }
    if (!positionId) {
      newErrors.positionId = "กรุณาเลือกตำแหน่ง";
    }
    if (!departmentId) {
      newErrors.departmentId = "กรุณาเลือกกลุ่มภารกิจ";
    }
    if (!departmentSubId) {
      newErrors.departmentSubId = "กรุณาเลือกกลุ่มงาน";
    }
    if (!departmentSubSubId) {
      newErrors.departmentSubSubId = "กรุณาเลือกหน่วยงาน";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm() || !user) {
      return;
    }

    try {
      const payload: UserUpdatePayload = {
        displayName: displayName.trim(),
        phone: phone.trim(),
        mobile: mobile.trim() || undefined,
        role,
        personTypeId: personTypeId ? Number.parseInt(personTypeId, 10) : null,
        positionId: positionId ? Number.parseInt(positionId, 10) : null,
        departmentId: departmentId ? Number.parseInt(departmentId, 10) : null,
        departmentSubId: departmentSubId
          ? Number.parseInt(departmentSubId, 10)
          : null,
        departmentSubSubId: departmentSubSubId
          ? Number.parseInt(departmentSubSubId, 10)
          : null,
      };

      const success = await onSave(user.id, payload);

      if (success) {
        onClose();
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "ไม่สามารถบันทึกข้อมูลได้";

      addToast({
        title: "เกิดข้อผิดพลาด",
        description: message,
        color: "danger",
      });
    }
  };

  return (
    <Modal
      isDismissable={!isLoading}
      isKeyboardDismissDisabled={isLoading}
      isOpen={isOpen}
      scrollBehavior="inside"
      size="2xl"
      onClose={onClose}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold">แก้ไขข้อมูลผู้ใช้</h2>
          {user && (
            <p className="text-sm text-default-500 font-normal">
              {user.email || user.id}
            </p>
          )}
        </ModalHeader>
        <ModalBody>
          {isCurrentUser && (
            <div className="bg-warning-50 border border-warning-200 rounded-lg p-3 text-sm text-warning-800">
              คุณกำลังแก้ไขข้อมูลของตัวเอง
            </div>
          )}

          <div className="space-y-4">
            <Input
              isRequired
              errorMessage={errors.displayName}
              isDisabled={isLoading}
              isInvalid={!!errors.displayName}
              label="ชื่อที่แสดง"
              placeholder="กรุณากรอกชื่อที่ต้องการแสดง"
              value={displayName}
              variant="bordered"
              onChange={(e) => {
                setDisplayName(e.target.value);
                if (errors.displayName) {
                  setErrors((prev) => ({ ...prev, displayName: "" }));
                }
              }}
            />

            <Input
              isRequired
              errorMessage={errors.phone}
              isDisabled={isLoading}
              isInvalid={!!errors.phone}
              label="โทรศัพท์ภายใน"
              placeholder="IP-Phone / เบอร์ 4 ตัว"
              value={phone}
              variant="bordered"
              onChange={(e) => {
                setPhone(e.target.value);
                if (errors.phone) {
                  setErrors((prev) => ({ ...prev, phone: "" }));
                }
              }}
            />

            <Input
              errorMessage={errors.mobile}
              isDisabled={isLoading}
              isInvalid={!!errors.mobile}
              label="เบอร์มือถือ"
              placeholder="กรุณากรอกเบอร์มือถือ (ไม่บังคับ)"
              value={mobile}
              variant="bordered"
              onChange={(e) => {
                setMobile(e.target.value);
                if (errors.mobile) {
                  setErrors((prev) => ({ ...prev, mobile: "" }));
                }
              }}
            />

            <Select
              isRequired
              isDisabled={isLoading}
              label="บทบาท"
              placeholder="เลือกบทบาท"
              selectedKeys={[role]}
              variant="bordered"
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string;

                setRole(selected as "admin" | "user");
              }}
            >
              {ROLE_OPTIONS.map((option) => (
                <SelectItem key={option.value}>{option.label}</SelectItem>
              ))}
            </Select>

            {isCurrentUser && role === "admin" && (
              <div className="bg-warning-50 border border-warning-200 rounded-lg p-3 text-sm text-warning-800">
                คุณกำลังแก้ไขบทบาทของตัวเองเป็น ผู้ดูแลระบบ โปรดระวัง:
                การเปลี่ยนบทบาทอาจส่งผลต่อสิทธิ์การเข้าถึงของคุณ
              </div>
            )}
          </div>

          <Divider />

          {/* Organization Information Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-default-700 dark:text-default-300 uppercase tracking-wide">
              ข้อมูลองค์กร
            </h4>
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Autocomplete
                  isRequired
                  defaultItems={personTypeOptions}
                  errorMessage={errors.personTypeId}
                  isDisabled={isLoading}
                  isInvalid={!!errors.personTypeId}
                  isLoading={isLoadingPersonTypes}
                  label="กลุ่มบุคลากร"
                  placeholder="เลือกกลุ่มบุคลากร"
                  selectedKey={personTypeId ?? undefined}
                  startContent={
                    <UserIcon className="w-5 h-5 text-default-400" />
                  }
                  variant="bordered"
                  onSelectionChange={(key) => {
                    const value = key != null ? String(key) : null;

                    setPersonTypeId(value);
                    if (errors.personTypeId) {
                      setErrors((prev) => ({ ...prev, personTypeId: "" }));
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
                  defaultItems={positionOptions}
                  errorMessage={errors.positionId}
                  isDisabled={isLoading}
                  isInvalid={!!errors.positionId}
                  isLoading={isLoadingPositions}
                  label="ตำแหน่ง"
                  placeholder="เลือกตำแหน่ง"
                  selectedKey={positionId ?? undefined}
                  startContent={
                    <BriefcaseIcon className="w-5 h-5 text-default-400" />
                  }
                  variant="bordered"
                  onSelectionChange={(key) => {
                    const value = key != null ? String(key) : null;

                    setPositionId(value);
                    if (errors.positionId) {
                      setErrors((prev) => ({ ...prev, positionId: "" }));
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
                  defaultItems={departmentOptions}
                  errorMessage={errors.departmentId}
                  isDisabled={isLoading}
                  isInvalid={!!errors.departmentId}
                  isLoading={isLoadingDepartments}
                  label="กลุ่มภารกิจ"
                  placeholder="เลือกกลุ่มภารกิจ"
                  selectedKey={departmentId ?? undefined}
                  startContent={
                    <BuildingOfficeIcon className="w-5 h-5 text-default-400" />
                  }
                  variant="bordered"
                  onSelectionChange={(key) => {
                    const value = key != null ? String(key) : null;

                    setDepartmentId(value);
                    // Reset dependent fields
                    setDepartmentSubId(null);
                    setDepartmentSubSubId(null);
                    setDepartmentSubOptions([]);
                    setDepartmentSubSubOptions([]);
                    if (errors.departmentId) {
                      setErrors((prev) => ({ ...prev, departmentId: "" }));
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
                  defaultItems={departmentSubOptions}
                  errorMessage={errors.departmentSubId}
                  isDisabled={isLoading || !departmentId}
                  isInvalid={!!errors.departmentSubId}
                  isLoading={isLoadingDepartmentSubs}
                  label="กลุ่มงาน"
                  placeholder={
                    departmentId ? "เลือกกลุ่มงาน" : "กรุณาเลือกกลุ่มภารกิจก่อน"
                  }
                  selectedKey={departmentSubId ?? undefined}
                  variant="bordered"
                  onSelectionChange={(key) => {
                    const value = key != null ? String(key) : null;

                    setDepartmentSubId(value);
                    // Reset dependent field
                    setDepartmentSubSubId(null);
                    setDepartmentSubSubOptions([]);
                    if (errors.departmentSubId) {
                      setErrors((prev) => ({ ...prev, departmentSubId: "" }));
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
                  defaultItems={departmentSubSubOptions}
                  errorMessage={errors.departmentSubSubId}
                  isDisabled={isLoading || !departmentSubId}
                  isInvalid={!!errors.departmentSubSubId}
                  isLoading={isLoadingDepartmentSubSubs}
                  label="หน่วยงาน"
                  placeholder={
                    departmentSubId ? "เลือกหน่วยงาน" : "กรุณาเลือกกลุ่มงานก่อน"
                  }
                  selectedKey={departmentSubSubId ?? undefined}
                  variant="bordered"
                  onSelectionChange={(key) => {
                    const value = key != null ? String(key) : null;

                    setDepartmentSubSubId(value);
                    if (errors.departmentSubSubId) {
                      setErrors((prev) => ({
                        ...prev,
                        departmentSubSubId: "",
                      }));
                    }
                  }}
                >
                  {(item) => (
                    <AutocompleteItem key={item.key}>
                      {item.label}
                    </AutocompleteItem>
                  )}
                </Autocomplete>
              </div>
            </div>
          </div>

          <Divider />

          {/* LINE Connection Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-default-700 dark:text-default-300 uppercase tracking-wide">
              การเชื่อมต่อ LINE
            </h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Chip
                  color={user?.lineUserId ? "success" : "warning"}
                  size="sm"
                  variant="flat"
                >
                  {user?.lineUserId ? "เชื่อมแล้ว" : "ยังไม่เชื่อม"}
                </Chip>
                {user?.lineUserId && (
                  <span className="text-xs text-default-500 truncate">
                    ID: {user.lineUserId}
                  </span>
                )}
              </div>
              {user?.lineDisplayName && (
                <div>
                  <p className="text-xs text-default-500 mb-1">
                    ชื่อแสดงใน LINE
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {user.lineDisplayName}
                  </p>
                </div>
              )}
              <p className="text-sm text-default-500">
                {user?.lineUserId
                  ? "หากต้องการเปลี่ยนบัญชี LINE ต้องยกเลิกการเชื่อมต่อก่อนเชื่อมใหม่"
                  : "เชื่อมต่อบัญชี LINE เพื่อรับการแจ้งเตือนและอัปเดตรูปโปรไฟล์อัตโนมัติ"}
              </p>
              <div className="flex flex-col gap-3">
                {!user?.lineUserId && (
                  <Button
                    color="primary"
                    isDisabled={isLoading}
                    startContent={<LockClosedIcon className="w-5 h-5" />}
                    variant="solid"
                    onPress={() => {
                      signIn("line", { callbackUrl: "/setting/users" });
                    }}
                  >
                    เชื่อมบัญชี LINE
                  </Button>
                )}
                {user?.lineUserId && (
                  <Button
                    color="danger"
                    isDisabled={isLoading}
                    isLoading={isUnlinking}
                    variant="flat"
                    onPress={async () => {
                      if (!user?.id) return;
                      setIsUnlinking(true);
                      try {
                        const response = await fetch(
                          `/api/users/${user.id}/line`,
                          {
                            method: "DELETE",
                          },
                        );
                        const payload = await response.json();

                        if (!response.ok || !payload?.success) {
                          throw new Error(
                            payload?.error ||
                              "ไม่สามารถยกเลิกการเชื่อมต่อ LINE ได้",
                          );
                        }

                        addToast({
                          title: "สำเร็จ",
                          description: "ยกเลิกการเชื่อมต่อ LINE สำเร็จแล้ว",
                          color: "success",
                        });

                        // Reload user data
                        if (onSave) {
                          await onSave(user.id, {});
                        }
                      } catch (error) {
                        addToast({
                          title: "เกิดข้อผิดพลาด",
                          description:
                            error instanceof Error
                              ? error.message
                              : "ไม่สามารถยกเลิกการเชื่อมต่อ LINE ได้",
                          color: "danger",
                        });
                      } finally {
                        setIsUnlinking(false);
                      }
                    }}
                  >
                    ยกเลิกการเชื่อมต่อ LINE
                  </Button>
                )}
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            color="default"
            isDisabled={isLoading}
            variant="light"
            onPress={onClose}
          >
            ยกเลิก
          </Button>
          <Button color="primary" isLoading={isLoading} onPress={handleSave}>
            บันทึก
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
