// src/app/api/auth/register/route.ts
import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { withMiddleware } from "@/lib/api-middleware";
import { decryptData } from "@/lib/encryption";
import { CustomApiError, ERROR_CODES, HTTP_STATUS, validateRequired, validateEmail, validatePostalCode, validatePhone, successResponse, withErrorHandler } from "@/lib/error-handler";


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
    role: encryptedRole,

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
    postal_code,
  } = body;

  // ---------- ถอดรหัส role และ national_id ----------
  let role: string;
  let decryptedNationalId: string | null = null;
  
  try {
    role = decryptData(encryptedRole);
  } catch (error) {
    throw new CustomApiError(
      ERROR_CODES.VALIDATION_ERROR,
      "ข้อมูล role ไม่ถูกต้อง",
      HTTP_STATUS.BAD_REQUEST,
      { field: "role" }
    );
  }

  // Whitelist allowed registration roles - prevent privilege escalation
  // [SECURITY FIX] - Remove demonstration_student from public registration
  const ALLOWED_REGISTRATION_ROLES = ['student', 'staff', 'guest'];
  if (!ALLOWED_REGISTRATION_ROLES.includes(role)) {
    throw new CustomApiError(
      ERROR_CODES.FORBIDDEN,
      'ไม่สามารถสมัครสมาชิกด้วย role นี้ได้',
      HTTP_STATUS.FORBIDDEN,
      { field: "role" }
    );
  }

  // ถอดรหัส national_id ถ้ามี
  if (national_id) {
    try {
      decryptedNationalId = decryptData(national_id);
    } catch (error) {
      throw new CustomApiError(
        ERROR_CODES.VALIDATION_ERROR,
        "ข้อมูลเลขบัตรประชาชนไม่ถูกต้อง",
        HTTP_STATUS.BAD_REQUEST,
        { field: "national_id" }
      );
    }
  }

  // ---------- Validate เบื้องต้น ----------
  validateRequired(body, ['username', 'password', 'email', 'first_name', 'last_name', 'role', 'national_id']);

  // Validate email format
  validateEmail(email);

  // เงื่อนไขเฉพาะ role
  if (role === "demonstration_student") {
    validateRequired(body, ['student_id', 'faculty_id', 'department_id', 'level_of_study', 'national_id']);
  }

  if (role === "staff") {
    validateRequired(body, ['national_id', 'staff_type']);
  }

  if (role === "guest") {
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
        ...(decryptedNationalId ? [{ national_id: decryptedNationalId }] : []),
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
    else if (existingUser.national_id && existingUser.national_id === decryptedNationalId)
      duplicateField = "เลขบัตรประชาชน";

    throw new CustomApiError(
      ERROR_CODES.DUPLICATE_ENTRY,
      `ข้อมูลซ้ำในระบบ: ${duplicateField}`,
      HTTP_STATUS.CONFLICT,
      { duplicateField }
    );
  }

  // [SECURITY FIX] - Enforce strong password policy (12+ chars, complexity)
  if (password.length < 12) {
    throw new CustomApiError(
      ERROR_CODES.VALIDATION_ERROR,
      'รหัสผ่านต้องมีความยาวอย่างน้อย 12 ตัวอักษร',
      HTTP_STATUS.BAD_REQUEST,
      { field: "password" }
    );
  }

  // Require uppercase, lowercase, number, and special character
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(password)) {
    throw new CustomApiError(
      ERROR_CODES.VALIDATION_ERROR,
      'รหัสผ่านต้องประกอบด้วยตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก ตัวเลข และอักขระพิเศษ (@$!%*?&)',
      HTTP_STATUS.BAD_REQUEST,
      { field: "password" }
    );
  }

  // [SECURITY FIX] - Always hash passwords server-side with strong rounds
  const bcrypt = require('bcryptjs');
  const password_hash = await bcrypt.hash(password, 14); // Increased from 12 to 14 rounds

  // ---------- Transaction ----------
  const result = await prisma.$transaction(async (tx) => {
    // 1) users (บันทึก national_id ที่ถอดรหัสแล้ว)
    const newUser = await tx.users.create({
      data: {
        username,
        password_hash,
        email,
        phone,
        title_th: title_th,
        title_en: title_en,
        first_name,
        last_name,
        role: role as any,
        staff_id: role === "staff" ? `STAFF_${Date.now()}` : null,
        national_id: decryptedNationalId,
        status: "active" as any,
      },
      select: {
        user_id: true,
        username: true,
        email: true,
        first_name: true,
        last_name: true,
      },
    });

    // 2) profile ตาม role
    if (role === "student" || role === "demonstration_student") {
      await tx.student_profile.create({
        data: {
          user_id: newUser.user_id,
          student_id: student_id,
          national_id: decryptedNationalId,
          faculty_id: BigInt(faculty_id),
          department_id: BigInt(department_id),
          level_of_study: level_of_study as any,
        },
      });
    } else if (role === "staff") {
      // staff_profile.national_id เป็น required และรองรับแค่ VARCHAR(20)
      if (!decryptedNationalId) {
        throw new CustomApiError(
          ERROR_CODES.VALIDATION_ERROR,
          "กรุณากรอกเลขบัตรประชาชน",
          HTTP_STATUS.BAD_REQUEST,
          { field: "national_id" }
        );
      }
      
      await tx.staff_profile.create({
        data: {
          user_id: newUser.user_id,
          national_id: decryptedNationalId.substring(0, 20),
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

    return { newUser };
  });

  const { newUser } = result;

  return successResponse({
    // id: newUser.user_id.toString(),
    name: `${newUser.first_name} ${newUser.last_name}`,
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
