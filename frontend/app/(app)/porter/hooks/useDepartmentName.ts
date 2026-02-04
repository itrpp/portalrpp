import { useEffect, useState } from "react";

/**
 * Hook สำหรับดึงชื่อหน่วยงานจาก departmentSubSubId
 */
export function useDepartmentName(
  departmentSubSubId: number | null | undefined,
): string | null {
  const [departmentName, setDepartmentName] = useState<string | null>(null);

  useEffect(() => {
    const fetchDepartmentName = async () => {
      if (!departmentSubSubId) {
        setDepartmentName(null);

        return;
      }

      try {
        const response = await fetch(
          `/api/hrd/department-sub-subs/${departmentSubSubId}`,
        );

        if (response.ok) {
          const result = await response.json();

          if (result.success && result.data) {
            setDepartmentName(result.data.name);
          } else {
            setDepartmentName(null);
          }
        } else {
          setDepartmentName(null);
        }
      } catch (error) {
        console.error("Error fetching department name:", error);
        setDepartmentName(null);
      }
    };

    void fetchDepartmentName();
  }, [departmentSubSubId]);

  return departmentName;
}
