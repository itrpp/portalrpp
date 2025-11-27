"use client";

import type { ProfileDTO } from "@/lib/profile";

import { useState } from "react";
import { signIn } from "next-auth/react";
import {
  Avatar,
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Divider,
  Input,
} from "@heroui/react";

import { LockClosedIcon, PhoneIcon, ProfileIcon } from "@/components/ui/icons";

type Props = {
  initialProfile: ProfileDTO;
};

type EditableFields = {
  phone: string;
  mobile: string;
  lineDisplayName: string;
  image: string;
};

export default function ProfileClient({ initialProfile }: Props) {
  const [profile, setProfile] = useState(initialProfile);
  const [formData, setFormData] = useState<EditableFields>({
    phone: initialProfile.phone ?? "",
    mobile: initialProfile.mobile ?? "",
    lineDisplayName: initialProfile.lineDisplayName ?? "",
    image: initialProfile.image ?? "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

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
        throw new Error(payload?.error || "ไม่สามารถบันทึกข้อมูลได้");
      }

      setProfile(payload.data);
      setFormData({
        phone: payload.data.phone ?? "",
        mobile: payload.data.mobile ?? "",
        lineDisplayName: payload.data.lineDisplayName ?? "",
        image: payload.data.image ?? "",
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
        phone: payload.data.phone ?? "",
        mobile: payload.data.mobile ?? "",
        lineDisplayName: payload.data.lineDisplayName ?? "",
        image: payload.data.image ?? "",
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

  const isLineLinked = Boolean(profile.lineUserId);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border border-default-200 dark:border-default-600 shadow-lg">
          <CardHeader className="flex items-center gap-3">
            <Avatar
              isBordered
              radius="full"
              size="lg"
              src={profile.image ?? undefined}
            />
            <div>
              <p className="text-sm text-default-500">ข้อมูลพื้นฐาน</p>
              <h2 className="text-xl font-semibold text-foreground">
                {profile.name || "ไม่ระบุชื่อ"}
              </h2>
            </div>
          </CardHeader>
          <CardBody className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoItem
                label="อีเมล (LDAP)"
                value={profile.email || "ไม่ระบุ"}
              />
              <InfoItem label="บทบาท" value={profile.role} />
              <InfoItem label="แผนก" value={profile.department || "-"} />
              <InfoItem label="ตำแหน่ง" value={profile.title || "-"} />
              <InfoItem
                label="Provider หลัก"
                value={profile.providerType || "ไม่ระบุ"}
              />
              <InfoItem
                label="Line Display Name"
                value={profile.lineDisplayName || "-"}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-default-500 mb-2">
                กลุ่มที่ได้รับสิทธิ์จาก LDAP
              </p>
              <div className="rounded-xl border border-default-200 dark:border-default-600 bg-content1/60 p-3 text-sm text-default-600 dark:text-default-400">
                {profile.groups || "ไม่พบข้อมูลกลุ่ม"}
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="border border-default-200 dark:border-default-600 shadow-lg">
          <CardHeader className="flex items-center gap-3">
            <ProfileIcon className="w-8 h-8 text-primary" />
            <div>
              <p className="text-sm text-default-500">การเชื่อมต่อ LINE</p>
              <h3 className="text-lg font-semibold text-foreground">
                สถานะบัญชี LINE
              </h3>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
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
            <p className="text-sm text-default-500">
              หากต้องการเปลี่ยนบัญชี LINE
              ต้องยกเลิกการเชื่อมต่อก่อนเชื่อมใหม่
            </p>
            <Divider />
            <div className="flex flex-col gap-3">
              {!isLineLinked && (
                <Button
                  color={isLineLinked ? "success" : "primary"}
                  startContent={<LockClosedIcon className="w-5 h-5" />}
                  variant={isLineLinked ? "flat" : "solid"}
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

      <Card className="border border-default-200 dark:border-default-600 shadow-lg">
        <CardHeader>
          <div>
            <p className="text-sm text-default-500">ข้อมูลที่แก้ไขได้</p>
            <h3 className="text-xl font-semibold text-foreground">
              ข้อมูลการติดต่อ &amp; โปรไฟล์
            </h3>
          </div>
        </CardHeader>
        <CardBody>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
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

            <Input
              label="Line Display Name"
              maxLength={120}
              placeholder="ข้อความที่ต้องการให้แสดงในระบบ"
              value={formData.lineDisplayName}
              variant="bordered"
              onValueChange={handleInputChange("lineDisplayName")}
            />

            <Input
              description={
                isLineLinked
                  ? "รูปจะอัปเดตอัตโนมัติจาก LINE หลังการเชื่อมต่อ"
                  : "ใส่ URL รูปเมื่อยังไม่เชื่อมบัญชี LINE"
              }
              isReadOnly={isLineLinked}
              label="รูปโปรไฟล์ (URL)"
              placeholder="https://example.com/avatar.png"
              value={formData.image}
              variant="bordered"
              onValueChange={handleInputChange("image")}
            />

            {feedback && (
              <div
                className={`rounded-xl border px-4 py-3 text-sm ${feedback.type === "success"
                  ? "border-success-200 bg-success-50 text-success-700 dark:border-success-400/40 dark:bg-success-900/20 dark:text-success-300"
                  : "border-danger-200 bg-danger-50 text-danger-700 dark:border-danger-400/40 dark:bg-danger-900/20 dark:text-danger-300"
                  }`}
              >
                {feedback.message}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button
                color="default"
                variant="flat"
                onPress={() => {
                  setFormData({
                    phone: profile.phone ?? "",
                    mobile: profile.mobile ?? "",
                    lineDisplayName: profile.lineDisplayName ?? "",
                    image: profile.image ?? "",
                  });
                  setFeedback(null);
                }}
              >
                คืนค่าเดิม
              </Button>
              <Button color="primary" isLoading={isSaving} type="submit">
                {isSaving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-default-500">
        {label}
      </p>
      <p className="text-sm font-semibold text-foreground truncate">{value}</p>
    </div>
  );
}
