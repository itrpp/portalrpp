import { ValidationResult, PasswordValidationResult } from '../types';
import { URL } from 'url';

/**
 * Validation Utilities
 * รวม validation logic ทั้งหมดไว้ในที่เดียว
 */

export class ValidationUtils {
  /**
   * ตรวจสอบรูปแบบอีเมล
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * ตรวจสอบรหัสผ่าน
   */
  static validatePassword(password: string): PasswordValidationResult {
    const errors: string[] = [];
    let strength: 'weak' | 'medium' | 'strong' = 'weak';
    let score = 0;

    // ตรวจสอบความยาวขั้นต่ำตาม Security Requirements (8 ตัวอักษร)
    if (password.length < 8) {
      errors.push('รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร');
    } else {
      score += 1;
    }

    // ตรวจสอบตัวพิมพ์ใหญ่ (ตาม Security Requirements)
    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      errors.push('รหัสผ่านต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว');
    }

    // ตรวจสอบตัวพิมพ์เล็ก (ตาม Security Requirements)
    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      errors.push('รหัสผ่านต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว');
    }

    // ตรวจสอบตัวเลข (ตาม Security Requirements)
    if (/\d/.test(password)) {
      score += 1;
    } else {
      errors.push('รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว');
    }

    // ตรวจสอบอักขระพิเศษ (ตาม Security Requirements)
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 1;
    } else {
      errors.push('รหัสผ่านต้องมีอักขระพิเศษอย่างน้อย 1 ตัว');
    }

    // กำหนดความแข็งแกร่ง
    if (score >= 5) {
      strength = 'strong';
    } else if (score >= 3) {
      strength = 'medium';
    }

    return {
      isValid: errors.length === 0,
      errors,
      strength,
    };
  }

  /**
   * ตรวจสอบชื่อผู้ใช้
   */
  static validateUsername(username: string): ValidationResult {
    const errors: string[] = [];

    if (!username || username.trim().length === 0) {
      errors.push('ชื่อผู้ใช้ไม่สามารถเป็นค่าว่างได้');
    }

    if (username.length < 3) {
      errors.push('ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร');
    }

    if (username.length > 50) {
      errors.push('ชื่อผู้ใช้ต้องไม่เกิน 50 ตัวอักษร');
    }

    // ตรวจสอบอักขระที่อนุญาต
    if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
      errors.push('ชื่อผู้ใช้สามารถใช้ได้เฉพาะตัวอักษร ตัวเลข และ ._- เท่านั้น');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * ตรวจสอบชื่อ
   */
  static validateName(name: string): ValidationResult {
    const errors: string[] = [];

    if (!name || name.trim().length === 0) {
      errors.push('ชื่อไม่สามารถเป็นค่าว่างได้');
    }

    if (name.length < 2) {
      errors.push('ชื่อต้องมีอย่างน้อย 2 ตัวอักษร');
    }

    if (name.length > 100) {
      errors.push('ชื่อต้องไม่เกิน 100 ตัวอักษร');
    }

    // ตรวจสอบอักขระที่อนุญาต (ภาษาไทยและภาษาอังกฤษ)
    if (!/^[a-zA-Z\u0E00-\u0E7F\s]+$/.test(name)) {
      errors.push('ชื่อสามารถใช้ได้เฉพาะตัวอักษรภาษาไทยและภาษาอังกฤษเท่านั้น');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * ตรวจสอบข้อมูลการเข้าสู่ระบบ
   */
  static validateLoginCredentials(email: string, password: string): ValidationResult {
    const errors: string[] = [];

    if (!email || email.trim().length === 0) {
      errors.push('กรุณากรอกอีเมล');
    } else if (!this.isValidEmail(email)) {
      errors.push('รูปแบบอีเมลไม่ถูกต้อง');
    }

    if (!password || password.trim().length === 0) {
      errors.push('กรุณากรอกรหัสผ่าน');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * ตรวจสอบข้อมูลการสมัครสมาชิก
   */
  static validateRegistrationData(name: string, email: string, password: string): ValidationResult {
    const errors: string[] = [];

    // ตรวจสอบชื่อ
    const nameValidation = this.validateName(name);
    if (!nameValidation.isValid) {
      errors.push(...nameValidation.errors);
    }

    // ตรวจสอบอีเมล
    if (!email || email.trim().length === 0) {
      errors.push('กรุณากรอกอีเมล');
    } else if (!this.isValidEmail(email)) {
      errors.push('รูปแบบอีเมลไม่ถูกต้อง');
    }

    // ตรวจสอบรหัสผ่าน
    const passwordValidation = this.validatePassword(password);
    if (!passwordValidation.isValid) {
      errors.push(...passwordValidation.errors);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * ตรวจสอบข้อมูลการเปลี่ยนรหัสผ่าน
   */
  static validatePasswordChange(currentPassword: string, newPassword: string): ValidationResult {
    const errors: string[] = [];

    if (!currentPassword || currentPassword.trim().length === 0) {
      errors.push('กรุณากรอกรหัสผ่านปัจจุบัน');
    }

    if (!newPassword || newPassword.trim().length === 0) {
      errors.push('กรุณากรอกรหัสผ่านใหม่');
    } else {
      const passwordValidation = this.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        errors.push(...passwordValidation.errors);
      }
    }

    if (currentPassword === newPassword) {
      errors.push('รหัสผ่านใหม่ต้องไม่เหมือนกับรหัสผ่านปัจจุบัน');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * ตรวจสอบ session token
   */
  static validateSessionToken(sessionToken: string): ValidationResult {
    const errors: string[] = [];

    if (!sessionToken || sessionToken.trim().length === 0) {
      errors.push('Session token ไม่ถูกต้อง');
    }

    if (sessionToken.length < 32) {
      errors.push('Session token ไม่ถูกต้อง');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * ตรวจสอบ access token
   */
  static validateAccessToken(accessToken: string): ValidationResult {
    const errors: string[] = [];

    if (!accessToken || accessToken.trim().length === 0) {
      errors.push('Access token ไม่ถูกต้อง');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * ตรวจสอบ refresh token
   */
  static validateRefreshToken(refreshToken: string): ValidationResult {
    const errors: string[] = [];

    if (!refreshToken || refreshToken.trim().length === 0) {
      errors.push('Refresh token ไม่ถูกต้อง');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * ตรวจสอบ role
   */
  static validateRole(role: string): ValidationResult {
    const errors: string[] = [];
    const validRoles = ['user', 'admin', 'moderator'];

    if (role && !validRoles.includes(role)) {
      errors.push('Role ไม่ถูกต้อง');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * ตรวจสอบ URL
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * ตรวจสอบ IP address
   */
  static isValidIpAddress(ip: string): boolean {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  /**
   * ตรวจสอบและทำความสะอาดข้อมูล
   */
  static sanitizeInput(input: string): string {
    return input.trim().replace(/\s+/g, ' ');
  }

  /**
   * ตรวจสอบและทำความสะอาดอีเมล
   */
  static sanitizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}
