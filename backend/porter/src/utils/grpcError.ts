import type { sendUnaryData, ServiceError } from '@grpc/grpc-js';
import { Metadata, status } from '@grpc/grpc-js';

type UniqueConstraintOption = {
  field: string;
  message: string;
};

export type GrpcErrorOptions = {
  notFoundMessage?: string;
  foreignKeyMessage?: string;
  uniqueConstraints?: UniqueConstraintOption[];
};

export const handleGrpcError = <Response>(
  callback: sendUnaryData<Response>,
  error: unknown,
  fallbackMessage: string,
  options?: GrpcErrorOptions
): void => {
  if (options?.notFoundMessage && isPrismaNotFoundError(error)) {
    callback(createGrpcError(status.NOT_FOUND, options.notFoundMessage));
    return;
  }

  if (options?.uniqueConstraints) {
    for (const constraint of options.uniqueConstraints) {
      if (isPrismaUniqueConstraintError(error, constraint.field)) {
        callback(createGrpcError(status.ALREADY_EXISTS, constraint.message));
        return;
      }
    }
  }

  if (options?.foreignKeyMessage && isPrismaForeignKeyError(error)) {
    callback(createGrpcError(status.FAILED_PRECONDITION, options.foreignKeyMessage));
    return;
  }

  console.error('[gRPC Handler] Unexpected error:', error);
  callback(
    createGrpcError(
      status.INTERNAL,
      error instanceof Error ? error.message : fallbackMessage
    )
  );
};

const createGrpcError = (code: status, message: string): ServiceError => {
  const error = new Error(message) as ServiceError;
  error.code = code;
  error.details = message;
  error.metadata = new Metadata();
  return error;
};

export const isPrismaNotFoundError = (error: unknown): boolean => {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025';
};

export const isPrismaUniqueConstraintError = (error: unknown, fieldName: string): boolean => {
  if (
    typeof error !== 'object' ||
    error === null ||
    !('code' in error) ||
    error.code !== 'P2002' ||
    !('meta' in error) ||
    !error.meta
  ) {
    return false;
  }

  const target = (error.meta as { target?: string | string[] }).target;

  if (!target) {
    return false;
  }

  const targets = Array.isArray(target) ? target : [target];
  return targets.includes(fieldName);
};

export const isPrismaForeignKeyError = (error: unknown): boolean => {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2003';
};

