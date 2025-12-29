"use client";

import type { ProfileDTO } from "@/lib/profile";
import {
  parseMemberOf,
  getProfileErrorMessage,
  type MemberOfGroup,
} from "@/lib/utils";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import {
  Avatar,
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Divider,
  Input,
  Autocomplete,
  AutocompleteItem,
  Select,
  SelectItem,
} from "@heroui/react";

import {
  LockClosedIcon,
  PhoneIcon,
  ProfileIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  BriefcaseIcon,
  ShieldCheckIcon,
  UserIcon,
} from "@/components/ui/icons";

type Props = {
  initialProfile: ProfileDTO;
};

type EditableFields = {
  displayName: string;
  phone: string;
  mobile: string;
  role: string;
  personTypeId: string | null;
  positionId: string | null;
  departmentId: string | null;
  departmentSubId: string | null;
  departmentSubSubId: string | null;
};

const ROLE_OPTIONS = [
  { value: "user", label: "ผู้ใช้งาน" },
  { value: "admin", label: "ผู้ดูแลระบบ" },
] as const;


export default function ProfileClient({ initialProfile }: Props) {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [profile, setProfile] = useState(initialProfile);
  const [formData, setFormData] = useState<EditableFields>({
    displayName: initialProfile.displayName ?? "",
    phone: initialProfile.phone ?? "",
    mobile: initialProfile.mobile ?? "",
    role: initialProfile.role ?? "user",
    personTypeId: initialProfile.personTypeId
      ? String(initialProfile.personTypeId)
      : null,
    positionId: initialProfile.positionId
      ? String(initialProfile.positionId)
      : null,
    departmentId: initialProfile.departmentId
      ? String(initialProfile.departmentId)
      : null,
    departmentSubId: initialProfile.departmentSubId
      ? String(initialProfile.departmentSubId)
      : null,
    departmentSubSubId: initialProfile.departmentSubSubId
      ? String(initialProfile.departmentSubSubId)
      : null,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  type HrdOption = {
    key: string;
    label: string;
  };

  const [personTypeOptions, setPersonTypeOptions] = useState<HrdOption[]>([]);
  const [positionOptions, setPositionOptions] = useState<HrdOption[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<HrdOption[]>([]);
  const [departmentSubOptions, setDepartmentSubOptions] = useState<HrdOption[]>(
    [],
  );
  const [departmentSubSubOptions, setDepartmentSubSubOptions] = useState<
    HrdOption[]
  >([]);

  const [isLoadingPersonTypes, setIsLoadingPersonTypes] = useState(false);
  const [isLoadingPositions, setIsLoadingPositions] = useState(false);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);
  const [isLoadingDepartmentSubs, setIsLoadingDepartmentSubs] = useState(false);
  const [isLoadingDepartmentSubSubs, setIsLoadingDepartmentSubSubs] =
    useState(false);

  // ตรวจสอบสิทธิ์: เฉพาะ admin เท่านั้นที่สามารถแก้ไข role ได้
  const canEditRole = session?.user?.role === "admin";

  const handleTextInputChange =
    (field: "displayName" | "phone" | "mobile" | "role") => (value: string) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
      setFeedback(null);
    };

  const handleOrgSelectChange =
    (
      field:
        | "personTypeId"
        | "positionId"
        | "departmentId"
        | "departmentSubId"
        | "departmentSubSubId",
    ) =>
    (key: string | number | null) => {
      const value = key != null ? String(key) : null;

      setFormData((prev) => {
        const next: EditableFields = {
          ...prev,
          [field]: value,
        };

        // จัดการ chain ของกลุ่มภารกิจ → กลุ่มงาน → หน่วยงาน
        if (field === "departmentId") {
          next.departmentSubId = null;
          next.departmentSubSubId = null;
          setDepartmentSubOptions([]);
          setDepartmentSubSubOptions([]);
        } else if (field === "departmentSubId") {
          next.departmentSubSubId = null;
          setDepartmentSubSubOptions([]);
        }

        return next;
      });

      setFeedback(null);
    };

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
      // ในที่นี้ขอไม่แสดง error แยก เพิ่มได้ภายหลังหากต้องการ
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
    // โหลดข้อมูลพื้นฐานสำหรับ Autocomplete
    void fetchPersonTypes();
    void fetchPositions();
    void fetchDepartments();
  }, []);

  useEffect(() => {
    // เมื่อมี departmentId ให้โหลดกลุ่มงาน
    void fetchDepartmentSubs(formData.departmentId);
  }, [formData.departmentId]);

  useEffect(() => {
    // เมื่อมี departmentSubId ให้โหลดหน่วยงาน
    void fetchDepartmentSubSubs(formData.departmentSubId);
  }, [formData.departmentSubId]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // ป้องกันการ submit ซ้ำ
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    try {
      const payloadToSubmit = {
        displayName: formData.displayName,
        phone: formData.phone,
        mobile: formData.mobile,
        role: formData.role,
        personTypeId: formData.personTypeId
          ? Number.parseInt(formData.personTypeId, 10)
          : null,
        positionId: formData.positionId
          ? Number.parseInt(formData.positionId, 10)
          : null,
        departmentId: formData.departmentId
          ? Number.parseInt(formData.departmentId, 10)
          : null,
        departmentSubId: formData.departmentSubId
          ? Number.parseInt(formData.departmentSubId, 10)
          : null,
        departmentSubSubId: formData.departmentSubSubId
          ? Number.parseInt(formData.departmentSubSubId, 10)
          : null,
      };

      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payloadToSubmit),
      });
      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        const errorMessage = payload?.error
          ? getProfileErrorMessage(payload.error)
          : "ไม่สามารถบันทึกข้อมูลได้";

        throw new Error(errorMessage);
      }

      // อัปเดต state ภายในหน้าโปรไฟล์
      setProfile(payload.data);
      setFormData({
        displayName: payload.data.displayName ?? "",
        phone: payload.data.phone ?? "",
        mobile: payload.data.mobile ?? "",
        role: payload.data.role ?? "user",
        personTypeId: payload.data.personTypeId
          ? String(payload.data.personTypeId)
          : null,
        positionId: payload.data.positionId
          ? String(payload.data.positionId)
          : null,
        departmentId: payload.data.departmentId
          ? String(payload.data.departmentId)
          : null,
        departmentSubId: payload.data.departmentSubId
          ? String(payload.data.departmentSubId)
          : null,
        departmentSubSubId: payload.data.departmentSubSubId
          ? String(payload.data.departmentSubSubId)
          : null,
      });

      // อัปเดตค่าใน NextAuth session ทันที เพื่อให้ layout ตรวจโครงสร้างองค์กรจากค่าใหม่ได้เลย
      await update({
        user: {
          ...(session?.user ?? {}),
          personTypeId: payload.data.personTypeId ?? null,
          positionId: payload.data.positionId ?? null,
          departmentId: payload.data.departmentId ?? null,
          departmentSubId: payload.data.departmentSubId ?? null,
          departmentSubSubId: payload.data.departmentSubSubId ?? null,
        },
      });

      // รีเฟรชหน้าเพื่อดึง initialProfile ใหม่จาก server ให้ตรงกับข้อมูลล่าสุด
      router.refresh();

      setFeedback({
        type: "success",
        message: "บันทึกข้อมูลสำเร็จแล้ว",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "ไม่สามารถบันทึกข้อมูลได้",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLinkLine = () => {
    signIn("line", { callbackUrl: "/profile" });
  };

  const handleUnlinkLine = async () => {
    if (!profile.lineUserId || isUnlinking) {
      return;
    }

    setIsUnlinking(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/profile/line", {
        method: "DELETE",
      });
      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(
          payload?.error || "ไม่สามารถยกเลิกการเชื่อมต่อ LINE ได้",
        );
      }

      setProfile(payload.data);
      setFormData({
        displayName: payload.data.displayName ?? "",
        phone: payload.data.phone ?? "",
        mobile: payload.data.mobile ?? "",
        role: payload.data.role ?? "user",
        personTypeId: payload.data.personTypeId
          ? String(payload.data.personTypeId)
          : null,
        positionId: payload.data.positionId
          ? String(payload.data.positionId)
          : null,
        departmentId: payload.data.departmentId
          ? String(payload.data.departmentId)
          : null,
        departmentSubId: payload.data.departmentSubId
          ? String(payload.data.departmentSubId)
          : null,
        departmentSubSubId: payload.data.departmentSubSubId
          ? String(payload.data.departmentSubSubId)
          : null,
      });
      setFeedback({
        type: "success",
        message: "ยกเลิกการเชื่อมต่อ LINE สำเร็จแล้ว",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "ไม่สามารถยกเลิกการเชื่อมต่อ LINE ได้",
      });
    } finally {
      setIsUnlinking(false);
    }
  };

  const handleReset = () => {
    setFormData({
      displayName: profile.displayName ?? "",
      phone: profile.phone ?? "",
      mobile: profile.mobile ?? "",
      role: profile.role ?? "user",
      personTypeId: profile.personTypeId ? String(profile.personTypeId) : null,
      positionId: profile.positionId ? String(profile.positionId) : null,
      departmentId: profile.departmentId ? String(profile.departmentId) : null,
      departmentSubId: profile.departmentSubId
        ? String(profile.departmentSubId)
        : null,
      departmentSubSubId: profile.departmentSubSubId
        ? String(profile.departmentSubSubId)
        : null,
    });
    setFeedback(null);
  };

  const isLineLinked = Boolean(profile.lineUserId);
  const hasChanges =
    formData.displayName !== (profile.displayName ?? "") ||
    formData.phone !== (profile.phone ?? "") ||
    formData.mobile !== (profile.mobile ?? "") ||
    formData.role !== (profile.role ?? "user") ||
    (formData.personTypeId ?? null) !==
      (profile.personTypeId ? String(profile.personTypeId) : null) ||
    (formData.positionId ?? null) !==
      (profile.positionId ? String(profile.positionId) : null) ||
    (formData.departmentId ?? null) !==
      (profile.departmentId ? String(profile.departmentId) : null) ||
    (formData.departmentSubId ?? null) !==
      (profile.departmentSubId ? String(profile.departmentSubId) : null) ||
    (formData.departmentSubSubId ?? null) !==
      (profile.departmentSubSubId ? String(profile.departmentSubSubId) : null);

  return (
    <div className="space-y-6">
      {/* Profile Header Card */}
      <Card className="border border-default-200 dark:border-default-600 shadow-lg bg-gradient-to-br from-primary-50 to-default-50 dark:from-primary-900/20 dark:to-default-900/20">
        <CardBody className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <Avatar
              isBordered
              className="w-24 h-24 border-4 border-background shadow-lg"
              fallback={<UserIcon className="w-12 h-12 text-default-400" />}
              radius="full"
              size="lg"
              src={profile.image ?? undefined}
            />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl font-bold text-foreground">
                  {profile.displayName || "ไม่ระบุชื่อ"}
                </h2>
                <Chip
                  color={profile.role === "admin" ? "danger" : "default"}
                  size="sm"
                  startContent={<ShieldCheckIcon className="w-4 h-4" />}
                  variant="flat"
                >
                  {profile.role === "admin" ? "ผู้ดูแลระบบ" : "ผู้ใช้งาน"}
                </Chip>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-default-600">
                {profile.email && (
                  <div className="flex items-center gap-2">
                    <EnvelopeIcon className="w-4 h-4" />
                    <span>{profile.email}</span>
                  </div>
                )}
                {profile.department && (
                  <div className="flex items-center gap-2">
                    <BuildingOfficeIcon className="w-4 h-4" />
                    <span>{profile.department}</span>
                  </div>
                )}
                {profile.position && (
                  <div className="flex items-center gap-2">
                    <BriefcaseIcon className="w-4 h-4" />
                    <span>{profile.position}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editable Profile Information */}
        <Card className="lg:col-span-2 border border-default-200 dark:border-default-600 shadow-lg">
          <CardHeader className="flex items-center gap-3 pb-3">
            <ProfileIcon className="w-6 h-6 text-primary" />
            <div>
              <h3 className="text-xl font-semibold text-foreground">
                ข้อมูลโปรไฟล์
              </h3>
              <p className="text-sm text-default-500">
                แก้ไขข้อมูลส่วนตัวของคุณ
              </p>
            </div>
          </CardHeader>
          <Divider />
          <CardBody className="pt-6">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Basic Information Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-default-700 dark:text-default-300 uppercase tracking-wide">
                  ข้อมูลพื้นฐาน
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    isRequired
                    isDisabled={isSaving}
                    label="ชื่อที่แสดง"
                    placeholder="กรุณากรอกชื่อที่ต้องการแสดง"
                    startContent={
                      <UserIcon className="w-5 h-5 text-default-400" />
                    }
                    value={formData.displayName}
                    variant="bordered"
                    onValueChange={handleTextInputChange("displayName")}
                  />
                  <Select
                    isRequired
                    isDisabled={!canEditRole || isSaving}
                    label="บทบาท"
                    placeholder="เลือกบทบาท"
                    selectedKeys={[formData.role]}
                    startContent={
                      <ShieldCheckIcon className="w-5 h-5 text-default-400" />
                    }
                    variant="bordered"
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys)[0] as string;

                      handleTextInputChange("role")(selected);
                    }}
                  >
                    {ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value}>{option.label}</SelectItem>
                    ))}
                  </Select>
                </div>
              </div>

              <Divider />

              {/* Contact Information Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-default-700 dark:text-default-300 uppercase tracking-wide">
                  ข้อมูลการติดต่อ
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    isRequired
                    isDisabled={isSaving}
                    label="โทรศัพท์ภายใน"
                    placeholder="IP-Phone / เบอร์ 4 ตัว"
                    startContent={
                      <PhoneIcon className="w-5 h-5 text-default-400" />
                    }
                    value={formData.phone}
                    variant="bordered"
                    onValueChange={handleTextInputChange("phone")}
                  />
                  <Input
                    isDisabled={isSaving}
                    label="มือถือ"
                    placeholder="เช่น 08x-xxx-xxxx"
                    startContent={
                      <PhoneIcon className="w-5 h-5 text-default-400" />
                    }
                    value={formData.mobile}
                    variant="bordered"
                    onValueChange={handleTextInputChange("mobile")}
                  />
                </div>
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
                      isDisabled={isSaving}
                      isLoading={isLoadingPersonTypes}
                      label="กลุ่มบุคลากร"
                      placeholder="เลือกกลุ่มบุคลากร"
                      selectedKey={formData.personTypeId ?? undefined}
                      startContent={
                        <UserIcon className="w-5 h-5 text-default-400" />
                      }
                      variant="bordered"
                      onSelectionChange={handleOrgSelectChange("personTypeId")}
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
                      isDisabled={isSaving}
                      isLoading={isLoadingPositions}
                      label="ตำแหน่ง"
                      placeholder="เลือกตำแหน่ง"
                      selectedKey={formData.positionId ?? undefined}
                      startContent={
                        <BriefcaseIcon className="w-5 h-5 text-default-400" />
                      }
                      variant="bordered"
                      onSelectionChange={handleOrgSelectChange("positionId")}
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
                      isDisabled={isSaving}
                      isLoading={isLoadingDepartments}
                      label="กลุ่มภารกิจ"
                      placeholder="เลือกกลุ่มภารกิจ"
                      selectedKey={formData.departmentId ?? undefined}
                      startContent={
                        <BuildingOfficeIcon className="w-5 h-5 text-default-400" />
                      }
                      variant="bordered"
                      onSelectionChange={handleOrgSelectChange("departmentId")}
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
                      isDisabled={isSaving || !formData.departmentId}
                      isLoading={isLoadingDepartmentSubs}
                      label="กลุ่มงาน"
                      placeholder={
                        formData.departmentId
                          ? "เลือกกลุ่มงาน"
                          : "กรุณาเลือกกลุ่มภารกิจก่อน"
                      }
                      selectedKey={formData.departmentSubId ?? undefined}
                      variant="bordered"
                      onSelectionChange={handleOrgSelectChange(
                        "departmentSubId",
                      )}
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
                      isDisabled={isSaving || !formData.departmentSubId}
                      isLoading={isLoadingDepartmentSubSubs}
                      label="หน่วยงาน"
                      placeholder={
                        formData.departmentSubId
                          ? "เลือกหน่วยงาน"
                          : "กรุณาเลือกกลุ่มงานก่อน"
                      }
                      selectedKey={formData.departmentSubSubId ?? undefined}
                      variant="bordered"
                      onSelectionChange={handleOrgSelectChange(
                        "departmentSubSubId",
                      )}
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

              {feedback && (
                <div
                  className={`rounded-xl border px-4 py-3 text-sm ${
                    feedback.type === "success"
                      ? "border-success-200 bg-success-50 text-success-700 dark:border-success-400/40 dark:bg-success-900/20 dark:text-success-300"
                      : "border-danger-200 bg-danger-50 text-danger-700 dark:border-danger-400/40 dark:bg-danger-900/20 dark:text-danger-300"
                  }`}
                >
                  {feedback.message}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  color="default"
                  isDisabled={!hasChanges || isSaving}
                  variant="flat"
                  onPress={handleReset}
                >
                  คืนค่าเดิม
                </Button>
                <Button
                  color="primary"
                  isDisabled={!hasChanges || isSaving}
                  isLoading={isSaving}
                  type="submit"
                >
                  {isSaving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        {/* LINE Connection Card */}
        <Card className="border border-default-200 dark:border-default-600 shadow-lg">
          <CardHeader className="flex items-center gap-3 pb-3">
            <LockClosedIcon className="w-6 h-6 text-primary" />
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                การเชื่อมต่อ LINE
              </h3>
              <p className="text-sm text-default-500">สถานะบัญชี LINE</p>
            </div>
          </CardHeader>
          <Divider />
          <CardBody className="pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <Chip
                color={isLineLinked ? "success" : "warning"}
                size="sm"
                variant="flat"
              >
                {isLineLinked ? "เชื่อมแล้ว" : "ยังไม่เชื่อม"}
              </Chip>
              {profile.lineUserId && (
                <span className="text-xs text-default-500 truncate">
                  ID: {profile.lineUserId}
                </span>
              )}
            </div>
            {profile.lineDisplayName && (
              <div>
                <p className="text-xs text-default-500 mb-1">ชื่อแสดงใน LINE</p>
                <p className="text-sm font-medium text-foreground">
                  {profile.lineDisplayName}
                </p>
              </div>
            )}
            <p className="text-sm text-default-500">
              {isLineLinked
                ? "หากต้องการเปลี่ยนบัญชี LINE ต้องยกเลิกการเชื่อมต่อก่อนเชื่อมใหม่"
                : "เชื่อมต่อบัญชี LINE เพื่อรับการแจ้งเตือนและอัปเดตรูปโปรไฟล์อัตโนมัติ"}
            </p>
            <Divider />
            <div className="flex flex-col gap-3">
              {!isLineLinked && (
                <Button
                  color="primary"
                  startContent={<LockClosedIcon className="w-5 h-5" />}
                  variant="solid"
                  onPress={handleLinkLine}
                >
                  เชื่อมบัญชี LINE
                </Button>
              )}
              {isLineLinked && (
                <Button
                  color="danger"
                  isLoading={isUnlinking}
                  variant="flat"
                  onPress={handleUnlinkLine}
                >
                  ยกเลิกการเชื่อมต่อ LINE
                </Button>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Read-only Information Card */}
      <Card className="border border-default-200 dark:border-default-600 shadow-lg">
        <CardHeader className="pb-3">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              ข้อมูลจากระบบ LDAP
            </h3>
            <p className="text-sm text-default-500">
              ข้อมูลที่อัปเดตจากระบบ LDAP (ไม่สามารถแก้ไขได้)
            </p>
          </div>
        </CardHeader>
        <Divider />
        <CardBody className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem
              icon={<EnvelopeIcon className="w-5 h-5" />}
              label="อีเมล (LDAP)"
              value={profile.email || "ไม่ระบุ"}
            />
            <InfoItem
              icon={<UserIcon className="w-5 h-5" />}
              label="LDAP Display Name"
              value={profile.ldapDisplayName || "-"}
            />
            {profile.memberOf && (
              <div className="md:col-span-2">
                <p className="text-xs uppercase tracking-wide text-default-500 mb-3">
                  memberOf
                </p>
                <div className="flex flex-wrap gap-2">
                  {parseMemberOf(profile.memberOf).map((group, index) => (
                    <Chip
                      key={`${group.fullDn}-${index}`}
                      className="cursor-default"
                      color="primary"
                      size="sm"
                      title={group.fullDn}
                      variant="flat"
                    >
                      {group.cn}
                    </Chip>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      {icon && <div className="text-default-400 mt-0.5">{icon}</div>}
      <div className="flex-1">
        <p className="text-xs uppercase tracking-wide text-default-500 mb-1">
          {label}
        </p>
        <p className="text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}
