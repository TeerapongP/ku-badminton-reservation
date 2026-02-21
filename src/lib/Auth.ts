// lib/Auth.ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { encryptData, decryptData } from "./encryption";

const SESSION_MAX_AGE_SECONDS = 30 * 60;
const SESSION_UPDATE_AGE_SECONDS = 5 * 60;
const IP_MAX_LENGTH = 45;
const USER_AGENT_MAX_LENGTH = 512;

const VALID_LOGIN_TYPES = ['student_id', 'national_id', 'username'] as const;
type LoginType = typeof VALID_LOGIN_TYPES[number];

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            id: "credentials",
            name: "credentials",
            credentials: {
                identifier:         { label: "รหัสนิสิต/เลขบัตรประชาชน", type: "text" },
                password:           { label: "รหัสผ่าน", type: "password" },
                type:               { label: "Type", type: "text" },
                originalIdentifier: { label: "Original Identifier", type: "text" }
            },
            async authorize(credentials, req) {
                const ip = (
                    req?.headers?.["cf-connecting-ip"]?.toString() ??
                    req?.headers?.["x-real-ip"]?.toString() ??
                    req?.headers?.["x-forwarded-for"]?.toString().split(',')[0]?.trim() ??
                    "unknown"
                ).substring(0, IP_MAX_LENGTH);

                const userAgent = (req?.headers?.["user-agent"] ?? "unknown")
                    .substring(0, USER_AGENT_MAX_LENGTH);

                let identifier = credentials?.identifier;
                let password = credentials?.password;
                let originalIdentifier = credentials?.originalIdentifier;

                try {
                    if (identifier)         identifier = decryptData(identifier);
                    if (password)           password = decryptData(password);
                    if (originalIdentifier) originalIdentifier = decryptData(originalIdentifier);
                } catch {
                    return null;
                }

                if (!identifier || !password) return null;

                const encryptedIdentifierForLog = encryptData(identifier);

                const loginType: LoginType = VALID_LOGIN_TYPES.includes(credentials?.type as LoginType)
                    ? (credentials!.type as LoginType)
                    : 'student_id';

                try {
                    let user = null;

                    if (loginType === 'student_id') {
                        user = await prisma.users.findFirst({
                            where: { student_id: identifier },
                            select: {
                                user_id: true, username: true, password_hash: true,
                                role: true, status: true, last_login_at: true,
                            }
                        });
                    } else if (loginType === 'national_id') {
                        if (!originalIdentifier) return null;

                        user = await prisma.users.findFirst({
                            where: { national_id: originalIdentifier },
                            select: {
                                user_id: true, username: true, password_hash: true,
                                role: true, status: true, last_login_at: true,
                            }
                        });
                    } else if (loginType === 'username') {
                        user = await prisma.users.findFirst({
                            where: {
                                username: identifier,
                                OR: [{ role: 'admin' }, { role: 'super_admin' }]
                            },
                            select: {
                                user_id: true, username: true, password_hash: true,
                                role: true, status: true, last_login_at: true,
                            }
                        });
                    }

                    if (!user || user.status !== 'active') return null;

                    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

                    if (!isPasswordValid) {
                        await prisma.auth_log.create({
                            data: {
                                user_id:        user.user_id,
                                username_input: encryptedIdentifierForLog,
                                action:         "login_fail",
                                ip,
                                user_agent:     userAgent,
                            }
                        }).catch(() => {});

                        return null;
                    }

                    const mustChangePassword = !user.last_login_at;

                    await Promise.all([
                        mustChangePassword
                            ? Promise.resolve()
                            : prisma.users.update({
                                where: { user_id: user.user_id },
                                data:  { last_login_at: new Date(), last_login_ip: ip }
                            }).catch(() => {}),

                        prisma.auth_log.create({
                            data: {
                                user_id:        user.user_id,
                                username_input: encryptedIdentifierForLog,
                                action:         "login_success",
                                ip,
                                user_agent:     userAgent,
                            }
                        }).catch(() => {}),
                    ]);

                    return {
                        id: user.user_id.toString(),
                        username: user.username,
                        role: user.role,
                        mustChangePassword,
                    };

                } catch {
                    return null;
                }
            }
        })
    ],

    session: {
        strategy: "jwt",
        maxAge:    SESSION_MAX_AGE_SECONDS,
        updateAge: SESSION_UPDATE_AGE_SECONDS,
    },
    jwt: {
        maxAge: SESSION_MAX_AGE_SECONDS,
    },

    cookies: {
        sessionToken: {
            name: `next-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path:     '/',
                secure:   false, // TODO: เปิด SSL แล้วเปลี่ยนเป็น true
            }
        },
        callbackUrl: {
            name: `next-auth.callback-url`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path:     '/',
                secure:   false, // TODO: เปิด SSL แล้วเปลี่ยนเป็น true
            }
        },
        csrfToken: {
            name: `next-auth.csrf-token`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path:     '/',
                secure:   false, // TODO: เปิด SSL แล้วเปลี่ยนเป็น true
            }
        }
    },

    debug: process.env.NODE_ENV === 'development',

    callbacks: {
        async jwt({ token, user, trigger }) {
            if (trigger === 'update') {
                token.iat = Math.floor(Date.now() / 1000);
            }

            if (user) {
                token.id                = user.id;
                token.username          = user.username;
                token.role              = user.role;
                token.mustChangePassword = user.mustChangePassword;

                const dbUser = await prisma.users.findUnique({
                    where:  { user_id: BigInt(user.id) },
                    select: { updated_at: true }
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
                if (tokenIssuedAt < token.passwordChangedAt) {
                    throw new Error('Session expired');
                }
            }

            session.user = {
                id:       token.id,
                username: token.username,
                role:     token.role,
            } as typeof session.user;

            return session;
        },
    },

    pages: {
        signIn: "/login",
        error:  "/login",
    },

    secret: process.env.NEXTAUTH_SECRET,
};