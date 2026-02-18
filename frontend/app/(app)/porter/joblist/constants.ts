import type { JobListTab } from '@/types/porter';

export const JOBLIST_TAB_KEYS: JobListTab[] = [
  'waiting',
  'in-progress',
  'completed',
  'cancelled',
];

export function isValidJobListTab(value: string | null): value is JobListTab {
  return value !== null && JOBLIST_TAB_KEYS.includes(value as JobListTab);
}
