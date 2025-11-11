const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const path = require('path');

const prisma = new PrismaClient();

async function readExcelFile(filePath) {
    try {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // อ่านข้อมูลโดยข้าม header rows (เริ่มจากแถวที่ 2)
        const data = XLSX.utils.sheet_to_json(worksheet, { 
            range: 1, // ข้าม 1 แถวแรก (header)
            defval: '', // ค่า default สำหรับ cell ว่าง
            header: 1 // ใช้แถวที่ 1 เป็น header
        });

        console.log(`� อ่า นข้อมูลจากไฟล์: ${path.basename(filePath)}`);
        console.log(`📊 พบข้อมูล ${data.length} รายการ`);

        // แสดง column names ที่พบ (5 columns แรก)
        if (data.length > 0) {
            const columns = Object.keys(data[0]).slice(0, 10);
            console.log('📋 Columns (10 แรก):', columns.join(', '));
            
            // แสดงตัวอย่างข้อมูลแถวแรก
            console.log('📝 ตัวอย่างข้อมูล:', JSON.stringify(data[0], null, 2));
        }

        // แปลงข้อมูลตามโครงสร้างของไฟล์ Excel
        const students = data.map((row, index) => {
            // ข้อมูลเป็น array ใช้ index โดยตรง
            // 0 = รหัสนิสิต
            // 1 = เลขบัตรประชาชน
            // 2 = คำนำหน้า(ไทย)
            // 3 = คำนำหน้า(อังกฤษ)
            // 4 = ชื่อ(ไทย)
            // 5 = ชื่อ(อังกฤษ)
            // 6 = นามสกุล(ไทย)
            // 7 = นามสกุล(อังกฤษ)
            // 8 = วันเกิด
            // 9 = เพศ(ไทย)
            // 10 = เพศ(อังกฤษ)
            // 11 = กรุ๊ปเลือด
            // 12 = สัญชาติ
            // 13 = E-mail
            // 14 = โทรศัพท์มือถือ
            // 15 = วันที่เข้าศึกษา
            // 16 = ปีที่เข้าศึกษา
            // 17 = ชื่อวิทยาเขต
            // 18 = รหัสคณะ
            // 19 = คณะ
            // 20 = รหัสหลักสูตร
            // 21 = ชื่อหลักสูตร
            // 22 = รหัสภาควิชา
            // 23 = ชื่อภาควิชา
            // 24 = รหัสสาขาวิชา
            // 25 = ชื่อสาขาวิชา
            
            const studentId = String(row[0] || '').trim();
            const nationalId = String(row[1] || '').trim();
            const titleTh = String(row[2] || '').trim();
            const titleEn = String(row[3] || '').trim();
            const firstNameTh = String(row[4] || '').trim();
            const firstNameEn = String(row[5] || '').trim();
            const lastNameTh = String(row[6] || '').trim();
            const lastNameEn = String(row[7] || '').trim();
            
            // ดึง email - ถ้าไม่มีให้สร้างจากรหัสนิสิต
            let email = String(row[13] || '').trim();
            // ตรวจสอบว่าเป็น email จริง ถ้าไม่ใช่ให้สร้างจากรหัสนิสิต
            if (!email || !email.includes('@')) {
                email = `${studentId}@ku.th`;
            }
            
            // ดึงเบอร์โทร
            let phone = String(row[14] || '').trim();
            if (!/^0\d{9}$/.test(phone)) {
                phone = '';
            }
            
            const faculty = String(row[19] || '').trim();
            const department = String(row[23] || '').trim();
            
            // Debug แถวแรก 3 แถว
            if (index < 3) {
                console.log(`\n🔍 Debug แถวที่ ${index + 1}:`);
                console.log(`   รหัสนิสิต [0]: ${studentId}`);
                console.log(`   เลขบัตรประชาชน [1]: ${nationalId}`);
                console.log(`   คำนำหน้า(ไทย) [2]: ${titleTh}`);
                console.log(`   ชื่อ(ไทย) [4]: ${firstNameTh}`);
                console.log(`   นามสกุล(ไทย) [6]: ${lastNameTh}`);
                console.log(`   Email [13]: ${email}`);
                console.log(`   เบอร์โทร [14]: ${phone || '[ไม่มี]'}`);
                console.log(`   คณะ [19]: ${faculty}`);
                console.log(`   ภาควิชา [23]: ${department}`);
            }
            
            return {
                studentId,
                nationalId,
                titleTh,
                titleEn,
                firstName: firstNameTh,
                lastName: lastNameTh,
                email,
                phone,
                faculty,
                department,
                year: '',
            };
        });

        const validStudents = students.filter(s => {
            // ตรวจสอบว่ารหัสนิสิตเป็นตัวเลข 8-10 หลัก
            const isValidId = /^\d{8,10}$/.test(s.studentId);
            return isValidId && s.firstName && s.lastName;
        });

        console.log(`✅ กรองข้อมูลที่ถูกต้อง: ${validStudents.length} รายการ`);
        
        return validStudents;
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการอ่านไฟล์:', error.message);
        throw error;
    }
}

async function batchMigrateStudents(students, batchSize = 100, updateExisting = false) {
    try {
        // ดึงรายการนิสิตที่มีอยู่แล้ว
        const existingStudentIds = await prisma.users.findMany({
            where: {
                student_id: {
                    in: students.map(s => s.studentId)
                }
            },
            select: {
                student_id: true
            }
        });

        const existingIds = new Set(existingStudentIds.map(u => u.student_id));
        
        // แยกนิสิตใหม่และนิสิตเดิม
        const newStudents = students.filter(s => !existingIds.has(s.studentId));
        const existingStudents = students.filter(s => existingIds.has(s.studentId));
        
        console.log(`📊 พบนิสิตใหม่: ${newStudents.length} คน`);
        console.log(`⚠️  พบนิสิตที่มีอยู่แล้ว: ${existingStudents.length} คน`);

        let totalUpdated = 0;

        // อัปเดตข้อมูลเดิม (ถ้าเปิดใช้งาน)
        if (updateExisting && existingStudents.length > 0) {
            console.log('🔄 กำลังอัปเดตข้อมูลนิสิตเดิม...');
            
            for (const student of existingStudents) {
                try {
                    // ตรวจสอบว่าเบอร์โทรซ้ำหรือไม่
                    const phoneExists = student.phone ? await prisma.users.findFirst({
                        where: {
                            phone: student.phone,
                            student_id: { not: student.studentId }
                        }
                    }) : null;

                    // อัปเดตข้อมูล (ข้ามเบอร์โทรถ้าซ้ำ)
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
                    
                    if (phoneExists && student.phone) {
                        console.log(`⚠️  ข้ามการอัปเดตเบอร์ ${student.phone} (ซ้ำ) สำหรับนิสิต ${student.studentId}`);
                    }
                } catch (error) {
                    console.error(`❌ ไม่สามารถอัปเดตนิสิต ${student.studentId}:`, error.message);
                }
            }
            console.log(`✅ อัปเดตข้อมูล: ${totalUpdated} คน`);
        }

        if (newStudents.length === 0) {
            return { created: 0, updated: totalUpdated, skipped: existingStudents.length - totalUpdated };
        }

        // เตรียมข้อมูลสำหรับ batch insert
        console.log(`🔐 กำลังเข้ารหัสรหัสผ่าน ${newStudents.length} รายการ...`);
        
        const usersData = [];
        const chunkSize = 100;
        
        for (let i = 0; i < newStudents.length; i += chunkSize) {
            const chunk = newStudents.slice(i, i + chunkSize);
            
            const chunkData = await Promise.all(
                chunk.map(async (student) => {
                    const hashedPassword = await bcrypt.hash(student.studentId, 10); // ลด rounds จาก 12 เป็น 10
                    return {
                        username: student.studentId,
                        password_hash: hashedPassword,
                        role: 'student',
                        student_id: student.studentId,
                        title_th: student.titleTh || null,
                        first_name: student.firstName,
                        last_name: student.lastName,
                        phone: student.phone || null,
                        email: student.email || `${student.studentId}@ku.th`,
                        email_lc: (student.email || `${student.studentId}@ku.th`).toLowerCase(),
                        status: 'active',
                        membership: 'member',
                        registered_at: new Date(),
                    };
                })
            );
            
            usersData.push(...chunkData);
            console.log(`   ⏳ เข้ารหัสแล้ว ${Math.min(i + chunkSize, newStudents.length)}/${newStudents.length} รายการ`);
        }
        
        console.log('✅ เข้ารหัสรหัสผ่านเสร็จสิ้น');

        // Insert แบบ batch
        let totalCreated = 0;
        for (let i = 0; i < usersData.length; i += batchSize) {
            const batch = usersData.slice(i, i + batchSize);
            
            try {
                await prisma.users.createMany({
                    data: batch,
                    skipDuplicates: true
                });
                
                totalCreated += batch.length;
                console.log(`✅ Insert batch ${Math.floor(i / batchSize) + 1}: ${batch.length} รายการ (รวม ${totalCreated}/${usersData.length})`);
            } catch (error) {
                console.error(`❌ เกิดข้อผิดพลาดใน batch ${Math.floor(i / batchSize) + 1}:`, error.message);
            }
        }

        return { created: totalCreated, updated: totalUpdated, skipped: existingStudents.length - totalUpdated };
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการ migrate:', error.message);
        throw error;
    }
}

async function main() {
    try {
        console.log('🚀 เริ่มต้น Migration ข้อมูลนิสิต\n');

        // ระบุไฟล์ Excel ที่จะ migrate
        const excelFiles = [
            'Std_R01_01 (13).xlsx',
            // 'Std_R01_01 (14).xlsx',
            // 'Std_R01_01 (15).xlsx',
            // 'Std_R01_01 (16).xlsx',
            // 'Std_R01_01 (17).xlsx',
        ];

        let totalProcessed = 0;
        let totalCreated = 0;
        let totalUpdated = 0;
        let totalSkipped = 0;

        // ตั้งค่า: เปลี่ยนเป็น true ถ้าต้องการอัปเดตข้อมูลเดิม
        const UPDATE_EXISTING = true;

        for (const fileName of excelFiles) {
            const filePath = path.join(__dirname, fileName);
            
            console.log(`\n📁 กำลังประมวลผลไฟล์: ${fileName}`);
            console.log('─'.repeat(60));

            try {
                const students = await readExcelFile(filePath);
                totalProcessed += students.length;
                
                // ใช้ batch insert แทนการ insert ทีละรายการ
                const result = await batchMigrateStudents(students, 100, UPDATE_EXISTING);
                
                totalCreated += result.created;
                totalUpdated += result.updated;
                totalSkipped += result.skipped;
                
            } catch (error) {
                console.error(`❌ ไม่สามารถประมวลผลไฟล์ ${fileName}:`, error.message);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 สรุปผลการ Migration');
        console.log('='.repeat(60));
        console.log(`✅ สร้างผู้ใช้ใหม่: ${totalCreated} คน`);
        if (totalUpdated > 0) {
            console.log(`🔄 อัปเดตข้อมูลเดิม: ${totalUpdated} คน`);
        }
        console.log(`⚠️  ข้ามผู้ใช้ที่มีอยู่แล้ว: ${totalSkipped} คน`);
        console.log(`📝 ประมวลผลทั้งหมด: ${totalProcessed} รายการ`);
        console.log('='.repeat(60));
        console.log('\n💡 หมายเหตุ:');
        console.log('   - รหัสผ่านเริ่มต้นคือรหัสนิสิต');
        console.log(`   - การอัปเดตข้อมูลเดิม: ${UPDATE_EXISTING ? 'เปิด' : 'ปิด'}`);

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
