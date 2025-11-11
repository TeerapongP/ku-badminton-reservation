const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixEmail(studentId) {
    try {
        const email = `${studentId}@ku.th`;
        
        await prisma.users.update({
            where: { student_id: studentId },
            data: {
                email: email,
                email_lc: email.toLowerCase()
            }
        });
        
        console.log(`✅ อัปเดต email สำเร็จ: ${email}`);
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

const studentId = process.argv[2] || '6820000014';
fixEmail(studentId);
