import type { ProfileDTO } from '@/types/profile';

export interface ProfileEditableFields {
  displayName: string;
  phone: string;
  mobile: string;
  role: string;
  personTypeId: string | null;
  positionId: string | null;
  departmentId: string | null;
  departmentSubId: string | null;
  departmentSubSubId: string | null;
}

export interface HrdOption {
  key: string;
  label: string;
}

export interface ProfileClientProps {
  initialProfile: ProfileDTO;
}
