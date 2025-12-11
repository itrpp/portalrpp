'use client';

import React from 'react';
import { Card, CardHeader, CardBody } from "@heroui/react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { UrgencyStat } from '../utils';

interface UrgencyStatsProps {
    data: UrgencyStat[];
}

export const UrgencyStats: React.FC<UrgencyStatsProps> = ({ data }) => {
    return (
        <Card className="h-[400px]">
            <CardHeader className="flex gap-3">
                <div className="flex flex-col">
                    <p className="text-md font-bold">สัดส่วนความเร่งด่วน</p>
                    <p className="text-small text-default-500">ภาพรวมงานทั้งหมด</p>
                </div>
            </CardHeader>
            <CardBody>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            fill="#8884d8"
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                </ResponsiveContainer>
            </CardBody>
        </Card>
    );
};
