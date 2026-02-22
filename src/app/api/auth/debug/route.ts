// Debug endpoint for NextAuth issues (DEV ONLY)
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/Auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  //  ปิดกั้น production เด็ดขาด
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }

  try {
    // Check environment variables (แสดงแค่ว่ามีหรือไม่มี ไม่แสดงค่า)
    const envCheck = {
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      NEXTAUTH_URL:    !!process.env.NEXTAUTH_URL,
      DATABASE_URL:    !!process.env.DATABASE_URL,
    };

    // Check database connection
    let dbStatus = 'disconnected';
    let userCount = 0;
    try {
      await prisma.$connect();
      userCount = await prisma.users.count();
      dbStatus = 'connected';
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      dbStatus = 'error';  // ไม่แสดง error message ดิบ
    }

    // Check current session
    let sessionStatus = 'no session';
    try {
      const session = await getServerSession(authOptions);
      sessionStatus = session ? 'active session' : 'no session';
    } catch {
      sessionStatus = 'session error';
    }

    // Test user lookup (ไม่แสดง username หรือข้อมูล user จริง)
    let testUserStatus = 'not found';
    try {
      const testUser = await prisma.users.findFirst({
        where: {
          OR: [
            { role: 'admin' },
            { role: 'student' }
          ]
        },
        select: {
          role:   true,
          status: true,
        }
      });

      testUserStatus = testUser
        ? `found: role=${testUser.role}, status=${testUser.status}`
        : 'not found';
    } catch {
      testUserStatus = 'user lookup error';
    }

    return NextResponse.json({
      success: true,
      debug: {
        environment: envCheck,
        database: {
          status:    dbStatus,
          userCount,
        },
        session:  sessionStatus,
        testUser: testUserStatus,
        timestamp: new Date().toISOString(),
      }
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({
      success:   false,
      error:     'Internal server error',  // ไม่แสดง error message ดิบ
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}