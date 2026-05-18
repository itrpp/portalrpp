'use client';

import { Button, Card, CardFooter } from '@heroui/react';

import { CARD_STYLES } from '@/lib/cardStyles';
import { cn } from '@/lib/utils';
import { AmbulanceIcon } from '@/components/ui/icons';

interface Props {
  isSubmitting: boolean;
  editingRequestId: string | null;
  onCancelEdit: () => void;
  onReset: () => void;
}

export function SubmitActions({ isSubmitting, editingRequestId, onCancelEdit, onReset }: Props) {
  return (
    <Card className={cn(CARD_STYLES.default, 'w-full')}>
      <CardFooter className="p-3 flex justify-end gap-4">
        {editingRequestId ? (
          <Button size="md" type="button" variant="flat" onPress={onCancelEdit}>
            ยกเลิกการแก้ไข
          </Button>
        ) : (
          <Button size="md" type="button" variant="flat" onPress={onReset}>
            ล้างข้อมูล
          </Button>
        )}
        <Button
          color="primary"
          isLoading={isSubmitting}
          size="md"
          startContent={!isSubmitting && <AmbulanceIcon className="w-5 h-5" />}
          type="submit"
        >
          {isSubmitting
            ? editingRequestId
              ? 'กำลังแก้ไขคำขอ...'
              : 'กำลังส่งคำขอ...'
            : editingRequestId
              ? 'แก้ไขคำขอ'
              : 'ส่งคำขอ'}
        </Button>
      </CardFooter>
    </Card>
  );
}
