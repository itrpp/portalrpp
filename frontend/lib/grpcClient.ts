import path from "path";

import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

/**
 * โหลด Proto Definition สำหรับ Porter Service
 * ใช้ไฟล์ proto ที่อยู่ใน frontend/proto/porter.proto
 */
function getProtoPath(): string {
  // Path ไปยัง proto file ใน frontend/proto/porter.proto
  // ใช้ process.cwd() ซึ่งจะชี้ไปที่ frontend directory
  const protoPath = path.resolve(process.cwd(), "proto/porter.proto");

  try {
    const fs = require("fs");

    if (fs.existsSync(protoPath)) {
      return protoPath;
    }
  } catch {}

  // ถ้าหาไม่เจอ ให้ throw error แทนการใช้ default path
  throw new Error(
    `Proto file not found at: ${protoPath}. Please ensure proto/porter.proto exists in the frontend directory.`,
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
