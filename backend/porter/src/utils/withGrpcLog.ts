import type { sendUnaryData, ServerUnaryCall, ServerWritableStream } from '@grpc/grpc-js';

type UnaryHandler<Req, Res> = (
  call: ServerUnaryCall<Req, Res>,
  callback: sendUnaryData<Res>,
) => void | Promise<void>;

type StreamHandler<Req, Res> = (call: ServerWritableStream<Req, Res>) => void;

/**
 * Wrapper สำหรับ unary RPC handler — log ทุกการเรียก (method, duration, success/error) ไปที่ stdout/stderr ให้ PM2 จับได้
 */
export function withGrpcLog<Req, Res>(
  methodName: string,
  handler: UnaryHandler<Req, Res>,
): UnaryHandler<Req, Res> {
  return (call: ServerUnaryCall<Req, Res>, callback: sendUnaryData<Res>) => {
    const start = Date.now();
    console.log('[gRPC]', methodName, 'called');

    const wrappedCallback: sendUnaryData<Res> = (err, res) => {
      const duration = Date.now() - start;
      if (err) {
        const code = (err as { code?: number }).code;
        console.error('[gRPC]', methodName, 'error', 'code=' + code, duration + 'ms', err);
      } else {
        console.log('[gRPC]', methodName, 'ok', duration + 'ms');
      }
      callback(err, res);
    };

    const result = handler(call, wrappedCallback);
    if (result && typeof (result as Promise<void>).then === 'function') {
      (result as Promise<void>).catch((e) => {
        const duration = Date.now() - start;
        console.error('[gRPC]', methodName, 'error', 'unhandled', duration + 'ms', e);
        wrappedCallback(
          Object.assign(new Error(String(e)), { code: 13, details: String(e) }),
          undefined,
        );
      });
    }
  };
}

/**
 * Wrapper สำหรับ server streaming RPC — log เมื่อ stream เริ่มและเมื่อจบ/error/cancelled
 */
export function withGrpcStreamLog<Req, Res>(
  methodName: string,
  handler: StreamHandler<Req, Res>,
): StreamHandler<Req, Res> {
  return (call: ServerWritableStream<Req, Res>) => {
    const start = Date.now();
    console.log('[gRPC]', methodName, 'stream started');

    const logEnd = (kind: 'ended' | 'error' | 'cancelled') => {
      const duration = Date.now() - start;
      if (kind === 'error') {
        console.error('[gRPC]', methodName, 'stream', kind, duration + 'ms');
      } else {
        console.log('[gRPC]', methodName, 'stream', kind, duration + 'ms');
      }
    };

    call.on('end', () => logEnd('ended'));
    call.on('error', () => logEnd('error'));
    call.on('cancelled', () => logEnd('cancelled'));

    handler(call);
  };
}
