import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/Auth";
import { prisma } from "@/lib/prisma";
import { decode } from "@/lib/Cryto";

// ตรวจสอบว่า id ถูก encrypt ไว้หรือเปล่า (format: salt:iv:authTag:ciphertext)
function isEncrypted(value: string): boolean {
    return value.split(':').length === 4;
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (session?.user?.id) {
            const ip = (
                req.headers.get('cf-connecting-ip') ??
                req.headers.get('x-real-ip') ??
                req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
                'unknown'
            ).substring(0, 45);

            try {
                // decode ก่อนถ้า id ถูก encrypt ไว้
                const rawId = isEncrypted(session.user.id)
                    ? await decode(session.user.id)
                    : session.user.id;

                await prisma.auth_log.create({
                    data: {
                        user_id: BigInt(rawId),
                        username_input: session.user.username ?? session.user.email ?? 'unknown',
                        action: 'logout',
                        ip,
                        user_agent: req.headers.get('user-agent')?.substring(0, 512) ?? 'unknown',
                    }
                });
            } catch (logError) {
                // A09 — log ภายใน แต่ไม่ให้ log error หยุด logout
                console.error('[POST /api/auth/logout] Failed to write auth_log:', logError instanceof Error ? logError.message : 'Unknown');
            }
        }

        return NextResponse.json({ success: true, message: 'ออกจากระบบสำเร็จ' });

    } catch (error) {
        console.error('[POST /api/auth/logout] Unexpected error:', error instanceof Error ? error.message : 'Unknown');
        return NextResponse.json({ success: true, message: 'ออกจากระบบสำเร็จ' });
    }
}