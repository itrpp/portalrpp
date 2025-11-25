import { useCallback, useEffect, useState } from "react";

interface CrudResourceOptions<T> {
  onError?: (errorMessage: string) => void;
  transform?: (items: T[]) => T[];
}

export function useCrudResource<T>(
  resourcePath: string,
  options: CrudResourceOptions<T> = {},
) {
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/porter/${resourcePath}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "ไม่สามารถโหลดข้อมูลได้");
      }

      const rawItems = result.data as T[];
      const nextItems = options.transform
        ? options.transform(rawItems)
        : rawItems;

      setItems(nextItems);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "ไม่สามารถโหลดข้อมูลได้";

      options.onError?.(message);
    } finally {
      setIsLoading(false);
    }
  }, [options, resourcePath]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    items,
    setItems,
    isLoading,
    refresh,
    setIsLoading,
  };
}
