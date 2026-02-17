import path from 'path';

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

import { config } from './config/env';
import prisma from './config/database';
import * as porterHandlers from './handlers/porter.handler';

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
    console.info('✅ Database connected successfully');

    const server = new grpc.Server({
      // เพิ่ม max message size เป็น 10MB เพื่อรองรับข้อมูลขนาดใหญ่
      // Default คือ 4MB (4194304 bytes) ซึ่งไม่พอสำหรับบาง request/response
      'grpc.max_receive_message_length': 10 * 1024 * 1024, // 10MB
      'grpc.max_send_message_length': 10 * 1024 * 1024, // 10MB
    });

    server.addService(porterProto.porter.PorterService.service, {
      createPorterRequest: porterHandlers.createPorterRequest,
      getPorterRequest: porterHandlers.getPorterRequest,
      listPorterRequests: porterHandlers.listPorterRequests,
      updatePorterRequest: porterHandlers.updatePorterRequest,
      updatePorterRequestStatus: porterHandlers.updatePorterRequestStatus,
      updatePorterRequestTimestamps: porterHandlers.updatePorterRequestTimestamps,
      deletePorterRequest: porterHandlers.deletePorterRequest,
      healthCheck: porterHandlers.healthCheck,
      streamPorterRequests: porterHandlers.streamPorterRequests,
      createBuilding: porterHandlers.createBuilding,
      getBuilding: porterHandlers.getBuilding,
      listBuildings: porterHandlers.listBuildings,
      updateBuilding: porterHandlers.updateBuilding,
      deleteBuilding: porterHandlers.deleteBuilding,
      createFloorDepartment: porterHandlers.createFloorDepartment,
      getFloorDepartment: porterHandlers.getFloorDepartment,
      listFloorDepartments: porterHandlers.listFloorDepartments,
      updateFloorDepartment: porterHandlers.updateFloorDepartment,
      deleteFloorDepartment: porterHandlers.deleteFloorDepartment,
      createFloorPlan: porterHandlers.createFloorPlan,
      getFloorPlan: porterHandlers.getFloorPlan,
      listFloorPlans: porterHandlers.listFloorPlans,
      updateFloorPlan: porterHandlers.updateFloorPlan,
      deleteFloorPlan: porterHandlers.deleteFloorPlan,
      createBleStation: porterHandlers.createBleStation,
      getBleStation: porterHandlers.getBleStation,
      listBleStations: porterHandlers.listBleStations,
      updateBleStation: porterHandlers.updateBleStation,
      deleteBleStation: porterHandlers.deleteBleStation,
      createEmployee: porterHandlers.createEmployee,
      getEmployee: porterHandlers.getEmployee,
      listEmployees: porterHandlers.listEmployees,
      updateEmployee: porterHandlers.updateEmployee,
      deleteEmployee: porterHandlers.deleteEmployee,
    });

    const port = config.port || 50051;
    server.bindAsync(
      `0.0.0.0:${port}`,
      grpc.ServerCredentials.createInsecure(),
      (error, boundPort) => {
        if (error) {
          console.error('❌ Failed to start gRPC server:', error);
          process.exit(1);
        }

        server.start();
        console.info(`🚀 gRPC Server is running on port ${boundPort}`);
        console.info(`📝 Environment: ${config.nodeEnv}`);
        console.info(`🌐 gRPC endpoint: 0.0.0.0:${boundPort}`);
      },
    );
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('SIGTERM', async () => {
  console.info('SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.info('SIGINT received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
