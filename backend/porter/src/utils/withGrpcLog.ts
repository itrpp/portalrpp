import type { sendUnaryData, ServerUnaryCall, ServerWritableStream } from '@grpc/grpc-js';

import { logger } from './logger';

type UnaryHandler<Req, Res> = (
  call: ServerUnaryCall<Req, Res>,
  callback: sendUnaryData<Res>,
) => void | Promise<void>;

type StreamHandler<Req, Res> = (call: ServerWritableStream<Req, Res>) => void;

/**
 * Wrapper สำหรับ unary RPC handler — log ทุกการเรียก (method, duration, success/error) ผ่าน pino ให้ PM2 จับได้ใน production
 */
export function withGrpcLog<Req, Res>(
  methodName: string,
  handler: UnaryHandler<Req, Res>,
): UnaryHandler<Req, Res> {
  return (call: ServerUnaryCall<Req, Res>, callback: sendUnaryData<Res>) => {
    const start = Date.now();
    logger.info({ method: methodName }, 'gRPC called');

    const wrappedCallback: sendUnaryData<Res> = (err, res) => {
      const duration = Date.now() - start;
      if (err) {
        const code = (err as { code?: number }).code;
        logger.error({ method: methodName, code, durationMs: duration, err }, 'gRPC error');
      } else {
        logger.info({ method: methodName, durationMs: duration }, 'gRPC ok');
      }
      callback(err, res);
    };

    const result = handler(call, wrappedCallback);
    if (result && typeof (result as Promise<void>).then === 'function') {
      (result as Promise<void>).catch((e) => {
        const duration = Date.now() - start;
        logger.error({ method: methodName, durationMs: duration, err: e }, 'gRPC unhandled error');
        wrappedCallback(
          Object.assign(new Error(String(e)), { code: 13, details: String(e) }),
          undefined,
        );
      });
    }
  };
}

/**
 * Wrapper สำหรับ server streaming RPC — log เมื่อ stream เริ่มและเมื่อจบ/error/cancelled ผ่าน pino
 */
export function withGrpcStreamLog<Req, Res>(
  methodName: string,
  handler: StreamHandler<Req, Res>,
): StreamHandler<Req, Res> {
  return (call: ServerWritableStream<Req, Res>) => {
    const start = Date.now();
    logger.info({ method: methodName }, 'gRPC stream started');

    const logEnd = (kind: 'ended' | 'error' | 'cancelled') => {
      const duration = Date.now() - start;
      if (kind === 'error') {
        logger.error({ method: methodName, kind, durationMs: duration }, 'gRPC stream');
      } else {
        logger.info({ method: methodName, kind, durationMs: duration }, 'gRPC stream');
      }
    };

    call.on('end', () => logEnd('ended'));
    call.on('error', () => logEnd('error'));
    call.on('cancelled', () => logEnd('cancelled'));

    handler(call);
  };
}
