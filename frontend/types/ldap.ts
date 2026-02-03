// LDAP Configuration Interface
export interface LDAPConfig {
  url: string;
  baseDN: string;
  bindDN: string;
  bindPassword: string;
  searchFilter: string;
  timeout: number;
  connectTimeout: number;
  idleTimeout?: number;
  reconnect?: boolean;
}

// LDAP User Data Interface
export interface LDAPUserData {
  id: string;
  displayName: string;
  email: string;
  department: string;
  position: string;
  memberOf: string;
  role: "admin" | "user";
}

// LDAP Search Result Interface
export interface LDAPSearchResult {
  objectName: string;
  attributes: Array<{
    type: string;
    values: string[];
  }>;
}

// LDAP Authentication Result
export type LDAPErrorCode =
  | "MISSING_CREDENTIALS"
  | "USER_NOT_FOUND"
  | "ACCOUNT_DISABLED"
  | "USER_NOT_AUTHORIZED"
  | "INVALID_CREDENTIALS"
  | "CONNECTION_ERROR"
  | "INTERNAL_ERROR";

export interface LDAPAuthResult {
  success: boolean;
  user?: LDAPUserData;
  errorCode?: LDAPErrorCode;
}

/** เจ้าหน้าที่เปลที่ผูกกับ user login นี้ (จาก PorterEmployee) */
export interface PorterEmployeeRef {
  id: string;
}

// NextAuth User Interface Extension
export interface ExtendedUser {
  id: string;
  displayName: string;
  email: string;
  department?: string;
  position?: string;
  memberOf?: string;
  role: "admin" | "user";
  phone?: string | null;
  mobile?: string | null;
  lineDisplayName?: string | null;
  lineUserId?: string | null;
  image?: string | null;
  ldapDisplayName?: string | null;
  departmentSubSubId?: number | null;
  /** เจ้าหน้าที่เปลที่ผูกกับ user นี้ (มีเมื่อ user ถูกผูกกับ PorterEmployee) */
  porterEmployee?: PorterEmployeeRef | null;
}

// NextAuth Token Interface Extension
export interface ExtendedToken {
  sub?: string;
  department?: string;
  position?: string;
  memberOf?: string;
  role?: "admin" | "user";
  phone?: string | null;
  mobile?: string | null;
  lineDisplayName?: string | null;
  lineUserId?: string | null;
  image?: string | null;
  ldapDisplayName?: string | null;
  departmentSubSubId?: number | null;
  porterEmployee?: PorterEmployeeRef | null;
}

// NextAuth Session Interface Extension
export interface ExtendedSession {
  user: ExtendedUser;
}
