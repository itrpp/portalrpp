import JobListClient from "./JobListClient";

/**
 * หน้ารายการคำขอรับพนักงานเปล – Server Component
 * แสดง UI ผ่าน JobListClient (Client Component) สำหรับ state, SSE, ตาราง และ drawer
 */
export default function PorterJobListPage() {
  return <JobListClient />;
}
