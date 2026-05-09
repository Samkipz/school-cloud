import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: string;
      fullName: string;
      dbUserId: string;
    };
  }

  interface User {
    username?: string | null;
    phone?: string | null;
    role?: string;
    fullName?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    fullName?: string;
    dbUserId?: string;
  }
}
