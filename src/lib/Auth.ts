// lib/Auth.ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { encryptData, decryptData } from "./encryption";
import { encode } from "./Cryto"; // async

const SESSION_MAX_AGE_SECONDS = 30 * 60;
const SESSION_UPDATE_AGE_SECONDS = 5 * 60;
const IP_MAX_LENGTH = 45;
const USER_AGENT_MAX_LENGTH = 512;

const VALID_LOGIN_TYPES = ["student_id", "national_id", "username", "email"] as const;
type LoginType = (typeof VALID_LOGIN_TYPES)[number];

const isSecure = false;

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            id: "credentials",
            name: "credentials",
            credentials: {
                identifier: { label: "รหัสนิสิต/เลขบัตรประชาชน", type: "text" },
                password: { label: "รหัสผ่าน", type: "password" },
                type: { label: "Type", type: "text" },
                originalIdentifier: { label: "Original Identifier", type: "text" },
            },
            async authorize(credentials, req) {
                const ip = (
                    req?.headers?.["cf-connecting-ip"]?.toString() ??
                    req?.headers?.["x-real-ip"]?.toString() ??
                    req?.headers?.["x-forwarded-for"]?.toString().split(",")[0]?.trim() ??
                    "unknown"
                ).substring(0, IP_MAX_LENGTH);

                const userAgent = (req?.headers?.["user-agent"] ?? "unknown")
                    .substring(0, USER_AGENT_MAX_LENGTH);

                console.log("[auth DEBUG] raw credentials.type:", credentials?.type);
                console.log("[auth DEBUG] raw password from credentials (encrypted):", credentials?.password);
                console.log("[auth DEBUG] raw identifier from credentials (encrypted):", credentials?.identifier);

                let identifier = credentials?.identifier;
                let password = credentials?.password;
                let originalIdentifier = credentials?.originalIdentifier;

                try {
                    if (identifier) identifier = decryptData(identifier);
                    if (password) password = decryptData(password);
                    if (originalIdentifier) originalIdentifier = decryptData(originalIdentifier);
                } catch (e) {
                    console.error("[auth] decryptData failed:", (e as Error).message);
                    return null;
                }

                console.log("[auth DEBUG] loginType received:", credentials?.type);
                console.log("[auth DEBUG] identifier after decrypt:", identifier);
                console.log("[auth DEBUG] identifier length:", identifier?.length);
                console.log("[auth DEBUG] password after decrypt length:", password?.length);
                // ⚠️ SECURITY: Remove this line after debugging
                console.log("[auth DEBUG] password actual value:", password);
                console.log("[auth DEBUG] originalIdentifier after decrypt:", originalIdentifier);

                if (!identifier || !password) {
                    console.error("[auth] identifier or password is empty after decrypt");
                    return null;
                }

                const encryptedIdentifierForLog = encryptData(identifier);

                const loginType: LoginType = VALID_LOGIN_TYPES.includes(
                    credentials?.type as LoginType
                )
                    ? (credentials!.type as LoginType)
                    : "student_id";

                try {
                    let user = null;

                    if (loginType === "student_id") {
                        user = await prisma.users.findFirst({
                            where: {
                                OR: [
                                    { student_id: identifier },
                                    { student_profile: { student_id: identifier } },
                                    { demonstration_student: { student_id: identifier } }
                                ]
                            },
                            select: {
                                user_id: true, username: true, password_hash: true,
                                role: true, status: true, last_login_at: true,
                            },
                        });
                    } else if (loginType === "national_id") {
                        const rawNationalId = originalIdentifier ?? identifier;

                        if (!rawNationalId) {
                            console.error("[auth] rawNationalId is empty");
                            return null;
                        }

                        // ค้นหาจาก users.national_id ก่อน
                        user = await prisma.users.findFirst({
                            where: { national_id: rawNationalId },
                            select: {
                                user_id: true, username: true, password_hash: true,
                                role: true, status: true, last_login_at: true,
                            },
                        });

                        // ถ้าไม่เจอ ให้ค้นหาผ่าน profile ต่างๆ
                        if (!user) {
                            user = await prisma.users.findFirst({
                                where: {
                                    OR: [
                                        { staff_profile: { national_id: rawNationalId } },
                                        { student_profile: { national_id: rawNationalId } },
                                        { demonstration_student: { national_id: rawNationalId } }
                                    ]
                                },
                                select: {
                                    user_id: true, username: true, password_hash: true,
                                    role: true, status: true, last_login_at: true,
                                },
                            });
                        }
                    } else if (loginType === "username") {
                        user = await prisma.users.findFirst({
                            where: {
                                username: identifier,
                            },
                            select: {
                                user_id: true, username: true, password_hash: true,
                                role: true, status: true, last_login_at: true,
                            },
                        });
                    } else if (loginType === "email") {
                        user = await prisma.users.findFirst({
                            where: { email: identifier },
                            select: {
                                user_id: true, username: true, password_hash: true,
                                role: true, status: true, last_login_at: true,
                            },
                        });
                    }

                    if (!user) {
                        console.error("[auth] User not found for loginType:", loginType);
                        return null;
                    }

                    if (user.status !== "active") {
                        console.error("[auth] User status is not active:", user.status);
                        return null;
                    }

                    console.log("[auth DEBUG] password length before bcrypt.compare:", password?.length);
                    console.log("[auth DEBUG] password_hash from DB:", user.password_hash);

                    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

                    console.log("[auth DEBUG] isPasswordValid:", isPasswordValid);

                    if (!isPasswordValid) {
                        console.error("[auth] Password invalid for user_id:", user.user_id.toString());

                        await prisma.auth_log.create({
                            data: {
                                user_id: user.user_id,
                                username_input: encryptedIdentifierForLog,
                                action: "login_fail",
                                ip,
                                user_agent: userAgent,
                            },
                        }).catch(() => { });

                        return null;
                    }

                    const isFirstLogin = !user.last_login_at;
                    
                    // Auto update last_login_at for specific roles even on first login
                    const shouldUpdateImmediately = ["staff", "demonstration_student", "guest"].includes(user.role);

                    await Promise.all([
                        (isFirstLogin && !shouldUpdateImmediately)
                            ? Promise.resolve()
                            : prisma.users.update({
                                where: { user_id: user.user_id },
                                data: { last_login_at: new Date(), last_login_ip: ip },
                            }).catch(() => { }),

                        prisma.auth_log.create({
                            data: {
                                user_id: user.user_id,
                                username_input: encryptedIdentifierForLog,
                                action: "login_success",
                                ip,
                                user_agent: userAgent,
                            },
                        }).catch(() => { }),
                    ]);

                    return {
                        id: user.user_id.toString(),
                        username: user.username,
                        role: user.role,
                        isFirstLogin,
                        mustChangePassword: isFirstLogin,
                    };

                } catch (e) {
                    console.error("[auth] authorize error:", (e as Error).message);
                    return null;
                }
            },
        }),
    ],

    session: {
        strategy: "jwt",
        maxAge: SESSION_MAX_AGE_SECONDS,
        updateAge: SESSION_UPDATE_AGE_SECONDS,
    },
    jwt: {
        maxAge: SESSION_MAX_AGE_SECONDS,
    },

    cookies: {
        sessionToken: {
            name: "next-auth.session-token",
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: isSecure,
                domain: undefined,
            },
        },
        callbackUrl: {
            name: "next-auth.callback-url",
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: isSecure,
                domain: undefined,
            },
        },
        csrfToken: {
            name: "next-auth.csrf-token",
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: isSecure,
                domain: undefined,
            },
        },
    },

    debug: true,

    callbacks: {
        async jwt({ token, user, trigger }) {
            if (trigger === "update") {
                token.iat = Math.floor(Date.now() / 1000);
            }

            if (user) {
                token.id = user.id;
                token.username = user.username;
                token.role = user.role;
                token.isFirstLogin = (user as any).isFirstLogin;

                const dbUser = await prisma.users.findUnique({
                    where: { user_id: BigInt(user.id) },
                    select: { updated_at: true },
                }).catch(() => null);

                if (dbUser) {
                    token.passwordChangedAt = dbUser.updated_at.getTime();
                }
            }

            return token;
        },

        async session({ session, token }) {
            if (token.passwordChangedAt) {
                const tokenIssuedAt = (token.iat as number) * 1000;
                if (tokenIssuedAt < (token.passwordChangedAt as number)) {
                    throw new Error("Session expired");
                }
            }

            try {
                const encryptedRole = await encode(token.role as string);
                const encryptId = await encode(token.id as string);

                session.user = {
                    id: encryptId,
                    username: token.username,
                    role: encryptedRole,
                    isFirstLogin: !!token.isFirstLogin,
                } as typeof session.user;

                return session;
            } catch (error) {
                console.error("[auth] Session callback encryption failed:", (error as Error).message);
                session.user = {
                    id: token.id as string,
                    username: token.username,
                    role: token.role as string,
                    isFirstLogin: !!token.isFirstLogin,
                } as typeof session.user;

                return session;
            }
        },
    },

    pages: {
        signIn: "/login",
        error: "/login",
    },

    secret: process.env.NEXTAUTH_SECRET,
};