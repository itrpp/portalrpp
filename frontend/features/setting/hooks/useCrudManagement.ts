
export type { CrudItem } from '../types';
export type { UseCrudManagementOptions, UseCrudManagementReturn } from '@/app/(app)/setting/hooks/useCrudManagement';

// Re-export implementation while stabilizing feature-first import paths.
export { useCrudManagement } from '@/app/(app)/setting/hooks/useCrudManagement';
