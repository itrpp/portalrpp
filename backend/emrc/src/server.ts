import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { config } from './config/env';
import prisma from './config/database';
import * as emrcHandlers from './handlers/emrc.handler';

// Path ไปยัง proto file ใน shared/proto/emrc.proto
// รองรับทั้ง development (__dirname = backend/emrc/src/) และ production (__dirname = backend/emrc/dist/)
// จาก backend/emrc/src/ หรือ backend/emrc/dist/ ไปที่ shared/proto/emrc.proto = ../../../shared/proto/emrc.proto
const PROTO_PATH = path.resolve(__dirname, '../../../shared/proto/emrc.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const emrcProto = grpc.loadPackageDefinition(packageDefinition) as unknown as {
  emrc: {
    EMRCService: {
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

    server.addService(emrcProto.emrc.EMRCService.service, {
      createAmbulanceRequest: emrcHandlers.createAmbulanceRequest,
      getAmbulanceRequest: emrcHandlers.getAmbulanceRequest,
      listAmbulanceRequests: emrcHandlers.listAmbulanceRequests,
      updateAmbulanceRequest: emrcHandlers.updateAmbulanceRequest,
      updateAmbulanceRequestStatus: emrcHandlers.updateAmbulanceRequestStatus,
      updateAmbulanceRequestTimestamps: emrcHandlers.updateAmbulanceRequestTimestamps,
      deleteAmbulanceRequest: emrcHandlers.deleteAmbulanceRequest,
      healthCheck: emrcHandlers.healthCheck,
      streamAmbulanceRequests: emrcHandlers.streamAmbulanceRequests
    });

    const port = config.port || 50052;
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
      }
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

