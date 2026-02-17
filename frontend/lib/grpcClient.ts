import path from 'path';
import { fileURLToPath } from 'url';

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

/**
 * โหลด Proto Definition สำหรับ Porter Service
 * ใช้ไฟล์ proto ที่อยู่ใน shared/proto/porter.proto
 */
function getProtoPath(): string {
  // ใช้ import.meta.url เพื่อหา directory ของไฟล์ปัจจุบัน (ES modules)
  // จาก frontend/lib/grpcClient.ts ไปที่ shared/proto/porter.proto = ../../shared/proto/porter.proto
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Resolve path จาก frontend/lib/ ไปที่ shared/proto/porter.proto
  const protoPath = path.resolve(__dirname, '../../shared/proto/porter.proto');

  try {
    const fs = require('fs');

    if (fs.existsSync(protoPath)) {
      return protoPath;
    }
  } catch (error) {
    // ถ้า runtime สภาพแวดล้อมไม่รองรับ fs (เช่น บางกรณีของ Next.js) ให้ปล่อยไปแล้วไปใช้ error ด้านล่างแทน
    console.warn('[gRPC] Failed to check proto file existence:', error);
  }

  // ถ้าหาไม่เจอ ให้ throw error แทนการใช้ default path
  throw new Error(
    `Proto file not found at: ${protoPath}. Please ensure shared/proto/porter.proto exists in the project root.`,
  );
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

/** ชื่อ env สำหรับ gRPC URL (ใช้ key แบบ dynamic เพื่อให้ Next.js ไม่ inline ตอน build จะได้อ่านค่าจาก .env.local ตอน runtime) */
const PORTER_GRPC_URL_KEY = 'PORTER_SERVICE_GRPC_URL';
const DEFAULT_PORTER_GRPC_URL = 'localhost:50051';

/**
 * สร้าง gRPC Client สำหรับ Porter Service
 * เรียกโดยตรงจาก Next.js API route
 */
export function getPorterClient(): any {
  const grpcUrl =
    (process.env[PORTER_GRPC_URL_KEY] as string | undefined) || DEFAULT_PORTER_GRPC_URL;

  if (!grpcUrl) {
    throw new Error('PORTER_SERVICE_GRPC_URL is not configured');
  }

  const client = new porterProto.PorterService(grpcUrl, grpc.credentials.createInsecure(), {
    // เพิ่ม max message size เป็น 10MB เพื่อรองรับข้อมูลขนาดใหญ่
    // Default คือ 4MB (4194304 bytes) ซึ่งไม่พอสำหรับบาง response
    'grpc.max_receive_message_length': 10 * 1024 * 1024, // 10MB
    'grpc.max_send_message_length': 10 * 1024 * 1024, // 10MB
  });

  return client;
}

/**
 * Helper function สำหรับเรียก gRPC method แบบ Promise
 */
export function callPorterService<T = any>(methodName: string, request: any): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      const client = getPorterClient();
      const method = client[methodName];

      if (!method) {
        reject(new Error(`Method ${methodName} not found`));

        return;
      }

      method.call(client, request, (error: any, response: T) => {
        if (error) {
          reject(error);
        } else {
          resolve(response);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * สร้าง gRPC stream สำหรับ Porter Requests
 * เรียกโดยตรงจาก Next.js API route
 */
export function streamPorterRequests(request: any): any {
  const client = getPorterClient();
  const stream = client.StreamPorterRequests(request);

  return stream;
}
