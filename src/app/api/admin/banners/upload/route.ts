import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/Auth";
import { mkdir, writeFile } from "fs/promises";
import { randomBytes } from "crypto";
import path from "path";


export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: "ไม่ได้รับอนุญาต" },
                { status: 401 }
            );
        }

        // ตรวจสอบสิทธิ์ admin หรือ super_admin
        if (!['admin', 'super_admin'].includes(session.user.role || "")) {
            return NextResponse.json(
                { success: false, error: "ไม่มีสิทธิ์เข้าถึง" },
                { status: 403 }
            );
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { success: false, error: "ไม่พบไฟล์ที่อัปโหลด" },
                { status: 400 }
            );
        }

        // ตรวจสอบประเภทไฟล์
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { success: false, error: "ประเภทไฟล์ไม่ถูกต้อง กรุณาเลือกไฟล์รูปภาพ (JPG, PNG, WebP)" },
                { status: 400 }
            );
        }

        // ตรวจสอบขนาดไฟล์ (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            return NextResponse.json(
                { success: false, error: "ไฟล์มีขนาดใหญ่เกินไป กรุณาเลือกไฟล์ที่มีขนาดไม่เกิน 10MB" },
                { status: 400 }
            );
        }

        // สร้างชื่อไฟล์ใหม่
        const fileExtension = path.extname(file.name);
        const fileName = `banner_${Date.now()}_${randomBytes(8).toString('hex')}${fileExtension}`;

        // สร้างโฟลเดอร์ถ้ายังไม่มี
        const uploadDir = process.env.IMAGE_PATH
            ? path.join('/app/uploads', 'banners')
            : path.join(process.cwd(), 'public', 'uploads', 'banners');
        await mkdir(uploadDir, { recursive: true });

        // บันทึกไฟล์
        const filePath = path.join(uploadDir, fileName);
        const bytes = await file.arrayBuffer();
        await writeFile(filePath, Buffer.from(bytes));

        // สร้าง URL สำหรับเข้าถึงไฟล์ (use API route)
        const fileUrl = `/api/images/banners/${fileName}`;

        return NextResponse.json({
            success: true,
            message: "อัปโหลดไฟล์สำเร็จ",
            data: {
                filename: fileName,
                url: fileUrl,
                size: file.size,
                type: file.type
            }
        });

    } catch (error) {
        console.error("Error uploading banner image:", error);
        return NextResponse.json(
            { success: false, error: "เกิดข้อผิดพลาดในการอัปโหลดไฟล์" },
            { status: 500 }
        );
    }
}