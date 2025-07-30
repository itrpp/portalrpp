"use client";

import { Spinner } from "@heroui/react";

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-content2 to-content3">
      <div className="text-center">
        <Spinner size="lg" color="primary" />
        <p className="mt-4 text-default-600 dark:text-default-400">
          กำลังโหลด...
        </p>
      </div>
    </div>
  );
} 