import type { Selection } from "@react-types/shared";

import { PorterRequestFormData } from "./index";

export type JobListTab = "waiting" | "in-progress" | "completed" | "cancelled";

export interface PorterJobItem {
  id: string;
  status: JobListTab;
  form: PorterRequestFormData;
  assignedTo?: string; // ID หรือชื่อผู้ดำเนินการ
  assignedToName?: string; // ชื่อผู้ดำเนินการสำหรับแสดงผล
}

export interface JobTableProps {
  items: PorterJobItem[];
  sortedJobs: PorterJobItem[];
  currentPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  rowsPerPage: number;
  paginationId: string;
  selectedKeys?: Selection;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rows: number) => void;
  onSelectionChange?: (keys: Selection) => void;
}
