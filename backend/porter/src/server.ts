import fs from 'fs';
import path from 'path';

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

import { config } from './config/env';
import prisma from './config/database';
import * as porterHandlers from './handlers/porter.handler';
import { logger } from './utils/logger';
import { withGrpcLog, withGrpcStreamLog } from './utils/withGrpcLog';

/**
 * หา porter.proto ให้ชัวร์ทั้งโหมด tsx (src/) และ dist/ — กันโหลดไฟล์ผิดแล้ว RPC ใหม่กลายเป็น UNIMPLEMENTED
 */
function resolvePorterProtoPath(): string {
  const candidates = [
    path.resolve(process.cwd(), '../../shared/proto/porter.proto'),
    path.resolve(process.cwd(), 'shared/proto/porter.proto'),
    path.resolve(__dirname, '../../shared/proto/porter.proto'),
    path.resolve(__dirname, '../../../../../../shared/proto/porter.proto'),
  ];

  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    candidates.push(path.join(dir, 'shared/proto/porter.proto'));
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  throw new Error(
    `porter.proto not found (cwd=${process.cwd()}, __dirname=${__dirname})`,
  );
}

const PROTO_PATH = resolvePorterProtoPath();

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const porterProto = grpc.loadPackageDefinition(packageDefinition) as unknown as {
  porter: {
    PorterService: {
      service: grpc.ServiceDefinition;
    };
  };
};

const porterServiceDef = porterProto.porter.PorterService.service;
if (!porterServiceDef.GetPorterRequestStats) {
  throw new Error(
    `GetPorterRequestStats missing from loaded proto at ${PROTO_PATH}`,
  );
}
if (typeof porterHandlers.getPorterRequestStats !== 'function') {
  throw new Error(
    'porterHandlers.getPorterRequestStats is not a function — rebuild dist after adding porterStats.service',
  );
}

const startServer = async () => {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');

    const server = new grpc.Server({
      // เพิ่ม max message size เป็น 10MB เพื่อรองรับข้อมูลขนาดใหญ่
      // Default คือ 4MB (4194304 bytes) ซึ่งไม่พอสำหรับบาง request/response
      'grpc.max_receive_message_length': 10 * 1024 * 1024, // 10MB
      'grpc.max_send_message_length': 10 * 1024 * 1024, // 10MB
    });

    // keepCase:true → key ใน service เป็น PascalCase (GetPorterRequestStats)
    // register ทั้ง PascalCase + camelCase กัน UNIMPLEMENTED จาก key mismatch
    const handlers: Record<string, unknown> = {
      createPorterRequest: withGrpcLog('createPorterRequest', porterHandlers.createPorterRequest),
      getPorterRequest: withGrpcLog('getPorterRequest', porterHandlers.getPorterRequest),
      listPorterRequests: withGrpcLog('listPorterRequests', porterHandlers.listPorterRequests),
      getPorterRequestStats: withGrpcLog(
        'getPorterRequestStats',
        porterHandlers.getPorterRequestStats,
      ),
      updatePorterRequest: withGrpcLog('updatePorterRequest', porterHandlers.updatePorterRequest),
      updatePorterRequestStatus: withGrpcLog(
        'updatePorterRequestStatus',
        porterHandlers.updatePorterRequestStatus,
      ),
      updatePorterRequestTimestamps: withGrpcLog(
        'updatePorterRequestTimestamps',
        porterHandlers.updatePorterRequestTimestamps,
      ),
      deletePorterRequest: withGrpcLog('deletePorterRequest', porterHandlers.deletePorterRequest),
      healthCheck: withGrpcLog('healthCheck', porterHandlers.healthCheck),
      streamPorterRequests: withGrpcStreamLog(
        'streamPorterRequests',
        porterHandlers.streamPorterRequests,
      ),
      createBuilding: withGrpcLog('createBuilding', porterHandlers.createBuilding),
      getBuilding: withGrpcLog('getBuilding', porterHandlers.getBuilding),
      listBuildings: withGrpcLog('listBuildings', porterHandlers.listBuildings),
      updateBuilding: withGrpcLog('updateBuilding', porterHandlers.updateBuilding),
      deleteBuilding: withGrpcLog('deleteBuilding', porterHandlers.deleteBuilding),
      createFloorDepartment: withGrpcLog(
        'createFloorDepartment',
        porterHandlers.createFloorDepartment,
      ),
      getFloorDepartment: withGrpcLog('getFloorDepartment', porterHandlers.getFloorDepartment),
      listFloorDepartments: withGrpcLog(
        'listFloorDepartments',
        porterHandlers.listFloorDepartments,
      ),
      updateFloorDepartment: withGrpcLog(
        'updateFloorDepartment',
        porterHandlers.updateFloorDepartment,
      ),
      deleteFloorDepartment: withGrpcLog(
        'deleteFloorDepartment',
        porterHandlers.deleteFloorDepartment,
      ),
      createFloorPlan: withGrpcLog('createFloorPlan', porterHandlers.createFloorPlan),
      getFloorPlan: withGrpcLog('getFloorPlan', porterHandlers.getFloorPlan),
      listFloorPlans: withGrpcLog('listFloorPlans', porterHandlers.listFloorPlans),
      updateFloorPlan: withGrpcLog('updateFloorPlan', porterHandlers.updateFloorPlan),
      deleteFloorPlan: withGrpcLog('deleteFloorPlan', porterHandlers.deleteFloorPlan),
      createBleStation: withGrpcLog('createBleStation', porterHandlers.createBleStation),
      getBleStation: withGrpcLog('getBleStation', porterHandlers.getBleStation),
      listBleStations: withGrpcLog('listBleStations', porterHandlers.listBleStations),
      updateBleStation: withGrpcLog('updateBleStation', porterHandlers.updateBleStation),
      deleteBleStation: withGrpcLog('deleteBleStation', porterHandlers.deleteBleStation),
      createEmployee: withGrpcLog('createEmployee', porterHandlers.createEmployee),
      getEmployee: withGrpcLog('getEmployee', porterHandlers.getEmployee),
      listEmployees: withGrpcLog('listEmployees', porterHandlers.listEmployees),
      updateEmployee: withGrpcLog('updateEmployee', porterHandlers.updateEmployee),
      deleteEmployee: withGrpcLog('deleteEmployee', porterHandlers.deleteEmployee),
    };

    const implementation: Record<string, unknown> = { ...handlers };
    for (const [name, methodDef] of Object.entries(porterServiceDef)) {
      const originalName = (methodDef as { originalName?: string }).originalName;
      const fn = handlers[name] ?? (originalName ? handlers[originalName] : undefined);
      if (typeof fn === 'function') {
        implementation[name] = fn;
        if (originalName) implementation[originalName] = fn;
      }
    }

    server.addService(porterServiceDef, implementation as never);

    const port = config.port || 50051;
    server.bindAsync(
      `0.0.0.0:${port}`,
      grpc.ServerCredentials.createInsecure(),
      (error, boundPort) => {
        if (error) {
          logger.error({ err: error }, 'Failed to start gRPC server');
          process.exit(1);
        }

        logger.info(
          {
            port: boundPort,
            nodeEnv: config.nodeEnv,
            protoPath: PROTO_PATH,
            hasGetPorterRequestStats: true,
          },
          'gRPC Server is running',
        );
      },
    );
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    await prisma.$disconnect();
    process.exit(1);
  }
};

process.on('unhandledRejection', (err) => {
  logger.error({ err }, 'Unhandled Rejection');
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught Exception');
  process.exit(1);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
