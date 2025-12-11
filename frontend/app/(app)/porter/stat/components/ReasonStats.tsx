'use client';

import React from 'react';
import { Card, CardHeader, CardBody } from "@heroui/react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { ReasonStat } from '../utils';

interface ReasonStatsProps {
    data: ReasonStat[];
}

export const ReasonStats: React.FC<ReasonStatsProps> = ({ data }) => {
    // Sort data from high to low
    const sortedData = [...data].sort((a, b) => b.value - a.value);
    const total = sortedData.reduce((sum, item) => sum + item.value, 0);

    return (
        <Card className="h-[400px]">
            <CardHeader className="flex gap-3">
                <div className="flex flex-col">
                    <p className="text-md font-bold">เหตุผลการเคลื่อนย้าย (Top 5)</p>
                    <p className="text-small text-default-500">จำแนกตามวัตถุประสงค์</p>
                </div>
            </CardHeader>
            <CardBody>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={sortedData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            fill="#8884d8"
                            paddingAngle={5}
                            dataKey="value"
                            label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                                const RADIAN = Math.PI / 180;
                                // Add defaults to avoid TS errors
                                const rInner = innerRadius || 60;
                                const rOuter = outerRadius || 100;
                                const angle = midAngle || 0;
                                const pct = percent || 0;

                                const radius = 25 + rInner + (rOuter - rInner);
                                const x = cx + radius * Math.cos(-angle * RADIAN);
                                const y = cy + radius * Math.sin(-angle * RADIAN);

                                return (
                                    <text
                                        x={x}
                                        y={y}
                                        fill="#666"
                                        textAnchor={x > cx ? 'start' : 'end'}
                                        dominantBaseline="central"
                                        fontSize="10px"
                                    >
                                        {/* Removed label text from Pie itself as it is now in Legend, or keeping just % as requested? 
                                            User asked for Legend to show %, and cut text in parenthesis. 
                                            They didn't explicitly ask to remove on-chart labels, but usually clean look is better.
                                            Wait, existing code shows % in label. I'll keep it as is for now unless it conflicts.
                                         */}
                                        {`${(pct * 100).toFixed(0)}%`}
                                    </text>
                                );
                            }}
                        >
                            {sortedData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color || '#8884d8'} />
                            ))}
                        </Pie>
                        <Tooltip
                            wrapperStyle={{ fontSize: '10px' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend
                            layout="vertical"
                            verticalAlign="middle"
                            align="right"
                            formatter={(value, entry: any) => {
                                const { payload } = entry;
                                const percent = total > 0 ? (payload.value / total) * 100 : 0;
                                // Remove text in parentheses
                                const cleanName = value.replace(/\s*\(.*?\)\s*/g, '');
                                return <span className="text-small text-default-500">{cleanName} {percent.toFixed(0)}%</span>;
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </CardBody>
        </Card>
    );
};
