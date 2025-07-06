import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "OK",
    service: "RPP Portal Frontend",
    timestamp: new Date().toISOString(),
  });
}
