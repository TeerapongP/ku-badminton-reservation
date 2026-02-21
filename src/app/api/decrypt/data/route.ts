import { authOptions } from "@/lib/Auth";
import { decryptData } from "@/lib/encryption";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";


export async function POST(request: NextRequest) {
  try {
    // [SECURITY FIX] - Require authentication
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: "ไม่ได้รับอนุญาต - กรุณาเข้าสู่ระบบ" },
        { status: 401 }
      );
    }

    const { encryptedData } = await request.json();

    if (!encryptedData) {
      return NextResponse.json(
        { success: false, error: "ไม่พบข้อมูลที่ต้องการถอดรหัส" },
        { status: 400 }
      );
    }

    const decryptedData = decryptData(encryptedData);

    return NextResponse.json({
      success: true,
      decryptedData,
    });
  } catch (error) {
    console.error("Decryption error:", error);
    return NextResponse.json(
      { success: false, error: "ไม่สามารถถอดรหัสข้อมูลได้" },
      { status: 500 }
    );
  }
}
