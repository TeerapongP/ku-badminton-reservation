const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function checkUser(studentId) {
    try {
        const user = await prisma.users.findFirst({
            where: { student_id: studentId },
            select: {
                user_id: true,
                username: true,
                student_id: true,
                email: true,
                role: true,
                first_name: true,
                last_name: true,
                password_hash: true,
            }
        });

        if (!user) {
            console.log(`❌ ไม่พบนิสิตรหัส ${studentId}`);
            return;
        }

        console.log('✅ พบข้อมูลนิสิต:');
        console.log(`   User ID: ${user.user_id}`);
        console.log(`   Username: ${user.username}`);
        console.log(`   Student ID: ${user.student_id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Name: ${user.first_name} ${user.last_name}`);
        
        // ทดสอบรหัสผ่าน
        const testPassword = studentId;
        const isPasswordValid = await bcrypt.compare(testPassword, user.password_hash);
        
        console.log(`\n🔐 ทดสอบรหัสผ่าน "${testPassword}": ${isPasswordValid ? '✅ ถูกต้อง' : '❌ ไม่ถูกต้อง'}`);
        
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาด:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

// ใช้ student ID จาก command line หรือ default
const studentId = process.argv[2] || '6820000014';
checkUser(studentId);
