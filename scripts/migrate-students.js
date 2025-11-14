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
        
        // อ่านข้อมูลโดยใช้ชื่อ column จาก header
        const data = XLSX.utils.sheet_to_json(worksheet, { 
            defval: '', // ค่า default สำหรับ cell ว่าง
        });

        console.log(`📂 อ่านข้อมูลจากไฟล์: ${path.basename(filePath)}`);
        console.log(`📊 พบข้อมูล ${data.length} รายการ`);

        // แสดง column names ที่พบ
        if (data.length > 0) {
            const columns = Object.keys(data[0]);
            console.log(`📋 พบ ${columns.length} columns`);
            console.log('📋 Columns:', columns.slice(0, 10).join(', '), '...');
        }

        // กำหนด column names ที่ต้องการ
        const requiredColumns = {
            studentId: 'รหัสนิสิต',
            nationalId: 'เลขที่บัตรประจำตัวประชาชน',
            titleTh: 'คำนำหน้าชื่อ(ไทย)',
            titleEn: 'คำนำหน้าชื่อ(อังกฤษ)',
            firstNameTh: 'ชื่อ(ไทย)',
            firstNameEn: 'ชื่อ(อังกฤษ)',
            lastNameTh: 'นามสกุล(ไทย)',
            lastNameEn: 'นามสกุล(อังกฤษ)',
            birthDate: 'วันเกิด',
            genderTh: 'เพศ(ไทย)',
            genderEn: 'เพศ(อังกฤษ)',
            bloodType: 'กรุ๊ปเลือด',
            nationality: 'สัญชาติ',
            email: 'E-mail',
            phone: 'โทรศัพท์มือถือ',
            admissionDate: 'วันที่เข้าศึกษา',
            admissionYear: 'ปีที่เข้าศึกษา',
            campus: 'ชื่อวิทยาเขตเจ้าของหลักสูตร',
            facultyCode: 'รหัสคณะ/หน่วยงานที่เทียบเท่า',
            faculty: 'คณะ/หน่วยงานที่เทียบเท่า',
            programCode: 'รหัสหลักสูตร',
            program: 'ชื่อหลักสูตร',
            departmentCode: 'รหัสภาควิชา',
            department: 'ชื่อภาควิชา',
            majorCode: 'รหัสสาขาวิชา',
            major: 'ชื่อสาขาวิชา'
        };

        // ตรวจสอบว่า columns ที่จำเป็นมีอยู่หรือไม่
        const availableColumns = Object.keys(data[0]);
        const missingColumns = [];
        const foundColumns = [];
        
        for (const [key, colName] of Object.entries(requiredColumns)) {
            if (availableColumns.includes(colName)) {
                foundColumns.push(colName);
            } else {
                missingColumns.push(colName);
            }
        }

        console.log(`✅ พบ columns ที่ตรง: ${foundColumns.length}/${Object.keys(requiredColumns).length}`);
        if (missingColumns.length > 0) {
            console.log(`⚠️  ไม่พบ columns: ${missingColumns.slice(0, 5).join(', ')}${missingColumns.length > 5 ? '...' : ''}`);
        }

        // แปลงข้อมูล - ข้ามแถวที่ไม่มีข้อมูลสำคัญ
        const students = data.map((row, index) => {
            // ดึงข้อมูลจาก column names
            const studentId = String(row[requiredColumns.studentId] || '').trim();
            const titleTh = String(row[requiredColumns.titleTh] || '').trim();
            const firstNameTh = String(row[requiredColumns.firstNameTh] || '').trim();
            const lastNameTh = String(row[requiredColumns.lastNameTh] || '').trim();
            
            // ดึง email - ถ้าไม่มีให้สร้างจากรหัสนิสิต
            let email = String(row[requiredColumns.email] || '').trim();
            if (!email || !email.includes('@')) {
                email = studentId ? `${studentId}@ku.th` : '';
            }
            
            // ดึงเบอร์โทร
            let phone = String(row[requiredColumns.phone] || '').trim();
            // ลบช่องว่างและขีดออก
            phone = phone.replace(/[\s-]/g, '');
            // ตรวจสอบรูปแบบเบอร์โทร
            if (!/^0\d{9}$/.test(phone)) {
                phone = '';
            }
            
            const faculty = String(row[requiredColumns.faculty] || '').trim();
            const department = String(row[requiredColumns.department] || '').trim();
            
            // Debug แถวแรก 3 แถว
            if (index < 3) {
                console.log(`\n🔍 Debug แถวที่ ${index + 1}:`);
                console.log(`   รหัสนิสิต: ${studentId || '[ไม่มี]'}`);
                console.log(`   คำนำหน้า(ไทย): ${titleTh || '[ไม่มี]'}`);
                console.log(`   ชื่อ(ไทย): ${firstNameTh || '[ไม่มี]'}`);
                console.log(`   นามสกุล(ไทย): ${lastNameTh || '[ไม่มี]'}`);
                console.log(`   Email: ${email || '[ไม่มี]'}`);
                console.log(`   เบอร์โทร: ${phone || '[ไม่มี]'}`);
                console.log(`   คณะ: ${faculty || '[ไม่มี]'}`);
                console.log(`   ภาควิชา: ${department || '[ไม่มี]'}`);
            }
            
            return {
                studentId,
                titleTh,
                firstName: firstNameTh,
                lastName: lastNameTh,
                email,
                phone,
                faculty,
                department,
            };
        });

        // กรองเฉพาะข้อมูลที่ถูกต้อง - ข้ามแถวที่ไม่มีข้อมูลสำคัญ
        const validStudents = students.filter(s => {
            // ตรวจสอบว่ารหัสนิสิตเป็นตัวเลข 8-10 หลัก
            const isValidId = /^\d{8,10}$/.test(s.studentId);
            const hasName = s.firstName && s.lastName;
            
            if (!isValidId || !hasName) {
                return false;
            }
            
            return true;
        });

        console.log(`✅ กรองข้อมูลที่ถูกต้อง: ${validStudents.length} รายการ`);
        console.log(`⚠️  ข้ามข้อมูลที่ไม่ครบถ้วน: ${students.length - validStudents.length} รายการ`);
        
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
            'Std_R01_01 (14).xlsx',
            'Std_R01_01 (15).xlsx',
            'Std_R01_01 (16).xlsx',
            'Std_R01_01 (17).xlsx',
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
