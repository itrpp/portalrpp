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
  name: string;
  email: string;
  department: string;
  title: string;
  groups: string;
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

// NextAuth User Interface Extension
export interface ExtendedUser {
  id: string;
  name: string;
  email: string;
  department: string;
  title: string;
  groups: string;
  role: "admin" | "user";
}

// NextAuth Token Interface Extension
export interface ExtendedToken {
  sub?: string;
  department?: string;
  title?: string;
  groups?: string;
  role?: "admin" | "user";
}

// NextAuth Session Interface Extension
export interface ExtendedSession {
  user: ExtendedUser;
}
