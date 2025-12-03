"use client";

import type { ProfileDTO } from "@/lib/profile";

import { useState } from "react";
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
  department: string;
  position: string;
  role: string;
};

const ROLE_OPTIONS = [
  { value: "user", label: "ผู้ใช้งาน" },
  { value: "admin", label: "ผู้ดูแลระบบ" },
] as const;

type MemberOfGroup = {
  cn: string;
  fullDn: string;
};

function parseMemberOf(memberOf: string): MemberOfGroup[] {
  if (!memberOf || memberOf.trim().length === 0) {
    return [];
  }

  // Split by semicolon and process each DN
  const groups = memberOf
    .split(";")
    .map((dn) => dn.trim())
    .filter((dn) => dn.length > 0)
    .map((dn) => {
      // Match CN=value, handling various formats including spaces
      // Pattern: CN= followed by value (can contain spaces) until comma or end
      const cnMatch = dn.match(/^CN=([^,]+?)(?=,|$)/i);

      if (cnMatch && cnMatch[1]) {
        const cn = cnMatch[1].trim();

        return {
          cn,
          fullDn: dn,
        };
      }

      // Fallback: if no CN found, try to extract from the beginning
      const firstPart = dn.split(",")[0];

      if (firstPart) {
        const cn = firstPart.replace(/^CN=/i, "").trim();

        return {
          cn: cn || dn,
          fullDn: dn,
        };
      }

      // Last fallback: use the DN itself
      return {
        cn: dn,
        fullDn: dn,
      };
    })
    .filter((group) => group.cn.length > 0);

  // Remove duplicates based on full DN
  const uniqueGroups = Array.from(
    new Map(groups.map((group) => [group.fullDn, group])).values(),
  );

  // Sort by CN for consistent display
  return uniqueGroups.sort((a, b) => a.cn.localeCompare(b.cn));
}

function getErrorMessage(errorCode: string): string {
  const errorMessages: Record<string, string> = {
    // Display Name
    DISPLAY_NAME_REQUIRED: "กรุณากรอกชื่อที่แสดง",
    DISPLAY_NAME_TOO_SHORT: "ชื่อที่แสดงต้องมีความยาวอย่างน้อย 2 ตัวอักษร",
    DISPLAY_NAME_TOO_LONG: "ชื่อที่แสดงต้องมีความยาวไม่เกิน 100 ตัวอักษร",

    // Phone
    PHONE_REQUIRED: "กรุณากรอกโทรศัพท์สำนักงาน",
    PHONE_INVALID_FORMAT: "โทรศัพท์สำนักงานต้องมีตัวเลขอย่างน้อย 3 ตัว",
    MOBILE_INVALID_FORMAT: "รูปแบบหมายเลขมือถือไม่ถูกต้อง",

    // Department
    DEPARTMENT_REQUIRED: "กรุณากรอกฝ่าย/หน่วยงาน",
    DEPARTMENT_TOO_LONG: "ฝ่าย/หน่วยงานต้องมีความยาวไม่เกิน 100 ตัวอักษร",

    // Position
    POSITION_REQUIRED: "กรุณากรอกตำแหน่ง",
    POSITION_TOO_LONG: "ตำแหน่งต้องมีความยาวไม่เกิน 100 ตัวอักษร",

    // Role
    ROLE_REQUIRED: "กรุณาเลือกบทบาท",
    ROLE_INVALID: "บทบาทไม่ถูกต้อง",

    // General
    INVALID_TYPE: "ประเภทข้อมูลไม่ถูกต้อง",
    INVALID_REQUEST: "ข้อมูลไม่ถูกต้อง",
    NO_MUTATIONS: "ไม่มีการเปลี่ยนแปลงข้อมูล",
    UNAUTHORIZED: "คุณไม่มีสิทธิ์เข้าถึง",
    NOT_FOUND: "ไม่พบข้อมูล",
  };

  return errorMessages[errorCode] || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
}

export default function ProfileClient({ initialProfile }: Props) {
  const { data: session } = useSession();
  const [profile, setProfile] = useState(initialProfile);
  const [formData, setFormData] = useState<EditableFields>({
    displayName: initialProfile.displayName ?? "",
    phone: initialProfile.phone ?? "",
    mobile: initialProfile.mobile ?? "",
    department: initialProfile.department ?? "",
    position: initialProfile.position ?? "",
    role: initialProfile.role ?? "user",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // ตรวจสอบสิทธิ์: เฉพาะ admin เท่านั้นที่สามารถแก้ไข role ได้
  const canEditRole = session?.user?.role === "admin";

  const handleInputChange =
    (field: keyof EditableFields) => (value: string) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
      setFeedback(null);
    };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    // ป้องกันการ submit ซ้ำ
    if (isSaving) {
      return;
    }
    
    setIsSaving(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        const errorMessage = payload?.error
          ? getErrorMessage(payload.error)
          : "ไม่สามารถบันทึกข้อมูลได้";

        throw new Error(errorMessage);
      }

      setProfile(payload.data);
      setFormData({
        displayName: payload.data.displayName ?? "",
        phone: payload.data.phone ?? "",
        mobile: payload.data.mobile ?? "",
        department: payload.data.department ?? "",
        position: payload.data.position ?? "",
        role: payload.data.role ?? "user",
      });
      setFeedback({
        type: "success",
        message: "บันทึกข้อมูลสำเร็จแล้ว",
      });
    } catch (error: any) {
      setFeedback({
        type: "error",
        message: error.message || "ไม่สามารถบันทึกข้อมูลได้",
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
        department: payload.data.department ?? "",
        position: payload.data.position ?? "",
        role: payload.data.role ?? "user",
      });
      setFeedback({
        type: "success",
        message: "ยกเลิกการเชื่อมต่อ LINE สำเร็จแล้ว",
      });
    } catch (error: any) {
      setFeedback({
        type: "error",
        message: error.message || "ไม่สามารถยกเลิกการเชื่อมต่อ LINE ได้",
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
      department: profile.department ?? "",
      position: profile.position ?? "",
      role: profile.role ?? "user",
    });
    setFeedback(null);
  };

  const isLineLinked = Boolean(profile.lineUserId);
  const hasChanges =
    formData.displayName !== (profile.displayName ?? "") ||
    formData.phone !== (profile.phone ?? "") ||
    formData.mobile !== (profile.mobile ?? "") ||
    formData.department !== (profile.department ?? "") ||
    formData.position !== (profile.position ?? "") ||
    formData.role !== (profile.role ?? "user");

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
                    onValueChange={handleInputChange("displayName")}
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

                      handleInputChange("role")(selected);
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
                    label="โทรศัพท์สำนักงาน"
                    placeholder="เช่น 02-xxx-xxxx"
                    startContent={
                      <PhoneIcon className="w-5 h-5 text-default-400" />
                    }
                    value={formData.phone}
                    variant="bordered"
                    onValueChange={handleInputChange("phone")}
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
                    onValueChange={handleInputChange("mobile")}
                  />
                </div>
              </div>

              <Divider />

              {/* Organization Information Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-default-700 dark:text-default-300 uppercase tracking-wide">
                  ข้อมูลองค์กร
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    isRequired
                    isDisabled={isSaving}
                    label="ฝ่าย/หน่วยงาน"
                    placeholder="กรุณากรอกฝ่าย/หน่วยงาน"
                    startContent={
                      <BuildingOfficeIcon className="w-5 h-5 text-default-400" />
                    }
                    value={formData.department}
                    variant="bordered"
                    onValueChange={handleInputChange("department")}
                  />
                  <Input
                    isRequired
                    isDisabled={isSaving}
                    label="ตำแหน่ง"
                    placeholder="กรุณากรอกตำแหน่ง"
                    startContent={
                      <BriefcaseIcon className="w-5 h-5 text-default-400" />
                    }
                    value={formData.position}
                    variant="bordered"
                    onValueChange={handleInputChange("position")}
                  />
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
