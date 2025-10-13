import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaClient } from "@/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "credentials",
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.username || !credentials?.password) {
                    return null;
                }

                try {
                    // หาผู้ใช้จาก username, email, รหัสนิสิต, หรือเลขบัตรประชาชน
                    let user = await prisma.users.findFirst({
                        where: {
                            OR: [
                                { username: credentials.username },
                                { email: credentials.username },
                                { email_lc: credentials.username.toLowerCase() },
                                { student_id: credentials.username }, // รหัสนิสิต
                            ]
                        },
                        include: {
                            student_profile: {
                                include: {
                                    faculties: true,
                                    departments: true
                                }
                            },
                            staff_profile: {
                                include: {
                                    units: true
                                }
                            }
                        }
                    });

                    // ถ้าไม่เจอ ลองหาจากเลขบัตรประชาชนของบุคลากร
                    if (!user) {
                        const staffProfile = await prisma.staff_profile.findFirst({
                            where: {
                                national_id: credentials.username
                            },
                            include: {
                                users: {
                                    include: {
                                        student_profile: {
                                            include: {
                                                faculties: true,
                                                departments: true
                                            }
                                        },
                                        staff_profile: {
                                            include: {
                                                units: true
                                            }
                                        }
                                    }
                                }
                            }
                        });

                        if (staffProfile) {
                            user = staffProfile.users;
                        }
                    }

                    if (!user) {
                        return null;
                    }

                    // ตรวจสอบรหัสผ่าน
                    const isPasswordValid = await bcrypt.compare(
                        credentials.password,
                        user.password_hash
                    );

                    if (!isPasswordValid) {
                        return null;
                    }

                    // ตรวจสอบสถานะผู้ใช้
                    if (user.status !== "active") {
                        return null;
                    }

                    // อัปเดต last_login
                    await prisma.users.update({
                        where: { user_id: user.user_id },
                        data: {
                            last_login_at: new Date(),
                            last_login_ip: "unknown" // จะได้จาก request ใน production
                        }
                    });

                    // บันทึก auth log
                    await prisma.auth_log.create({
                        data: {
                            user_id: user.user_id,
                            username_input: credentials.username,
                            action: "login_success",
                            ip: "unknown", // จะได้จาก request ใน production
                            user_agent: "unknown" // จะได้จาก request ใน production
                        }
                    });

                    return {
                        id: user.user_id.toString(),
                        username: user.username,
                        email: user.email,
                        name: `${user.first_name} ${user.last_name}`,
                        role: user.role,
                        status: user.status,
                        profile: {
                            title_th: user.title_th,
                            title_en: user.title_en,
                            first_name: user.first_name,
                            last_name: user.last_name,
                            nickname: user.nickname,
                            gender: user.gender,
                            dob: user.dob,
                            phone: user.phone,
                            profile_photo_url: user.profile_photo_url,
                            student_profile: user.student_profile,
                            staff_profile: user.staff_profile
                        }
                    };
                } catch (error) {
                    console.error("Auth error:", error);
                    return null;
                }
            }
        })
    ],
    session: {
        strategy: "jwt",
        maxAge: 24 * 60 * 60, // 24 hours
    },
    jwt: {
        secret: process.env.SECRET_KEY,
        maxAge: 24 * 60 * 60, // 24 hours
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.username = user.username;
                token.role = user.role;
                token.status = user.status;
                token.profile = user.profile;
            }
            return token;
        },
        async session({ session, token }) {
            if (token) {
                session.user.id = token.id as string;
                session.user.username = token.username as string;
                session.user.role = token.role as string;
                session.user.status = token.status as string;
                session.user.profile = token.profile as any;
            }
            return session;
        }
    },
    pages: {
        signIn: "/login",
    },
    secret: process.env.SECRET_KEY,
};