"use client";

import React, { useMemo } from "react";
import { Card, CardBody, CardHeader } from "@heroui/react";
import {
  PieChart,
  Pie,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";

interface TransportReasonChartProps {
  data: Array<{ reason: string; count: number }>;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      reasonFull: string;
      count: number;
      name: string;
    };
    value: number;
  }>;
  totalCount: number;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

const CustomTooltip = ({ active, payload, totalCount }: CustomTooltipProps) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0];
  const count = data.value;
  const percent =
    totalCount > 0 ? ((count / totalCount) * 100).toFixed(1) : "0.0";
  const reasonFull = data.payload.reasonFull;

  return (
    <div
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        border: "1px solid #e0e0e0",
        borderRadius: "8px",
        padding: "12px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      }}
    >
      <p
        style={{
          margin: "0 0 8px 0",
          fontWeight: "600",
          color: "#333",
          fontSize: "12px",
        }}
      >
        {reasonFull}
      </p>
      <p style={{ margin: 0, color: "#666", fontSize: "12px" }}>
        {count} งาน ({percent}%)
      </p>
    </div>
  );
};

export function TransportReasonChart({ data }: TransportReasonChartProps) {
  const chartData = useMemo(
    () =>
      data.map((item) => ({
        name:
          item.reason.length > 30
            ? `${item.reason.substring(0, 30)}...`
            : item.reason,
        reasonFull: item.reason,
        count: item.count,
        value: item.count,
      })),
    [data],
  );

  const totalCount = useMemo(
    () => chartData.reduce((sum, item) => sum + item.count, 0),
    [chartData],
  );

  return (
    <Card className="shadow-md border border-default-200 hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="pb-0">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <div
            className="w-1 h-6 rounded-full"
            style={{ backgroundColor: "#0070f3" }}
          />
          เหตุผลการเคลื่อนย้าย (Top 5)
        </h3>
      </CardHeader>
      <CardBody className="pt-4">
        <ResponsiveContainer height={400} width="100%">
          <PieChart>
            <Pie
              cornerRadius="10%"
              cx="50%"
              cy="50%"
              data={chartData}
              dataKey="value"
              fill="#8884d8"
              innerRadius={60}
              label={({ percent }) =>
                percent && percent > 0.05
                  ? `${(percent * 100).toFixed(0)}%`
                  : ""
              }
              labelLine={false}
              outerRadius={100}
              paddingAngle={5}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip totalCount={totalCount} />} />
            <Legend
              align="right"
              formatter={(value, entry) => {
                const payload = entry?.payload as
                  | { reasonFull?: string }
                  | undefined;

                return payload?.reasonFull ?? value;
              }}
              layout="vertical"
              verticalAlign="middle"
              wrapperStyle={{
                fontSize: "12px",
                whiteSpace: "normal",
                wordBreak: "break-word",
                overflowWrap: "break-word",
                maxWidth: "200px",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardBody>
    </Card>
  );
}
