import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/env.js';
import prisma from './config/database.js';
import * as porterHandlers from './handlers/porter.handler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path ไปยัง proto file จาก src/server.js -> proto/porter.proto
const PROTO_PATH = path.resolve(__dirname, '../proto/porter.proto');

/**
 * โหลด Proto Definition
 */
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const porterProto = grpc.loadPackageDefinition(packageDefinition).porter;

/**
 * เริ่มต้น gRPC Server
 */
const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    console.info('✅ Database connected successfully');

    // สร้าง gRPC Server
    const server = new grpc.Server();

    // ลงทะเบียน Porter Service
    server.addService(porterProto.PorterService.service, {
      // Porter Request handlers
      createPorterRequest: porterHandlers.createPorterRequest,
      getPorterRequest: porterHandlers.getPorterRequest,
      listPorterRequests: porterHandlers.listPorterRequests,
      updatePorterRequest: porterHandlers.updatePorterRequest,
      updatePorterRequestStatus: porterHandlers.updatePorterRequestStatus,
      updatePorterRequestTimestamps: porterHandlers.updatePorterRequestTimestamps,
      deletePorterRequest: porterHandlers.deletePorterRequest,
      healthCheck: porterHandlers.healthCheck,
      streamPorterRequests: porterHandlers.streamPorterRequests,
      // Location Settings handlers
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
      // Employee Management handlers
      createEmployee: porterHandlers.createEmployee,
      getEmployee: porterHandlers.getEmployee,
      listEmployees: porterHandlers.listEmployees,
      updateEmployee: porterHandlers.updateEmployee,
      deleteEmployee: porterHandlers.deleteEmployee,
      // EmploymentType Management handlers
      createEmploymentType: porterHandlers.createEmploymentType,
      getEmploymentType: porterHandlers.getEmploymentType,
      listEmploymentTypes: porterHandlers.listEmploymentTypes,
      updateEmploymentType: porterHandlers.updateEmploymentType,
      deleteEmploymentType: porterHandlers.deleteEmploymentType,
      // Position Management handlers
      createPosition: porterHandlers.createPosition,
      getPosition: porterHandlers.getPosition,
      listPositions: porterHandlers.listPositions,
      updatePosition: porterHandlers.updatePosition,
      deletePosition: porterHandlers.deletePosition,
    });

    // เริ่ม listen
    const port = config.port || 50051;
    server.bindAsync(
      `0.0.0.0:${port}`,
      grpc.ServerCredentials.createInsecure(),
      (error, port) => {
        if (error) {
          console.error('❌ Failed to start gRPC server:', error);
          process.exit(1);
        }

        server.start();
        console.info(`🚀 gRPC Server is running on port ${port}`);
        console.info(`📝 Environment: ${config.nodeEnv}`);
        console.info(`🌐 gRPC endpoint: 0.0.0.0:${port}`);
      }
    );
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Graceful shutdown
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