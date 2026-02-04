"use client";

import React from "react";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";

import { AmbulanceIcon, InfoCircleIcon } from "@/components/ui/icons";

interface EmergencyConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * รายการอาการที่เข้าข่ายเคสฉุกเฉิน
 */
const EMERGENCY_SYMPTOMS = [
  "หมดสติ ไม่รู้สึกตัว",
  "หยุดหายใจ / หายใจลำบากรุนแรง",
  "เจ็บหน้าอกรุนแรง แน่น อึดอัด",
  "ชัก ไม่หยุด หรือชักแล้วไม่ฟื้น",
  "แขนขาอ่อนแรง พูดไม่ชัด ซึมลง (สงสัย Stroke)",
  "เลือดออกมาก ควบคุมไม่ได้",
  "อุบัติเหตุรุนแรง (ศีรษะ หน้าอก ช่องท้อง)",
  "ไข้สูงร่วมกับซึม คอแข็ง (สงสัยติดเชื้อรุนแรง)",
];

/**
 * Modal สำหรับยืนยันการเลือกความเร่งด่วน "ฉุกเฉิน"
 */
export default function EmergencyConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
}: EmergencyConfirmationModalProps) {
  return (
    <Modal isOpen={isOpen} size="lg" onClose={onClose}>
      <ModalContent>
        <ModalHeader>
          <div className="flex items-center gap-2">
            <AmbulanceIcon className="w-5 h-5 text-danger" />
            <h3 className="text-lg font-semibold text-foreground">
              ยืนยันการเลือกความเร่งด่วน &quot;ฉุกเฉิน&quot;
            </h3>
          </div>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div className="bg-danger-50 dark:bg-danger-900/20 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <InfoCircleIcon className="w-5 h-5 text-danger-600 dark:text-danger-400 mt-0.5 shrink-0" />
                <div className="text-sm text-danger-800 dark:text-danger-200">
                  <p className="font-medium">
                    เจ้าหน้าที่เปล จะถึงจุดรับภายใน 5 นาที
                    และจะต้องเป็นเคสฉุกเฉิน
                  </p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground mb-3">
                ลักษณะอาการที่เข้าข่ายเคสฉุกเฉิน:
              </p>
              <ul className="space-y-2">
                {EMERGENCY_SYMPTOMS.map((symptom, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-default-700 dark:text-default-300"
                  >
                    <span className="text-danger-500 dark:text-danger-400 mt-1.5 shrink-0">
                      •
                    </span>
                    <span>{symptom}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-warning-50 dark:bg-warning-900/20 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <InfoCircleIcon className="w-5 h-5 text-warning-600 dark:text-warning-400 mt-0.5 shrink-0" />
                <div className="text-sm text-warning-800 dark:text-warning-200">
                  <p className="font-medium">
                    กรุณาตรวจสอบว่าผู้ป่วยมีอาการเข้าข่ายเคสฉุกเฉินตามรายการข้างต้น
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            ยกเลิก
          </Button>
          <Button
            color="danger"
            startContent={<AmbulanceIcon className="w-4 h-4" />}
            onPress={onConfirm}
          >
            ยืนยัน
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
