// src/types/next-auth.d.ts
import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
    interface Session extends DefaultSession {
        user: {
            id: string;
            username: string;
            role: string;
            isFirstLogin: boolean;
        } & DefaultSession["user"];
    }

    interface User extends DefaultUser {
        username: string;
        role: string;
        isFirstLogin: boolean;
    }
}

declare module "next-auth/jwt" {
    interface JWT extends DefaultJWT {
        id: string;
        username: string;
        role: string;
        passwordChangedAt?: number;
        isFirstLogin: boolean;
    }
}
