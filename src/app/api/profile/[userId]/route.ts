import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/Auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET - ดึงข้อมูลโปรไฟล์
export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "ไม่ได้รับอนุญาต" },
        { status: 401 }
      );
    }

    // Await params since it's now a Promise in Next.js 15
    const { userId } = await params;

    // ตรวจสอบว่าผู้ใช้เข้าถึงโปรไฟล์ของตัวเองหรือไม่
    if (session.user.id !== userId) {
      return NextResponse.json(
        { success: false, error: "ไม่ได้รับอนุญาต" },
        { status: 403 }
      );
    }

    const user = await prisma.users.findUnique({
      where: { user_id: BigInt(userId) },
      select: {
        user_id: true,
        role: true,
        username: true,
        email: true,
        phone: true,
        title_th: true,
        title_en: true,
        first_name: true,
        last_name: true,
        student_id: true,
        staff_id: true,
        profile_photo_url: true,
        status: true,
        membership: true,
        registered_at: true,
        last_login_at: true,
      }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "ไม่พบผู้ใช้" },
        { status: 404 }
      );
    }

    // แปลง BigInt เป็น string สำหรับ JSON
    const userData = {
      ...user,
      user_id: Number(user.user_id),
      registered_at: user.registered_at.toISOString(),
      last_login_at: user.last_login_at ? user.last_login_at.toISOString() : null,
    };

    return NextResponse.json({
      success: true,
      user: userData
    });

  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการดึงข้อมูล" },
      { status: 500 }
    );
  }
}

// PUT - อัปเดตข้อมูลโปรไฟล์
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "ไม่ได้รับอนุญาต" },
        { status: 401 }
      );
    }

    // Await params since it's now a Promise in Next.js 15
    const { userId } = await params;

    // ตรวจสอบว่าผู้ใช้แก้ไขโปรไฟล์ของตัวเองหรือไม่
    if (session.user.id !== userId) {
      return NextResponse.json(
        { success: false, error: "ไม่ได้รับอนุญาต" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      username,
      email,
      phone,
      title_th,
      title_en,
      first_name,
      last_name,
      profile_photo_url
    } = body;

    // Validation
    if (!username || !email || !first_name || !last_name) {
      return NextResponse.json(
        { success: false, error: "ข้อมูลไม่ครบถ้วน" },
        { status: 400 }
      );
    }

    // ตรวจสอบว่า username และ email ซ้ำหรือไม่ (ยกเว้นของตัวเอง)
    const existingUser = await prisma.users.findFirst({
      where: {
        AND: [
          { user_id: { not: BigInt(userId) } },
          {
            OR: [
              { username },
              { email }
            ]
          }
        ]
      }
    });

    if (existingUser) {
      let errorMessage = "ข้อมูลซ้ำในระบบ: ";
      if (existingUser.username === username) errorMessage += "ชื่อผู้ใช้";
      else if (existingUser.email.toLowerCase() === email.toLowerCase()) errorMessage += "อีเมล";

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      );
    }

    // อัปเดตข้อมูล
    const updatedUser = await prisma.users.update({
      where: { user_id: BigInt(userId) },
      data: {
        username,
        email,
        phone: phone || null,
        title_th: title_th || null,
        title_en: title_en || null,
        first_name,
        last_name,
        profile_photo_url: profile_photo_url || null,
      },
      select: {
        user_id: true,
        role: true,
        username: true,
        email: true,
        phone: true,
        title_th: true,
        title_en: true,
        first_name: true,
        last_name: true,
        student_id: true,
        staff_id: true,
        profile_photo_url: true,
        status: true,
        membership: true,
        registered_at: true,
        last_login_at: true,
      }
    });

    // แปลง BigInt เป็น string สำหรับ JSON
    const userData = {
      ...updatedUser,
      user_id: Number(updatedUser.user_id),
      registered_at: updatedUser.registered_at.toISOString(),
      last_login_at: updatedUser.last_login_at ? updatedUser.last_login_at.toISOString() : null,
    };

    return NextResponse.json({
      success: true,
      message: "อัปเดตโปรไฟล์สำเร็จ",
      user: userData
    });

  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการอัปเดตข้อมูล" },
      { status: 500 }
    );
  }
}