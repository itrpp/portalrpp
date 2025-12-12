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
} from "recharts";

import { useFilteredJobs } from "../hooks/useFilteredJobs";

import { FilterState } from "./StatFilter";

import { PorterJobItem } from "@/types/porter";
import { formatLocationString } from "@/types/porter";

interface PopularLocationChartProps {
  title: string;
  data: Array<{ location: string; count: number }>;
  color?: string;
  jobs?: PorterJobItem[];
  filterState?: FilterState | null;
  locationType: "pickup" | "delivery";
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
      <p
        style={{
          margin: "0 0 8px 0",
          fontWeight: "600",
          color: "#333",
          fontSize: "12px",
        }}
      >
        {locationFull}
      </p>
      <p style={{ margin: 0, color: "#666", fontSize: "12px" }}>
        {count} ครั้ง ({percent}%)
      </p>
    </div>
  );
};

export function PopularLocationChart({
  title,
  data,
  color = "#0070f3",
  jobs,
  filterState,
  locationType,
}: PopularLocationChartProps) {
  // ใช้ shared filtered jobs hook เพื่อลดการ filter ซ้ำซ้อน
  const filteredJobs = useFilteredJobs(jobs, filterState);

  // ถ้ามี jobs และ filterState ให้คำนวณข้อมูลใหม่ (Optimized)
  const filteredData = useMemo(() => {
    if (!filteredJobs || filteredJobs.length === 0 || !filterState) {
      return data;
    }

    // Cache สำหรับ location strings
    const locationStringCache = new Map<string, string>();
    const locationMap = new Map<string, number>();

    // Single pass: คำนวณ popular locations จาก filtered jobs
    for (const job of filteredJobs) {
      const locationDetail =
        locationType === "pickup"
          ? job.form.pickupLocationDetail
          : job.form.deliveryLocationDetail;

      // ใช้ cache สำหรับ location string
      const locationKey = JSON.stringify(locationDetail);
      let locationStr = locationStringCache.get(locationKey);

      if (!locationStr) {
        locationStr = formatLocationString(locationDetail);
        locationStringCache.set(locationKey, locationStr);
      }

      if (locationStr) {
        locationMap.set(locationStr, (locationMap.get(locationStr) || 0) + 1);
      }
    }

    return Array.from(locationMap.entries())
      .map(([location, count]) => ({
        location,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredJobs, filterState, locationType, data]);

  const totalCount = useMemo(
    () => filteredData.reduce((sum, item) => sum + item.count, 0),
    [filteredData],
  );

  const chartData = useMemo(
    () =>
      filteredData.map((item) => ({
        location:
          item.location.length > 40
            ? `${item.location.substring(0, 40)}...`
            : item.location,
        locationFull: item.location,
        count: item.count,
      })),
    [filteredData],
  );

  return (
    <Card className="shadow-md border border-default-200 hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="pb-0">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <div
            className="w-1 h-6 rounded-full"
            style={{ backgroundColor: color }}
          />
          {title}
        </h3>
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
            {/* <Legend /> */}
            <Bar
              dataKey="count"
              fill={color}
              label={{ position: "right", style: { fontSize: "10px" } }}
              name="จำนวนงาน"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardBody>
    </Card>
  );
}
