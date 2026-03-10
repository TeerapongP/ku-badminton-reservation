import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

// ===== Performance Constants =====
const BCRYPT_SALT_ROUNDS = 10;
const HASH_CONCURRENCY = 50;

/**
 * Hash passwords ในรูปแบบ parallel batches
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

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const updateExisting = formData.get('updateExisting') === 'true';

        if (!file) {
            return NextResponse.json({ success: false, error: 'ไม่พบไฟล์' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        // Fix: Use Uint8Array to create Buffer and cast to any to resolve type mismatch in newer Node versions
        const buffer = Buffer.from(new Uint8Array(bytes)) as any;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.worksheets[0];

        if (!worksheet) {
            return NextResponse.json({ success: false, error: 'ไม่พบ worksheet ในไฟล์' }, { status: 400 });
        }

        const data: any[] = [];
        const headers: string[] = [];

        worksheet.getRow(1).eachCell((cell, colNumber) => {
            headers[colNumber] = cellValueToString(cell.value);
        });

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            const rowData: any = {};
            row.eachCell((cell, colNumber) => {
                const header = headers[colNumber];
                if (header) {
                    rowData[header] = cellValueToString(cell.value);
                }
            });
            data.push(rowData);
        });

        if (data.length === 0) {
            return NextResponse.json({ success: false, error: 'ไฟล์ว่างเปล่า' }, { status: 400 });
        }

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

        const students: StudentRow[] = data.map((row: any) => {
            const studentId = String(row[requiredColumns.studentId] || '').trim();
            let email = String(row[requiredColumns.email] || '').trim();
            if (!email || !email.includes('@')) {
                email = studentId ? `${studentId}@ku.th` : '';
            }
            let phone = String(row[requiredColumns.phone] || '').trim().replace(/[\s-]/g, '');
            if (!/^0\d{9}$/.test(phone)) phone = '';

            return {
                studentId,
                titleTh: String(row[requiredColumns.titleTh] || '').trim(),
                firstName: String(row[requiredColumns.firstNameTh] || '').trim(),
                lastName: String(row[requiredColumns.lastNameTh] || '').trim(),
                email,
                phone,
                faculty: String(row[requiredColumns.faculty] || '').trim(),
                department: String(row[requiredColumns.department] || '').trim(),
            };
        });

        const validStudents = students.filter((s) => {
            const isValidId = /^\d{8,10}$/.test(s.studentId);
            const hasName = s.firstName && s.lastName;
            return isValidId && hasName;
        });

        if (validStudents.length === 0) {
            return NextResponse.json({ success: false, error: 'ไม่พบข้อมูลที่ถูกต้อง' }, { status: 400 });
        }

        // Hash passwords
        const hashedPasswords = await hashPasswordsBatch(validStudents.map(s => s.studentId));

        let createdCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;
        const errors: string[] = [];

        // Caches for optimization
        const facultyCache = new Map<string, bigint>();
        const departmentCache = new Map<string, bigint>();

        for (let i = 0; i < validStudents.length; i++) {
            const s = validStudents[i];
            const hashedPassword = hashedPasswords[i];

            try {
                const existingUser = await prisma.users.findUnique({
                    where: { username: s.studentId },
                    include: { student_profile: true }
                });

                if (existingUser && !updateExisting) {
                    skippedCount++;
                    continue;
                }

                await prisma.$transaction(async (tx) => {
                    // 1. Resolve Faculty
                    let facultyId: bigint | undefined;
                    if (s.faculty) {
                        if (facultyCache.has(s.faculty)) {
                            facultyId = facultyCache.get(s.faculty)!;
                        } else {
                            const faculty = await tx.faculties.upsert({
                                where: { faculty_name_th: s.faculty },
                                update: {},
                                create: { faculty_name_th: s.faculty, status: 'active' }
                            });
                            facultyId = faculty.id;
                            facultyCache.set(s.faculty, facultyId);
                        }
                    }

                    // 2. Resolve Department
                    let departmentId: bigint | undefined;
                    if (s.department && facultyId) {
                        const deptKey = `${facultyId}-${s.department}`;
                        if (departmentCache.has(deptKey)) {
                            departmentId = departmentCache.get(deptKey)!;
                        } else {
                            const department = await tx.departments.upsert({
                                where: {
                                    faculty_id_department_name_th: {
                                        faculty_id: facultyId,
                                        department_name_th: s.department
                                    }
                                },
                                update: {},
                                create: { faculty_id: facultyId, department_name_th: s.department }
                            });
                            departmentId = department.id;
                            departmentCache.set(deptKey, departmentId);
                        }
                    }

                    // 3. Upsert User
                    const userData = {
                        username: s.studentId,
                        password_hash: hashedPassword,
                        role: 'student' as any,
                        student_id: s.studentId,
                        title_th: s.titleTh || null,
                        first_name: s.firstName,
                        last_name: s.lastName,
                        phone: s.phone || null,
                        email: s.email,
                        email_lc: s.email.toLowerCase(),
                        status: 'active' as any,
                        membership: 'member' as any,
                    };

                    const user = await tx.users.upsert({
                        where: { username: s.studentId },
                        update: updateExisting ? {
                            title_th: userData.title_th,
                            first_name: userData.first_name,
                            last_name: userData.last_name,
                            phone: userData.phone,
                            email: userData.email,
                            email_lc: userData.email_lc,
                            updated_at: new Date()
                        } : {},
                        create: {
                            ...userData,
                            registered_at: new Date()
                        }
                    });

                    // 4. Upsert Student Profile
                    if (facultyId && departmentId) {
                        await tx.student_profile.upsert({
                            where: { user_id: user.user_id },
                            update: updateExisting ? {
                                student_id: s.studentId,
                                faculty_id: facultyId,
                                department_id: departmentId,
                                updated_at: new Date()
                            } : {},
                            create: {
                                user_id: user.user_id,
                                student_id: s.studentId,
                                faculty_id: facultyId,
                                department_id: departmentId,
                                level_of_study: 'UG',
                                student_status: 'enrolled'
                            }
                        });
                    }
                });

                if (existingUser) updatedCount++;
                else createdCount++;

            } catch (err: any) {
                errors.push(`Student ${s.studentId}: ${err.message}`);
            }
        }

        return NextResponse.json({
            success: true,
            created: createdCount,
            updated: updatedCount,
            skipped: skippedCount,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error: any) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'เกิดข้อผิดพลาดในการอัพโหลด' },
            { status: 500 }
        );
    }
}
