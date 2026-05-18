import { useCallback, useState } from 'react';
import { addToast } from '@heroui/react';

interface PatientLookupResult {
  PNAME?: string;
  FNAME?: string;
  LNAME?: string;
}

interface PatientLookupApiResponse {
  success: boolean;
  data?: PatientLookupResult;
  message?: string;
}

interface UsePatientLookupOptions {
  onPatientFound: (patientName: string) => void;
}

/**
 * Hook สำหรับค้นหาข้อมูลผู้ป่วยจาก HN/AN ผ่าน API
 */
export function usePatientLookup({ onPatientFound }: UsePatientLookupOptions) {
  const [isLoading, setIsLoading] = useState(false);

  const searchPatient = useCallback(
    async (patientHN: string) => {
      const trimmedHN = patientHN.trim();

      if (!trimmedHN) {
        addToast({
          title: 'ข้อมูลไม่ครบถ้วน',
          description: 'กรุณากรอกหมายเลข HN / AN',
          color: 'warning',
        });

        return;
      }

      if (!trimmedHN.includes('/') && !trimmedHN.includes('-')) {
        addToast({
          title: 'ข้อมูลไม่ถูกต้อง',
          description: 'กรุณากรอกรูปแบบ HN (123456/68) หรือ AN (123456-68)',
          color: 'warning',
        });

        return;
      }

      setIsLoading(true);

      try {
        const response = await fetch('/api/porter/patient', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patientHN: trimmedHN }),
        });

        if (!response.ok) {
          const errorData = (await response.json().catch(() => ({}))) as { message?: string };

          throw new Error(errorData.message || `HTTP ${response.status} ${response.statusText}`);
        }

        const result = (await response.json()) as PatientLookupApiResponse;

        if (result.success && result.data) {
          const { PNAME, FNAME, LNAME } = result.data;
          const patientName = [PNAME || '', FNAME || '', LNAME || '']
            .filter(Boolean)
            .join(' ');

          if (patientName) {
            onPatientFound(patientName);
            addToast({
              title: 'ค้นหาสำเร็จ',
              description: 'พบข้อมูลผู้ป่วยและเติมชื่ออัตโนมัติแล้ว',
              color: 'success',
            });
          } else {
            addToast({
              title: 'ไม่พบข้อมูล',
              description: 'ไม่พบชื่อผู้ป่วยในระบบ',
              color: 'warning',
            });
          }
        } else {
          throw new Error(result.message || 'ไม่พบข้อมูลผู้ป่วย');
        }
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : 'ไม่สามารถค้นหาข้อมูลผู้ป่วยได้ กรุณาลองใหม่อีกครั้ง';

        addToast({
          title: 'เกิดข้อผิดพลาด',
          description: message,
          color: 'danger',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [onPatientFound],
  );

  return { searchPatient, isLoading };
}
