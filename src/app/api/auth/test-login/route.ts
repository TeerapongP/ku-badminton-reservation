// Test login endpoint to debug authentication issues
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { identifier, password, type } = await request.json();

    console.log("🧪 Test login attempt:", {
      identifier,
      type,
      hasPassword: !!password
    });

    if (!identifier || !password || !type) {
      return NextResponse.json({
        success: false,
        error: "Missing required fields",
        received: { identifier: !!identifier, password: !!password, type }
      }, { status: 400 });
    }

    let user;
    let searchMethod = '';

    if (type === 'student_id') {
      searchMethod = 'student_id';
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
          student_id: true,
        }
      });
    } else if (type === 'national_id') {
      searchMethod = 'national_id (hashed)';
      const allUsers = await prisma.users.findMany({
        where: {
          national_id: { not: null },
          OR: [
            { role: 'staff' },
            { role: 'guest' },
            { role: 'admin' }
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

      console.log(`Found ${allUsers.length} users with national_id`);

      for (const u of allUsers) {
        if (u.national_id && await bcrypt.compare(identifier, u.national_id)) {
          user = u;
          break;
        }
      }
    } else if (type === 'username') {
      searchMethod = 'username (admin only)';
      user = await prisma.users.findFirst({
        where: {
          username: identifier,
          role: 'admin'
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
      return NextResponse.json({
        success: false,
        error: "User not found",
        debug: {
          searchMethod,
          identifier,
          type
        }
      }, { status: 404 });
    }

    // Test password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    return NextResponse.json({
      success: true,
      result: {
        userFound: true,
        passwordValid: isPasswordValid,
        userInfo: {
          id: user.user_id.toString(),
          username: user.username,
          role: user.role,
          status: user.status,
          name: `${user.first_name} ${user.last_name}`,
          email: user.email,
        },
        searchMethod,
      }
    });

  } catch (error) {
    console.error('Test login error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
      stack: (error as Error).stack,
    }, { status: 500 });
  }
}