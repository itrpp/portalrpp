import type {
  LDAPConfig,
  LDAPUserData,
  LDAPAuthResult,
  LDAPSearchResult,
} from "@/types/ldap";

import { Client } from "ldapts";

import { validateEnvironment } from "./env";

/**
 * LDAP Service Class สำหรับจัดการการเชื่อมต่อและ authentication
 */
export class LDAPService {
  private config: LDAPConfig;
  private client: Client | null = null;

  constructor(config: LDAPConfig) {
    this.config = config;
  }

  /**
   * สร้าง LDAP client connection
   */
  private async createClient(): Promise<Client> {
    if (this.client) {
      return this.client;
    }

    this.client = new Client({
      url: this.config.url,
      timeout: this.config.timeout,
      connectTimeout: this.config.connectTimeout,
    });

    return this.client;
  }

  /**
   * ปิดการเชื่อมต่อ LDAP
   */
  private async closeClient(): Promise<void> {
    if (this.client) {
      try {
        await this.client.unbind();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn("LDAP unbind warning:", error);
      }
      this.client = null;
    }
  }

  /**
   * ตรวจสอบว่า error เป็นปัญหาการเชื่อมต่อเครือข่ายหรือไม่
   */
  private isConnectionError(error: unknown): boolean {
    if (!error) return false;

    const messageRaw = (error as Error)?.message || "";
    const nameRaw = (error as Error)?.name || "";
    const message = messageRaw.toString();
    const name = nameRaw.toString();
    const lower = `${name} ${message}`.toLowerCase();

    // ครอบคลุมกรณี timeout, DNS, refuse, reset, unreachable และข้อผิดพลาดของ ldapts ที่เกี่ยวกับ network
    const networkKeywords = [
      "econnrefused",
      "etimedout",
      "econnreset",
      "ehostunreach",
      "enetunreach",
      "enotfound",
      "eai_again",
      "server down",
      "code 81", // LDAP serverDown
      "protocol error",
      "ldaperror: 81",
      "socket",
      "timeout",
      "timed out",
      "connect",
      "network",
      "client network socket disconnected",
    ];

    return networkKeywords.some((k) => lower.includes(k));
  }

  /**
   * ค้นหาผู้ใช้ใน LDAP Directory
   */
  private async searchUser(username: string): Promise<LDAPSearchResult | null> {
    const client = await this.createClient();

    try {
      // Bind ด้วย service account
      await client.bind(this.config.bindDN, this.config.bindPassword);

      // สร้าง search filter
      const searchFilter = this.config.searchFilter.replace(
        /{{username}}/g,
        username,
      );

      // ค้นหาผู้ใช้
      const { searchEntries } = await client.search(this.config.baseDN, {
        scope: "sub",
        filter: searchFilter,
        attributes: this.config.attributes,
      });

      if (searchEntries.length === 0) {
        return null;
      }

      // แปลงข้อมูลเป็นรูปแบบที่ต้องการ
      const entry = searchEntries[0];

      // console.log(entry);

      return {
        objectName: entry.dn,
        attributes: Object.entries(entry)
          .map(([type, values]) => ({
            type,
            values: Array.isArray(values)
              ? values.map((v) => (typeof v === "string" ? v : v.toString()))
              : [typeof values === "string" ? values : values.toString()],
          }))
          .filter((attr) => attr.type !== "dn"),
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("LDAP search error:", error);

      // ถ้าเป็น error การเชื่อมต่อ ให้โยนต่อเพื่อให้ชั้นบนจัดการเป็นข้อความที่ถูกต้อง
      if (this.isConnectionError(error)) {
        throw new Error("LDAP_CONNECTION_ERROR");
      }

      // กรณีอื่น ๆ ให้ถือว่าไม่พบบัญชี (เช่น search ไม่อนุญาต/ไม่มีสิทธิ์)
      return null;
    }
  }

  /**
   * ทดสอบการ bind ด้วย user credentials
   */
  private async testUserBind(
    userDN: string,
    password: string,
  ): Promise<boolean> {
    const userClient = new Client({
      url: this.config.url,
      timeout: this.config.timeout,
      connectTimeout: this.config.connectTimeout,
    });

    try {
      await userClient.bind(userDN, password);
      await userClient.unbind();

      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("User bind test failed:", error);

      return false;
    }
  }

  /**
   * ตรวจสอบว่า user account ถูก disable หรือไม่
   */
  private isAccountDisabled(
    attributes: Array<{ type: string; values: string[] }>,
  ): boolean {
    const userAccountControl = attributes.find(
      (a) => a.type === "userAccountControl",
    );

    if (!userAccountControl || !userAccountControl.values[0]) {
      return false; // ถ้าไม่มี userAccountControl ให้ผ่าน
    }

    const uac = parseInt(userAccountControl.values[0], 10);

    // ADS_UF_ACCOUNTDISABLE = 0x0002 (2 in decimal)
    return (uac & 2) === 2;
  }

  /**
   * ตรวจสอบว่า user อยู่ใน OU "rpp-user" หรือไม่
   */
  private isUserInRppUserOU(objectName: string): boolean {
    // ตรวจสอบว่า DN มี OU=rpp-user หรือไม่
    return /OU=rpp-user/i.test(objectName);
  }

  /**
   * ถอดรหัส objectGUID จาก binary format เป็น UUID string
   * @param objectGUID - objectGUID ในรูปแบบ binary
   * @returns UUID string ในรูปแบบ xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   */
  private decodeObjectGUID(objectGUID: string): string {
    return decodeObjectGUID(objectGUID);
  }

  /**
   * แปลง LDAP search result เป็น user data
   */
  private parseUserData(
    searchResult: LDAPSearchResult,
    username: string,
  ): LDAPUserData {
    const { attributes } = searchResult;

    // Helper function สำหรับดึงค่า attribute
    const getAttribute = (attrName: string): string => {
      const attr = attributes.find((a) => a.type === attrName);

      return attr?.values[0] || "";
    };

    // Helper function สำหรับดึงค่าทั้งหมดของ attribute
    const getAttributeValues = (attrName: string): string[] => {
      const attr = attributes.find((a) => a.type === attrName);

      return attr?.values || [];
    };

    // ดึงข้อมูล groups
    const memberOfValues = getAttributeValues("memberOf");
    const groupsString = memberOfValues.join(";");

    // ตรวจสอบว่าเป็น admin หรือไม่
    const isAdmin = memberOfValues.some((dn: string) => {
      return (
        /(,|^)CN=(Domain Admins|Administrators)(,|$)/i.test(dn) ||
        /(Domain Admins|Administrators)/i.test(dn)
      );
    });

    // ดึง objectGUID และถอดรหัสเป็น UUID format
    const rawObjectGUID = getAttributeValues("objectGUID")[0];
    const UserId = decodeObjectGUID(rawObjectGUID);

    return {
      id: UserId,
      name: getAttribute("displayName") || getAttribute("cn") || username,
      email: getAttribute("mail") || `${username}@rpphosp.local`,
      department:
        getAttribute("department") || getAttribute("departmentNumber") || "",
      title: getAttribute("title") || getAttribute("description") || "",
      groups: groupsString,
      role: isAdmin ? "admin" : "user",
    };
  }

  /**
   * Authenticate ผู้ใช้ผ่าน LDAP
   */
  async authenticate(
    username: string,
    password: string,
  ): Promise<LDAPAuthResult> {
    try {
      // ตรวจสอบ input parameters
      if (!username || !password) {
        return {
          success: false,
          // แสดงเฉพาะรหัสข้อผิดพลาด เพื่อให้ชั้นบน map ข้อความสำหรับผู้ใช้
          errorCode: "MISSING_CREDENTIALS",
        };
      }

      // ค้นหาผู้ใช้ใน LDAP
      const searchResult = await this.searchUser(username);

      if (!searchResult) {
        return {
          success: false,
          errorCode: "USER_NOT_FOUND",
        };
      }

      // ตรวจสอบว่า user account ถูก disable หรือไม่
      if (this.isAccountDisabled(searchResult.attributes)) {
        return {
          success: false,
          errorCode: "ACCOUNT_DISABLED",
        };
      }

      // ตรวจสอบว่า user อยู่ใน OU "rpp-user" หรือไม่
      if (!this.isUserInRppUserOU(searchResult.objectName)) {
        return {
          success: false,
          errorCode: "USER_NOT_AUTHORIZED",
        };
      }

      // ทดสอบการ bind ด้วย user credentials
      const bindCredentials = [
        searchResult.objectName, // DN ที่ได้จาก search
        `${username}@rpphosp.local`, // UserPrincipalName format
        username, // sAMAccountName
      ];

      let bindSuccess = false;

      for (const bindDN of bindCredentials) {
        try {
          bindSuccess = await this.testUserBind(bindDN, password);
          if (bindSuccess) {
            break;
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn(`Bind failed with ${bindDN}:`, error);
        }
      }

      if (!bindSuccess) {
        return {
          success: false,
          errorCode: "INVALID_CREDENTIALS",
        };
      }

      // แปลงข้อมูลผู้ใช้
      const userData = this.parseUserData(searchResult, username);

      return {
        success: true,
        user: userData,
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("LDAP authentication error:", error);

      // แยกกรณีเชื่อมต่อ LDAP ไม่ได้ ให้แจ้งผู้ใช้ด้วยข้อความที่ถูกต้อง
      if (
        error instanceof Error &&
        (error.message === "LDAP_CONNECTION_ERROR" ||
          this.isConnectionError(error))
      ) {
        return {
          success: false,
          errorCode: "CONNECTION_ERROR",
        };
      }

      return {
        success: false,
        errorCode: "INTERNAL_ERROR",
      };
    } finally {
      // ปิดการเชื่อมต่อ
      await this.closeClient();
    }
  }

  /**
   * ปิดการเชื่อมต่อทั้งหมด
   */
  async disconnect(): Promise<void> {
    await this.closeClient();
  }
}

/**
 * Utility function สำหรับถอดรหัส objectGUID จาก binary format เป็น UUID string
 * ใช้สำหรับการจัดการ objectGUID ที่ได้รับจาก LDAP search results
 * @param objectGUID - objectGUID ในรูปแบบ binary
 * @returns UUID string ในรูปแบบ xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 */
export function decodeObjectGUID(objectGUID: string): string {
  try {
    // แปลงจาก binary เป็น hex string
    const hex = Buffer.from(objectGUID, "binary").toString("hex");

    // จัดเรียงไบต์ตามลำดับที่ถูกต้องสำหรับ UUID
    const p1 =
      hex.substr(6, 2) + hex.substr(4, 2) + hex.substr(2, 2) + hex.substr(0, 2);
    const p2 = hex.substr(10, 2) + hex.substr(8, 2);
    const p3 = hex.substr(14, 2) + hex.substr(12, 2);
    const p4 = hex.substr(16, 4);
    const p5 = hex.substr(20, 12);

    return [p1, p2, p3, p4, p5].join("-");
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error decoding objectGUID:", error);

    return objectGUID; // ส่งคืนค่าเดิมหากถอดรหัสไม่ได้
  }
}

/**
 * Utility function สำหรับตรวจสอบว่า string เป็น UUID format หรือไม่
 * @param uuid - string ที่ต้องการตรวจสอบ
 * @returns true หากเป็น UUID format ที่ถูกต้อง
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  return uuidRegex.test(uuid);
}

/**
 * สร้าง LDAP Service instance จาก environment variables
 */
export function createLDAPService(): LDAPService {
  try {
    // ตรวจสอบ environment variables
    const { required, optional } = validateEnvironment();

    const config: LDAPConfig = {
      url: required.LDAP_URL,
      baseDN: required.LDAP_BASE_DN,
      bindDN: required.LDAP_BIND_DN,
      bindPassword: required.LDAP_BIND_PASSWORD,
      searchFilter:
        optional.LDAP_SEARCH_FILTER ||
        "(|(sAMAccountName={{username}})(userPrincipalName={{username}}))",
      attributes: optional.LDAP_ATTRIBUTES?.split(",") || [
        "sAMAccountName",
        "userPrincipalName",
        "displayName",
        "mail",
        "memberOf",
        "cn",
        "userAccountControl",
        "department",
        "departmentNumber",
        "title",
        "description",
      ],
      timeout: parseInt(optional.LDAP_TIMEOUT || "5000"),
      connectTimeout: parseInt(optional.LDAP_CONNECT_TIMEOUT || "10000"),
      idleTimeout: parseInt(optional.LDAP_IDLE_TIMEOUT || "30000"),
      reconnect: optional.LDAP_RECONNECT === "true",
    };

    return new LDAPService(config);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to create LDAP service:", error);
    throw new Error(
      "ไม่สามารถเริ่มต้น LDAP service ได้ กรุณาตรวจสอบ environment variables",
    );
  }
}
