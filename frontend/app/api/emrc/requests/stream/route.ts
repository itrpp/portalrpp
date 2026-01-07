import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/api/auth/authOptions";
import { streamEMRCRequests } from "@/lib/grpcClient";
import {
  mapBookingPurposeToProto,
  convertProtoToFrontend,
} from "@/lib/emrc";

// Route segment config สำหรับ SSE stream
export const maxDuration = 300; // 5 minutes
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * SSE Endpoint สำหรับ real-time updates ของ EMRC Requests
 * GET /api/emrc/requests/stream
 */
export async function GET(request: NextRequest) {
  try {
    const session = (await getServerSession(
      authOptions as any,
    )) as import("@/types/ldap").ExtendedSession;

    if (!session?.user?.id) {
      return new Response(
        JSON.stringify({ success: false, error: "UNAUTHORIZED" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // อ่าน query parameters
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const { status, booking_purpose } = Object.fromEntries(searchParams);

    // สร้าง request สำหรับ gRPC stream โดยตรง
    const protoRequest: any = {};

    if (status !== undefined && status !== null) {
      protoRequest.status = status;
    }
    if (booking_purpose !== undefined && booking_purpose !== null) {
      protoRequest.booking_purpose = mapBookingPurposeToProto(booking_purpose);
    }

    // สร้าง gRPC stream โดยตรงจาก gRPC service
    const grpcStream = streamEMRCRequests(protoRequest);

    // สร้าง ReadableStream เพื่อแปลง gRPC stream เป็น SSE
    let isStreamClosed = false;
    let keepAliveInterval: NodeJS.Timeout | null = null;

    const stream = new ReadableStream({
      async start(streamController) {
        try {
          // Helper function สำหรับตรวจสอบว่า stream ยังเปิดอยู่
          const isControllerOpen = () => {
            try {
              return !isStreamClosed;
            } catch {
              return false;
            }
          };

          // Helper function สำหรับ close stream อย่างปลอดภัย
          const safeClose = () => {
            if (isStreamClosed) {
              return;
            }

            isStreamClosed = true;

            if (keepAliveInterval) {
              clearInterval(keepAliveInterval);
              keepAliveInterval = null;
            }

            try {
              streamController.close();
            } catch {
              // Ignore errors when closing
            }
          };

          // รับข้อมูลจาก gRPC stream
          grpcStream.on("data", (update: any) => {
            if (!isControllerOpen()) {
              return;
            }

            try {
              const frontendData = convertProtoToFrontend(update.request);
              const updateType = update.type || "UPDATED";

              const sseData = JSON.stringify({
                type: updateType,
                data: frontendData,
              });

              streamController.enqueue(
                new TextEncoder().encode(`data: ${sseData}\n\n`),
              );
            } catch (error) {
              console.error("[SSE] Error processing stream data:", error);
            }
          });

          grpcStream.on("error", (error: any) => {
            console.error("[SSE] gRPC stream error:", error);
            safeClose();
          });

          grpcStream.on("end", () => {
            console.info("[SSE] gRPC stream ended");
            safeClose();
          });

          // Keep-alive: ส่ง comment ทุก 30 วินาที
          keepAliveInterval = setInterval(() => {
            if (isControllerOpen()) {
              try {
                streamController.enqueue(
                  new TextEncoder().encode(`: keep-alive\n\n`),
                );
              } catch {
                safeClose();
              }
            } else {
              if (keepAliveInterval) {
                clearInterval(keepAliveInterval);
                keepAliveInterval = null;
              }
            }
          }, 30000);
        } catch (error) {
          console.error("[SSE] Stream setup error:", error);
          streamController.close();
        }
      },
      cancel() {
        isStreamClosed = true;
        if (keepAliveInterval) {
          clearInterval(keepAliveInterval);
          keepAliveInterval = null;
        }
        try {
          grpcStream.cancel();
        } catch {
          // Ignore errors
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error: any) {
    console.error("[SSE] Error setting up stream:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: "STREAM_SETUP_FAILED",
        message: "ไม่สามารถสร้าง stream ได้",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

