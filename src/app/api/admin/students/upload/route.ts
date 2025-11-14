import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import * as XLSX from 'xlsx';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

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
        const buffer = Buffer.from(bytes);
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

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
        const students = data.map((row: any) => {
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
        const validStudents = students.filter((s: any) => {
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

        // ดึงรายการนิสิตที่มีอยู่แล้ว
        const existingStudentIds = await prisma.users.findMany({
            where: {
                student_id: {
                    in: validStudents.map((s: any) => s.studentId)
                }
            },
            select: {
                student_id: true
            }
        });

        const existingIds = new Set(existingStudentIds.map((u: { student_id: string | null }) => u.student_id));
        const newStudents = validStudents.filter((s: any) => !existingIds.has(s.studentId));
        const existingStudents = validStudents.filter((s: any) => existingIds.has(s.studentId));

        let totalCreated = 0;
        let totalUpdated = 0;
        const errors: string[] = [];

        // อัปเดตข้อมูลเดิม
        if (updateExisting && existingStudents.length > 0) {
            for (const student of existingStudents) {
                try {
                    const phoneExists = student.phone ? await prisma.users.findFirst({
                        where: {
                            phone: student.phone,
                            student_id: { not: student.studentId }
                        }
                    }) : null;

                    await prisma.users.update({
                        where: { student_id: student.studentId },
                        data: {
                            title_th: student.titleTh || null,
                            first_name: student.firstName,
                            last_name: student.lastName,
                            ...(student.phone && !phoneExists ? { phone: student.phone } : {}),
                            updated_at: new Date(),
                        }
                    });
                    totalUpdated++;
                } catch (error: any) {
                    errors.push(`ไม่สามารถอัปเดตนิสิต ${student.studentId}: ${error.message}`);
                }
            }
        }

        // สร้างผู้ใช้ใหม่
        if (newStudents.length > 0) {
            const batchSize = 100;
            const usersData = [];

            for (let i = 0; i < newStudents.length; i += batchSize) {
                const chunk = newStudents.slice(i, i + batchSize);
                
                const chunkData = await Promise.all(
                    chunk.map(async (student: any) => {
                        const hashedPassword = await bcrypt.hash(student.studentId, 10);
                        return {
                            username: student.studentId,
                            password_hash: hashedPassword,
                            role: 'student' as const,
                            student_id: student.studentId,
                            title_th: student.titleTh || null,
                            first_name: student.firstName,
                            last_name: student.lastName,
                            phone: student.phone || null,
                            email: student.email || `${student.studentId}@ku.th`,
                            email_lc: (student.email || `${student.studentId}@ku.th`).toLowerCase(),
                            status: 'active' as const,
                            membership: 'member' as const,
                            registered_at: new Date(),
                        };
                    })
                );
                
                usersData.push(...chunkData);
            }

            // Insert แบบ batch
            for (let i = 0; i < usersData.length; i += batchSize) {
                const batch = usersData.slice(i, i + batchSize);
                
                try {
                    await prisma.users.createMany({
                        data: batch,
                        skipDuplicates: true
                    });
                    totalCreated += batch.length;
                } catch (error: any) {
                    errors.push(`เกิดข้อผิดพลาดใน batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
                }
            }
        }

        return NextResponse.json({
            success: true,
            created: totalCreated,
            updated: totalUpdated,
            skipped: existingStudents.length - totalUpdated,
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
