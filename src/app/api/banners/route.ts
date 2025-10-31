import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET - ดึงรายการ banners ที่ active สำหรับแสดงผล
export async function GET(request: NextRequest) {
    try {
        const banners = await prisma.banners.findMany({
            where: { is_active: true },
            orderBy: { display_order: 'asc' },
            select: {
                banner_id: true,
                title: true,
                subtitle: true,
                image_path: true,
                display_order: true
            }
        });

        const formattedBanners = banners.map(banner => ({
            id: Number(banner.banner_id),
            title: banner.title,
            subtitle: banner.subtitle,
            image_path: banner.image_path,
            display_order: banner.display_order
        }));

        return NextResponse.json({
            success: true,
            data: formattedBanners
        });

    } catch (error) {
        console.error("Error fetching active banners:", error);
        return NextResponse.json(
            { success: false, error: "เกิดข้อผิดพลาดในการดึงข้อมูล banner" },
            { status: 500 }
        );
    }
}