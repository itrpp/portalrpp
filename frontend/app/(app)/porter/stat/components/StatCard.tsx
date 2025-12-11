"use client";

import React from "react";
import { Card, CardBody } from "@heroui/react";

interface StatCardProps {
  title: string;
  value: number;
  icon?: React.ReactNode;
  color?: "default" | "primary" | "success" | "warning" | "danger";
}

export function StatCard({
  title,
  value,
  icon,
  color = "default",
}: StatCardProps) {
  const colorClasses = {
    default: "bg-default-100 border-default-200",
    primary: "bg-primary-50 border-primary-200",
    success: "bg-success-50 border-success-200",
    warning: "bg-warning-50 border-warning-200",
    danger: "bg-danger-50 border-danger-200",
  };

  const textColorClasses = {
    default: "text-default-700",
    primary: "text-primary-700",
    success: "text-success-700",
    warning: "text-warning-700",
    danger: "text-danger-700",
  };

  return (
    <Card className={`border ${colorClasses[color]}`}>
      <CardBody className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className={`text-sm font-medium ${textColorClasses[color]}`}>
              {title}
            </p>
            <p className={`text-3xl font-bold mt-2 ${textColorClasses[color]}`}>
              {value.toLocaleString("th-TH")}
            </p>
          </div>
          {icon && (
            <div className={`ml-4 ${textColorClasses[color]} opacity-60`}>
              {icon}
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
