/**
 * Environment Variables Validation
 * ตรวจสอบและ validate environment variables ที่จำเป็น
 */

interface RequiredEnvVars {
  NEXTAUTH_URL: string;
  NEXTAUTH_SECRET: string;
  LDAP_URL: string;
  LDAP_BASE_DN: string;
  LDAP_BIND_DN: string;
  LDAP_BIND_PASSWORD: string;
}

interface OptionalEnvVars {
  LDAP_SEARCH_FILTER?: string;
  LDAP_ATTRIBUTES?: string;
  LDAP_TIMEOUT?: string;
  LDAP_CONNECT_TIMEOUT?: string;
  LDAP_IDLE_TIMEOUT?: string;
  LDAP_RECONNECT?: string;
}

/**
 * ตรวจสอบ required environment variables
 */
function validateRequiredEnvVars(): RequiredEnvVars {
  const requiredVars: (keyof RequiredEnvVars)[] = [
    "NEXTAUTH_URL",
    "NEXTAUTH_SECRET",
    "LDAP_URL",
    "LDAP_BASE_DN",
    "LDAP_BIND_DN",
    "LDAP_BIND_PASSWORD",
  ];

  const missingVars: string[] = [];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}`,
    );
  }

  return {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL!,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET!,
    LDAP_URL: process.env.LDAP_URL!,
    LDAP_BASE_DN: process.env.LDAP_BASE_DN!,
    LDAP_BIND_DN: process.env.LDAP_BIND_DN!,
    LDAP_BIND_PASSWORD: process.env.LDAP_BIND_PASSWORD!,
  };
}

/**
 * ตรวจสอบ optional environment variables
 */
function validateOptionalEnvVars(): OptionalEnvVars {
  return {
    LDAP_SEARCH_FILTER: process.env.LDAP_SEARCH_FILTER,
    LDAP_ATTRIBUTES: process.env.LDAP_ATTRIBUTES,
    LDAP_TIMEOUT: process.env.LDAP_TIMEOUT,
    LDAP_CONNECT_TIMEOUT: process.env.LDAP_CONNECT_TIMEOUT,
    LDAP_IDLE_TIMEOUT: process.env.LDAP_IDLE_TIMEOUT,
    LDAP_RECONNECT: process.env.LDAP_RECONNECT,
  };
}

/**
 * ตรวจสอบความปลอดภัยของ environment variables
 */
function validateSecurity(): void {
  // ตรวจสอบ NEXTAUTH_SECRET
  const secret = process.env.NEXTAUTH_SECRET;

  if (secret && secret.length < 32) {
    throw new Error("NEXTAUTH_SECRET ต้องมีความยาวอย่างน้อย 32 ตัวอักษร");
  }

  // ตรวจสอบ LDAP_URL format
  const ldapUrl = process.env.LDAP_URL;

  if (
    ldapUrl &&
    !ldapUrl.startsWith("ldap://") &&
    !ldapUrl.startsWith("ldaps://")
  ) {
    throw new Error("LDAP_URL ต้องเริ่มต้นด้วย ldap:// หรือ ldaps://");
  }

  // ตรวจสอบ LDAP_BASE_DN format
  const baseDN = process.env.LDAP_BASE_DN;

  if (baseDN && !baseDN.match(/^DC=/i)) {
    throw new Error("LDAP_BASE_DN ต้องเป็นรูปแบบ DC=domain,DC=com");
  }
}

/**
 * ตรวจสอบและ validate environment variables ทั้งหมด
 */
export function validateEnvironment(): {
  required: RequiredEnvVars;
  optional: OptionalEnvVars;
} {
  try {
    // ตรวจสอบความปลอดภัยก่อน
    validateSecurity();

    // ตรวจสอบ required variables
    const required = validateRequiredEnvVars();

    // ตรวจสอบ optional variables
    const optional = validateOptionalEnvVars();

    return { required, optional };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Environment validation failed:", error);
    throw error;
  }
}

/**
 * ตรวจสอบว่าเป็น production environment หรือไม่
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * ตรวจสอบว่าเป็น development environment หรือไม่
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}
