import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { withMiddleware } from "@/lib/api-middleware";
import { decryptData } from "@/lib/encryption";
import { users_role, users_status, auth_log_action, student_profile_level_of_study, staff_profile_staff_type } from "@prisma/client";
import {
    CustomApiError,
    ERROR_CODES,
    HTTP_STATUS,
    validateRequired,
    validateEmail,
    validatePostalCode,
    validatePhone,
    successResponse,
    withErrorHandler,
} from "@/lib/error-handler";

//  Whitelist roles ที่สมัครได้จาก public
const ALLOWED_REGISTRATION_ROLES = ['student', 'demonstration_student', 'staff', 'guest'] as const;
type AllowedRole = typeof ALLOWED_REGISTRATION_ROLES[number];

async function registerHandler(req: NextRequest) {
    const body = await req.json();

    // ---- รองรับ prefix หลายรูปแบบ ----
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
        username,
        password,
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

    //  Validate required fields ก่อน decrypt เสมอ
    validateRequired(body, ['username', 'password', 'email', 'first_name', 'last_name', 'role']);
    validateEmail(email);

    if (postal_code) validatePostalCode(postal_code);
    if (phone) validatePhone(phone);

    // ---- Decrypt role ----
    let role: string;
    try {
        role = decryptData(encryptedRole);
    } catch {
        throw new CustomApiError(
            ERROR_CODES.VALIDATION_ERROR,
            "ข้อมูล role ไม่ถูกต้อง",
            HTTP_STATUS.BAD_REQUEST,
            { field: "role" }
        );
    }

    //  ตรวจ role whitelist — ป้องกัน privilege escalation
    if (!ALLOWED_REGISTRATION_ROLES.includes(role as AllowedRole)) {
        throw new CustomApiError(
            ERROR_CODES.FORBIDDEN,
            "ไม่สามารถสมัครสมาชิกด้วย role นี้ได้",
            HTTP_STATUS.FORBIDDEN,
            { field: "role" }
        );
    }

    // ---- Validate required fields ตาม role ----
    if (role === "student" || role === "demonstration_student") {
        validateRequired(body, ['student_id', 'faculty_id', 'department_id', 'level_of_study', 'national_id']);
    }

    if (role === "staff") {
        validateRequired(body, ['national_id', 'staff_type']);
        // unit_id is optional
    }

    if (role === "guest") {
        validateRequired(body, ['national_id']);
    }

    // ---- Decrypt national_id ถ้ามี ----
    let decryptedNationalId: string | null = null;
    if (national_id) {
        try {
            decryptedNationalId = decryptData(national_id);
        } catch {
            throw new CustomApiError(
                ERROR_CODES.VALIDATION_ERROR,
                "ข้อมูลเลขบัตรประชาชนไม่ถูกต้อง",
                HTTP_STATUS.BAD_REQUEST,
                { field: "national_id" }
            );
        }
    }

    // ---- Password policy ----
    if (password.length < 12) {
        throw new CustomApiError(
            ERROR_CODES.VALIDATION_ERROR,
            "รหัสผ่านต้องมีความยาวอย่างน้อย 12 ตัวอักษร",
            HTTP_STATUS.BAD_REQUEST,
            { field: "password" }
        );
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(password)) {
        throw new CustomApiError(
            ERROR_CODES.VALIDATION_ERROR,
            "รหัสผ่านต้องประกอบด้วยตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก ตัวเลข และอักขระพิเศษ (@$!%*?&)",
            HTTP_STATUS.BAD_REQUEST,
            { field: "password" }
        );
    }

    // ---- ตรวจซ้ำ ----
    // ---- ตรวจซ้ำ basic fields ----
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
            national_id: true,
        },
    });

    // ---- ตรวจ student_id ซ้ำแยกต่างหาก ----
    // Note: ใช้ (prisma as any) เพราะไทป์อาจจะยังไม่อัพเดท
    const existingStudentId = student_id
        ? await prisma.student_profile.findUnique({ where: { student_id }, select: { student_id: true } })
        ?? await (prisma as any).demonstration_student.findUnique({ where: { student_id }, select: { student_id: true } })
        : null;

    if (existingUser || existingStudentId) {
        let duplicateField = "";
        if (existingUser?.username === username) duplicateField = "ชื่อผู้ใช้";
        else if (existingUser && existingUser.email.toLowerCase() === email.toLowerCase()) duplicateField = "อีเมล";
        else if (existingUser?.phone && existingUser.phone === phone) duplicateField = "เบอร์โทรศัพท์";
        else if (existingUser?.national_id && existingUser.national_id === decryptedNationalId) duplicateField = "เลขบัตรประชาชน";
        else if (existingStudentId) duplicateField = "รหัสนิสิต";

        throw new CustomApiError(
            ERROR_CODES.DUPLICATE_ENTRY,
            `ข้อมูลซ้ำในระบบ: ${duplicateField}`,
            HTTP_STATUS.CONFLICT,
            { duplicateField }
        );
    }

    // Use the password directly because the client (RegisterContainer) already hashes it
    const password_hash = password;

    // ---- Transaction ----
    const { newUser } = await prisma.$transaction(async (tx) => {
        const newUser = await tx.users.create({
            data: {
                username,
                password_hash,
                email,
                phone,
                title_th,
                title_en,
                first_name,
                last_name,
                role: role as users_role,
                student_id: (role === "student" || role === "demonstration_student") ? student_id : null,
                staff_id: role === "staff" ? `STAFF_${Date.now()}` : null,
                national_id: decryptedNationalId,
                status: "active" as users_status,
            },
            select: {
                user_id: true,
                username: true,
                email: true,
                first_name: true,
                last_name: true,
            },
        });

        // Profile ตาม role
        if (role === "student") {
            await tx.student_profile.create({
                data: {
                    user_id: newUser.user_id,
                    student_id,
                    national_id: decryptedNationalId,
                    faculty_id: BigInt(faculty_id),
                    department_id: BigInt(department_id),
                    level_of_study: level_of_study as student_profile_level_of_study,
                },
            });
        } else if (role === "demonstration_student") {
            // @ts-ignore - Bypass stale types until prisma generate succeeds
            await (tx as any).demonstration_student.create({
                data: {
                    user_id: newUser.user_id,
                    student_id,
                    national_id: decryptedNationalId,
                    faculty_id: BigInt(faculty_id),
                    department_id: BigInt(department_id),
                    level_of_study: level_of_study as any,
                },
            });
        } else if (role === "staff") {
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
                    staff_type: staff_type as staff_profile_staff_type,
                    unit_id: unit_id ? BigInt(unit_id) : null,
                },
            });
        }

        // บันทึก auth_log หลังจากสมัครสมาชิกสำเร็จ (ใช้ login_success เพราะ enum ไม่มี register)
        await tx.auth_log.create({
            data: {
                user_id: newUser.user_id,
                username_input: newUser.username,
                action: auth_log_action.login_success,
                ip: "registration",
                user_agent: req.headers.get('user-agent') || "unknown",
            },
        });

        return { newUser };
    });

    return successResponse(
        { name: `${newUser.first_name} ${newUser.last_name}` },
        "สมัครสมาชิกสำเร็จ"
    );
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
