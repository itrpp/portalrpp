import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  REQUEST_FIELD_LABELS,
  REQUEST_REQUIRED_FIELDS,
  createDefaultFormData,
} from "../constants";

import { PorterJobItem, PorterRequestFormData } from "@/types/porter";
import { validateForm } from "@/lib/porter";

type ValidationErrors = Record<string, string>;

interface UsePorterRequestFormOptions {
  requesterName?: string;
  requesterPhone?: string;
  requesterDepartment?: string;
}

export function usePorterRequestForm({
  requesterName,
  requesterPhone,
  requesterDepartment,
}: UsePorterRequestFormOptions = {}) {
  const [formData, setFormData] = useState<PorterRequestFormData>(() =>
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
  }, [requesterName, requesterPhone]);

  const setFormField = useCallback(
    <Field extends keyof PorterRequestFormData>(
      field: Field,
      value: PorterRequestFormData[Field],
    ) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const clearFieldError = useCallback((field: keyof PorterRequestFormData) => {
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
    );

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
    (request: PorterJobItem) => {
      setFormData({
        requesterDepartment: request.form.requesterDepartment || "",
        requesterName: request.form.requesterName || requesterName || "",
        requesterPhone: request.form.requesterPhone || "",
        patientName: request.form.patientName || "",
        patientHN: request.form.patientHN || "",
        pickupLocationDetail: request.form.pickupLocationDetail || null,
        deliveryLocationDetail: request.form.deliveryLocationDetail || null,
        requestedDateTime: request.form.requestedDateTime,
        urgencyLevel: request.form.urgencyLevel || "ปกติ",
        vehicleType: request.form.vehicleType || "",
        equipment: request.form.equipment || [],
        hasVehicle: request.form.hasVehicle || "",
        returnTrip: request.form.returnTrip || "",
        transportReason: request.form.transportReason || "",
        equipmentOther: request.form.equipmentOther || "",
        specialNotes: request.form.specialNotes || "",
        patientCondition: request.form.patientCondition || [],
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
