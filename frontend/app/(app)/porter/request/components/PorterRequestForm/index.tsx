'use client';

import { useCallback } from 'react';
import { Form, addToast } from '@heroui/react';

import { usePorterRequestForm } from '../../hooks/usePorterRequestForm';

import { NotesCard } from './NotesCard';
import { PatientInfoCard } from './PatientInfoCard';
import { RequesterInfoCard } from './RequesterInfoCard';
import { SubmitActions } from './SubmitActions';
import { TransportInfoCard } from './TransportInfoCard';

import { getApiErrorMessage } from '@/lib/errorMessages';
import { URGENCY } from '@/lib/porter';
import { PorterRequestFormData } from '@/types/porter';

interface PorterApiResult {
  success: boolean;
  data?: unknown;
  error?: string;
  message?: string;
}

interface Props {
  form: ReturnType<typeof usePorterRequestForm>;
  requesterDepartmentName?: string;
  onEmergencyConfirm: (urgencyLevel: string) => void;
  onSubmitted: () => void | Promise<void>;
}

export function PorterRequestForm({
  form,
  requesterDepartmentName,
  onEmergencyConfirm,
  onSubmitted,
}: Props) {
  const {
    formData,
    validationErrors,
    editingRequestId,
    isSubmitting,
    setIsSubmitting,
    setFormField,
    clearFieldError,
    runValidation,
    resetForm,
    cancelEditing,
  } = form;

  const handleInputChange = useCallback(
    <Field extends keyof PorterRequestFormData>(
      field: Field,
      value: PorterRequestFormData[Field],
    ) => {
      setFormField(field, value);
      clearFieldError(field);
    },
    [setFormField, clearFieldError],
  );

  const handleUrgencyLevelChange = useCallback(
    (urgencyLevel: string) => {
      if (urgencyLevel === URGENCY.EMERGENCY) {
        onEmergencyConfirm(urgencyLevel);
      } else {
        handleInputChange('urgencyLevel', urgencyLevel as PorterRequestFormData['urgencyLevel']);
      }
    },
    [onEmergencyConfirm, handleInputChange],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const validation = runValidation();

      if (!validation.isValid) {
        addToast({
          title: 'ข้อมูลไม่ครบถ้วน',
          description: 'กรุณาตรวจสอบข้อมูลที่กรอกแล้วลองอีกครั้ง',
          color: 'danger',
        });

        return;
      }

      setIsSubmitting(true);

      try {
        const url = editingRequestId
          ? `/api/porter/requests/${editingRequestId}`
          : '/api/porter/requests';
        const method = editingRequestId ? 'PUT' : 'POST';

        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const result = (await response.json()) as PorterApiResult;

        if (!response.ok || !result.success) {
          addToast({
            title: 'เกิดข้อผิดพลาด',
            description: getApiErrorMessage(result.error, result.message),
            color: 'danger',
          });

          return;
        }

        addToast({
          title: editingRequestId ? 'แก้ไขคำขอสำเร็จ' : 'ส่งคำขอสำเร็จ',
          description: editingRequestId
            ? 'คำขอของคุณได้รับการแก้ไขเรียบร้อยแล้ว'
            : 'คำขอของคุณได้รับการส่งเรียบร้อยแล้ว',
          color: 'success',
        });

        await onSubmitted();
        resetForm();
      } catch {
        addToast({
          title: 'เกิดข้อผิดพลาด',
          description: 'ไม่สามารถส่งคำขอได้ กรุณาลองอีกครั้ง',
          color: 'danger',
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [editingRequestId, formData, onSubmitted, resetForm, runValidation, setIsSubmitting],
  );

  return (
    <Form
      className="mt-[-8px]"
      validationBehavior="aria"
      validationErrors={validationErrors}
      onSubmit={handleSubmit}
    >
      <RequesterInfoCard
        formData={formData}
        requesterDepartmentName={requesterDepartmentName}
        onChange={handleInputChange}
      />
      <PatientInfoCard formData={formData} onChange={handleInputChange} />
      <TransportInfoCard
        formData={formData}
        setFormField={setFormField}
        validationErrors={validationErrors}
        onChange={handleInputChange}
        onUrgencyLevelChange={handleUrgencyLevelChange}
      />
      <NotesCard
        formData={formData}
        validationErrors={validationErrors}
        onChange={handleInputChange}
      />
      <SubmitActions
        editingRequestId={editingRequestId}
        isSubmitting={isSubmitting}
        onCancelEdit={cancelEditing}
        onReset={resetForm}
      />
    </Form>
  );
}
