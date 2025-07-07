"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/NextAuthContext";
import {
  Card,
  CardHeader,
  CardBody,
  Input,
  Button,
  Divider,
  Link as HeroLink,
  Progress,
  Spinner,
  Select,
  SelectItem,
} from "@heroui/react";
import {
  EyeIcon,
  EyeSlashIcon,
  UserIcon,
  EnvelopeIcon,
  KeyIcon,
  CheckCircleIcon,
  XCircleIcon,
  HomeIcon,
  HeartIcon,
  BuildingOfficeIcon,
  IdentificationIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import { siteConfig } from "@/config/site";

interface PasswordStrength {
  score: number;
  feedback: string;
  color: "danger" | "warning" | "success";
}

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    firstName: "",
    lastName: "",
    department: "",
    position: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    feedback: "",
    color: "danger",
  });
  const [step, setStep] = useState(1);
  const { register, user } = useAuth();
  const router = useRouter();

  const toggleVisibility = () => setIsVisible(!isVisible);
  const toggleConfirmVisibility = () => setIsConfirmVisible(!isConfirmVisible);

  const departments = [
    { value: "it", label: "ฝ่ายเทคโนโลยีสารสนเทศ" },
    { value: "medical", label: "ฝ่ายการแพทย์" },
    { value: "nursing", label: "ฝ่ายการพยาบาล" },
    { value: "pharmacy", label: "ฝ่ายเภสัชกรรม" },
    { value: "admin", label: "ฝ่ายบริหาร" },
    { value: "finance", label: "ฝ่ายการเงิน" },
    { value: "hr", label: "ฝ่ายทรัพยากรบุคคล" },
    { value: "other", label: "อื่นๆ" },
  ];

  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  const checkPasswordStrength = (password: string): PasswordStrength => {
    let score = 0;
    let feedback = "";
    let color: "danger" | "warning" | "success" = "danger";

    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score < 3) {
      feedback = "รหัสผ่านอ่อนแอ";
      color = "danger";
    } else if (score < 5) {
      feedback = "รหัสผ่านปานกลาง";
      color = "warning";
    } else {
      feedback = "รหัสผ่านแข็งแรง";
      color = "success";
    }

    return { score: (score / 6) * 100, feedback, color };
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (field === "password") {
      setPasswordStrength(checkPasswordStrength(value));
    }
  };

  const validateStep1 = () => {
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      setError("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("รหัสผ่านไม่ตรงกัน");
      return false;
    }
    if (formData.password.length < 6) {
      setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.name || !formData.firstName || !formData.lastName) {
      setError("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    setError("");
    if (step === 1 && validateStep1()) {
      setStep(2);
    }
  };

  const handlePrevStep = () => {
    setError("");
    setStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    if (!validateStep2()) {
      setIsLoading(false);
      return;
    }

    const result = await register(
      formData.email,
      formData.password,
      formData.name,
    );

    if (result.success) {
      setSuccess("สมัครสมาชิกสำเร็จ! กำลังพาไปหน้าแดชบอร์ด...");
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } else {
      setError(result.message);
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <div className="min-h-screen flex">
        {/* Left Side - Hospital Info */}
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center relative">
          <div
            className="absolute inset-0 bg-gradient-to-br from-green-600 to-blue-600"
            style={{
              backgroundImage: `url('/images/login-bg.png')`,
              backgroundBlendMode: "overlay",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="relative z-10 p-12 text-white text-center">
            <div className="mb-8">
              <HeartIcon className="w-16 h-16 mx-auto mb-4 text-white" />
              <h1 className="text-4xl font-bold mb-4">ยินดีต้อนรับ</h1>
              <p className="text-xl mb-6 opacity-90">
                {siteConfig.hospitalName}
              </p>
              <p className="text-lg opacity-75 max-w-md mx-auto">
                เข้าร่วมกับเราในการพัฒนาระบบดิจิทัล
                เพื่อการให้บริการที่มีคุณภาพและประสิทธิภาพ
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 max-w-sm mx-auto">
              <div className="text-center bg-white bg-opacity-10 rounded-lg p-4">
                <BuildingOfficeIcon className="w-8 h-8 mx-auto mb-2" />
                <div className="text-lg font-semibold">ระบบที่ทันสมัย</div>
                <div className="text-sm opacity-75">เทคโนโลยีล่าสุด</div>
              </div>
              <div className="text-center bg-white bg-opacity-10 rounded-lg p-4">
                <IdentificationIcon className="w-8 h-8 mx-auto mb-2" />
                <div className="text-lg font-semibold">ความปลอดภัย</div>
                <div className="text-sm opacity-75">การรักษาความปลอดภัย</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Register Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <Card className="w-full max-w-md shadow-2xl border-0">
            <CardHeader className="pb-0 pt-6 px-6 flex-col items-center">
              {/* Logo */}
              <div className="w-20 h-20 mb-4">
                <Image
                  src="/images/logo.png"
                  alt={siteConfig.hospitalName}
                  width={80}
                  height={80}
                  className="w-full h-full object-contain rounded-full shadow-lg"
                  priority
                />
              </div>

              {/* Title */}
              <div className="text-center mb-4">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  สมัครสมาชิก
                </h1>
                <p className="text-gray-600">{siteConfig.projectName}</p>
                <p className="text-sm text-gray-500">
                  {siteConfig.hospitalName}
                </p>
              </div>

              {/* Progress */}
              <div className="w-full max-w-xs mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>ขั้นตอน {step} จาก 2</span>
                  <span>{step === 1 ? "ข้อมูลบัญชี" : "ข้อมูลส่วนตัว"}</span>
                </div>
                <Progress
                  value={step * 50}
                  color="primary"
                  className="w-full"
                />
              </div>
            </CardHeader>

            <CardBody className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {step === 1 && (
                  <>
                    {/* Email Field */}
                    <Input
                      type="email"
                      label="อีเมล"
                      placeholder="กรอกอีเมลของคุณ"
                      value={formData.email}
                      onChange={(e) =>
                        handleInputChange("email", e.target.value)
                      }
                      required
                      variant="bordered"
                      startContent={
                        <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                      }
                      className="w-full"
                      classNames={{
                        input: "text-sm",
                        inputWrapper: "border-gray-300 focus:border-blue-500",
                      }}
                    />

                    {/* Password Field */}
                    <Input
                      type={isVisible ? "text" : "password"}
                      label="รหัสผ่าน"
                      placeholder="กรอกรหัสผ่านของคุณ (อย่างน้อย 6 ตัวอักษร)"
                      value={formData.password}
                      onChange={(e) =>
                        handleInputChange("password", e.target.value)
                      }
                      required
                      variant="bordered"
                      startContent={
                        <KeyIcon className="w-4 h-4 text-gray-400" />
                      }
                      endContent={
                        <button
                          className="focus:outline-none"
                          type="button"
                          onClick={toggleVisibility}
                        >
                          {isVisible ? (
                            <EyeSlashIcon className="w-4 h-4 text-gray-400" />
                          ) : (
                            <EyeIcon className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      }
                      className="w-full"
                      classNames={{
                        input: "text-sm",
                        inputWrapper: "border-gray-300 focus:border-blue-500",
                      }}
                    />

                    {/* Password Strength */}
                    {formData.password && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            ความแข็งแรงของรหัสผ่าน
                          </span>
                          <span
                            className={`text-sm font-medium ${
                              passwordStrength.color === "success"
                                ? "text-green-600"
                                : passwordStrength.color === "warning"
                                  ? "text-yellow-600"
                                  : "text-red-600"
                            }`}
                          >
                            {passwordStrength.feedback}
                          </span>
                        </div>
                        <Progress
                          value={passwordStrength.score}
                          color={passwordStrength.color}
                          className="w-full"
                          size="sm"
                        />
                      </div>
                    )}

                    {/* Confirm Password Field */}
                    <Input
                      type={isConfirmVisible ? "text" : "password"}
                      label="ยืนยันรหัสผ่าน"
                      placeholder="กรอกรหัสผ่านอีกครั้ง"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        handleInputChange("confirmPassword", e.target.value)
                      }
                      required
                      variant="bordered"
                      startContent={
                        <KeyIcon className="w-4 h-4 text-gray-400" />
                      }
                      endContent={
                        <div className="flex items-center gap-2">
                          {formData.confirmPassword &&
                            (formData.password === formData.confirmPassword ? (
                              <CheckCircleIcon className="w-4 h-4 text-green-500" />
                            ) : (
                              <XCircleIcon className="w-4 h-4 text-red-500" />
                            ))}
                          <button
                            className="focus:outline-none"
                            type="button"
                            onClick={toggleConfirmVisibility}
                          >
                            {isConfirmVisible ? (
                              <EyeSlashIcon className="w-4 h-4 text-gray-400" />
                            ) : (
                              <EyeIcon className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                        </div>
                      }
                      className="w-full"
                      classNames={{
                        input: "text-sm",
                        inputWrapper: "border-gray-300 focus:border-blue-500",
                      }}
                    />
                  </>
                )}

                {step === 2 && (
                  <>
                    {/* Display Name */}
                    <Input
                      type="text"
                      label="ชื่อที่ใช้แสดง"
                      placeholder="กรอกชื่อที่ใช้แสดงในระบบ"
                      value={formData.name}
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
                      required
                      variant="bordered"
                      startContent={
                        <UserIcon className="w-4 h-4 text-gray-400" />
                      }
                      className="w-full"
                      classNames={{
                        input: "text-sm",
                        inputWrapper: "border-gray-300 focus:border-blue-500",
                      }}
                    />

                    {/* First Name */}
                    <Input
                      type="text"
                      label="ชื่อจริง"
                      placeholder="กรอกชื่อจริงของคุณ"
                      value={formData.firstName}
                      onChange={(e) =>
                        handleInputChange("firstName", e.target.value)
                      }
                      required
                      variant="bordered"
                      startContent={
                        <IdentificationIcon className="w-4 h-4 text-gray-400" />
                      }
                      className="w-full"
                      classNames={{
                        input: "text-sm",
                        inputWrapper: "border-gray-300 focus:border-blue-500",
                      }}
                    />

                    {/* Last Name */}
                    <Input
                      type="text"
                      label="นามสกุล"
                      placeholder="กรอกนามสกุลของคุณ"
                      value={formData.lastName}
                      onChange={(e) =>
                        handleInputChange("lastName", e.target.value)
                      }
                      required
                      variant="bordered"
                      startContent={
                        <IdentificationIcon className="w-4 h-4 text-gray-400" />
                      }
                      className="w-full"
                      classNames={{
                        input: "text-sm",
                        inputWrapper: "border-gray-300 focus:border-blue-500",
                      }}
                    />

                    {/* Department */}
                    <Select
                      label="แผนก"
                      placeholder="เลือกแผนกของคุณ"
                      selectedKeys={
                        formData.department ? [formData.department] : []
                      }
                      onSelectionChange={(keys) => {
                        const value = Array.from(keys)[0] as string;
                        handleInputChange("department", value);
                      }}
                      variant="bordered"
                      startContent={
                        <BuildingOfficeIcon className="w-4 h-4 text-gray-400" />
                      }
                      className="w-full"
                      classNames={{
                        trigger: "border-gray-300 focus:border-blue-500",
                      }}
                    >
                      {departments.map((dept) => (
                        <SelectItem key={dept.value}>{dept.label}</SelectItem>
                      ))}
                    </Select>

                    {/* Position */}
                    <Input
                      type="text"
                      label="ตำแหน่ง"
                      placeholder="กรอกตำแหน่งงานของคุณ (ไม่บังคับ)"
                      value={formData.position}
                      onChange={(e) =>
                        handleInputChange("position", e.target.value)
                      }
                      variant="bordered"
                      startContent={
                        <IdentificationIcon className="w-4 h-4 text-gray-400" />
                      }
                      className="w-full"
                      classNames={{
                        input: "text-sm",
                        inputWrapper: "border-gray-300 focus:border-blue-500",
                      }}
                    />
                  </>
                )}

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}

                {/* Success Message */}
                {success && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-green-600 text-sm">{success}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4">
                  {step === 1 && (
                    <Button
                      type="button"
                      color="primary"
                      className="w-full font-medium py-6 text-lg"
                      onClick={handleNextStep}
                    >
                      ถัดไป
                    </Button>
                  )}

                  {step === 2 && (
                    <>
                      <Button
                        type="button"
                        variant="bordered"
                        className="w-full font-medium py-6 text-lg"
                        onClick={handlePrevStep}
                      >
                        ย้อนกลับ
                      </Button>
                      <Button
                        type="submit"
                        color="success"
                        className="w-full font-medium py-6 text-lg"
                        isLoading={isLoading}
                        disabled={isLoading}
                        spinner={<Spinner color="white" size="sm" />}
                      >
                        {isLoading ? "กำลังสมัครสมาชิก..." : "สมัครสมาชิก"}
                      </Button>
                    </>
                  )}
                </div>
              </form>

              {/* Divider */}
              <div className="flex items-center my-6">
                <Divider className="flex-1" />
                <span className="px-3 text-gray-400 text-sm">หรือ</span>
                <Divider className="flex-1" />
              </div>

              {/* Login Link */}
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  มีบัญชีแล้ว?{" "}
                  <HeroLink
                    as={Link}
                    href="/auth/login"
                    color="primary"
                    className="font-medium"
                  >
                    เข้าสู่ระบบ
                  </HeroLink>
                </p>
              </div>

              {/* Home Link */}
              <div className="text-center">
                <HeroLink
                  as={Link}
                  href="/"
                  color="foreground"
                  className="text-sm font-medium flex items-center justify-center gap-2"
                >
                  <HomeIcon className="w-4 h-4" />
                  กลับหน้าหลัก
                </HeroLink>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
