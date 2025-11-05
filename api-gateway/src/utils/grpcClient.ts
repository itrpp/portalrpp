import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { config } from '../config/env';

/**
 * โหลด Proto Definition สำหรับ Porter Service
 * Path: api-gateway/src/utils/grpcClient.ts -> backend/porter/proto/porter.proto
 * ใช้ path.resolve จาก project root (portalrpp)
 * เมื่อ compile แล้ว __dirname จะเป็น dist/utils
 * เมื่อ dev mode ใช้ tsx, __dirname จะเป็น src/utils
 */
function getProtoPath(): string {
  // ลองหา path จากหลายๆ ที่
  const possiblePaths = [
    // จาก compiled code (dist/utils)
    path.resolve(__dirname, '../../../backend/porter/proto/porter.proto'),
    // จาก source code (src/utils) เมื่อใช้ tsx
    path.resolve(__dirname, '../../../../backend/porter/proto/porter.proto'),
    // จาก current working directory (api-gateway)
    path.resolve(process.cwd(), '../backend/porter/proto/porter.proto'),
  ];

  for (const protoPath of possiblePaths) {
    try {
      const fs = require('fs');
      if (fs.existsSync(protoPath)) {
        return protoPath;
      }
    } catch {
      // Continue to next path
    }
  }

  // ถ้าหาไม่เจอ ให้ใช้ path แรก (default)
  return possiblePaths[0];
}

const PROTO_PATH = getProtoPath();

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const porterProto = grpc.loadPackageDefinition(packageDefinition).porter as any;

/**
 * สร้าง gRPC Client สำหรับ Porter Service
 */
export function getPorterClient(): any {
  if (!config.services.porter?.grpcUrl) {
    throw new Error('PORTER_SERVICE_GRPC_URL is not configured');
  }

  const client = new porterProto.PorterService(
    config.services.porter.grpcUrl,
    grpc.credentials.createInsecure()
  );

  return client;
}

/**
 * Helper function สำหรับเรียก gRPC method แบบ Promise
 */
export function callPorterService<T>(
  method: string,
  request: any
): Promise<T> {
  return new Promise((resolve, reject) => {
    const client = getPorterClient();
    const grpcMethod = client[method];

    if (!grpcMethod) {
      reject(new Error(`Method ${method} not found in PorterService`));
      return;
    }

    grpcMethod.call(client, request, (error: any, response: T) => {
      if (error) {
        reject(error);
      } else {
        resolve(response);
      }
    });
  });
}

