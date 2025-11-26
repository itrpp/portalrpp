import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { streamPorterRequests } from "@/lib/grpcClient";
import {
  mapStatusToProto,
  mapUrgencyLevelToProto,
  convertProtoToFrontend,
} from "@/lib/porter";

// Route segment config สำหรับ SSE stream
// maxDuration 300 วินาที (5 นาที) เป็น maximum ที่ Next.js อนุญาต
// แต่ stream จะ reconnect อัตโนมัติเมื่อ timeout
export const maxDuration = 300; // 5 minutes (max allowed by Next.js)
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * SSE Endpoint สำหรับ real-time updates ของ Porter Requests
 * GET /api/porter/requests/stream
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
    const { status, urgency_level } = Object.fromEntries(searchParams);

    // สร้าง request สำหรับ gRPC stream โดยตรง
    const protoRequest: any = {};

    if (status !== undefined && status !== null) {
      protoRequest.status = mapStatusToProto(status);
      console.info("[Next.js API] Mapped status filter:", {
        original: status,
        proto: protoRequest.status,
      });
    }
    if (urgency_level !== undefined && urgency_level !== null) {
      protoRequest.urgency_level = mapUrgencyLevelToProto(urgency_level);
      console.info("[Next.js API] Mapped urgency_level filter:", {
        original: urgency_level,
        proto: protoRequest.urgency_level,
      });
    }

    console.info("[Next.js API] Proto request object:", protoRequest);

    // สร้าง gRPC stream โดยตรงจาก gRPC service (ไม่ผ่าน API Gateway)
    const grpcStream = streamPorterRequests(protoRequest);

    console.info(
      "[Next.js API] gRPC stream created directly, waiting for data...",
    );

    // สร้าง ReadableStream เพื่อแปลง gRPC stream เป็น SSE
    let isStreamClosed = false;
    let keepAliveInterval: NodeJS.Timeout | null = null;

    const stream = new ReadableStream({
      async start(streamController) {
        try {
          console.info("[Next.js API] Starting to read gRPC stream...");

          // Helper function สำหรับตรวจสอบว่า stream ยังเปิดอยู่
          const isControllerOpen = () => {
            try {
              // ตรวจสอบว่า streamController ยังเปิดอยู่
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
            // แปลง type เป็น string (รองรับทั้ง number และ string)
            // เนื่องจาก protoLoader อาจแปลง enum เป็น string เมื่อใช้ enums: String
            let updateTypeNumber: number;

            if (typeof update.type === "string") {
              // ถ้าเป็น string ให้ map กลับเป็น number
              const typeMap: Record<string, number> = {
                CREATED: 0,
                UPDATED: 1,
                STATUS_CHANGED: 2,
                DELETED: 3,
              };

              updateTypeNumber = typeMap[update.type] ?? 0;
            } else {
              updateTypeNumber = update.type;
            }

            const updateTypeString =
              updateTypeNumber === 0
                ? "CREATED"
                : updateTypeNumber === 1
                  ? "UPDATED"
                  : updateTypeNumber === 2
                    ? "STATUS_CHANGED"
                    : "DELETED";

            console.info("[Next.js API] Received gRPC stream data event:", {
              rawType: update.type,
              typeValue: updateTypeNumber,
              typeName: updateTypeString,
              hasRequest: !!update.request,
              requestId: update.request?.id,
              requestStatus: update.request?.status,
              isControllerOpen: isControllerOpen(),
            });

            if (!isControllerOpen()) {
              console.warn(
                "[Next.js API] Stream controller is closed, ignoring data",
              );

              return;
            }

            try {
              // แปลงข้อมูลจาก Proto format เป็น Frontend format
              if (update.request) {
                const frontendData = convertProtoToFrontend(update.request);

                const updateData = {
                  type: updateTypeString,
                  data: frontendData,
                };

                console.info("[Next.js API] Converted to frontend format:", {
                  type: updateData.type,
                  requestId: frontendData.id,
                  status: frontendData.status,
                });

                // ส่งข้อมูลผ่าน SSE
                const sseMessage = `data: ${JSON.stringify(updateData)}\n\n`;
                const encoder = new TextEncoder();

                if (isControllerOpen()) {
                  try {
                    streamController.enqueue(encoder.encode(sseMessage));
                    console.info(
                      "[Next.js API] Successfully sent SSE message:",
                      {
                        type: updateData.type,
                        requestId: frontendData.id,
                      },
                    );
                  } catch (enqueueError) {
                    console.error(
                      "[Next.js API] Error enqueueing SSE message:",
                      enqueueError,
                    );
                  }
                } else {
                  console.warn(
                    "[Next.js API] Controller closed, cannot send SSE message",
                  );
                }
              } else {
                console.warn(
                  "[Next.js API] Received update without request data:",
                  update,
                );
              }
            } catch (error) {
              console.error("[Next.js API] Error processing stream data:", {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                rawUpdateType: update.type,
                updateTypeName: updateTypeString,
                hasRequest: !!update.request,
              });
            }
          });

          // จัดการ error
          grpcStream.on("error", (error: any) => {
            // ไม่ต้องแสดง error ถ้าเป็น CANCELLED (ปกติเมื่อ client ปิด connection)
            if (
              error.code === 1 &&
              (error.details?.includes("Cancelled") ||
                error.message?.includes("Cancelled"))
            ) {
              console.info("[Next.js API] Stream cancelled by client (normal)");
              safeClose();

              return;
            }

            // Error อื่นๆ - log และส่ง error message
            console.error("[Next.js API] gRPC stream error:", error);

            if (isControllerOpen()) {
              try {
                const errorMessage = `event: error\ndata: ${JSON.stringify({ error: error.message || "Stream error" })}\n\n`;
                const encoder = new TextEncoder();

                streamController.enqueue(encoder.encode(errorMessage));
              } catch {
                // Ignore errors
              }
            }

            safeClose();
          });

          // จัดการเมื่อ stream end
          grpcStream.on("end", () => {
            console.info("[Next.js API] gRPC stream ended");
            safeClose();
          });

          // ส่ง keep-alive message ทุก 20 วินาที
          keepAliveInterval = setInterval(() => {
            if (!isControllerOpen()) {
              if (keepAliveInterval) {
                clearInterval(keepAliveInterval);
                keepAliveInterval = null;
              }

              return;
            }

            try {
              const keepAlive = ": keep-alive\n\n";
              const encoder = new TextEncoder();

              streamController.enqueue(encoder.encode(keepAlive));
              console.info("[Next.js API] Sent keep-alive message");
            } catch {
              // Connection closed
              if (keepAliveInterval) {
                clearInterval(keepAliveInterval);
                keepAliveInterval = null;
              }

              safeClose();
            }
          }, 20000);
        } catch (error: any) {
          console.error("[Next.js API] Error setting up stream:", error);
          isStreamClosed = true;

          if (keepAliveInterval) {
            clearInterval(keepAliveInterval);
            keepAliveInterval = null;
          }

          try {
            streamController.close();
          } catch {
            // Ignore errors
          }
        }
      },
      cancel() {
        // เมื่อ client ปิด connection - cancel gRPC stream
        console.info("[Next.js API] Stream cancelled by client");

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

    // ส่งกลับ response พร้อม SSE headers
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error: unknown) {
    // Log error for debugging
    console.error("Error setting up SSE stream:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: "Failed to establish stream",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
