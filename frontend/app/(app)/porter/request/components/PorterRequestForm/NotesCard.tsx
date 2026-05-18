'use client';

import { Card, CardBody, CardHeader, Textarea } from '@heroui/react';

import { CARD_STYLES } from '@/lib/cardStyles';
import { cn } from '@/lib/utils';
import { PorterRequestFormData } from '@/types/porter';
import { ClipboardListIcon } from '@/components/ui/icons';

interface Props {
  formData: PorterRequestFormData;
  validationErrors: Record<string, string>;
  onChange: <Field extends keyof PorterRequestFormData>(
    field: Field,
    value: PorterRequestFormData[Field],
  ) => void;
}

export function NotesCard({ formData, validationErrors, onChange }: Props) {
  const isOtherHospital = formData.deliveryLocationDetail?.buildingName === 'โรงพยาบาลอื่น';

  return (
    <Card className={cn(CARD_STYLES.default, 'w-full')}>
      <CardHeader className="pb-0">
        <div className="flex items-center gap-2">
          <ClipboardListIcon className="w-6 h-6 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">รายละเอียดเพิ่มเติม</h3>
        </div>
      </CardHeader>
      <CardBody className="pt-4">
        <Textarea
          classNames={{ input: 'resize-y min-h-[40px]' }}
          errorMessage={validationErrors.specialNotes}
          isInvalid={!!validationErrors.specialNotes}
          isRequired={isOtherHospital}
          label={
            isOtherHospital
              ? 'ระบุโรงพยาบาลปลายทาง (รายละเอียดเพิ่มเติม)'
              : 'หมายเหตุ / ข้อมูลเพิ่มเติม'
          }
          minRows={3}
          name="specialNotes"
          placeholder={
            isOtherHospital
              ? 'ระบุชื่อโรงพยาบาลปลายทาง'
              : 'ระบุข้อมูลเพิ่มเติมที่สำคัญ เช่น ข้อควรระวังพิเศษ, โรคประจำตัว, อาการพิเศษ'
          }
          value={formData.specialNotes}
          variant="bordered"
          onChange={(e) => onChange('specialNotes', e.target.value)}
        />
      </CardBody>
    </Card>
  );
}
