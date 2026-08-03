'use client';

import { useCallback } from 'react';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  CheckboxGroup,
  Chip,
  DatePicker,
  Input,
  Radio,
  RadioGroup,
  Select,
  SelectItem,
  Tooltip,
} from '@heroui/react';
import { CalendarDateTime } from '@internationalized/date';

import { LocationSelector } from '../../../components/LocationSelector';

import { CARD_STYLES } from '@/lib/cardStyles';
import { cn, getDateTimeLocal } from '@/lib/utils';
import {
  EQUIPMENT_OPTIONS,
  TRANSPORT_REASON_OPTIONS,
  URGENCY,
  URGENCY_OPTIONS,
  VEHICLE_TYPE_OPTIONS,
} from '@/lib/porter';
import {
  EquipmentType,
  PorterRequestFormData,
  VehicleType,
} from '@/types/porter';
import {
  AmbulanceIcon,
  CalendarIcon,
  ClipboardListIcon,
  MapPinIcon,
} from '@/components/ui/icons';

interface Props {
  formData: PorterRequestFormData;
  validationErrors: Record<string, string>;
  onChange: <Field extends keyof PorterRequestFormData>(
    field: Field,
    value: PorterRequestFormData[Field],
  ) => void;
  onUrgencyLevelChange: (urgencyLevel: string) => void;
  setFormField: <Field extends keyof PorterRequestFormData>(
    field: Field,
    value: PorterRequestFormData[Field],
  ) => void;
}

function stringToCalendarDateTime(dateString: string): CalendarDateTime {
  try {
    const [datePart, timePart] = dateString.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = (timePart || '00:00').split(':').map(Number);

    return new CalendarDateTime(year, month, day, hour || 0, minute || 0);
  } catch {
    const now = new Date();

    return new CalendarDateTime(
      now.getFullYear(),
      now.getMonth() + 1,
      now.getDate(),
      now.getHours(),
      now.getMinutes(),
    );
  }
}

function calendarDateTimeToString(date: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}): string {
  const year = date.year.toString().padStart(4, '0');
  const month = date.month.toString().padStart(2, '0');
  const day = date.day.toString().padStart(2, '0');
  const hour = date.hour.toString().padStart(2, '0');
  const minute = date.minute.toString().padStart(2, '0');

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export function TransportInfoCard({
  formData,
  validationErrors,
  onChange,
  onUrgencyLevelChange,
  setFormField,
}: Props) {
  const handleDateTimeChange = useCallback(
    (value: CalendarDateTime | null) => {
      if (value) onChange('requestedDateTime', calendarDateTimeToString(value));
    },
    [onChange],
  );

  return (
    <Card className={cn(CARD_STYLES.default, 'w-full')}>
      <CardHeader className="pb-0">
        <div className="flex items-center gap-2">
          <MapPinIcon className="w-6 h-6 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">ข้อมูลการเคลื่อนย้าย</h3>
        </div>
      </CardHeader>
      <CardBody className="pt-4 space-y-4">
        <Select
          isRequired
          label="รายการเหตุผลการเคลื่อนย้าย"
          name="transportReason"
          placeholder="เลือกเหตุผล"
          selectedKeys={formData.transportReason ? [formData.transportReason] : []}
          variant="bordered"
          onSelectionChange={(keys) => {
            const selected = Array.from(keys)[0] as string;

            onChange('transportReason', selected);
          }}
        >
          {TRANSPORT_REASON_OPTIONS.map((r) => (
            <SelectItem key={r}>{r}</SelectItem>
          ))}
        </Select>

        <div className="space-y-4">
          <LocationSelector
            key="pickup"
            isRequired
            errorMessage={validationErrors.pickupLocation}
            label="สถานที่รับ"
            showOnlyBeds={true}
            value={formData.pickupLocationDetail}
            onChange={(location) => setFormField('pickupLocationDetail', location)}
          />

          <LocationSelector
            key="delivery"
            isRequired
            errorMessage={validationErrors.deliveryLocation}
            label="สถานที่ส่ง"
            value={formData.deliveryLocationDetail}
            onChange={(location) => setFormField('deliveryLocationDetail', location)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <DatePicker
              isRequired
              granularity="minute"
              label="วันที่และเวลาที่ต้องการเคลื่อนย้าย"
              selectorIcon={<CalendarIcon className="w-4 h-4" />}
              value={stringToCalendarDateTime(formData.requestedDateTime)}
              variant="bordered"
              onChange={handleDateTimeChange}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="flat"
                onPress={() => onChange('requestedDateTime', getDateTimeLocal())}
              >
                ตอนนี้
              </Button>
              <Button
                size="sm"
                variant="flat"
                onPress={() => {
                  const d = new Date();

                  d.setMinutes(d.getMinutes() + 30);
                  onChange('requestedDateTime', getDateTimeLocal(d));
                }}
              >
                +30 นาที
              </Button>
              <Button
                size="sm"
                variant="flat"
                onPress={() => {
                  const d = new Date();

                  d.setHours(d.getHours() + 2);
                  onChange('requestedDateTime', getDateTimeLocal(d));
                }}
              >
                +2 ชั่วโมง
              </Button>
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-foreground mb-2 block">
              ความเร่งด่วน
              <span className="text-danger ml-1">*</span>
            </div>
            {validationErrors.urgencyLevel && (
              <div className="text-sm text-danger mb-2">{validationErrors.urgencyLevel}</div>
            )}
            <div className="flex flex-wrap gap-2">
              {URGENCY_OPTIONS.map((option) => {
                const tooltipContent =
                  option.value === URGENCY.NORMAL
                    ? 'เจ้าหน้าที่เปล จะถึงจุดรับภายใน 30 นาที'
                    : option.value === URGENCY.URGENT
                      ? 'เจ้าหน้าที่เปล จะถึงจุดรับภายใน 15 นาที'
                      : 'เจ้าหน้าที่เปล จะถึงจุดรับภายใน 5 นาที และ จะต้องเป็นเคสฉุกเฉินเท่านั้น';

                return (
                  <Tooltip key={option.value} content={tooltipContent}>
                    <Chip
                      className="cursor-pointer"
                      color={option.color}
                      startContent={
                        option.value === URGENCY.EMERGENCY || option.value === URGENCY.URGENT ? (
                          <AmbulanceIcon className="w-4 h-4" />
                        ) : (
                          <ClipboardListIcon className="w-4 h-4" />
                        )
                      }
                      variant={formData.urgencyLevel === option.value ? 'solid' : 'bordered'}
                      onClick={() => onUrgencyLevelChange(option.value)}
                    >
                      {option.label}
                    </Chip>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm font-medium text-foreground mb-2 block">
              ประเภทรถ
              <span className="text-danger ml-1">*</span>
            </div>
            {validationErrors.vehicleType && (
              <div className="text-sm text-danger mb-2">{validationErrors.vehicleType}</div>
            )}
            <RadioGroup
              isRequired
              className="gap-3"
              name="vehicleType"
              orientation="horizontal"
              value={formData.vehicleType}
              onValueChange={(val) => onChange('vehicleType', val as VehicleType)}
            >
              {VEHICLE_TYPE_OPTIONS.map((type) => (
                <Radio key={type} size="sm" value={type}>
                  {type}
                </Radio>
              ))}
            </RadioGroup>
          </div>
          <div>
            <div className="text-sm font-medium text-foreground mb-2 block">
              มีรถแล้วหรือยัง
              <span className="text-danger ml-1">*</span>
            </div>
            {validationErrors.hasVehicle && (
              <div className="text-sm text-danger mb-2">{validationErrors.hasVehicle}</div>
            )}
            <RadioGroup
              isRequired
              className="gap-3"
              name="hasVehicle"
              orientation="horizontal"
              value={formData.hasVehicle}
              onValueChange={(val) => onChange('hasVehicle', val as 'มี' | 'ไม่มี')}
            >
              <Radio size="sm" value="มี">
                มี
              </Radio>
              <Radio size="sm" value="ไม่มี">
                ไม่มี
              </Radio>
            </RadioGroup>
          </div>
          <div>
            <div className="text-sm font-medium text-foreground mb-2 block">
              รถกอล์ฟ
              <span className="text-danger ml-1">*</span>
            </div>
            {validationErrors.vehicleTypeGolf && (
              <div className="text-sm text-danger mb-2">{validationErrors.vehicleTypeGolf}</div>
            )}
            <RadioGroup
              isRequired
              className="gap-3"
              name="vehicleTypeGolf"
              orientation="horizontal"
              value={formData.vehicleTypeGolf || 'ไม่ต้องการ'}
              onValueChange={(val) => onChange('vehicleTypeGolf', val as 'ต้องการ' | 'ไม่ต้องการ' )}
            >
              <Radio size="sm" value="ต้องการ">
                ต้องการ
              </Radio>
              <Radio size="sm" value="ไม่ต้องการ">
                ไม่ต้องการ
              </Radio>
            </RadioGroup>
          </div>
          </div>
      
        <div className="mt-4">
          <label
            className="text-sm font-medium text-foreground mb-2 block"
            htmlFor="equipment-group"
          >
            อุปกรณ์ที่ต้องการ
          </label>
          <p className="text-xs text-default-500 mb-2">
            ไม่บังคับ — ไม่เลือกรายการได้ถ้าไม่ต้องการอุปกรณ์
          </p>
          <CheckboxGroup
            id="equipment-group"
            value={Array.isArray(formData.equipment) ? formData.equipment : []}
            onValueChange={(values) => {
              onChange('equipment', values as EquipmentType[]);
              if (!values.includes('อื่นๆ ระบุ')) {
                onChange('equipmentOther', '');
              }
            }}
          >
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {EQUIPMENT_OPTIONS.map((equipment) => (
                <Checkbox key={equipment} size="sm" value={equipment}>
                  {equipment}
                </Checkbox>
              ))}
            </div>
          </CheckboxGroup>
          {Array.isArray(formData.equipment) && formData.equipment.includes('อื่นๆ ระบุ') && (
            <Input
              className="mt-3"
              label="ระบุอุปกรณ์อื่นๆ"
              placeholder="กรุณาระบุอุปกรณ์ที่ต้องการ"
              value={formData.equipmentOther || ''}
              variant="bordered"
              onChange={(e) => onChange('equipmentOther', e.target.value)}
            />
          )}
        </div>
      </CardBody>
    </Card>
  );
}
