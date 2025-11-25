import { useCallback, useEffect, useState } from "react";

import { PorterJobItem } from "@/types/porter";

interface UseUserRequestsOptions {
  userId?: string;
  requesterName?: string | null;
}

export function useUserRequests({
  userId,
  requesterName,
}: UseUserRequestsOptions) {
  const [userRequests, setUserRequests] = useState<PorterJobItem[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);

  const fetchUserRequests = useCallback(async () => {
    if (!userId) {
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
        const filteredRequests = (result.data as PorterJobItem[]).filter(
          (request) => {
            const statusAllowed =
              request.status === "waiting" || request.status === "in-progress";
            const isUserOwner =
              requesterName && request.form.requesterName === requesterName;

            return statusAllowed && isUserOwner;
          },
        );

        const urgencyOrder: Record<string, number> = {
          ฉุกเฉิน: 3,
          ด่วน: 2,
          ปกติ: 1,
        };

        const sortedRequests = filteredRequests.sort((a, b) => {
          const urgencyDiff =
            (urgencyOrder[b.form.urgencyLevel] || 0) -
            (urgencyOrder[a.form.urgencyLevel] || 0);

          if (urgencyDiff !== 0) {
            return urgencyDiff;
          }

          return (
            new Date(a.form.requestedDateTime).getTime() -
            new Date(b.form.requestedDateTime).getTime()
          );
        });

        setUserRequests(sortedRequests);
      }
    } finally {
      setIsLoadingRequests(false);
    }
  }, [userId, requesterName]);

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
