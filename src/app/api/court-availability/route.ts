import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function normalizeForJson<T = any>(data: T): T {
    const isPlainObj = (v: any) => v && typeof v === "object" && (v.constructor === Object || Object.getPrototypeOf(v) === Object.prototype);
    const norm = (v: any): any => {
        if (typeof v === "bigint") {
            const n = Number(v);
            return Number.isSafeInteger(n) ? n : v.toString();
        }
        if (v && typeof v === "object" && "toNumber" in v && typeof (v as any).toNumber === "function") {
            try { return (v as any).toNumber(); } catch { return (v as any).toString(); }
        }
        if (Array.isArray(v)) return v.map(norm);
        if (isPlainObj(v)) return Object.fromEntries(Object.entries(v).map(([k, val]) => [k, norm(val)]));
        return v;
    };
    return norm(data);
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const courtId = Number.parseInt(searchParams.get("courtId") ?? "", 10);
        const dateStr = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
        const userIdStr = searchParams.get("userId");
        const userId = userIdStr ? Number.parseInt(userIdStr, 10) : null;

        if (!Number.isSafeInteger(courtId) || courtId <= 0) {
            return NextResponse.json({ success: false, error: "courtId must be a positive integer" }, { status: 400 });
        }

        // หา role ของ user (ถ้ามี userId)
        let userRole: "student" | "staff" | "admin" | null = null;
        if (userId) {
            const r = await prisma.$queryRaw<{ role: "student" | "staff" | "admin" }[]>`
        SELECT role FROM users WHERE user_id = ${userId} LIMIT 1
      `;
            userRole = r[0]?.role ?? null;
        }

        type Row = {
            id: number;
            label: string;
            status: "available" | "reserved" | "pending" | "break";
            bookedBy: string | null;
            price_cents: number | null;
            price_thb: number | null;
        };

        const rows = await prisma.$queryRaw<Row[]>`

    `;

        const data = {
            courtId,
            date: dateStr,
            userId,
            userRole,
            slots: rows.map(r => ({
                id: r.id,
                label: r.label,
                status: r.status,
                bookedBy: r.bookedBy ?? undefined,
                priceCents: r.price_cents ?? null,
                priceThb: r.price_thb ?? null,
            })),
        };

        return NextResponse.json({ success: true, data: normalizeForJson(data) });
    } catch (err) {
        console.error("court-availability error:", err);
        return NextResponse.json({ success: false, error: "Failed to fetch availability" }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}
