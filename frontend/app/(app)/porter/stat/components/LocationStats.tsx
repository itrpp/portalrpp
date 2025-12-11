'use client';

import React from 'react';
import { Card, CardHeader, CardBody, Progress } from "@heroui/react";
import { LocationStat } from '../utils';

interface LocationStatsProps {
    data: LocationStat[];
}

export const LocationStats: React.FC<LocationStatsProps> = ({ data }) => {
    const maxCount = Math.max(...data.map(d => d.count));

    return (
        <Card className="h-[400px]">
            <CardHeader>
                <p className="text-md font-bold">จุดรับ-ส่งยอดนิยม (Top 10)</p>
            </CardHeader>
            <CardBody className="overflow-y-auto">
                <div className="flex flex-col gap-4">
                    {data.map((loc, index) => (
                        <div key={index} className="flex flex-col gap-1">
                            <div className="flex justify-between text-small">
                                <span>{index + 1}. {loc.name}</span>
                                <span className="text-default-500">{loc.count} ครั้ง ({loc.percentage}%)</span>
                            </div>
                            <Progress
                                value={loc.count}
                                maxValue={maxCount}
                                color={index < 3 ? "primary" : "default"}
                                size="sm"
                                aria-label={`Progress for ${loc.name}`}
                            />
                        </div>
                    ))}
                </div>
            </CardBody>
        </Card>
    );
};
