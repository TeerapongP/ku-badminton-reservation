import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/Auth';
import { prisma } from '@/lib/prisma'; // A05 — singleton แทน new PrismaClient()

export async function GET(req: Request) {
    try {
        // A01 — ตรวจสอบ auth ก่อนเสมอ
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'กรุณาเข้าสู่ระบบ' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(req.url);
        const unitId = searchParams.get('unitId');
        const q      = (searchParams.get('q') ?? '').trim().slice(0, 100); // จำกัดความยาว search
        const take   = Math.min(Math.max(Number(searchParams.get('take') ?? 100), 1), 500);

        if (!unitId) {
            return NextResponse.json(
                { success: false, error: 'unitId is required' },
                { status: 400 }
            );
        }

        // A03 — validate unitId ก่อน BigInt() กัน crash
        if (!/^\d+$/.test(unitId.trim()) || unitId.trim() === '0') {
            return NextResponse.json(
                { success: false, error: 'unitId ไม่ถูกต้อง' },
                { status: 400 }
            );
        }

        const rows = await prisma.sub_units.findMany({
            where: {
                unit_id: BigInt(unitId),
                ...(q ? { name_th: { contains: q } } : {}),
            },
            select: { sub_unit_id: true, name_th: true },
            orderBy: { name_th: 'asc' },
            take,
        });

        const data = rows.map((r) => ({
            label: r.name_th,
            name:  r.name_th,
            value: r.sub_unit_id.toString(),
        }));

        return NextResponse.json({ success: true, data });

    } catch (error) {
        // A09 — log จริงๆ แต่ไม่ expose error detail ออก response
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[GET /sub-units][${new Date().toISOString()}]`, message);

        return NextResponse.json(
            { success: false, error: 'Internal error' },
            { status: 500 }
        );
    }
}