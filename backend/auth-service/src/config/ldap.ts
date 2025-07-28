import dotenv from 'dotenv';

// โหลด environment variables
dotenv.config();

/**
 * LDAP Configuration
 * ตั้งค่าการเชื่อมต่อ Windows Active Directory
 */

export interface LDAPConfig {
  url: string;
  baseDN: string;
  bindDN: string;
  bindPassword: string;
  timeout: number;
  connectTimeout: number;
  idleTimeout: number;
}

// LDAP Configuration
export const ldapConfig: LDAPConfig = {
  url: process.env.LDAP_URL ?? 'ldap://192.168.238.8:389',
  baseDN: process.env.LDAP_BASE_DN ?? 'DC=rpphosp,DC=local',
  bindDN: process.env.LDAP_BIND_DN ?? 'ldaptest@rpphosp.local',
  bindPassword: process.env.LDAP_BIND_PASSWORD ?? 'P@ssw0rd',
  timeout: parseInt(process.env.LDAP_TIMEOUT ?? '5000'),
  connectTimeout: parseInt(process.env.LDAP_CONNECT_TIMEOUT ?? '5000'),
  idleTimeout: parseInt(process.env.LDAP_IDLE_TIMEOUT ?? '10000'),
};

/**
 * Validate LDAP configuration
 */
export function validateLDAPConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!ldapConfig.url) {
    errors.push('LDAP_URL ต้องตั้งค่าใน environment variables');
  }

  if (!ldapConfig.baseDN) {
    errors.push('LDAP_BASE_DN ต้องตั้งค่าใน environment variables');
  }

  if (!ldapConfig.bindDN) {
    errors.push('LDAP_BIND_DN ต้องตั้งค่าใน environment variables');
  }

  if (!ldapConfig.bindPassword) {
    errors.push('LDAP_BIND_PASSWORD ต้องตั้งค่าใน environment variables');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get LDAP configuration
 */
export function getLDAPConfig(): LDAPConfig {
  return ldapConfig;
}

/**
 * Check if LDAP is properly configured
 */
export function isLDAPConfigured(): boolean {
  const validation = validateLDAPConfig();
  return validation.isValid;
}

/**
 * Get LDAP status
 */
export function getLDAPStatus(): { configured: boolean; errors: string[] } {
  const validation = validateLDAPConfig();
  return {
    configured: validation.isValid,
    errors: validation.errors,
  };
}
