// src/app/api/auth/register/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ---- รองรับ prefix ได้ 3 รูปแบบ: {en, th} หรือ "mr|นาย" หรือส่ง title_th/title_en มาเลย ----
    const prefix = body.prefix as { en?: string; th?: string } | string | undefined;
    let { title_th, title_en } = body as { title_th?: string; title_en?: string };

    if (!title_th || !title_en) {
      if (typeof prefix === "string" && prefix.includes("|")) {
        const [en, th] = prefix.split("|");
        title_en = title_en ?? en ?? undefined;
        title_th = title_th ?? th ?? undefined;
      } else if (prefix && typeof prefix === "object") {
        title_en = title_en ?? prefix.en ?? undefined;
        title_th = title_th ?? prefix.th ?? undefined;
      }
    }

    const {
      // Basic info
      username,
      password, // NOTE: มาเป็น hash จาก frontend แล้ว
      email,
      phone,
      first_name,
      last_name,
      nickname,
      gender,
      dob,
      role,

      // Student specific
      student_id,
      faculty_id,
      department_id,
      level_of_study,

      // Staff / Guest
      national_id,
      office_department,
      position,
      staff_type,
      unit_id,

      // Address
      house_number,
      street,
      subdistrict,
      district,
      province,
      postal_code,
      country = "TH",
    } = body;

    // ---------- Validate เบื้องต้น ----------
    if (!username || !password || !email || !first_name || !last_name || !role) {
      return NextResponse.json(
        { success: false, error: "ข้อมูลไม่ครบถ้วน" },
        { status: 400 }
      );
    }

    // เงื่อนไขเฉพาะ role
    if (role === "student") {
      if (!student_id || !faculty_id || !department_id || !level_of_study) {
        return NextResponse.json(
          { success: false, error: "ข้อมูลนิสิตไม่ครบถ้วน" },
          { status: 400 }
        );
      }
    }

    if (role === "staff") {
      if (!national_id || !staff_type) {
        return NextResponse.json(
          { success: false, error: "ข้อมูลบุคลากรไม่ครบถ้วน" },
          { status: 400 }
        );
      }
    }

    if (role === "guest") {
      if (!national_id) {
        return NextResponse.json(
          { success: false, error: "กรุณากรอกเลขบัตรประชาชน/เอกสารแสดงตน" },
          { status: 400 }
        );
      }
    }

    // รูปแบบทั่วไป
    if (postal_code && !/^\d{5}$/.test(postal_code)) {
      return NextResponse.json(
        { success: false, error: "รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก" },
        { status: 400 }
      );
    }

    if (phone && !/^0\d{9}$/.test(phone)) {
      return NextResponse.json(
        { success: false, error: "เบอร์โทรศัพท์ต้องขึ้นต้นด้วย 0 และมี 10 หลัก" },
        { status: 400 }
      );
    }

    if (student_id && !/^\d{8,10}$/.test(student_id)) {
      return NextResponse.json(
        { success: false, error: "รหัสนิสิตต้องเป็นตัวเลข 8-10 หลัก" },
        { status: 400 }
      );
    }

    // national_id อาจถูก hash มาจากหน้าบ้านแล้ว (คอลัมน์รองรับ VARCHAR(255))

    // ---------- ตรวจซ้ำ ----------
    const existingUser = await prisma.users.findFirst({
      where: {
        OR: [
          { username },
          { email },
          ...(phone ? [{ phone }] : []),
          ...(role === "student" && student_id ? [{ student_id }] : []),
        ],
      },
      select: {
        username: true,
        email: true,
        phone: true,
        student_id: true,
      },
    });

    if (existingUser) {
      let errorMessage = "ข้อมูลซ้ำในระบบ: ";
      if (existingUser.username === username) errorMessage += "ชื่อผู้ใช้";
      else if (existingUser.email.toLowerCase() === email.toLowerCase()) errorMessage += "อีเมล";
      else if (existingUser.phone && existingUser.phone === phone) errorMessage += "เบอร์โทรศัพท์";
      else if (existingUser.student_id && existingUser.student_id === student_id) errorMessage += "รหัสนิสิต";

      return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
    }

    // รหัสผ่าน: ฝั่งหน้าเว็บส่ง hash มาแล้ว
    const password_hash: string = password;

    // ---------- Transaction ----------
    const result = await prisma.$transaction(async (tx) => {
      // 1) users (ยังไม่ใส่ address_id)
      const newUser = await tx.users.create({
        data: {
          username,
          password_hash, // ใช้ตัวแปรเดียว
          email,
          phone,
          title_th: title_th || null,
          title_en: title_en || null,
          first_name,
          last_name,
          nickname: nickname || null,
          gender: (gender ?? null) as any,
          dob: dob ? new Date(dob) : null,
          role: role as any,
          student_id: role === "student" ? student_id : null,
          staff_id: role === "staff" ? `STAFF_${Date.now()}` : null,
          national_id: national_id || null,
          status: "active",
        },
        select: {
          user_id: true,
          username: true,
          email: true,
          first_name: true,
          last_name: true,
          role: true,
        },
      });

      // 2) addresses (ถ้ามีข้อมูล)
      let addressId: bigint | null = null;

      if (house_number || street || subdistrict || district || province || postal_code) {
        const createdAddress = await tx.addresses.create({
          data: {
            user_id: newUser.user_id,
            house_number: house_number || null,
            street: street || null,
            subdistrict: subdistrict || null,
            district: district || null,
            province: province || null,
            postal_code: postal_code && /^\d{5}$/.test(postal_code) ? postal_code : null,
            country,
            is_primary: true,
          },
          select: { id: true },
        });

        addressId = createdAddress.id;

        // 3) อัปเดต users.address_id
        await tx.users.update({
          where: { user_id: newUser.user_id },
          data: { address_id: addressId },
        });
      } else {
        // ลองหา primary ที่มีอยู่ (เผื่อกรณีพิเศษ)
        const primaryAddress = await tx.addresses.findFirst({
          where: { user_id: newUser.user_id, is_primary: true },
          select: { id: true },
          orderBy: { id: "asc" },
        });

        if (primaryAddress) {
          addressId = primaryAddress.id;
          await tx.users.update({
            where: { user_id: newUser.user_id },
            data: { address_id: addressId },
          });
        }
      }

      // 4) profile ตาม role
      if (role === "student") {
        await tx.student_profile.create({
          data: {
            user_id: newUser.user_id,
            student_id: student_id!,
            national_id: national_id || null,
            faculty_id: BigInt(faculty_id),
            department_id: BigInt(department_id),
            level_of_study: level_of_study as any,
            student_status: "enrolled",
          },
        });
      } else if (role === "staff") {
        await tx.staff_profile.create({
          data: {
            user_id: newUser.user_id,
            national_id: national_id || null,
            office_department: office_department || null,
            position: position || null,
            staff_type: staff_type as any,
            unit_id: unit_id ? BigInt(unit_id) : null,
          },
        });
      }

      // 5) auth log
      await tx.auth_log.create({
        data: {
          user_id: newUser.user_id,
          username_input: newUser.username,
          action: "login_success",
          ip: "unknown",
          user_agent: "unknown",
        },
      });

      return { newUser, addressId };
    });

    const { newUser, addressId } = result;

    return NextResponse.json({
      success: true,
      message: "สมัครสมาชิกสำเร็จ",
      user: {
        id: newUser.user_id.toString(),
        username: newUser.username,
        email: newUser.email,
        name: `${newUser.first_name} ${newUser.last_name}`,
        role: newUser.role,
        address_id: addressId ? addressId.toString() : null,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    let errorMessage = "เกิดข้อผิดพลาดในการสมัครสมาชิก";
    if (error instanceof Error) {
      const msg = error.message || "";
      if (msg.includes("chk_postal_th")) {
        errorMessage = "รหัสไปรษณีย์ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง";
      } else if (msg.includes("Duplicate entry")) {
        errorMessage = "ข้อมูลซ้ำในระบบ กรุณาตรวจสอบชื่อผู้ใช้ อีเมล หรือเบอร์โทรศัพท์";
      } else if (msg.includes("foreign key constraint")) {
        errorMessage = "ข้อมูลอ้างอิงไม่ถูกต้อง กรุณาตรวจสอบคณะ สาขา หรือหน่วยงาน";
      } else if (msg.includes("check constraint")) {
        errorMessage = "ข้อมูลไม่ตรงตามรูปแบบที่กำหนด กรุณาตรวจสอบอีกครั้ง";
      } else if (msg.includes("P2000")) {
        errorMessage = "ข้อมูลบางฟิลด์ยาวเกินกำหนด กรุณาตรวจสอบอีกครั้ง";
      }
    }

    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
