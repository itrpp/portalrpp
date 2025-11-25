import { useCallback, useEffect, useState, useRef } from "react";

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

  // Use ref to keep track of options without triggering re-renders/re-fetches
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const refresh = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/porter/${resourcePath}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "ไม่สามารถโหลดข้อมูลได้");
      }

      const rawItems = result.data as T[];
      const currentOptions = optionsRef.current;
      const nextItems = currentOptions.transform
        ? currentOptions.transform(rawItems)
        : rawItems;

      setItems(nextItems);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "ไม่สามารถโหลดข้อมูลได้";

      optionsRef.current.onError?.(message);
    } finally {
      setIsLoading(false);
    }
  }, [resourcePath]);

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
