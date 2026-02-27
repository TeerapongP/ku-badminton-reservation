import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/Auth";
import { decryptData } from "@/lib/encryption";

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: "ไม่ได้รับอนุญาต" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { encryptedData } = body;

        console.log('[api/decrypt/data] Received request to decrypt:', {
            hasData: !!encryptedData,
            length: encryptedData?.length,
            preview: typeof encryptedData === 'string' ? encryptedData.substring(0, 20) + '...' : 'not a string'
        });

        if (!encryptedData || typeof encryptedData !== 'string') {
            return NextResponse.json(
                { success: false, error: "ไม่พบข้อมูลที่ต้องการถอดรหัส" },
                { status: 400 }
            );
        }

        try {
            const decryptedData = decryptData(encryptedData);
            
            console.log('[api/decrypt/data] Decryption successful');
            
            return NextResponse.json({
                success: true,
                decryptedData: decryptedData
            });
        } catch (decryptError) {
            console.error('[api/decrypt/data] Decryption failed:', {
                error: decryptError instanceof Error ? decryptError.message : String(decryptError),
                data: encryptedData
            });
            return NextResponse.json(
                { success: false, error: "ไม่สามารถถอดรหัสข้อมูลได้" },
                { status: 400 }
            );
        }

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[POST /api/decrypt/data][${new Date().toISOString()}] Fatal error:`, message);
        return NextResponse.json(
            { success: false, error: "เกิดข้อผิดพลาดภายในระบบ" },
            { status: 500 }
        );
    }
}
