'use client';

import React, { useEffect, useState } from 'react';
import { Breadcrumbs, BreadcrumbItem, Button, Spinner, DateRangePicker } from "@heroui/react";
import { Icon } from "@iconify/react";
import {
    fetchPorterStatsData,
    aggregateVolumeStats,
    aggregateStaffStats,
    aggregateLocationStats,
    aggregateReasonStats,
    VolumeStat,
    StaffStat,
    LocationStat,
    ReasonStat
} from './utils';

import { VolumeStats } from './components/VolumeStats';
import { StaffStats } from './components/StaffStats';
import { LocationStats } from './components/LocationStats';
import { ReasonStats } from './components/ReasonStats';
import { PorterJobItem } from "@/types/porter";

export default function PorterStatsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [rawData, setRawData] = useState<PorterJobItem[]>([]);
    const [volumeData, setVolumeData] = useState<VolumeStat[]>([]);
    const [staffData, setStaffData] = useState<StaffStat[]>([]);
    const [locationData, setLocationData] = useState<LocationStat[]>([]);
    const [reasonData, setReasonData] = useState<ReasonStat[]>([]);

    const loadData = async () => {
        setIsLoading(true);
        const data = await fetchPorterStatsData();
        setRawData(data);

        // Aggregations
        setVolumeData(aggregateVolumeStats(data));
        setStaffData(aggregateStaffStats(data));
        setLocationData(aggregateLocationStats(data));
        setReasonData(aggregateReasonStats(data));

        setIsLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    return (
        <div className="h-full w-full p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center flex-wrap gap-4">
                    <h1 className="text-2xl font-bold">สถิติประสิทธิภาพการให้บริการ (Dashboard)</h1>
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant="flat"
                            color="default"
                            onPress={loadData}
                            isLoading={isLoading}
                            startContent={!isLoading && <Icon icon="solar:refresh-bold" />}
                        >
                            รีเฟรช
                        </Button>
                        <Button startContent={<Icon icon="solar:printer-bold" />} variant="flat" color="primary">
                            พิมพ์รายงาน
                        </Button>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-[400px]">
                    <Spinner size="lg" label="กำลังโหลดข้อมูล..." color="primary" />
                </div>
            ) : (
                /* Main Grid Layout */
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pb-4">

                    {/* Row 1: Volume (Line/Bar) takes 8 cols, Reason (Pie) takes 4 cols */}
                    <div className="md:col-span-8">
                        <VolumeStats data={volumeData} />
                    </div>
                    <div className="md:col-span-4">
                        <ReasonStats data={reasonData} />
                    </div>

                    {/* Row 2: Location takes 6 cols, Staff takes 6 cols */}
                    <div className="md:col-span-6">
                        <LocationStats data={locationData} />
                    </div>
                    <div className="md:col-span-6">
                        <StaffStats data={staffData} />
                    </div>
                </div>
            )}
        </div>
    );
}
