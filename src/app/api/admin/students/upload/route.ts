import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// ===== Performance Constants =====
const BCRYPT_SALT_ROUNDS = 10;
const HASH_CONCURRENCY = 50;
const UPSERT_BATCH_SIZE = 500;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any;

/**
 * Hash passwords แบบ parallel batches
 * ทำพร้อมกันครั้งละ HASH_CONCURRENCY ตัว เพื่อไม่ให้ block event loop
 */
async function hashPasswordsBatch(passwords: string[]): Promise<string[]> {
    const results: string[] = new Array(passwords.length);

    for (let i = 0; i < passwords.length; i += HASH_CONCURRENCY) {
        const chunk = passwords.slice(i, i + HASH_CONCURRENCY);
        const hashed = await Promise.all(
            chunk.map(pw => bcrypt.hash(pw, BCRYPT_SALT_ROUNDS))
        );
        for (let j = 0; j < hashed.length; j++) {
            results[i + j] = hashed[j];
        }
    }

    return results;
}

/** Helper: safely convert ExcelJS cell value to string */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cellValueToString(value: any): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (value && typeof value === 'object' && 'text' in value) {
        return String(value.text);
    }
    return String(value);
}

interface StudentRow {
    studentId: string;
    titleTh: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    faculty: string;
    department: string;
}

/**
 * Bulk upsert ด้วย raw SQL: INSERT ... ON DUPLICATE KEY UPDATE
 * เร็วกว่า Prisma createMany + update loop มาก เพราะเป็น SQL statement เดียว
 * 
 * - ถ้า student_id ยังไม่มี → INSERT record ใหม่
 * - ถ้า student_id มีแล้ว + updateExisting=true → UPDATE fields ที่ระบุ
 * - ถ้า student_id มีแล้ว + updateExisting=false → ข้ามไป (ไม่ทำอะไร)
 */
async function bulkUpsertStudents(
    students: StudentRow[],
    hashedPasswords: string[],
    updateExisting: boolean
): Promise<{ totalAffected: number; errors: string[] }> {
    const errors: string[] = [];
    let totalAffected = 0;

    for (let i = 0; i < students.length; i += UPSERT_BATCH_SIZE) {
        const chunk = students.slice(i, i + UPSERT_BATCH_SIZE);
        const chunkPasswords = hashedPasswords.slice(i, i + UPSERT_BATCH_SIZE);

        // สร้าง VALUES list
        const values: AnyRow[] = [];
        const placeholders: string[] = [];

        for (let j = 0; j < chunk.length; j++) {
            const s = chunk[j];
            const emailVal = s.email || `${s.studentId}@ku.th`;
            const emailLc = emailVal.toLowerCase();
            const now = new Date();

            placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            values.push(
                s.studentId,            // username
                chunkPasswords[j],      // password_hash
                'student',              // role
                s.studentId,            // student_id
                s.titleTh || null,      // title_th
                s.firstName,            // first_name
                s.lastName,             // last_name
                s.phone || null,        // phone
                emailVal,               // email
                emailLc,                // email_lc
                'active',               // status
                now,                    // registered_at
            );
        }

        // ON DUPLICATE KEY UPDATE:
        // - ถ้า updateExisting=true → อัปเดต title, ชื่อ, นามสกุล
        //   phone ใช้ IFNULL(VALUES(phone), phone) เพื่อไม่ให้เขียนทับ phone ที่มีอยู่แล้วด้วย null
        // - ถ้า updateExisting=false → อัปเดตแค่ username=username (no-op) เพื่อข้ามไป
        let onDuplicateClause: string;
        if (updateExisting) {
            onDuplicateClause = `
                title_th = VALUES(title_th),
                first_name = VALUES(first_name),
                last_name = VALUES(last_name),
                phone = COALESCE(VALUES(phone), phone),
                updated_at = NOW()
            `;
        } else {
            // No-op: ไม่อัปเดตอะไรเลย ใช้ trick ให้ student_id = student_id
            onDuplicateClause = `student_id = student_id`;
        }

        const sql = `
            INSERT INTO users (
                username, password_hash, role, student_id,
                title_th, first_name, last_name, phone,
                email, email_lc, status, registered_at
            )
            VALUES ${placeholders.join(', ')}
            ON DUPLICATE KEY UPDATE ${onDuplicateClause}
        `;

        try {
            const result = await prisma.$executeRawUnsafe(sql, ...values);
            totalAffected += result;
        } catch (error: AnyRow) {
            errors.push(`Batch ${Math.floor(i / UPSERT_BATCH_SIZE) + 1}: ${error.message}`);
        }
    }

    return { totalAffected, errors };
}

export async function POST(request: NextRequest) {
    try {
        // รับไฟล์จาก FormData
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const updateExisting = formData.get('updateExisting') === 'true';

        if (!file) {
            return NextResponse.json(
                { success: false, error: 'ไม่พบไฟล์' },
                { status: 400 }
            );
        }

        // อ่านไฟล์ Excel
        const bytes = await file.arrayBuffer();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const buffer = Buffer.from(bytes) as any;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.worksheets[0];

        if (!worksheet) {
            return NextResponse.json(
                { success: false, error: 'ไม่พบ worksheet ในไฟล์' },
                { status: 400 }
            );
        }

        // แปลง worksheet เป็น array of objects
        const data: AnyRow[] = [];
        const headers: string[] = [];

        // อ่าน header row (row 1)
        worksheet.getRow(1).eachCell((cell, colNumber) => {
            headers[colNumber] = cellValueToString(cell.value);
        });

        // อ่านข้อมูล rows (เริ่มจาก row 2)
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;

            const rowData: AnyRow = {};
            row.eachCell((cell, colNumber) => {
                const header = headers[colNumber];
                if (header) {
                    rowData[header] = cellValueToString(cell.value);
                }
            });
            data.push(rowData);
        });

        if (data.length === 0) {
            return NextResponse.json(
                { success: false, error: 'ไฟล์ว่างเปล่า' },
                { status: 400 }
            );
        }

        // กำหนด column names
        const requiredColumns = {
            studentId: 'รหัสนิสิต',
            titleTh: 'คำนำหน้าชื่อ(ไทย)',
            firstNameTh: 'ชื่อ(ไทย)',
            lastNameTh: 'นามสกุล(ไทย)',
            email: 'E-mail',
            phone: 'โทรศัพท์มือถือ',
            faculty: 'คณะ/หน่วยงานที่เทียบเท่า',
            department: 'ชื่อภาควิชา',
        };

        // แปลงข้อมูล
        const students: StudentRow[] = data.map((row: AnyRow) => {
            const studentId = String(row[requiredColumns.studentId] || '').trim();
            const titleTh = String(row[requiredColumns.titleTh] || '').trim();
            const firstNameTh = String(row[requiredColumns.firstNameTh] || '').trim();
            const lastNameTh = String(row[requiredColumns.lastNameTh] || '').trim();

            let email = String(row[requiredColumns.email] || '').trim();
            if (!email || !email.includes('@')) {
                email = studentId ? `${studentId}@ku.th` : '';
            }

            let phone = String(row[requiredColumns.phone] || '').trim();
            phone = phone.replace(/[\s-]/g, '');
            if (!/^0\d{9}$/.test(phone)) {
                phone = '';
            }

            return {
                studentId,
                titleTh,
                firstName: firstNameTh,
                lastName: lastNameTh,
                email,
                phone,
                faculty: String(row[requiredColumns.faculty] || '').trim(),
                department: String(row[requiredColumns.department] || '').trim(),
            };
        });

        // กรองข้อมูลที่ถูกต้อง
        const validStudents = students.filter((s) => {
            const isValidId = /^\d{8,10}$/.test(s.studentId);
            const hasName = s.firstName && s.lastName;
            return isValidId && hasName;
        });

        if (validStudents.length === 0) {
            return NextResponse.json(
                { success: false, error: 'ไม่พบข้อมูลที่ถูกต้อง' },
                { status: 400 }
            );
        }

        // ===== Hash รหัสผ่านทั้งหมดแบบ parallel =====
        const passwords = validStudents.map((s) => s.studentId);
        const hashedPasswords = await hashPasswordsBatch(passwords);

        // ===== นับจำนวนที่มีอยู่แล้ว (สำหรับ response statistics) =====
        const existingCount = await prisma.users.count({
            where: {
                student_id: { in: validStudents.map((s) => s.studentId) }
            }
        });

        const newCount = validStudents.length - existingCount;

        // ===== Bulk UPSERT ด้วย INSERT ... ON DUPLICATE KEY UPDATE =====
        // ทำทั้ง insert + update ใน SQL เดียว ไม่ต้องแยก logic
        const { totalAffected, errors } = await bulkUpsertStudents(
            validStudents,
            hashedPasswords,
            updateExisting
        );

        // MySQL ON DUPLICATE KEY UPDATE:
        //   - INSERT ใหม่ = affected 1
        //   - UPDATE (เปลี่ยนค่าจริง) = affected 2
        //   - UPDATE (ค่าเหมือนเดิม) = affected 0
        // ดังนั้นเราใช้ count ที่นับก่อนแทน
        const totalCreated = newCount;
        const totalUpdated = updateExisting ? existingCount : 0;
        const totalSkipped = updateExisting ? 0 : existingCount;

        return NextResponse.json({
            success: true,
            created: totalCreated,
            updated: totalUpdated,
            skipped: totalSkipped,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error: AnyRow) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'เกิดข้อผิดพลาดในการอัพโหลด' },
            { status: 500 }
        );
    }
}
