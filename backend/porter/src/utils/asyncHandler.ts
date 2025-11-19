type AsyncFn<Args extends unknown[]> = (...args: Args) => Promise<unknown>;

/**
 * Async Handler Utility
 * จัดการ error ใน async handlers โดยอัตโนมัติ
 *
 * @param fn - Async function ที่ต้องการ wrap
 * @returns Handler function ที่จัดการ rejected promise ให้
 */
export const asyncHandler = <Args extends unknown[]>(fn: AsyncFn<Args>) => {
  return (...args: Args) => {
    return Promise.resolve(fn(...args)).catch((error) => {
      const maybeNext = args[args.length - 1];
      if (typeof maybeNext === 'function') {
        (maybeNext as (...innerArgs: unknown[]) => void)(error);
      } else {
        throw error;
      }
    });
  };
};


