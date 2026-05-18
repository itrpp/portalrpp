'use client';

import { Card, CardBody, CardHeader, Input } from '@heroui/react';

import { CARD_STYLES } from '@/lib/cardStyles';
import { cn } from '@/lib/utils';
import { PorterRequestFormData } from '@/types/porter';
import {
  BuildingOfficeIcon,
  UserIcon,
  PhoneIcon,
} from '@/components/ui/icons';

interface Props {
  formData: PorterRequestFormData;
  requesterDepartmentName?: string;
  onChange: <Field extends keyof PorterRequestFormData>(
    field: Field,
    value: PorterRequestFormData[Field],
  ) => void;
}

export function RequesterInfoCard({ formData, requesterDepartmentName, onChange }: Props) {
  return (
    <Card className={cn(CARD_STYLES.default, 'w-full')}>
      <CardHeader className="pb-0">
        <div className="flex items-center gap-2">
          <BuildingOfficeIcon className="w-6 h-6 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">ข้อมูลหน่วยงานผู้แจ้ง</h3>
        </div>
      </CardHeader>
      <CardBody className="pt-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            readOnly
            label="หน่วยงานผู้แจ้ง"
            name="requesterDepartment"
            placeholder="หน่วยงานผู้แจ้งจากโปรไฟล์"
            startContent={<BuildingOfficeIcon className="w-4 h-4 text-default-400" />}
            value={requesterDepartmentName || '-'}
            variant="bordered"
          />

          <Input
            isRequired
            autoComplete="name"
            label="ชื่อผู้แจ้ง"
            name="requesterName"
            placeholder="กรอกชื่อผู้แจ้ง"
            startContent={<UserIcon className="w-4 h-4 text-default-400" />}
            value={formData.requesterName}
            variant="bordered"
            onChange={(e) => onChange('requesterName', e.target.value)}
          />

          <Input
            isRequired
            autoComplete="tel"
            classNames={{
              input:
                '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
            }}
            label="โทรศัพท์ภายใน"
            name="requesterPhone"
            placeholder="IP-Phone / เบอร์ 4 ตัว"
            startContent={<PhoneIcon className="w-4 h-4 text-default-400" />}
            type="tel"
            value={formData.requesterPhone}
            variant="bordered"
            onChange={(e) => onChange('requesterPhone', e.target.value)}
          />
        </div>
      </CardBody>
    </Card>
  );
}
