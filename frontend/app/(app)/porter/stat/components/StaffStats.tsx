'use client';

import React from 'react';
import { Card, CardHeader, CardBody, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, User } from "@heroui/react";
import { StaffStat } from '../utils';

interface StaffStatsProps {
    data: StaffStat[];
}

export const StaffStats: React.FC<StaffStatsProps> = ({ data }) => {
    return (
        <Card className="h-[400px]">
            <CardHeader>
                <p className="text-md font-bold">ประสิทธิผลรายบุคคล (Top Performers)</p>
            </CardHeader>
            <CardBody>
                <Table removeWrapper aria-label="Staff performance table" isStriped>
                    <TableHeader>
                        <TableColumn>เจ้าหน้าที่</TableColumn>
                        <TableColumn>งานที่ทำได้</TableColumn>
                        <TableColumn>เวลาเฉลี่ย (นาที)</TableColumn>
                    </TableHeader>
                    <TableBody>
                        {data.map((staff) => (
                            <TableRow key={staff.id}>
                                <TableCell>
                                    <User
                                        name={staff.name}
                                        description={`ID: ${staff.id}`}
                                        avatarProps={{
                                            src: `https://i.pravatar.cc/150?u=${staff.id}`,
                                        }}
                                    />
                                </TableCell>
                                <TableCell className="font-bold text-success">{staff.totalJobs}</TableCell>
                                <TableCell>{staff.avgTime} นาที</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardBody>
        </Card>
    );
};
