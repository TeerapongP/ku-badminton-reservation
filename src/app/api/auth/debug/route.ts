// Debug endpoint for NextAuth issues
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/Auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    const envCheck = {
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      DATABASE_URL: !!process.env.DATABASE_URL,
    };

    // Check database connection
    let dbStatus = 'disconnected';
    let userCount = 0;
    try {
      await prisma.$connect();
      const result = await prisma.users.count();
      userCount = result;
      dbStatus = 'connected';
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      dbStatus = 'error: ' + (dbError as Error).message;
    }

    // Check current session
    let sessionStatus = 'no session';
    try {
      const session = await getServerSession(authOptions);
      sessionStatus = session ? 'active session' : 'no session';
    } catch (sessionError) {
      sessionStatus = 'session error: ' + (sessionError as Error).message;
    }

    // Test user lookup
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
          user_id: true,
          username: true,
          role: true,
          status: true,
          student_id: true,
        }
      });
      
      if (testUser) {
        testUserStatus = `found: ${testUser.role} - ${testUser.username}`;
      }
    } catch (userError) {
      testUserStatus = 'user lookup error: ' + (userError as Error).message;
    }

    return NextResponse.json({
      success: true,
      debug: {
        environment: envCheck,
        database: {
          status: dbStatus,
          userCount: userCount,
        },
        session: sessionStatus,
        testUser: testUserStatus,
        timestamp: new Date().toISOString(),
      }
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}