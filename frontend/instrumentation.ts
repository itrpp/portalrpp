/**
 * Log request errors ที่หลุดจาก route handler / server component ไปที่ stderr
 * ให้ PM2 หรือ log aggregator จับได้
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation#onrequesterror
 */
export async function onRequestError(
  err: Error & { digest?: string },
  request: { path: string; method: string; headers: Record<string, string | string[] | undefined> },
  context: { routeType: string; routePath: string; routerKind?: string },
) {
  console.error(
    '[API] onRequestError',
    {
      message: err.message,
      digest: err.digest,
      path: request.path,
      method: request.method,
      routeType: context.routeType,
      routePath: context.routePath,
    },
    err,
  );
}
