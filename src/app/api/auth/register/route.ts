// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import {
  withErrorHandler,
  validateRequired,
  validateEmail,
  validatePhone,
  validatePostalCode,
  validateStudentId,
  CustomApiError,
  ERROR_CODES,
  HTTP_STATUS,
  successResponse
} from "@/lib/error-handler";
import { withMiddleware } from "@/lib/api-middleware";

const prisma = new PrismaClient();

async function registerHandler(req: NextRequest) {
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
  validateRequired(body, ['username', 'password', 'email', 'first_name', 'last_name', 'role']);

  // Validate email format
  validateEmail(email);

  // เงื่อนไขเฉพาะ role
  if (role === "student") {
    validateRequired(body, ['student_id', 'faculty_id', 'department_id', 'level_of_study']);
    validateStudentId(student_id);
  }

  if (role === "staff") {
    validateRequired(body, ['national_id', 'staff_type']);
  }

  if (role === "guest") {
    validateRequired(body, ['national_id']);
  }

  // Admin และ SuperAdmin ไม่ต้องมี national_id
  if (role === "admin" || role === "super_admin") {
    // ไม่ต้อง validate national_id
  } else {
    // ผู้ใช้อื่นต้องมี national_id
    validateRequired(body, ['national_id']);
  }

  // Validate formats
  if (postal_code) {
    validatePostalCode(postal_code);
  }

  if (phone) {
    validatePhone(phone);
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
        // ตรวจสอบ national_id เฉพาะผู้ใช้ที่ไม่ใช่ admin
        ...(role !== "admin" && role !== "super_admin" && national_id ? [{ national_id }] : []),
      ],
    },
    select: {
      username: true,
      email: true,
      phone: true,
      student_id: true,
      national_id: true,
    },
  });

  if (existingUser) {
    let duplicateField = "";
    if (existingUser.username === username) duplicateField = "ชื่อผู้ใช้";
    else if (existingUser.email.toLowerCase() === email.toLowerCase()) duplicateField = "อีเมล";
    else if (existingUser.phone && existingUser.phone === phone) duplicateField = "เบอร์โทรศัพท์";
    else if (existingUser.student_id && existingUser.student_id === student_id) duplicateField = "รหัสนิสิต";
    else if (existingUser.national_id && existingUser.national_id === national_id) duplicateField = "เลขบัตรประชาชน";

    throw new CustomApiError(
      ERROR_CODES.DUPLICATE_ENTRY,
      `ข้อมูลซ้ำในระบบ: ${duplicateField}`,
      HTTP_STATUS.CONFLICT,
      { duplicateField }
    );
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
        role: role as any,
        student_id: role === "student" ? student_id : null,
        staff_id: role === "staff" ? `STAFF_${Date.now()}` : null,
        national_id: national_id || null,
        status: "active" as any,
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

    // 2) ข้าม addresses เนื่องจากไม่มี table นี้ใน schema
    let addressId: bigint | null = null;

    // 3) profile ตาม role
    if (role === "student") {
      await tx.student_profile.create({
        data: {
          user_id: newUser.user_id,
          student_id: student_id!,
          national_id: national_id || null,
          faculty_id: BigInt(faculty_id),
          department_id: BigInt(department_id),
          level_of_study: level_of_study as any,
          student_status: "enrolled" as any,
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

    // 4) auth log
    await tx.auth_log.create({
      data: {
        user_id: newUser.user_id,
        username_input: newUser.username,
        action: "login_success" as any,
        ip: "unknown",
        user_agent: "unknown",
      },
    });

    return { newUser, addressId };
  });

  const { newUser, addressId } = result;

  return successResponse({
    id: newUser.user_id.toString(),
    username: newUser.username,
    email: newUser.email,
    name: `${newUser.first_name} ${newUser.last_name}`,
    role: newUser.role,
    address_id: null,
  }, "สมัครสมาชิกสำเร็จ");
}

export const POST = withMiddleware(
  withErrorHandler(registerHandler),
  {
    methods: ['POST'],
    rateLimit: 'auth',
    requireContentType: 'application/json',
    maxBodySize: 10 * 1024, // 10KB
  }
);
