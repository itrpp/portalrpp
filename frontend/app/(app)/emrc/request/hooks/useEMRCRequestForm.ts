import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  REQUEST_FIELD_LABELS,
  REQUEST_REQUIRED_FIELDS,
  createDefaultFormData,
} from "../constants";

import { EMRCRequestItem, EMRCRequestFormData } from "@/types/emrc";
import { validateForm } from "@/lib/emrc";

type ValidationErrors = Record<string, string>;

interface UseEMRCRequestFormOptions {
  requesterName?: string;
  requesterPhone?: string;
  requesterDepartment?: number | null;
}

export function useEMRCRequestForm({
  requesterName,
  requesterPhone,
  requesterDepartment,
}: UseEMRCRequestFormOptions = {}) {
  const [formData, setFormData] = useState<EMRCRequestFormData>(() =>
    createDefaultFormData(requesterName, requesterPhone, requesterDepartment),
  );
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {},
  );
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shouldScrollToError, setShouldScrollToError] = useState(false);
  const previousErrorsCountRef = useRef(0);

  const resetForm = useCallback(() => {
    setFormData(
      createDefaultFormData(requesterName, requesterPhone, requesterDepartment),
    );
    setValidationErrors({});
    setEditingRequestId(null);
  }, [requesterName, requesterPhone, requesterDepartment]);

  const setFormField = useCallback(
    <Field extends keyof EMRCRequestFormData>(
      field: Field,
      value: EMRCRequestFormData[Field],
    ) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const clearFieldError = useCallback((field: keyof EMRCRequestFormData) => {
    setValidationErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }

      const next = { ...prev };

      delete next[field];

      return next;
    });
    setShouldScrollToError(false);
  }, []);

  const runValidation = useCallback(() => {
    const validation = validateForm(formData);

    setValidationErrors(validation.errors);

    if (!validation.isValid) {
      setShouldScrollToError(true);
    }

    return validation;
  }, [formData]);

  const scrollToFirstError = useCallback(() => {
    const currentErrors = Object.keys(validationErrors);

    if (currentErrors.length === 0) {
      previousErrorsCountRef.current = 0;

      return;
    }

    const firstErrorKey = REQUEST_REQUIRED_FIELDS.find(
      (field) => validationErrors[field],
    ) || Object.keys(validationErrors)[0];

    if (!firstErrorKey) {
      previousErrorsCountRef.current = currentErrors.length;

      return;
    }

    const label = REQUEST_FIELD_LABELS[firstErrorKey];

    if (!label) {
      previousErrorsCountRef.current = currentErrors.length;

      return;
    }

    const labels = Array.from(document.querySelectorAll("label"));

    for (const labelElement of labels) {
      if (!labelElement.textContent?.includes(label)) {
        continue;
      }

      const target = labelElement
        .closest("div")
        ?.querySelector(
          "input, select, [role='combobox'], textarea",
        ) as HTMLElement | null;

      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => target.focus(), 100);
        break;
      }
    }

    previousErrorsCountRef.current = currentErrors.length;
  }, [validationErrors]);

  useEffect(() => {
    if (!shouldScrollToError) {
      return;
    }

    const timer = setTimeout(() => {
      scrollToFirstError();
      setShouldScrollToError(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [scrollToFirstError, shouldScrollToError]);

  const loadRequestForEdit = useCallback(
    (request: EMRCRequestItem) => {
      setFormData({
        requesterDepartment: request.form.requesterDepartment ?? null,
        requesterName: request.form.requesterName || requesterName || "",
        requesterPhone: request.form.requesterPhone || "",
        requestDate: request.form.requestDate || "",
        requestTime: request.form.requestTime || "",
        bookingPurpose: request.form.bookingPurpose || "",
        bookingPurposeOther: request.form.bookingPurposeOther || "",
        patientName: request.form.patientName || "",
        patientBirthDate: request.form.patientBirthDate || "",
        destinationAddress: request.form.destinationAddress || "",
        patientRights: request.form.patientRights || "",
        patientHN: request.form.patientHN || "",
        patientCitizenId: request.form.patientCitizenId || "",
        patientPhone: request.form.patientPhone || "",
        requiredEquipment: request.form.requiredEquipment || [],
        infectionStatus: request.form.infectionStatus || "",
        infectionStatusOther: request.form.infectionStatusOther || "",
        departmentPhone: request.form.departmentPhone || "",
        requesterNameDetail: request.form.requesterNameDetail || "",
        conditionType: request.form.conditionType || "",
        acknowledged: request.form.acknowledged ?? false,
      });
      setEditingRequestId(request.id);
      setValidationErrors({});
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [requesterName],
  );

  const cancelEditing = useCallback(() => {
    resetForm();
  }, [resetForm]);

  return {
    formData,
    validationErrors,
    editingRequestId,
    isSubmitting,
    setIsSubmitting,
    setFormField,
    setFormData,
    clearFieldError,
    runValidation,
    resetForm,
    loadRequestForEdit,
    cancelEditing,
    hasErrors: useMemo(
      () => Object.keys(validationErrors).length > 0,
      [validationErrors],
    ),
  };
}

