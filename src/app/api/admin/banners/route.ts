import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/Auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET - ดึงรายการ banners ทั้งหมด
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: "ไม่ได้รับอนุญาต" },
                { status: 401 }
            );
        }

        // ตรวจสอบสิทธิ์ admin หรือ super-admin
        if (!['admin', 'super-admin'].includes(session.user.role)) {
            return NextResponse.json(
                { success: false, error: "ไม่มีสิทธิ์เข้าถึง" },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(request.url);
        const activeOnly = searchParams.get('active') === 'true';

        const whereCondition = activeOnly ? { is_active: true } : {};

        const banners = await prisma.banners.findMany({
            where: whereCondition,
            orderBy: [
                { display_order: 'asc' },
                { created_at: 'desc' }
            ],
            select: {
                banner_id: true,
                title: true,
                subtitle: true,
                image_path: true,
                is_active: true,
                display_order: true,
                created_at: true,
                updated_at: true
            }
        });

        const formattedBanners = banners.map(banner => ({
            id: Number(banner.banner_id),
            title: banner.title,
            subtitle: banner.subtitle,
            image_path: banner.image_path,
            is_active: banner.is_active,
            display_order: banner.display_order,
            created_at: banner.created_at.toISOString(),
            updated_at: banner.updated_at.toISOString()
        }));

        return NextResponse.json({
            success: true,
            data: formattedBanners
        });

    } catch (error) {
        console.error("Error fetching banners:", error);
        return NextResponse.json(
            { success: false, error: "เกิดข้อผิดพลาดในการดึงข้อมูล banner" },
            { status: 500 }
        );
    }
}

// POST - สร้าง banner ใหม่
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: "ไม่ได้รับอนุญาต" },
                { status: 401 }
            );
        }

        // ตรวจสอบสิทธิ์ admin หรือ super-admin
        if (!['admin', 'super-admin'].includes(session.user.role)) {
            return NextResponse.json(
                { success: false, error: "ไม่มีสิทธิ์เข้าถึง" },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { title, subtitle, image_path, is_active = true, display_order } = body;

        // Validation
        if (!title || !image_path) {
            return NextResponse.json(
                { success: false, error: "กรุณากรอกข้อมูลให้ครบถ้วน" },
                { status: 400 }
            );
        }

        // หา display_order ถัดไปถ้าไม่ได้ระบุ
        let finalDisplayOrder = display_order;
        if (!finalDisplayOrder) {
            const maxOrder = await prisma.banners.findFirst({
                orderBy: { display_order: 'desc' },
                select: { display_order: true }
            });
            finalDisplayOrder = (maxOrder?.display_order || 0) + 1;
        }

        const newBanner = await prisma.banners.create({
            data: {
                title,
                subtitle: subtitle || null,
                image_path,
                is_active,
                display_order: finalDisplayOrder,
                created_by: BigInt(session.user.id)
            },
            select: {
                banner_id: true,
                title: true,
                subtitle: true,
                image_path: true,
                is_active: true,
                display_order: true,
                created_at: true,
                updated_at: true
            }
        });

        const formattedBanner = {
            id: Number(newBanner.banner_id),
            title: newBanner.title,
            subtitle: newBanner.subtitle,
            image_path: newBanner.image_path,
            is_active: newBanner.is_active,
            display_order: newBanner.display_order,
            created_at: newBanner.created_at.toISOString(),
            updated_at: newBanner.updated_at.toISOString()
        };

        return NextResponse.json({
            success: true,
            message: "สร้าง banner สำเร็จ",
            data: formattedBanner
        });

    } catch (error) {
        console.error("Error creating banner:", error);
        return NextResponse.json(
            { success: false, error: "เกิดข้อผิดพลาดในการสร้าง banner" },
            { status: 500 }
        );
    }
}