"use client";

import React, { useMemo } from "react";
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

interface PopularLocationChartProps {
  title: string;
  data: Array<{ location: string; count: number }>;
  color?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      locationFull: string;
      count: number;
    };
    value: number;
  }>;
  totalCount: number;
}

const CustomTooltip = ({ active, payload, totalCount }: CustomTooltipProps) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0];
  const count = data.value;
  const percent =
    totalCount > 0 ? ((count / totalCount) * 100).toFixed(1) : "0.0";
  const locationFull = data.payload.locationFull;

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
      <p style={{ margin: "0 0 8px 0", fontWeight: "600", color: "#333" }}>
        {locationFull}
      </p>
      <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>
        {count} ครั้ง ({percent}%)
      </p>
    </div>
  );
};

export function PopularLocationChart({
  title,
  data,
  color = "#0070f3",
}: PopularLocationChartProps) {
  const totalCount = useMemo(
    () => data.reduce((sum, item) => sum + item.count, 0),
    [data],
  );

  const chartData = data.map((item) => ({
    location:
      item.location.length > 40
        ? `${item.location.substring(0, 40)}...`
        : item.location,
    locationFull: item.location,
    count: item.count,
  }));

  return (
    <Card className="shadow-lg border border-default-200">
      <CardHeader className="pb-0">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      </CardHeader>
      <CardBody className="pt-4">
        <ResponsiveContainer height={400} width="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 50, bottom: 5 }}
          >
            <CartesianGrid stroke="#e0e0e0" strokeDasharray="3 3" />
            <XAxis stroke="#888" style={{ fontSize: "12px" }} type="number" />
            <YAxis
              dataKey="location"
              stroke="#888"
              style={{ fontSize: "11px" }}
              type="category"
              width={100}
            />
            <Tooltip content={<CustomTooltip totalCount={totalCount} />} />
            <Legend />
            <Bar dataKey="count" fill={color} name="จำนวนงาน" />
          </BarChart>
        </ResponsiveContainer>
      </CardBody>
    </Card>
  );
}
