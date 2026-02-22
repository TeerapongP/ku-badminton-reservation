import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/Auth";
import { prisma } from "@/lib/prisma";

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

            await prisma.auth_log.create({
                data: {
                    user_id: BigInt(session.user.id),
                    username_input: session.user.username ?? session.user.email ?? 'unknown',
                    action: 'logout',   // action ถูกต้อง
                    ip,
                    user_agent: req.headers.get('user-agent')?.substring(0, 512) ?? 'unknown',
                }
            });
        }

        return NextResponse.json({ success: true, message: 'ออกจากระบบสำเร็จ' });

    } catch (error) {
        console.error('Logout API error:', error);
        return NextResponse.json({ success: true, message: 'ออกจากระบบสำเร็จ' });
    }
}