'use client';

import { useCallback } from 'react';
import { Card, CardBody, CardHeader, Checkbox, CheckboxGroup, Input } from '@heroui/react';

import { usePatientLookup } from '../../hooks/usePatientLookup';

import { CARD_STYLES } from '@/lib/cardStyles';
import { cn } from '@/lib/utils';
import { PATIENT_CONDITION_OPTIONS } from '@/lib/porter';
import { PorterRequestFormData } from '@/types/porter';
import {
  UserIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
} from '@/components/ui/icons';

interface Props {
  formData: PorterRequestFormData;
  onChange: <Field extends keyof PorterRequestFormData>(
    field: Field,
    value: PorterRequestFormData[Field],
  ) => void;
}

export function PatientInfoCard({ formData, onChange }: Props) {
  const handlePatientFound = useCallback(
    (patientName: string) => onChange('patientName', patientName),
    [onChange],
  );

  const { searchPatient, isLoading: isLoadingPatient } = usePatientLookup({
    onPatientFound: handlePatientFound,
  });

  const handleClearHN = useCallback(() => {
    onChange('patientHN', '');
    onChange('patientName', '');
  }, [onChange]);

  const handleSearch = useCallback(() => {
    searchPatient(formData.patientHN ?? '');
  }, [searchPatient, formData.patientHN]);

  return (
    <Card className={cn(CARD_STYLES.default, 'w-full')}>
      <CardHeader className="pb-0">
        <div className="flex items-center gap-2">
          <UserIcon className="w-6 h-6 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">ข้อมูลผู้ป่วย</h3>
        </div>
      </CardHeader>
      <CardBody className="pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Input
              isRequired
              description="กรอกหมายเลข HN / AN แล้วกดปุ่มค้นหาเพื่อดึงข้อมูลผู้ป่วย"
              endContent={
                <div className="flex items-center gap-1">
                  {formData.patientHN && (
                    <button
                      aria-label="ล้างหมายเลข HN/AN"
                      className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none p-1 rounded-md hover:bg-default-100 transition-colors"
                      disabled={isLoadingPatient}
                      tabIndex={-1}
                      type="button"
                      onClick={handleClearHN}
                    >
                      <XMarkIcon className="w-4 h-4 text-default-400" />
                    </button>
                  )}
                  <button
                    aria-label="ค้นหาข้อมูลผู้ป่วย"
                    className="focus-visible:ring-2 focus-visible:ring-primary-foreground focus-visible:outline-none p-1.5 rounded-md bg-primary text-white hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoadingPatient || !formData.patientHN?.trim()}
                    tabIndex={-1}
                    type="button"
                    onClick={handleSearch}
                  >
                    {isLoadingPatient ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <MagnifyingGlassIcon className="w-4 h-4 text-white" />
                    )}
                  </button>
                </div>
              }
              label="หมายเลข HN / AN"
              name="patientHN"
              placeholder="เช่น 123456/68 หรือ 123456-68"
              value={formData.patientHN}
              variant="bordered"
              onChange={(e) => {
                const filtered = e.target.value.replace(/[^0-9/-]/g, '');

                onChange('patientHN', filtered);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearch();
                }
              }}
            />
          </div>

          <Input
            isClearable
            isRequired
            autoComplete="off"
            label="ชื่อผู้ป่วย"
            name="patientName"
            placeholder="กรอกชื่อผู้ป่วย"
            value={formData.patientName}
            variant="bordered"
            onChange={(e) => onChange('patientName', e.target.value)}
          />
        </div>
        <div className="mt-4">
          <label
            className="text-sm font-medium text-foreground mb-2 block"
            htmlFor="patient-condition-group"
          >
            อาการ / สภาพผู้ป่วยที่ต้องแจ้งเวรเปล
          </label>
          <CheckboxGroup
            id="patient-condition-group"
            value={formData.patientCondition}
            onValueChange={(values) => onChange('patientCondition', values as string[])}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {PATIENT_CONDITION_OPTIONS.map((condition) => (
                <Checkbox key={condition} size="sm" value={condition}>
                  {condition}
                </Checkbox>
              ))}
            </div>
          </CheckboxGroup>
        </div>
      </CardBody>
    </Card>
  );
}
