import path from 'path';

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

import { config } from './config/env';
import prisma from './config/database';
import * as porterHandlers from './handlers/porter.handler';
import { logger } from './utils/logger';
import { withGrpcLog, withGrpcStreamLog } from './utils/withGrpcLog';

// Path ไปยัง proto file ใน shared/proto/porter.proto
// รองรับทั้ง development (__dirname = backend/porter/src/) และ production (__dirname = backend/porter/dist/)
// จาก backend/porter/src/ หรือ backend/porter/dist/ ไปที่ shared/proto/porter.proto = ../../../shared/proto/porter.proto
const PROTO_PATH = path.resolve(__dirname, '../../../shared/proto/porter.proto');

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

    server.addService(porterProto.porter.PorterService.service, {
      createPorterRequest: withGrpcLog('createPorterRequest', porterHandlers.createPorterRequest),
      getPorterRequest: withGrpcLog('getPorterRequest', porterHandlers.getPorterRequest),
      listPorterRequests: withGrpcLog('listPorterRequests', porterHandlers.listPorterRequests),
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
    });

    const port = config.port || 50051;
    server.bindAsync(
      `0.0.0.0:${port}`,
      grpc.ServerCredentials.createInsecure(),
      (error, boundPort) => {
        if (error) {
          logger.error({ err: error }, 'Failed to start gRPC server');
          process.exit(1);
        }

        logger.info({ port: boundPort, nodeEnv: config.nodeEnv }, 'gRPC Server is running');
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
