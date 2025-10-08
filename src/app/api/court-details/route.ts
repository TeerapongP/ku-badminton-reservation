// src/app/api/court-details/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma";
const prisma = new PrismaClient();

// แปลง BigInt / Prisma.Decimal / object ซ้อน ๆ ให้ serialize เป็น JSON ได้
function normalizeForJson<T = any>(data: T): T {
    const isPlainObj = (v: any) =>
        v !== null && typeof v === "object" && (v.constructor === Object || Object.getPrototypeOf(v) === Object.prototype);

    const norm = (v: any): any => {
        if (typeof v === "bigint") {
            const n = Number(v);
            return Number.isSafeInteger(n) ? n : v.toString(); // ถ้าใหญ่เกิน → string
        }
        // Prisma.Decimal รองรับทั้ง toNumber()/toString()
        if (v && typeof v === "object" && "toNumber" in v && typeof (v as any).toNumber === "function") {
            try {
                return (v as any).toNumber();
            } catch {
                return (v as any).toString();
            }
        }
        if (Array.isArray(v)) return v.map(norm);
        if (isPlainObj(v)) {
            return Object.fromEntries(Object.entries(v).map(([k, val]) => [k, norm(val)]));
        }
        return v;
    };

    return norm(data);
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const courtIdStr = searchParams.get("courtId");
        const courtId = Number.parseInt(courtIdStr ?? "", 10);

        if (!Number.isSafeInteger(courtId) || courtId <= 0) {
            return NextResponse.json(
                { success: false, error: "courtId must be a positive integer" },
                { status: 400 }
            );
        }

        // วันนี้ในรูปแบบ YYYY-MM-DD (ใช้เลือก pricing_rules วันนี้)
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
            today.getDate()
        ).padStart(2, "0")}`;

        const rows = await prisma.$queryRaw<
            Array<{
                courtId: bigint;
                courtCode: string;
                courtName: string | null;
                surface: "wood" | "synthetic" | "other";
                isActive: number; // tinyint(1)
                facilityId: bigint;
                facilityNameTh: string;
                facilityNameEn: string | null;
                priceCents: number | null; // อาจเป็น Decimal ก็รองรับด้วย normalizeForJson
            }>
        >`
      SELECT
        c.court_id                                          AS courtId,
        c.court_code                                        AS courtCode,
        c.name                                              AS courtName,
        c.surface                                           AS surface,
        c.is_active                                         AS isActive,
        f.facility_id                                       AS facilityId,
        f.name_th                                           AS facilityNameTh,
        f.name_en                                           AS facilityNameEn,
        (
          SELECT pr.price_cents
          FROM pricing_rules pr
          WHERE pr.active = 1
            AND (pr.effective_from <= ${todayStr})
            AND (pr.effective_to IS NULL OR pr.effective_to >= ${todayStr})
            AND (
              (pr.court_id = c.court_id) OR
              (pr.court_id IS NULL AND pr.facility_id = f.facility_id)
            )
          ORDER BY (pr.court_id IS NOT NULL) DESC, pr.effective_from DESC
          LIMIT 1
        )                                                   AS priceCents
      FROM courts c
      JOIN facilities f ON f.facility_id = c.facility_id
      WHERE c.court_id = ${courtId}
      LIMIT 1
    `;

        if (rows.length === 0) {
            return NextResponse.json({ success: false, error: "Court not found" }, { status: 404 });
        }

        const r = rows[0];

        // map ให้อยู่ในรูปที่ UI ใช้ + แปลงหน่วยราคาเป็นบาท
        const data = {
            court_id: r.courtId, // bigint → จะถูก normalize ต่อไป
            courtCode: r.courtCode,
            courtName: r.courtName ?? `Court ${r.courtCode}`,
            surface: r.surface,
            active: r.isActive === 1,
            facilityId: r.facilityId, // bigint
            building: r.facilityNameTh,
            facilityNameTh: r.facilityNameTh,
            facilityNameEn: r.facilityNameEn,
            pricePerHour: r.priceCents != null ? (typeof r.priceCents === "number" ? r.priceCents / 100 : r.priceCents) : null,
        };

        // 🔧 ป้องกัน BigInt/Decimal พัง JSON.stringify
        const safeData = normalizeForJson(data);

        return NextResponse.json({ success: true, data: safeData });
    } catch (error) {
        console.error("Court Details API error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch court details" },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
    }
}
