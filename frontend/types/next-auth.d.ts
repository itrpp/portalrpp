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
      title?: string;
      groups?: string;
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
    title?: string;
    groups?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "admin" | "user" | null;
    department?: string;
    title?: string;
    groups?: string;
  }
}
