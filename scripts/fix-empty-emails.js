const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixEmptyEmails() {
    try {
        console.log('🔍 กำลังค้นหานิสิตที่ไม่มี email...');
        
        // หานิสิตที่ email ว่าง
        const usersWithoutEmail = await prisma.users.findMany({
            where: {
                OR: [
                    { email: '' },
                    { email: null }
                ],
                role: 'student'
            },
            select: {
                user_id: true,
                username: true,
                student_id: true,
                email: true
            }
        });

        console.log(`📊 พบนิสิตที่ไม่มี email: ${usersWithoutEmail.length} คน`);

        if (usersWithoutEmail.length === 0) {
            console.log(' ทุกคนมี email แล้ว');
            return;
        }

        console.log('\n🔄 กำลังอัปเดต email...');
        
        let updated = 0;
        for (const user of usersWithoutEmail) {
            const newEmail = `${user.student_id}@ku.th`;
            
            try {
                await prisma.users.update({
                    where: { user_id: user.user_id },
                    data: {
                        email: newEmail,
                        email_lc: newEmail.toLowerCase()
                    }
                });
                updated++;
                
                if (updated % 100 === 0) {
                    console.log(`   ⏳ อัปเดตแล้ว ${updated}/${usersWithoutEmail.length} คน`);
                }
            } catch (error) {
                console.error(`❌ ไม่สามารถอัปเดต user_id ${user.user_id}:`, error.message);
            }
        }

        console.log(`\n อัปเดต email สำเร็จ: ${updated} คน`);
        
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาด:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

fixEmptyEmails();
