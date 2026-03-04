import ExcelJS from 'exceljs';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as path from 'path';

const prisma = new PrismaClient();

interface StudentData {
    studentId: string;
    titleTh: string;
    firstName: string;
    lastName: string;
    faculty?: string;
    department?: string;
    year?: string;
}

async function readExcelFile(filePath: string): Promise<StudentData[]> {
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        const worksheet = workbook.worksheets[0];

        if (!worksheet) {
            throw new Error('ไม่พบ worksheet ในไฟล์');
        }

        // Helper function to safely convert cell value to string
        const cellValueToString = (value: any): string => {
            if (value === null || value === undefined) return '';
            if (typeof value === 'string') return value;
            if (typeof value === 'number' || typeof value === 'boolean') return String(value);
            // For complex objects (dates, formulas, etc.), try to get text representation
            if (value && typeof value === 'object' && 'text' in value) {
                return String(value.text);
            }
            return String(value);
        };

        // อ่าน header row (row 1)
        const headers: string[] = [];
        worksheet.getRow(1).eachCell((cell, colNumber) => {
            headers[colNumber] = cellValueToString(cell.value);
        });

        // อ่านข้อมูล rows (เริ่มจาก row 2)
        const data: any[] = [];
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // ข้าม header row

            const rowData: any = {};
            row.eachCell((cell, colNumber) => {
                const header = headers[colNumber];
                if (header) {
                    rowData[header] = cellValueToString(cell.value);
                }
            });
            data.push(rowData);
        });

        console.log(`📖 อ่านข้อมูลจากไฟล์: ${filePath}`);
        console.log(`📊 พบข้อมูล ${data.length} รายการ`);

        // แปลงข้อมูลตามโครงสร้างของไฟล์ Excel
        const students: StudentData[] = data.map((row: any) => ({
            studentId: String(row['รหัสนิสิต'] || row['Student ID'] || '').trim(),
            titleTh: String(row['คำนำหน้า'] || row['Title'] || '').trim(),
            firstName: String(row['ชื่อ'] || row['First Name'] || '').trim(),
            lastName: String(row['นามสกุล'] || row['Last Name'] || '').trim(),
            faculty: String(row['คณะ'] || row['Faculty'] || '').trim(),
            department: String(row['สาขา'] || row['Department'] || '').trim(),
            year: String(row['ชั้นปี'] || row['Year'] || '').trim(),
        }));

        return students.filter(s => s.studentId && s.firstName && s.lastName);
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการอ่านไฟล์:', error);
        throw error;
    }
}

async function migrateStudent(student: StudentData): Promise<boolean> {
    try {
        // ตรวจสอบว่ามีนิสิตอยู่แล้วหรือไม่
        const existingUser = await prisma.users.findFirst({
            where: {
                OR: [
                    { student_id: student.studentId },
                    { username: student.studentId }
                ]
            }
        });

        if (existingUser) {
            console.log(`⚠️  นิสิต ${student.studentId} มีอยู่ในระบบแล้ว`);
            return false;
        }

        // สร้างรหัสผ่านเริ่มต้น (ใช้รหัสนิสิต)
        const defaultPassword = student.studentId;
        const hashedPassword = await bcrypt.hash(defaultPassword, 12);

        // สร้างผู้ใช้ใหม่
        await prisma.users.create({
            data: {
                username: student.studentId,
                password_hash: hashedPassword,
                role: 'student',
                student_id: student.studentId,
                title_th: student.titleTh || null,
                first_name: student.firstName,
                last_name: student.lastName,
                email: `${student.studentId}@ku.th`,
                email_lc: `${student.studentId}@ku.th`.toLowerCase(),
                status: 'active',
                membership: 'member',
                registered_at: new Date(),
            }
        });

        console.log(` สร้างนิสิต ${student.studentId} - ${student.firstName} ${student.lastName}`);
        return true;
    } catch (error) {
        console.error(`❌ เกิดข้อผิดพลาดในการสร้างนิสิต ${student.studentId}:`, error);
        return false;
    }
}

async function main() {
    try {
        console.log('🚀 เริ่มต้น Migration ข้อมูลนิสิต\n');

        // ระบุไฟล์ Excel ที่จะ migrate
        const excelFiles = [
            'Std_R01_01 (12).xlsx',
            'Std_R01_01 (13).xlsx',
            'Std_R01_01 (14).xlsx',
            'Std_R01_01 (15).xlsx',
            'Std_R01_01 (16).xlsx',
            'Std_R01_01 (17).xlsx',
        ];

        let totalProcessed = 0;
        let totalCreated = 0;
        let totalSkipped = 0;

        for (const fileName of excelFiles) {
            const filePath = path.join(__dirname, fileName);

            console.log(`\n📁 กำลังประมวลผลไฟล์: ${fileName}`);
            console.log('─'.repeat(60));

            try {
                const students = await readExcelFile(filePath);

                for (const student of students) {
                    totalProcessed++;
                    const created = await migrateStudent(student);

                    if (created) {
                        totalCreated++;
                    } else {
                        totalSkipped++;
                    }
                }
            } catch (error) {
                console.error(`❌ ไม่สามารถประมวลผลไฟล์ ${fileName}:`, error);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 สรุปผลการ Migration');
        console.log('='.repeat(60));
        console.log(` สร้างผู้ใช้ใหม่: ${totalCreated} คน`);
        console.log(`⚠️  ข้ามผู้ใช้ที่มีอยู่แล้ว: ${totalSkipped} คน`);
        console.log(`📝 ประมวลผลทั้งหมด: ${totalProcessed} รายการ`);
        console.log('='.repeat(60));

    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดร้ายแรง:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// รัน script
main()
    .catch((error) => {
        console.error('❌ เกิดข้อผิดพลาด:', error);
        process.exit(1);
    });
