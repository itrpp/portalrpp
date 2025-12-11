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
  Cell,
} from "recharts";

interface TransportReasonChartProps {
  data: Array<{ reason: string; count: number }>;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

export function TransportReasonChart({ data }: TransportReasonChartProps) {
  const chartData = data.map((item) => ({
    reason:
      item.reason.length > 30
        ? `${item.reason.substring(0, 30)}...`
        : item.reason,
    reasonFull: item.reason,
    count: item.count,
  }));

  return (
    <Card className="shadow-lg border border-default-200">
      <CardHeader className="pb-0">
        <h3 className="text-lg font-semibold text-foreground">
          เหตุผลการเคลื่อนย้าย (Top 5)
        </h3>
      </CardHeader>
      <CardBody className="pt-4">
        <ResponsiveContainer height={300} width="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          >
            <CartesianGrid stroke="#e0e0e0" strokeDasharray="3 3" />
            <XAxis stroke="#888" style={{ fontSize: "12px" }} type="number" />
            <YAxis
              dataKey="reason"
              stroke="#888"
              style={{ fontSize: "12px" }}
              type="category"
              width={10}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                border: "1px solid #e0e0e0",
                borderRadius: "8px",
              }}
              formatter={(value: number, name: string, props: any) => [
                `${value} งาน`,
                props.payload.reasonFull || name,
              ]}
            />
            <Legend />
            <Bar dataKey="count" fill="#0070f3" name="จำนวนงาน">
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardBody>
    </Card>
  );
}
