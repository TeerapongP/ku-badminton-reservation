import { NextResponse } from "next/server";
import { decryptData } from "@/lib/encryption";

export async function POST(req: Request) {
  try {
    const { encryptedData } = await req.json();

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
