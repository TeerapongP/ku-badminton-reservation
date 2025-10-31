import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

// Ensure database connection
prisma.$connect().catch((error: any) => {
  console.error("Failed to connect to database:", error);
});

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "credentials",
      credentials: {
        identifier: { label: "รหัสนิสิต/เลขบัตรประชาชน", type: "text" },
        password: { label: "รหัสผ่าน", type: "password" },
        type: { label: "Type", type: "text" },
        originalIdentifier: { label: "Original Identifier", type: "text" }
      },
      async authorize(credentials, req) {
        console.log("🔐 NextAuth authorize called with:", {
          identifier: credentials?.identifier,
          type: credentials?.type,
          hasPassword: !!credentials?.password,
          allCredentials: Object.keys(credentials || {})
        });

        // Validate required fields
        if (!credentials?.identifier || !credentials?.password) {
          console.error("❌ Missing required credentials:", {
            hasIdentifier: !!credentials?.identifier,
            hasPassword: !!credentials?.password,
            hasType: !!credentials?.type
          });
          return null;
        }

        // Default type if not provided
        const loginType = credentials.type || 'student_id';

        try {
          let user;

          console.log("🔍 Searching user by type:", loginType);

          if (loginType === 'student_id') {
            // ค้นหาด้วยรหัสนิสิต
            console.log("👨‍🎓 Searching by student_id:", credentials.identifier);
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
          } else if (loginType === 'national_id') {
            // ค้นหาด้วยเลขบัตรประชาชน
            const allUsers = await prisma.users.findMany({
              where: {
                national_id: { not: null },
                OR: [
                  { role: 'staff' },
                  { role: 'guest' },
                  { role: 'admin' },
                  { role: 'super_admin' }
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
          } else if (loginType === 'username') {
            // ค้นหาด้วย username (สำหรับ admin เท่านั้น)
            user = await prisma.users.findFirst({
              where: {
                username: credentials.identifier,
                OR: [
                  { role: 'admin' },
                  { role: 'super_admin' }
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
              }
            });
          }

          if (!user) {
            console.log("❌ User not found for identifier:", credentials.identifier, "type:", loginType);
            throw new Error("CredentialsSignin");
          }

          console.log("✅ User found:", {
            id: user.user_id.toString(),
            username: user.username,
            role: user.role,
            status: user.status
          });

          // ตรวจสอบสถานะผู้ใช้
          if (user.status !== 'active') {
            console.log("❌ User account suspended");
            throw new Error("CredentialsSignin");
          }

          // ตรวจสอบรหัสผ่าน
          const isPasswordValid = await bcrypt.compare(credentials.password, user.password_hash);

          if (!isPasswordValid) {
            console.log("❌ Invalid password");

            // บันทึก log การ login ไม่สำเร็จ
            try {
              await prisma.auth_log.create({
                data: {
                  user_id: user.user_id,
                  username_input: credentials.identifier,
                  action: "login_fail",
                  ip: "unknown",
                  user_agent: "unknown"
                }
              });
            } catch (logError) {
              console.error("Failed to log auth attempt:", logError);
            }

            throw new Error("CredentialsSignin");
          }

          console.log("✅ Password valid, logging in user");

          // อัปเดต last_login_at
          try {
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
          } catch (updateError) {
            console.error("Failed to update user login info:", updateError);
            // Continue with login even if logging fails
          }

          const userResult = {
            id: user.user_id.toString(),
            name: `${user.first_name} ${user.last_name}`,
            email: user.email,
            username: user.username,
            role: user.role,
          };

          console.log("🎉 Login successful, returning user:", userResult);
          return userResult;

        } catch (error) {
          console.error("❌ Login error:", error);
          throw new Error("CredentialsSignin");
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
  debug: process.env.NODE_ENV === 'development', // Enable debug in development
  callbacks: {
    async jwt({ token, user }) {
      console.log("🔑 JWT callback:", { user: !!user, tokenId: token.id });
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      console.log("📋 Session callback:", { tokenId: token.id });
      if (token) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.role = token.role as string;
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      console.log("🚪 SignIn callback:", {
        userId: user?.id,
        account: account?.provider
      });
      return true; // Allow sign in
    }
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  events: {
    async signIn({ user, account, profile }) {
      console.log("🎉 SignIn event:", { userId: user?.id, provider: account?.provider });
    },
    async signOut({ session, token }) {
      console.log("👋 SignOut event:", { userId: token?.id });
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};