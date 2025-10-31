import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/Auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// PUT - อัปเดต banner
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: "ไม่ได้รับอนุญาต" },
                { status: 401 }
            );
        }

        // ตรวจสอบสิทธิ์ admin หรือ super_admin
        if (!['admin', 'super_admin'].includes(session.user.role ?? "")) {
            return NextResponse.json(
                { success: false, error: "ไม่มีสิทธิ์เข้าถึง" },
                { status: 403 }
            );
        }

        const { id } = await params;
        const body = await request.json();
        const { title, subtitle, image_path, is_active, display_order } = body;

        // ตรวจสอบว่า banner มีอยู่หรือไม่
        const existingBanner = await prisma.banners.findUnique({
            where: { banner_id: BigInt(id) }
        });

        if (!existingBanner) {
            return NextResponse.json(
                { success: false, error: "ไม่พบ banner ที่ต้องการแก้ไข" },
                { status: 404 }
            );
        }

        // อัปเดตข้อมูล
        const updatedBanner = await prisma.banners.update({
            where: { banner_id: BigInt(id) },
            data: {
                title: title || existingBanner.title,
                subtitle: subtitle !== undefined ? subtitle : existingBanner.subtitle,
                image_path: image_path || existingBanner.image_path,
                is_active: is_active !== undefined ? is_active : existingBanner.is_active,
                display_order: display_order !== undefined ? display_order : existingBanner.display_order,
                updated_at: new Date()
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
            id: Number(updatedBanner.banner_id),
            title: updatedBanner.title,
            subtitle: updatedBanner.subtitle,
            image_path: updatedBanner.image_path,
            is_active: updatedBanner.is_active,
            display_order: updatedBanner.display_order,
            created_at: updatedBanner.created_at.toISOString(),
            updated_at: updatedBanner.updated_at.toISOString()
        };

        return NextResponse.json({
            success: true,
            message: "อัปเดต banner สำเร็จ",
            data: formattedBanner
        });

    } catch (error) {
        console.error("Error updating banner:", error);
        return NextResponse.json(
            { success: false, error: "เกิดข้อผิดพลาดในการอัปเดต banner" },
            { status: 500 }
        );
    }
}

// DELETE - ลบ banner
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: "ไม่ได้รับอนุญาต" },
                { status: 401 }
            );
        }

        // ตรวจสอบสิทธิ์ admin หรือ super_admin
        if (!['admin', 'super_admin'].includes(session.user.role)) {
            return NextResponse.json(
                { success: false, error: "ไม่มีสิทธิ์เข้าถึง" },
                { status: 403 }
            );
        }

        const { id } = await params;

        // ตรวจสอบว่า banner มีอยู่หรือไม่
        const existingBanner = await prisma.banners.findUnique({
            where: { banner_id: BigInt(id) }
        });

        if (!existingBanner) {
            return NextResponse.json(
                { success: false, error: "ไม่พบ banner ที่ต้องการลบ" },
                { status: 404 }
            );
        }

        // ลบ banner
        await prisma.banners.delete({
            where: { banner_id: BigInt(id) }
        });

        return NextResponse.json({
            success: true,
            message: "ลบ banner สำเร็จ"
        });

    } catch (error) {
        console.error("Error deleting banner:", error);
        return NextResponse.json(
            { success: false, error: "เกิดข้อผิดพลาดในการลบ banner" },
            { status: 500 }
        );
    }
}