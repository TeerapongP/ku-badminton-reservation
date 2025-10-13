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
        identifier: { label: "รหัสนิสิต/เลขบัตรประชาชน", type: "text" },
        password: { label: "รหัสผ่าน", type: "password" },
        type: { label: "Type", type: "text" },
        originalIdentifier: { label: "Original Identifier", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password || !credentials?.type) {
          throw new Error("ข้อมูลไม่ครบถ้วน");
        }

        try {
          let user;
          
          if (credentials.type === 'student_id') {
            // ค้นหาด้วยรหัสนิสิต
            user = await prisma.users.findFirst({
              where: { student_id: credentials.identifier },
              select: {
                user_id: true,
                username: true,
                password_hash: true,
                email: true,
                first_name: true,
                last_name: true,
                role: true,
                status: true,
              }
            });
          } else if (credentials.type === 'national_id') {
            // ค้นหาด้วยเลขบัตรประชาชน
            const allUsers = await prisma.users.findMany({
              where: { 
                national_id: { not: null },
                OR: [
                  { role: 'staff' },
                  { role: 'guest' }
                ]
              },
              select: {
                user_id: true,
                username: true,
                password_hash: true,
                email: true,
                first_name: true,
                last_name: true,
                role: true,
                status: true,
                national_id: true,
              }
            });

            // เปรียบเทียบ plain text กับ hash ใน database
            for (const u of allUsers) {
              if (u.national_id && credentials.originalIdentifier && 
                  await bcrypt.compare(credentials.originalIdentifier, u.national_id)) {
                user = u;
                break;
              }
            }
          }

          if (!user) {
            throw new Error("ไม่พบผู้ใช้ในระบบ");
          }

          // ตรวจสอบสถานะผู้ใช้
          if (user.status !== 'active') {
            throw new Error("บัญชีผู้ใช้ถูกระงับ กรุณาติดต่อผู้ดูแลระบบ");
          }

          // ตรวจสอบรหัสผ่าน
          const isPasswordValid = await bcrypt.compare(credentials.password, user.password_hash);
          
          if (!isPasswordValid) {
            // บันทึก log การ login ไม่สำเร็จ
            await prisma.auth_log.create({
              data: {
                user_id: user.user_id,
                username_input: credentials.identifier,
                action: "login_fail",
                ip: "unknown",
                user_agent: "unknown"
              }
            });

            throw new Error("รหัสผ่านไม่ถูกต้อง");
          }

          // อัปเดต last_login_at
          await prisma.users.update({
            where: { user_id: user.user_id },
            data: { 
              last_login_at: new Date(),
              last_login_ip: "unknown"
            }
          });

          // บันทึก log การ login สำเร็จ
          await prisma.auth_log.create({
            data: {
              user_id: user.user_id,
              username_input: credentials.identifier,
              action: "login_success",
              ip: "unknown",
              user_agent: "unknown"
            }
          });

          return {
            id: user.user_id.toString(),
            name: `${user.first_name} ${user.last_name}`,
            email: user.email,
            username: user.username,
            role: user.role,
          };
        } catch (error) {
          console.error("Login error:", error);
          throw error;
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 ชั่วโมง
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24 ชั่วโมง
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.role = token.role as string;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};