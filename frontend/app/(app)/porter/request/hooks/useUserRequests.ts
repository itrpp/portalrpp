import { useCallback, useEffect, useState } from "react";

import { PorterJobItem } from "@/types/porter";

interface UseUserRequestsOptions {
  userId?: string;
}

export function useUserRequests({ userId }: UseUserRequestsOptions) {
  const [userRequests, setUserRequests] = useState<PorterJobItem[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);

  const fetchUserRequests = useCallback(async () => {
    if (!userId) {
      setUserRequests([]);
      setIsLoadingRequests(false);

      return;
    }

    setIsLoadingRequests(true);

    try {
      const queryParams = new URLSearchParams({
        requester_user_id: userId,
        page_size: "100",
      });

      const response = await fetch(
        `/api/porter/requests?${queryParams.toString()}`,
      );

      if (!response.ok) {
        throw new Error("ไม่สามารถโหลดข้อมูลรายการคำขอได้");
      }

      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        // ไม่ต้อง filter สถานะ ให้แสดงทั้งหมด (Waiting, In-progress, Completed, Cancelled)
        const allRequests = result.data as PorterJobItem[];

        // เรียงลำดับตามวันที่นัดหมาย (ใหม่ล่าสุดขึ้นก่อน)
        const sortedRequests = allRequests.sort((a, b) => {
          return (
            new Date(b.form.requestedDateTime).getTime() -
            new Date(a.form.requestedDateTime).getTime()
          );
        });

        setUserRequests(sortedRequests);
      } else {
        setUserRequests([]);
      }
    } catch (error) {
      console.error("Error fetching user requests:", error);
      setUserRequests([]);
    } finally {
      setIsLoadingRequests(false);
    }
  }, [userId]);

  // โหลดข้อมูลเมื่อ userId เปลี่ยน (รวมถึงเมื่อเปลี่ยนจาก undefined เป็น string)
  // ใช้ fetchUserRequests ใน dependency เพื่อให้ trigger เมื่อ callback เปลี่ยน
  useEffect(() => {
    fetchUserRequests();
  }, [fetchUserRequests]);

  return {
    userRequests,
    isLoadingRequests,
    refreshUserRequests: fetchUserRequests,
    setUserRequests,
  };
}
