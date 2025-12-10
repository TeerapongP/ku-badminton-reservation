import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PrismaClient } from "@prisma/client";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const prisma = new PrismaClient();

// POST - สร้าง banners table
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: "ไม่ได้รับอนุญาต" },
                { status: 401 }
            );
        }

        // ตรวจสอบสิทธิ์ super_admin เท่านั้น
        if (session.user.role !== 'super_admin') {
            return NextResponse.json(
                { success: false, error: "ต้องเป็น super_admin เท่านั้น" },
                { status: 403 }
            );
        }

        // สร้าง banners table
        const createTableSQL = `
      CREATE TABLE IF NOT EXISTS banners (
        banner_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        subtitle VARCHAR(500) NULL,
        image_path VARCHAR(500) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        display_order INT UNSIGNED NOT NULL DEFAULT 1,
        created_by BIGINT UNSIGNED NOT NULL,
        created_at DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
        updated_at DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
        
        PRIMARY KEY (banner_id),
        INDEX idx_banner_active (is_active),
        INDEX idx_banner_order (display_order),
        INDEX idx_banner_created_by (created_by),
        CONSTRAINT fk_banner_created_by FOREIGN KEY (created_by) REFERENCES users (user_id) ON DELETE RESTRICT ON UPDATE CASCADE
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `;

        await prisma.$executeRawUnsafe(createTableSQL);

        return NextResponse.json({
            success: true,
            message: "สร้าง banners table สำเร็จ"
        });

    } catch (error) {
        console.error("Error creating banners table:", error);
        return NextResponse.json(
            {
                success: false,
                error: "เกิดข้อผิดพลาดในการสร้าง table",
                debug: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
    }
}