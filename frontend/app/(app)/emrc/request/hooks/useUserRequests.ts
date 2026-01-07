import { useCallback, useEffect, useState } from "react";

import { EMRCRequestItem } from "@/types/emrc";

interface UseUserRequestsOptions {
  userId?: string;
}

export function useUserRequests({ userId }: UseUserRequestsOptions) {
  const [userRequests, setUserRequests] = useState<EMRCRequestItem[]>([]);
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
        `/api/emrc/requests?${queryParams.toString()}`,
      );

      if (!response.ok) {
        throw new Error("ไม่สามารถโหลดข้อมูลรายการคำขอได้");
      }

      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        const allRequests = result.data as EMRCRequestItem[];

        // เรียงลำดับตามวันที่ (ใหม่ล่าสุดขึ้นก่อน)
        const sortedRequests = allRequests.sort((a, b) => {
          const dateA = a.form.requestDate
            ? new Date(
                a.form.requestDate.split("/").reverse().join("-") +
                  " " +
                  a.form.requestTime,
              ).getTime()
            : 0;
          const dateB = b.form.requestDate
            ? new Date(
                b.form.requestDate.split("/").reverse().join("-") +
                  " " +
                  b.form.requestTime,
              ).getTime()
            : 0;

          return dateB - dateA;
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

