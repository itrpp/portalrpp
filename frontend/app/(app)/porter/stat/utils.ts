import { PorterJobItem } from "@/types/porter";

export interface VolumeStat {
    date: string;
    total: number;
    urgent: number;
    emergency: number;
    normal: number;
    rawDate: string; // for sorting
    [key: string]: any;
}

export interface StaffStat {
    id: string;
    name: string;
    totalJobs: number;
    avgTime: number; // minutes
    [key: string]: any;
}

export interface LocationStat {
    name: string;
    count: number;
    percentage: number;
    [key: string]: any;
}

export interface UrgencyStat {
    name: string;
    value: number;
    color: string;
    [key: string]: any;
}

// Fetch all requests (can add date range params later)
export async function fetchPorterStatsData(): Promise<PorterJobItem[]> {
    try {
        // Fetch a large number to get a good dataset for stats
        // In a real production app with massive data, we should use a dedicated stats API
        const response = await fetch('/api/porter/requests?page_size=1000');
        if (!response.ok) {
            throw new Error('Failed to fetch data');
        }
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
            return result.data as PorterJobItem[];
        }
        return [];
    } catch (error) {
        console.error("Error fetching porter stats data:", error);
        return [];
    }
}

export function aggregateVolumeStats(jobs: PorterJobItem[], days: number = 7): VolumeStat[] {
    const stats: Record<string, VolumeStat> = {};
    const today = new Date();

    // Initialize last 'days' days with 0
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateKey = d.toISOString().split('T')[0];
        const displayDate = d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' });

        stats[dateKey] = {
            date: displayDate,
            rawDate: dateKey,
            total: 0,
            urgent: 0,
            emergency: 0,
            normal: 0
        };
    }

    jobs.forEach(job => {
        if (!job.createdAt) return;
        const dateKey = job.createdAt.split('T')[0];

        // Only count if within our initialized range
        if (stats[dateKey]) {
            stats[dateKey].total++;

            const urgency = job.form.urgencyLevel;
            if (urgency === 'ฉุกเฉิน') stats[dateKey].emergency++;
            else if (urgency === 'ด่วน') stats[dateKey].urgent++;
            else stats[dateKey].normal++;
        }
    });

    return Object.values(stats).sort((a, b) => a.rawDate.localeCompare(b.rawDate));
}

export function aggregateUrgencyStats(jobs: PorterJobItem[]): UrgencyStat[] {
    let normal = 0;
    let urgent = 0;
    let emergency = 0;

    jobs.forEach(job => {
        const urgency = job.form.urgencyLevel;
        if (urgency === 'ฉุกเฉิน') emergency++;
        else if (urgency === 'ด่วน') urgent++;
        else normal++; // Default to normal if unspecified or "ปกติ"
    });

    return [
        { name: 'ปกติ', value: normal, color: '#17c964' }, // success
        { name: 'ด่วน', value: urgent, color: '#f5a524' },  // warning
        { name: 'ฉุกเฉิน', value: emergency, color: '#f31260' }, // danger
    ];
}

export interface ReasonStat {
    name: string;
    value: number;
    color?: string;
    [key: string]: any;
}

export function aggregateReasonStats(jobs: PorterJobItem[]): ReasonStat[] {
    const reasonMap: Record<string, number> = {};
    let total = 0;

    jobs.forEach(job => {
        const reason = job.form.transportReason || "ไม่ระบุ";
        reasonMap[reason] = (reasonMap[reason] || 0) + 1;
        total++;
    });

    // Colors for reasoning (palette)
    const colors = [
        '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8',
        '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'
    ];

    return Object.entries(reasonMap)
        .map(([name, value], index) => ({
            name,
            value,
            color: colors[index % colors.length]
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5); // Top 5 reasons
}

export function aggregateStaffStats(jobs: PorterJobItem[]): StaffStat[] {
    const staffMap: Record<string, StaffStat> = {};
    const completedJobs = jobs.filter(j => j.status === 'completed' && j.assignedToName);

    completedJobs.forEach(job => {
        const staffId = job.assignedTo || 'unknown';
        const staffName = job.assignedToName || 'Unknown';

        if (!staffMap[staffId]) {
            staffMap[staffId] = { id: staffId, name: staffName, totalJobs: 0, avgTime: 0 };
        }

        staffMap[staffId].totalJobs++;

        // Calculate time if available (completedAt - acceptedAt or startedAt)
        // For now, we'll simulate or skip logic if data is missing, 
        // but ideally: (new Date(job.completedAt).getTime() - new Date(job.acceptedAt).getTime()) / 60000
        // Let's assume we don't have perfect timestamps for duration in this mock-like real data yet
    });

    return Object.values(staffMap).sort((a, b) => b.totalJobs - a.totalJobs).slice(0, 10);
}

export function aggregateLocationStats(jobs: PorterJobItem[]): LocationStat[] {
    const locMap: Record<string, number> = {};
    let totalWithLoc = 0;

    jobs.forEach(job => {
        // Count both Pickup and Delivery locations
        const pickupLoc = job.form.pickupLocationDetail;
        const deliveryLoc = job.form.deliveryLocationDetail;

        if (pickupLoc?.floorDepartmentName) {
            const name = pickupLoc.buildingName
                ? `${pickupLoc.buildingName} -> ${pickupLoc.floorDepartmentName}`
                : pickupLoc.floorDepartmentName;
            locMap[name] = (locMap[name] || 0) + 1;
            totalWithLoc++;
        }

        if (deliveryLoc?.floorDepartmentName) {
            const name = deliveryLoc.buildingName
                ? `${deliveryLoc.buildingName} -> ${deliveryLoc.floorDepartmentName}`
                : deliveryLoc.floorDepartmentName;
            locMap[name] = (locMap[name] || 0) + 1;
            totalWithLoc++;
        }
    });

    const stats: LocationStat[] = Object.entries(locMap).map(([name, count]) => ({
        name,
        count,
        percentage: totalWithLoc > 0 ? Math.round((count / totalWithLoc) * 100) : 0
    }));

    return stats.sort((a, b) => b.count - a.count).slice(0, 10);
}
