import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: "admin" | "user" | null;
      department?: string;
      position?: string;
      memberOf?: string;
      phone?: string | null;
      mobile?: string | null;
      lineDisplayName?: string | null;
      lineUserId?: string | null;
      ldapDisplayName?: string | null;
    };
    accessToken?: string;
    sessionToken?: string;
  }

  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: "admin" | "user" | null;
    department?: string;
    position?: string;
    memberOf?: string;
    phone?: string | null;
    mobile?: string | null;
    lineDisplayName?: string | null;
    lineUserId?: string | null;
    ldapDisplayName?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "admin" | "user" | null;
    department?: string;
    position?: string;
    memberOf?: string;
    phone?: string | null;
    mobile?: string | null;
    lineDisplayName?: string | null;
    lineUserId?: string | null;
    ldapDisplayName?: string | null;
  }
}
