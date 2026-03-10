const ExcelJS = require('exceljs');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const path = require('path');

const prisma = new PrismaClient();

// Helper function to safely convert cell value to string
function cellValueToString(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    // For complex objects (dates, formulas, etc.), try to get text representation
    if (value && typeof value === 'object' && 'text' in value) {
        return String(value.text);
    }
    return String(value);
}

async function readExcelFile(filePath) {
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        const worksheet = workbook.worksheets[0];
        
        if (!worksheet) {
            throw new Error('ไม่พบ worksheet ในไฟล์');
        }

        // อ่าน header row (row 1)
        const headers = [];
        worksheet.getRow(1).eachCell((cell, colNumber) => {
            headers[colNumber] = cellValueToString(cell.value);
        });

        // อ่านข้อมูล rows (เริ่มจาก row 2)
        const data = [];
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // ข้าม header row
            
            const rowData = {};
            row.eachCell((cell, colNumber) => {
                const header = headers[colNumber];
                if (header) {
                    rowData[header] = cellValueToString(cell.value);
                }
            });
            data.push(rowData);
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

        console.log(` พบ columns ที่ตรง: ${foundColumns.length}/${Object.keys(requiredColumns).length}`);
        if (missingColumns.length > 0) {
            console.log(`runพ  ไม่พบ columns: ${missingColumns.slice(0, 5).join(', ')}${missingColumns.length > 5 ? '...' : ''}`);
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

        console.log(` กรองข้อมูลที่ถูกต้อง: ${validStudents.length} รายการ`);
        console.log(`⚠️  ข้ามข้อมูลที่ไม่ครบถ้วน: ${students.length - validStudents.length} รายการ`);
        
        return validStudents;
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการอ่านไฟล์:', error.message);
        throw error;
    }
}

async function batchMigrateStudents(students, batchSize = 100, updateExisting = false) {
    try {
        let totalCreated = 0;
        let totalUpdated = 0;
        let totalSkipped = 0;

        // Cache for faculties and departments to avoid repeated lookups
        const facultyCache = new Map();
        const departmentCache = new Map();

        console.log(`📊 กำลังประมวลผลนิสิต ${students.length} คน...`);

        for (let i = 0; i < students.length; i++) {
            const student = students[i];
            
            try {
                // Check if user already exists
                const existingUser = await prisma.users.findUnique({
                    where: { username: student.studentId },
                    include: { student_profile: true }
                });

                if (existingUser) {
                    if (updateExisting) {
                        // Update existing user
                        await prisma.users.update({
                            where: { user_id: existingUser.user_id },
                            data: {
                                title_th: student.titleTh || null,
                                first_name: student.firstName,
                                last_name: student.lastName,
                                phone: student.phone || existingUser.phone,
                                email: student.email || existingUser.email,
                                updated_at: new Date(),
                            }
                        });
                        totalUpdated++;
                    } else {
                        totalSkipped++;
                    }
                    continue;
                }

                // New User Migration with Transaction
                await prisma.$transaction(async (tx) => {
                    // 1. Handle Faculty
                    let facultyId;
                    if (student.faculty) {
                        if (facultyCache.has(student.faculty)) {
                            facultyId = facultyCache.get(student.faculty);
                        } else {
                            const faculty = await tx.faculties.upsert({
                                where: { faculty_name_th: student.faculty },
                                update: {},
                                create: {
                                    faculty_name_th: student.faculty,
                                    status: 'active'
                                }
                            });
                            facultyId = faculty.id;
                            facultyCache.set(student.faculty, facultyId);
                        }
                    }

                    // 2. Handle Department
                    let departmentId;
                    if (student.department && facultyId) {
                        const deptKey = `${facultyId}-${student.department}`;
                        if (departmentCache.has(deptKey)) {
                            departmentId = departmentCache.get(deptKey);
                        } else {
                            const department = await tx.departments.upsert({
                                where: {
                                    faculty_id_department_name_th: {
                                        faculty_id: facultyId,
                                        department_name_th: student.department
                                    }
                                },
                                update: {},
                                create: {
                                    faculty_id: facultyId,
                                    department_name_th: student.department
                                }
                            });
                            departmentId = department.id;
                            departmentCache.set(deptKey, departmentId);
                        }
                    }

                    // 3. Create User
                    const hashedPassword = await bcrypt.hash(student.studentId, 10);
                    const newUser = await tx.users.create({
                        data: {
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
                        }
                    });

                    // 4. Create Student Profile
                    if (facultyId && departmentId) {
                        await tx.student_profile.create({
                            data: {
                                user_id: newUser.user_id,
                                student_id: student.studentId,
                                faculty_id: facultyId,
                                department_id: departmentId,
                                level_of_study: 'UG', // Default to Undergraduate
                                student_status: 'enrolled'
                            }
                        });
                    }
                });

                totalCreated++;
                if (totalCreated % 10 === 0) {
                    process.stdout.write(`\r   ⏳ สร้างแล้ว ${totalCreated}/${students.length} รายการ`);
                }

            } catch (error) {
                console.error(`\n❌ เกิดข้อผิดพลาดกับนิสิต ${student.studentId}:`, error.message);
            }
        }

        console.log(`\n การประมวลผลเสร็จสิ้น: สร้างใหม่ ${totalCreated}, อัปเดต ${totalUpdated}, ข้าม ${totalSkipped}`);
        return { created: totalCreated, updated: totalUpdated, skipped: totalSkipped };
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
            'Std_R01_01 (12).xlsx',
            'Std_R01_01 (13).xlsx',
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
        console.log(` สร้างผู้ใช้ใหม่: ${totalCreated} คน`);
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
