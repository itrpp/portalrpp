import { readFile, stat } from "fs/promises";
import path from "path";

import { NextRequest, NextResponse } from "next/server";

// กำหนด MIME types สำหรับไฟล์ต่างๆ
const MIME_TYPES: Record<string, string> = {
  ".json": "application/json",
  ".apk": "application/vnd.android.package-archive",
  ".pdf": "application/pdf",
  ".zip": "application/zip",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".txt": "text/plain",
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".xml": "application/xml",
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path: pathSegments } = await params;

    // สร้าง path จาก segments
    const filePath = path.join(process.cwd(), "storage", ...pathSegments);

    // ป้องกัน path traversal attack
    const storageRoot = path.join(process.cwd(), "storage");
    const resolvedPath = path.resolve(filePath);

    if (!resolvedPath.startsWith(storageRoot)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // ตรวจสอบว่าไฟล์มีอยู่หรือไม่
    const fileStat = await stat(resolvedPath);

    if (!fileStat.isFile()) {
      return NextResponse.json({ error: "Not a file" }, { status: 400 });
    }

    // อ่านไฟล์
    const fileBuffer = await readFile(resolvedPath);

    // กำหนด content type
    const ext = path.extname(resolvedPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    // ตรวจสอบว่าเป็นไฟล์ที่ควร download หรือแสดงใน browser
    const downloadableExtensions = [
      ".apk",
      ".zip",
      ".pdf",
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
    ];
    const isDownloadable = downloadableExtensions.includes(ext);

    // สร้าง response พร้อม headers ที่เหมาะสม
    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Content-Length": fileStat.size.toString(),
      // ไม่ cache เพื่อให้ได้ไฟล์ล่าสุดเสมอ
      "Cache-Control": "no-store, no-cache, must-revalidate",
    };

    // เพิ่ม Content-Disposition สำหรับไฟล์ที่ต้องการ download
    if (isDownloadable) {
      headers["Content-Disposition"] =
        `attachment; filename="${encodeURIComponent(path.basename(resolvedPath))}"`;
    }

    return new NextResponse(fileBuffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    console.error("Storage file error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
