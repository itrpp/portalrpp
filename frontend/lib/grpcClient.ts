import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

/**
 * โหลด Proto Definition สำหรับ Porter Service
 */
function getProtoPath(): string {
  // Path ไปยัง proto file จาก frontend/lib -> backend/porter/proto/porter.proto
  // ใช้ __dirname ใน Node.js runtime (Next.js API routes)
  const possiblePaths = [
    // จาก compiled code (.next/server/app/api/...)
    path.resolve(process.cwd(), 'backend/porter/proto/porter.proto'),
    // จาก source code (lib/)
    path.resolve(process.cwd(), '../backend/porter/proto/porter.proto'),
    // จาก project root
    path.resolve(process.cwd(), '../../backend/porter/proto/porter.proto'),
  ];

  for (const protoPath of possiblePaths) {
    try {
      const fs = require('fs');
      if (fs.existsSync(protoPath)) {
        // eslint-disable-next-line no-console
        console.log('[gRPC Client] Using proto file:', protoPath);
        return protoPath;
      }
    } catch {
      // Continue to next path
    }
  }

  // ถ้าหาไม่เจอ ให้ใช้ path แรก (default)
  const defaultPath = possiblePaths[0];
  // eslint-disable-next-line no-console
  console.warn('[gRPC Client] Proto file not found, using default path:', defaultPath);
  return defaultPath;
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
  const grpcUrl = 
    process.env.PORTER_SERVICE_GRPC_URL || 
    process.env.NEXT_PUBLIC_PORTER_SERVICE_GRPC_URL || 
    'localhost:50051';

  // eslint-disable-next-line no-console
  console.log('[gRPC Client] Connecting to gRPC service at:', grpcUrl);

  if (!grpcUrl) {
    throw new Error('PORTER_SERVICE_GRPC_URL is not configured');
  }

  const client = new porterProto.PorterService(
    grpcUrl,
    grpc.credentials.createInsecure()
  );

  return client;
}

/**
 * สร้าง gRPC stream สำหรับ Porter Requests
 * เรียกโดยตรงจาก Next.js API route
 */
export function streamPorterRequests(request: any): any {
  try {
    const client = getPorterClient();
    const stream = client.StreamPorterRequests(request);

    // eslint-disable-next-line no-console
    console.log("[gRPC Client] Stream created successfully");

    return stream;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[gRPC Client] Error creating stream:", error);
    throw error;
  }
}

