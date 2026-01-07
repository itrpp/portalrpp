import path from "path";
import { fileURLToPath } from "url";

import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

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
  const protoPath = path.resolve(
    __dirname,
    "../../shared/proto/porter.proto",
  );

  try {
    const fs = require("fs");

    if (fs.existsSync(protoPath)) {
      return protoPath;
    }
  } catch {}

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

/**
 * สร้าง gRPC Client สำหรับ Porter Service
 * เรียกโดยตรงจาก Next.js API route
 */
export function getPorterClient(): any {
  // อ่าน gRPC URL จาก environment variable
  // ใช้ NEXT_PUBLIC_ prefix สำหรับ client-side แต่ใน API route ใช้ process.env ได้
  const grpcUrl = process.env.PORTER_SERVICE_GRPC_URL || "localhost:50051";

  if (!grpcUrl) {
    throw new Error("PORTER_SERVICE_GRPC_URL is not configured");
  }

  const client = new porterProto.PorterService(
    grpcUrl,
    grpc.credentials.createInsecure(),
    {
      // เพิ่ม max message size เป็น 10MB เพื่อรองรับข้อมูลขนาดใหญ่
      // Default คือ 4MB (4194304 bytes) ซึ่งไม่พอสำหรับบาง response
      "grpc.max_receive_message_length": 10 * 1024 * 1024, // 10MB
      "grpc.max_send_message_length": 10 * 1024 * 1024, // 10MB
    },
  );

  return client;
}

/**
 * Helper function สำหรับเรียก gRPC method แบบ Promise
 */
export function callPorterService<T = any>(
  methodName: string,
  request: any,
): Promise<T> {
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
  try {
    const client = getPorterClient();
    const stream = client.StreamPorterRequests(request);

    return stream;
  } catch (error) {
    throw error;
  }
}

/**
 * ========================================
 * EMRC Service gRPC Client
 * ========================================
 */

/**
 * โหลด Proto Definition สำหรับ EMRC Service
 */
function getEMRCProtoPath(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  
  const protoPath = path.resolve(
    __dirname,
    "../../shared/proto/emrc.proto",
  );

  try {
    const fs = require("fs");

    if (fs.existsSync(protoPath)) {
      return protoPath;
    }
  } catch {}

  throw new Error(
    `Proto file not found at: ${protoPath}. Please ensure shared/proto/emrc.proto exists in the project root.`,
  );
}

const EMRC_PROTO_PATH = getEMRCProtoPath();

const emrcPackageDefinition = protoLoader.loadSync(EMRC_PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const emrcProto = grpc.loadPackageDefinition(emrcPackageDefinition).emrc as any;

/**
 * สร้าง gRPC Client สำหรับ EMRC Service
 * เรียกโดยตรงจาก Next.js API route
 */
export function getEMRCClient(): any {
  const grpcUrl = process.env.EMRC_SERVICE_GRPC_URL || "localhost:50052";

  if (!grpcUrl) {
    throw new Error("EMRC_SERVICE_GRPC_URL is not configured");
  }

  const client = new emrcProto.EMRCService(
    grpcUrl,
    grpc.credentials.createInsecure(),
    {
      "grpc.max_receive_message_length": 10 * 1024 * 1024, // 10MB
      "grpc.max_send_message_length": 10 * 1024 * 1024, // 10MB
    },
  );

  return client;
}

/**
 * Helper function สำหรับเรียก gRPC method แบบ Promise สำหรับ EMRC
 */
export function callEMRCService<T = any>(
  methodName: string,
  request: any,
): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      const client = getEMRCClient();
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
 * สร้าง gRPC stream สำหรับ EMRC Requests
 * เรียกโดยตรงจาก Next.js API route
 */
export function streamEMRCRequests(request: any): any {
  try {
    const client = getEMRCClient();
    const stream = client.StreamAmbulanceRequests(request);

    return stream;
  } catch (error) {
    throw error;
  }
}
