import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import type { LDAPErrorCode } from "@/types/ldap";

import { createLDAPService } from "@/lib/ldap";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/auth/login
 * API endpoint สำหรับให้ app อื่นๆ ทำ authentication และรับ JWT token
 * Body: { username: string, password: string }
 */
export async function POST(request: Request) {
  try {
    // อ่าน request body
    const body = await request.json();
    const { username, password } = body;

    // Input validation
    if (!username || !password) {
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_CREDENTIALS",
          message: "username and password are required",
        },
        { status: 400 },
      );
    }

    // ตรวจสอบ JWT secret
    const jwtSecret =
      process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "";

    if (!jwtSecret) {
      return NextResponse.json(
        {
          success: false,
          error: "CONFIGURATION_ERROR",
          message: "JWT secret is not configured",
        },
        { status: 500 },
      );
    }

    // LDAP Authentication
    const ldapService = createLDAPService();
    let ldapUser;

    try {
      const result = await ldapService.authenticate(username, password);

      if (!result.success || !result.user) {
        // Map error code to HTTP status and message
        const errorCode = result.errorCode || "INVALID_CREDENTIALS";
        const statusCode =
          errorCode === "MISSING_CREDENTIALS" ? 400 : 401;

        return NextResponse.json(
          {
            success: false,
            error: errorCode,
            message: getErrorMessage(errorCode),
          },
          { status: statusCode },
        );
      }

      ldapUser = result.user;
    } catch (error) {
      console.error("LDAP authentication error:", error);

      if (error instanceof Error) {
        const errorCode = error.message as LDAPErrorCode;
        const statusCode =
          errorCode === "MISSING_CREDENTIALS" ? 400 : 401;

        return NextResponse.json(
          {
            success: false,
            error: errorCode,
            message: getErrorMessage(errorCode),
          },
          { status: statusCode },
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: "INTERNAL_ERROR",
          message: "Authentication failed",
        },
        { status: 500 },
      );
    } finally {
      await ldapService.disconnect();
    }

    // Upsert user ใน database
    const email = ldapUser.email ?? `ldap-${ldapUser.id}`;
    const ldapDisplayName = ldapUser.displayName;
    const department = ldapUser.department ?? null;
    const position = ldapUser.position ?? null;
    const memberOf = ldapUser.memberOf ?? null;
    const role = ldapUser.role || "user";
    const ldapId = ldapUser.id;

    let dbUser;

    try {
      dbUser = await prisma.user.upsert({
        where: { email },
        update: {
          ldapDisplayName,
          memberOf,
          ldapId,
        },
        create: {
          email,
          ldapDisplayName,
          department,
          position,
          memberOf,
          role,
          ldapId,
        },
      });
    } catch (error) {
      console.error("Database upsert error:", error);

      return NextResponse.json(
        {
          success: false,
          error: "INTERNAL_ERROR",
          message: "Failed to save user data",
        },
        { status: 500 },
      );
    }

    // สร้าง JWT token
    const token = jwt.sign(
      {
        sub: dbUser.id,
        department: dbUser.department,
        position: dbUser.position,
        memberOf: dbUser.memberOf,
        role: dbUser.role,
      },
      jwtSecret,
      { expiresIn: "1h" },
    );

    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        token,
        user: {
          id: dbUser.id,
          email: dbUser.email,
          displayName: dbUser.displayName,
          department: dbUser.department,
          position: dbUser.position,
          role: dbUser.role,
        },
      },
    });
  } catch (error: unknown) {
    console.error("Login API error:", error);

    // จัดการกรณี request body ไม่ถูกต้อง
    if (
      error instanceof SyntaxError ||
      (error instanceof Error && error.message.includes("JSON"))
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_REQUEST",
          message: "Invalid request body",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: "An error occurred during authentication",
      },
      { status: 500 },
    );
  }
}

/**
 * แปลง error code เป็น error message
 */
function getErrorMessage(errorCode: LDAPErrorCode): string {
  switch (errorCode) {
    case "MISSING_CREDENTIALS":
      return "username and password are required";
    case "USER_NOT_FOUND":
      return "Invalid username or password";
    case "ACCOUNT_DISABLED":
      return "Account is disabled";
    case "USER_NOT_AUTHORIZED":
      return "User is not authorized";
    case "INVALID_CREDENTIALS":
      return "Invalid username or password";
    case "CONNECTION_ERROR":
      return "Cannot connect to authentication server";
    case "INTERNAL_ERROR":
    default:
      return "Authentication failed";
  }
}

