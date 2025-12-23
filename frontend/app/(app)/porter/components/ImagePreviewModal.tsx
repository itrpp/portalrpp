"use client";

import React from "react";
import Image from "next/image";
import { Modal, ModalContent, ModalBody } from "@heroui/react";

/**
 * Props สำหรับ ImagePreviewModal
 */
interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  alt?: string;
}

/**
 * Modal สำหรับแสดงรูปภาพแบบขยาย
 */
export default function ImagePreviewModal({
  isOpen,
  onClose,
  imageUrl,
  alt = "รูปภาพ",
}: ImagePreviewModalProps) {
  return (
    <Modal
      classNames={{
        base: "max-w-3xl",
        body: "p-6",
      }}
      isOpen={isOpen}
      size="2xl"
      onClose={onClose}
    >
      <ModalContent>
        <ModalBody className="p-6">
          <div className="relative w-full flex items-center justify-center">
            {imageUrl && (
              <Image
                unoptimized
                alt={alt}
                className="max-w-full max-h-[70vh] w-auto h-auto object-contain rounded-lg"
                height={800}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
                src={imageUrl}
                width={1200}
              />
            )}
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
