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
  const colorConfig = {
    default: {
      bg: "bg-gradient-to-br from-default-50 to-default-100",
      border: "border-default-200",
      text: "text-default-700",
      iconBg: "bg-default-100",
      iconColor: "text-default-600",
    },
    primary: {
      bg: "bg-gradient-to-br from-primary-50 to-primary-100",
      border: "border-primary-200",
      text: "text-primary-700",
      iconBg: "bg-primary-100",
      iconColor: "text-primary-600",
    },
    success: {
      bg: "bg-gradient-to-br from-success-50 to-success-100",
      border: "border-success-200",
      text: "text-success-700",
      iconBg: "bg-success-100",
      iconColor: "text-success-600",
    },
    warning: {
      bg: "bg-gradient-to-br from-warning-50 to-warning-100",
      border: "border-warning-200",
      text: "text-warning-700",
      iconBg: "bg-warning-100",
      iconColor: "text-warning-600",
    },
    danger: {
      bg: "bg-gradient-to-br from-danger-50 to-danger-100",
      border: "border-danger-200",
      text: "text-danger-700",
      iconBg: "bg-danger-100",
      iconColor: "text-danger-600",
    },
  };

  const config = colorConfig[color];

  return (
    <Card
      className={`border ${config.border} ${config.bg} shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1`}
    >
      <CardBody className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className={`text-sm font-medium ${config.text} mb-2`}>{title}</p>
            <p className={`text-3xl font-bold ${config.text}`}>
              {value.toLocaleString("th-TH")}
            </p>
          </div>
          {icon && (
            <div
              className={`ml-4 p-3 rounded-xl ${config.iconBg} ${config.iconColor} transition-transform duration-300 hover:scale-110`}
            >
              {icon}
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
