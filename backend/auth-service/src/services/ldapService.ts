import ldap from 'ldapjs';
import { ldapConfig, validateLDAPConfig } from '../config/ldap';

export interface LDAPUser {
  dn: string;
  sAMAccountName: string;
  userPrincipalName?: string;
  displayName?: string;
  cn?: string;
  mail?: string;
  memberOf?: string[];
  [key: string]: string | string[] | undefined;
}

export interface LDAPAuthResult {
  success: boolean;
  message: string;
  user?: LDAPUser;
  error?: Error;
}

export class LDAPService {
  private static client: ldap.Client | null = null;

  /**
   * สร้าง LDAP client สำหรับ Windows AD
   * ใช้สำหรับเชื่อมต่อกับ Windows Active Directory
   */
  private static async createClient(): Promise<ldap.Client> {
    return new Promise((resolve, reject) => {
      try {
        // ตรวจสอบการตั้งค่า LDAP
        const configValidation = validateLDAPConfig();
        if (!configValidation.isValid) {
          throw new Error(`การตั้งค่า LDAP ไม่ถูกต้อง: ${configValidation.errors.join(', ')}`);
        }

        // สร้าง LDAP client สำหรับ Windows AD
        const client = ldap.createClient({
          url: ldapConfig.url,
          timeout: ldapConfig.timeout,
          connectTimeout: ldapConfig.connectTimeout,
          idleTimeout: ldapConfig.idleTimeout,
        });

        // จัดการ events
        client.on('error', (err: unknown) => {
          console.error('🔴 LDAP Client Error:', err);
        });

        client.on('connect', () => {
          console.log('✅ LDAP Client Connected to Windows AD');
        });

        client.on('connectTimeout', () => {
          console.error('🔴 LDAP Connection Timeout');
        });

        client.on('idleTimeout', () => {
          console.log('⚠️ LDAP Connection Idle Timeout');
        });

        resolve(client);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Direct bind เข้า Windows AD ด้วย user credentials
   * ใช้ UserPrincipalName format (username@domain) สำหรับการ bind
   */
  private static async directBind(userPrincipalName: string, password: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new Error('LDAP client ยังไม่ได้ถูกสร้าง'));
        return;
      }

      this.client.bind(userPrincipalName, password, err => {
        if (err) {
          console.error('🔴 Windows AD User Bind Error:', err);
          reject(new Error(`ไม่สามารถเข้าสู่ระบบได้: ${err.message}`));
        } else {
          console.log('✅ Windows AD User Bind Successful');
          resolve();
        }
      });
    });
  }

  /**
   * ค้นหาผู้ใช้ใน Windows AD หลังจาก bind สำเร็จแล้ว
   * ใช้ sAMAccountName และ userPrincipalName ในการค้นหา
   */
  private static async searchUserAfterBind(username: string): Promise<LDAPUser | null> {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new Error('LDAP client ยังไม่ได้ถูกสร้าง'));
        return;
      }

      // แทนที่ {{username}} ใน search filter สำหรับ Windows AD
      // ใช้ username ที่ bind สำเร็จแล้วในการค้นหา
      // ทดสอบด้วย filter ง่ายๆ ก่อน
      const searchFilter = `(sAMAccountName=${username})`;

      const searchOptions = {
        scope: 'sub' as const,
        filter: `(&(objectClass=person)(sAMAccountName=${username}))`,
        attributes: ['cn', 'mail', 'sAMAccountName', 'userPrincipalName', 'displayName', 'memberOf', 'department', 'title', 'givenName', 'sn', 'uid'],
      };

      console.log('🔍 ค้นหาผู้ใช้ใน Windows AD ด้วย filter:', searchFilter);
      console.log('🔍 ค้นหาจาก baseDN:', ldapConfig.baseDN);

      this.client.search(ldapConfig.baseDN, searchOptions, (err: Error | null, res: any) => {
        if (err) {
          console.error('🔴 Windows AD Search Error:', err);
          reject(new Error(`เกิดข้อผิดพลาดในการค้นหา Windows AD: ${err.message}`));
          return;
        }

        let userFound = false;

        res.on('searchEntry', (entry: ldap.SearchEntry) => {
          if (userFound) {
            console.warn('⚠️ พบผู้ใช้มากกว่า 1 คนใน Windows AD');
            return;
          }

          userFound = true;

          // สร้าง user object ที่ครบถ้วน
          const user: LDAPUser = {
            dn: entry.dn.toString(),
            sAMAccountName: entry.attributes.find((attr: ldap.Attribute) => attr.type === 'sAMAccountName')?.values?.[0] ?? '',
            userPrincipalName: entry.attributes.find((attr: ldap.Attribute) => attr.type === 'userPrincipalName')?.values?.[0] ?? '',
            displayName: entry.attributes.find((attr: ldap.Attribute) => attr.type === 'displayName')?.values?.[0] ?? '',
            cn: entry.attributes.find((attr: ldap.Attribute) => attr.type === 'cn')?.values?.[0] ?? '',
            mail: entry.attributes.find((attr: ldap.Attribute) => attr.type === 'mail')?.values?.[0] ?? '',
            memberOf: (entry.attributes.find((attr: ldap.Attribute) => attr.type === 'memberOf')?.values as string[]) ?? [],
          };

          // เพิ่ม attributes อื่นๆ ที่สำคัญ
          const department = entry.attributes.find((attr: ldap.Attribute) => attr.type === 'department')?.values?.[0];
          const title = entry.attributes.find((attr: ldap.Attribute) => attr.type === 'title')?.values?.[0];
          const givenName = entry.attributes.find((attr: ldap.Attribute) => attr.type === 'givenName')?.values?.[0];
          const sn = entry.attributes.find((attr: ldap.Attribute) => attr.type === 'sn')?.values?.[0];
          const uid = entry.attributes.find((attr: ldap.Attribute) => attr.type === 'uid')?.values?.[0];

          // เพิ่มข้อมูลเพิ่มเติม
          if (department) user.department = department;
          if (title) user.title = title;
          if (givenName) user.givenName = givenName;
          if (sn) user.sn = sn;
          if (uid) user.uid = uid;

          // เพิ่ม attributes อื่นๆ ที่ไม่ใช่ attributes หลัก
          entry.attributes.forEach((attr: ldap.Attribute) => {
            if (!['sAMAccountName', 'userPrincipalName', 'displayName', 'cn', 'mail', 'memberOf', 'department', 'title', 'givenName', 'sn', 'uid'].includes(attr.type)) {
              user[attr.type] = attr.values;
            }
          });

          console.log('✅ พบผู้ใช้ใน Windows AD:', user.sAMAccountName);
          console.log('📋 ข้อมูลผู้ใช้:', {
            dn: user.dn,
            sAMAccountName: user.sAMAccountName,
            userPrincipalName: user.userPrincipalName,
            displayName: user.displayName,
            cn: user.cn,
            mail: user.mail,
            department: user.department,
            title: user.title,
            memberOf: user.memberOf,
          });

          console.log('✅ พบผู้ใช้ใน Windows AD:', user.sAMAccountName);
          resolve(user);
        });

        res.on('error', (err: Error) => {
          console.error('🔴 Windows AD Search Response Error:', err);
          reject(new Error(`เกิดข้อผิดพลาดในการค้นหา Windows AD: ${err.message}`));
        });

        res.on('end', () => {
          if (!userFound) {
            console.log('🔴 ไม่พบผู้ใช้ใน Windows AD:', username);
            resolve(null);
          }
        });
      });
    });
  }

  /**
   * ตรวจสอบรหัสผ่านของผู้ใช้ใน Windows AD
   * สร้าง client ใหม่เพื่อ bind ด้วย credentials ของผู้ใช้
   */
  private static async verifyUserPassword(userDN: string, password: string): Promise<boolean> {
    return new Promise(resolve => {
      // สร้าง client ใหม่สำหรับการ bind ของผู้ใช้
      const userClient = ldap.createClient({
        url: ldapConfig.url,
        timeout: ldapConfig.timeout,
        connectTimeout: ldapConfig.connectTimeout,
      });

      // เพิ่ม error handling
      userClient.on('error', err => {
        console.error('🔴 Windows AD User Client Error:', err);
      });

      userClient.on('connectTimeout', () => {
        console.error('🔴 Windows AD User Connection Timeout');
        userClient.unbind();
        resolve(false);
      });

      userClient.bind(userDN, password, err => {
        userClient.unbind();

        if (err) {
          console.log('🔴 Windows AD User Bind Failed:', err.message);
          resolve(false);
        } else {
          console.log('✅ Windows AD User Bind Successful');
          resolve(true);
        }
      });
    });
  }

  /**
   * เข้าสู่ระบบด้วย Windows AD
   * กระบวนการ: 1) Bind ด้วย admin credentials, 2) ค้นหาผู้ใช้, 3) ตรวจสอบรหัสผ่าน
   */
  static async authenticate(username: string, password: string): Promise<LDAPAuthResult> {
    try {
      console.log('🔍 เริ่มต้น Windows AD Authentication สำหรับ:', username);

      // สร้าง LDAP client
      this.client = await this.createClient();

      // สร้าง UserPrincipalName สำหรับ bind
      const userPrincipalName = username.includes('@') ? username : `${username}@rpphosp.local`;

      // Direct bind ด้วย user credentials
      await this.directBind(userPrincipalName, password);

      // ค้นหาข้อมูลผู้ใช้
      const user = await this.searchUserAfterBind(username);

      if (!user) {
        console.log('🔴 ไม่พบผู้ใช้ใน Windows AD:', username);
        return {
          success: false,
          message: 'ไม่พบผู้ใช้ในระบบ',
        };
      }

      // ตรวจสอบรหัสผ่านของผู้ใช้
      const isPasswordValid = await this.verifyUserPassword(user.dn, password);

      if (!isPasswordValid) {
        console.log('🔴 รหัสผ่านไม่ถูกต้องสำหรับ:', username);
        return {
          success: false,
          message: 'รหัสผ่านไม่ถูกต้อง',
        };
      }

      console.log('✅ Windows AD Authentication สำเร็จสำหรับ:', username);

      return {
        success: true,
        message: 'เข้าสู่ระบบสำเร็จ',
        user,
      };
    } catch (error) {
      console.error('🔴 Windows AD Authentication Error:', error);

      // ตรวจสอบประเภทของ error
      const errorMessage = error instanceof Error ? error.message : 'ไม่ทราบสาเหตุ';

      // ใช้ Mock Authentication สำหรับ development เมื่อไม่สามารถเชื่อมต่อ Windows AD ได้
      if (
        process.env.NODE_ENV === 'development' &&
        (errorMessage.includes('connection timeout') || errorMessage.includes('connectTimeout'))
      ) {
        console.log('⚠️ ใช้ Mock Authentication สำหรับ Development');
        return await this.mockAuthenticate(username, password);
      }

      // ใช้ Mock Authentication สำหรับ development mode
      if (process.env.NODE_ENV === 'development') {
        console.log('⚠️ ใช้ Mock Authentication สำหรับ Development Mode');
        return await this.mockAuthenticate(username, password);
      }

      // จัดการ error ตามประเภท
      if (errorMessage.includes('connection timeout') || errorMessage.includes('connectTimeout')) {
        return {
          success: false,
          message: 'ไม่สามารถเชื่อมต่อ Windows AD ได้ กรุณาตรวจสอบการเชื่อมต่อเครือข่าย',
          error: error as Error,
        };
      } else if (errorMessage.includes('bind')) {
        return {
          success: false,
          message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
          error: error as Error,
        };
      } else {
        return {
          success: false,
          message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ',
          error: error as Error,
        };
      }
    } finally {
      // ปิดการเชื่อมต่อ LDAP
      if (this.client) {
        this.client.unbind();
        this.client = null;
      }
    }
  }

  /**
   * Bind เข้า Windows AD ด้วย admin credentials (สำหรับ test connection)
   * ใช้ UserPrincipalName format (username@domain) สำหรับการ bind
   */
  private static async bindAsAdmin(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new Error('LDAP client ยังไม่ได้ถูกสร้าง'));
        return;
      }

      // สำหรับ Windows AD ใช้ UserPrincipalName format
      const bindDN = ldapConfig.bindDN.includes('@') ? ldapConfig.bindDN : `${ldapConfig.bindDN}@rpphosp.local`;

      this.client.bind(bindDN, ldapConfig.bindPassword, err => {
        if (err) {
          console.error('🔴 Windows AD Admin Bind Error:', err);
          reject(new Error(`ไม่สามารถ bind เข้า Windows AD ได้: ${err.message}`));
        } else {
          console.log('✅ Windows AD Admin Bind Successful');
          resolve();
        }
      });
    });
  }

  /**
   * ตรวจสอบการเชื่อมต่อ Windows AD
   * ทดสอบการ bind ด้วย admin credentials
   */
  static async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔍 ทดสอบการเชื่อมต่อ Windows AD...');
      console.log('🔍 ใช้ LDAP URL:', ldapConfig.url);
      console.log('🔍 ใช้ Bind DN:', ldapConfig.bindDN);
      console.log('🔍 ใช้ Base DN:', ldapConfig.baseDN);

      // ตรวจสอบการตั้งค่า LDAP
      const configValidation = validateLDAPConfig();
      if (!configValidation.isValid) {
        console.error('🔴 LDAP Config Validation Failed:', configValidation.errors);
        return {
          success: false,
          message: `การตั้งค่า LDAP ไม่ถูกต้อง: ${configValidation.errors.join(', ')}`,
        };
      }

      // สร้าง LDAP client
      this.client = await this.createClient();

      // Bind ด้วย admin credentials
      await this.bindAsAdmin();

      console.log('✅ การเชื่อมต่อ Windows AD สำเร็จ');

      return {
        success: true,
        message: 'การเชื่อมต่อ Windows AD สำเร็จ',
      };
    } catch (error) {
      console.error('🔴 Windows AD Connection Test Error:', error);

      // Fallback สำหรับ development/testing
      if (process.env.NODE_ENV === 'development') {
        console.log('⚠️ ใช้ Fallback Mode สำหรับ Development');
        return {
          success: true,
          message: 'การเชื่อมต่อ Windows AD สำเร็จ (Fallback Mode)',
        };
      }

      return {
        success: false,
        message: `การเชื่อมต่อ Windows AD ล้มเหลว: ${error instanceof Error ? error.message : 'ไม่ทราบสาเหตุ'}`,
      };
    } finally {
      // ปิดการเชื่อมต่อ LDAP
      if (this.client) {
        this.client.unbind();
        this.client = null;
      }
    }
  }

  /**
   * Mock authentication สำหรับ development/testing
   * ใช้เมื่อไม่สามารถเชื่อมต่อ Windows AD ได้
   */
  private static async mockAuthenticate(username: string, password: string): Promise<LDAPAuthResult> {
    console.log('🔍 ใช้ Mock Authentication สำหรับ:', username);

    // Mock user data สำหรับ testing
    const mockUsers = [
      {
        username: 'ldaptest',
        password: 'P@ssw0rd',
        user: {
          dn: 'CN=ldaptest,OU=Users,DC=rpphosp,DC=local',
          sAMAccountName: 'ldaptest',
          userPrincipalName: 'ldaptest@rpphosp.local',
          displayName: 'LDAP Test User',
          cn: 'ldaptest',
          mail: 'ldaptest@rpphosp.local',
          department: 'IT Department',
          title: 'System Administrator',
          memberOf: ['CN=Users,DC=rpphosp,DC=local'],
        },
      },
      {
        username: 'admin',
        password: 'admin123',
        user: {
          dn: 'CN=admin,OU=Users,DC=rpphosp,DC=local',
          sAMAccountName: 'admin',
          userPrincipalName: 'admin@rpphosp.local',
          displayName: 'Administrator',
          cn: 'admin',
          mail: 'admin@rpphosp.local',
          department: 'Administration',
          title: 'System Administrator',
          memberOf: ['CN=Administrators,DC=rpphosp,DC=local'],
        },
      },
    ];

    const mockUser = mockUsers.find(u => u.username === username);

    if (!mockUser) {
      return {
        success: false,
        message: 'ไม่พบผู้ใช้ในระบบ',
      };
    }

    if (mockUser.password !== password) {
      return {
        success: false,
        message: 'รหัสผ่านไม่ถูกต้อง',
      };
    }

    console.log('✅ Mock Authentication สำเร็จสำหรับ:', username);

    return {
      success: true,
      message: 'เข้าสู่ระบบสำเร็จ (Mock Mode)',
      user: mockUser.user,
    };
  }
}
