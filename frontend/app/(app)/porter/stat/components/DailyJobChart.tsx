"use client";

import React from "react";
import { Card, CardBody, CardHeader } from "@heroui/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface DailyJobChartProps {
  data: Array<{
    date: string;
    ปกติ: number;
    ด่วน: number;
    ฉุกเฉิน: number;
    ยอดรวม: number;
  }>;
}

export function DailyJobChart({ data }: DailyJobChartProps) {
  // แปลงวันที่เป็นรูปแบบที่อ่านง่าย (เช่น "1 ม.ค.")
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.getMonth() + 1;

    const monthNames = [
      "ม.ค.",
      "ก.พ.",
      "มี.ค.",
      "เม.ย.",
      "พ.ค.",
      "มิ.ย.",
      "ก.ค.",
      "ส.ค.",
      "ก.ย.",
      "ต.ค.",
      "พ.ย.",
      "ธ.ค.",
    ];

    return `${day} ${monthNames[month - 1]}`;
  };

  const chartData = data.map((item) => ({
    date: formatDate(item.date),
    dateFull: item.date,
    ปกติ: item.ปกติ,
    ด่วน: item.ด่วน,
    ฉุกเฉิน: item.ฉุกเฉิน,
    ยอดรวม: item.ยอดรวม,
  }));

  return (
    <Card className="shadow-lg border border-default-200">
      <CardHeader className="pb-0">
        <h3 className="text-lg font-semibold text-foreground">
          ปริมาณงานรายวัน (ย้อนหลัง 30 วัน)
        </h3>
      </CardHeader>
      <CardBody className="pt-4">
        <ResponsiveContainer height={400} width="100%">
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 40 }}
          >
            <CartesianGrid stroke="#e0e0e0" strokeDasharray="3 3" />
            <XAxis
              angle={-45}
              dataKey="date"
              height={60}
              stroke="#888"
              style={{ fontSize: "11px" }}
              textAnchor="end"
            />
            <YAxis stroke="#888" style={{ fontSize: "12px" }} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  const ปกติ = data.ปกติ || 0;
                  const ด่วน = data.ด่วน || 0;
                  const ฉุกเฉิน = data.ฉุกเฉิน || 0;
                  const ยอดรวม = data.ยอดรวม || 0;

                  return (
                    <div
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        border: "1px solid #e0e0e0",
                        borderRadius: "8px",
                        padding: "12px",
                      }}
                    >
                      <p style={{ fontWeight: "bold", marginBottom: "8px" }}>
                        {label}
                      </p>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <div
                            style={{
                              width: "12px",
                              height: "12px",
                              backgroundColor: "#22c55e",
                              borderRadius: "2px",
                            }}
                          />
                          <span>ปกติ: {ปกติ}</span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <div
                            style={{
                              width: "12px",
                              height: "12px",
                              backgroundColor: "#f59e0b",
                              borderRadius: "2px",
                            }}
                          />
                          <span>ด่วน: {ด่วน}</span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <div
                            style={{
                              width: "12px",
                              height: "12px",
                              backgroundColor: "#ef4444",
                              borderRadius: "2px",
                            }}
                          />
                          <span>ฉุกเฉิน: {ฉุกเฉิน}</span>
                        </div>
                        <div
                          style={{
                            marginTop: "8px",
                            paddingTop: "8px",
                            borderTop: "1px solid #e0e0e0",
                            fontWeight: "bold",
                          }}
                        >
                          ยอดรวม: {ยอดรวม}
                        </div>
                      </div>
                    </div>
                  );
                }

                return null;
              }}
            />
            <Legend />
            <Bar dataKey="ปกติ" fill="#22c55e" name="ปกติ" stackId="a" />
            <Bar dataKey="ด่วน" fill="#f59e0b" name="ด่วน" stackId="a" />
            <Bar dataKey="ฉุกเฉิน" fill="#ef4444" name="ฉุกเฉิน" stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </CardBody>
    </Card>
  );
}
