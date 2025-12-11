'use client';

import React from 'react';
import { Card, CardHeader, CardBody } from "@heroui/react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { VolumeStat } from '../utils';

interface VolumeStatsProps {
    data: VolumeStat[];
}

export const VolumeStats: React.FC<VolumeStatsProps> = ({ data }) => {
    return (
        <Card className="h-[400px]">
            <CardHeader className="flex gap-3">
                <div className="flex flex-col">
                    <p className="text-md font-bold">ปริมาณงานรายวัน</p>
                    <p className="text-small text-default-500">แยกตามระดับความเร่งด่วน (สะสม)</p>
                </div>
            </CardHeader>
            <CardBody>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        margin={{
                            top: 20,
                            right: 30,
                            left: 20,
                            bottom: 5,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                            content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                    const d = payload[0].payload as VolumeStat;
                                    return (
                                        <div className="bg-white p-3 rounded-lg shadow-lg border border-default-100">
                                            <p className="font-bold mb-2">{label}</p>
                                            <div className="flex flex-col gap-1 text-small">
                                                <div className="flex justify-between gap-4">
                                                    <span className="text-default-500">รวมทั้งหมด:</span>
                                                    <span className="font-bold">{d.total}</span>
                                                </div>
                                                <div className="w-full h-px bg-default-100 my-1"></div>
                                                <div className="flex justify-between gap-4">
                                                    <span style={{ color: '#f31260' }}>▪ ฉุกเฉิน:</span>
                                                    <span>{d.emergency}</span>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                    <span style={{ color: '#f5a524' }}>▪ ด่วน:</span>
                                                    <span>{d.urgent}</span>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                    <span style={{ color: '#17c964' }}>▪ ปกติ:</span>
                                                    <span>{d.normal}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Bar dataKey="normal" name="ปกติ" stackId="a" fill="#17c964" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="urgent" name="ด่วน" stackId="a" fill="#f5a524" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="emergency" name="ฉุกเฉิน" stackId="a" fill="#f31260" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </CardBody>
        </Card>
    );
};
