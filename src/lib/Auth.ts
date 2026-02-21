import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { encryptData, decryptData } from "./encryption";

// Ensure database connection
try {
  await prisma.$connect();
} catch (error: any) {
  console.error("Failed to connect to database:", error);
}

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
        // ถอดรหัสข้อมูลที่ได้รับจาก client
        let identifier = credentials?.identifier;
        let password = credentials?.password;
        let originalIdentifier = credentials?.originalIdentifier;

        try {
          if (identifier) identifier = decryptData(identifier);
          if (password) password = decryptData(password);
          if (originalIdentifier) originalIdentifier = decryptData(originalIdentifier);
        } catch (decryptError) {
          console.error("❌ Decryption error:", decryptError);
          return null;
        }

        // เข้ารหัสสำหรับ log
        const encryptedIdentifierForLog = identifier ? encryptData(identifier) : null;

        console.log("🔐 NextAuth authorize called with:", {
          identifier: encryptedIdentifierForLog,
          type: credentials?.type,
          hasPassword: !!password,
          allCredentials: Object.keys(credentials || {})
        });

        // Validate required fields
        if (!identifier || !password) {
          console.error("❌ Missing required credentials:", {
            hasIdentifier: !!identifier,
            hasPassword: !!password,
            hasType: !!credentials?.type
          });
          return null;
        }

        // Default type if not provided
        const loginType = credentials?.type || 'student_id';

        try {
          let user;

          console.log("🔍 Searching user by type:", loginType);

          if (loginType === 'student_id') {
            // ค้นหาด้วยรหัสนิสิต
            console.log("👨‍🎓 Searching by student_id:", encryptedIdentifierForLog);
            user = await prisma.users.findFirst({
              where: { student_id: identifier },
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
            // ค้นหาด้วยเลขบัตรประชาชน (เก็บเป็น plain text ในฐานข้อมูล)
            console.log("🔍 Searching national_id, originalIdentifier exists:", !!originalIdentifier);

            if (!originalIdentifier) {
              console.log("❌ originalIdentifier is required for national_id login");
              throw new Error("CredentialsSignin");
            }

            // ค้นหาโดยตรงด้วย national_id (plain text)
            user = await prisma.users.findFirst({
              where: {
                national_id: originalIdentifier,
                OR: [
                  { role: 'staff' },
                  { role: 'student' },
                  { role: 'demonstration_student' },
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
              }
            });

            if (user) {
              console.log("✅ Found user by national_id:", user.username);
            } else {
              console.log("❌ No user found with national_id");
            }
          } else if (loginType === 'username') {
            // ค้นหาด้วย username (สำหรับ admin และ super_admin เท่านั้น)
            console.log("👨‍💼 Searching by username:", encryptedIdentifierForLog);
            user = await prisma.users.findFirst({
              where: {
                username: identifier,
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
            console.log("❌ User not found for identifier:", encryptedIdentifierForLog, "type:", loginType);
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
          const isPasswordValid = await bcrypt.compare(password, user.password_hash);

          if (!isPasswordValid) {
            console.log("❌ Invalid password");

            // บันทึก log การ login ไม่สำเร็จ
            try {
              await prisma.auth_log.create({
                data: {
                  user_id: user.user_id,
                  username_input: encryptedIdentifierForLog || "unknown",
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

          // ตรวจสอบว่าเป็นการ login ครั้งแรกหรือไม่
          const userWithLoginInfo = await prisma.users.findUnique({
            where: { user_id: user.user_id },
            select: { last_login_at: true }
          });
          const isFirstLogin = !userWithLoginInfo?.last_login_at;

          console.log("🔍 First login check:", {
            role: user.role,
            hasLastLogin: !!userWithLoginInfo?.last_login_at,
            isFirstLogin
          });

          // อัปเดต last_login_at เฉพาะถ้าไม่ใช่ first login
          // (first login จะอัปเดตหลังจากเปลี่ยนรหัสผ่านแล้ว)
          try {
            if (!isFirstLogin) {
              await prisma.users.update({
                where: { user_id: user.user_id },
                data: {
                  last_login_at: new Date(),
                  last_login_ip: "unknown"
                }
              });
            }

            // บันทึก log การ login สำเร็จ
            await prisma.auth_log.create({
              data: {
                user_id: user.user_id,
                username_input: encryptedIdentifierForLog || "unknown",
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
            isFirstLogin,
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
    maxAge: 30 * 60, // 30 minutes
    updateAge: 5 * 60, // Refresh every 5 minutes
  },
  jwt: {
    maxAge: 30 * 60, // 30 minutes
  },
  // [SECURITY FIX] - Secure cookie configuration
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    },
    callbackUrl: {
      name: `__Secure-next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    },
    csrfToken: {
      name: `__Host-next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  },

  debug: process.env.NODE_ENV === 'development', // Enable debug in development
  callbacks: {
    async jwt({ token, user, trigger }) {
      console.log("🔑 JWT callback:", { user: !!user, tokenId: token.id });
      
      // Rotate token on update
      if (trigger === 'update') {
        token.iat = Math.floor(Date.now() / 1000);
      }
      
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.role = user.role;
        token.isFirstLogin = (user as any).isFirstLogin;
        
        // Check if password was changed since token issued
        const dbUser = await prisma.users.findUnique({
          where: { user_id: BigInt(user.id) },
          select: { updated_at: true }
        });
        
        if (dbUser) {
          token.passwordChangedAt = dbUser.updated_at.getTime();
        }
      }
      return token;
    },
    async session({ session, token }) {
      console.log("📋 Session callback:", {
        tokenId: token.id,
        role: token.role,
        isFirstLogin: token.isFirstLogin
      });
      
      // Validate token hasn't been invalidated
      if (token.passwordChangedAt) {
        const tokenIssuedAt = (token.iat as number) * 1000;
        if (tokenIssuedAt < (token.passwordChangedAt as number)) {
          throw new Error('Token invalidated - password changed');
        }
      }
      
      if (token) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.role = token.role as string;
        (session.user as any).isFirstLogin = token.isFirstLogin;
      }
      console.log("📋 Session after update:", {
        userId: session.user.id,
        role: session.user.role,
        isFirstLogin: (session.user as any).isFirstLogin
      });
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