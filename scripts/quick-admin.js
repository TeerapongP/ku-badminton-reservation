const { PrismaClient } = require('../src/generated/prisma');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createQuickAdmin() {
    try {
        console.log('🚀 Creating quick admin user...');

        const adminData = {
            username: 'admin',
            password: 'admin123',
            email: 'admin@ku.ac.th',
            phone: '0800000000',
            first_name: 'Admin',
            last_name: 'User'
        };

        // Check if admin exists
        const existing = await prisma.users.findUnique({
            where: { username: adminData.username }
        });

        if (existing) {
            console.log('⚠️  Admin user already exists!');
            console.log(`Username: ${existing.username}`);
            console.log(`Email: ${existing.email}`);
            console.log(`Role: ${existing.role}`);
            console.log('Use the existing credentials or run create-custom-admin.js to update');
            return;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(adminData.password, 12);

        // Create admin
        const admin = await prisma.users.create({
            data: {
                username: adminData.username,
                password_hash: hashedPassword,
                email: adminData.email,
                email_lc: adminData.email.toLowerCase(),
                phone: adminData.phone,
                title_th: 'นาย',
                title_en: 'Mr.',
                first_name: adminData.first_name,
                last_name: adminData.last_name,
                nickname: adminData.first_name,
                role: 'admin',
                status: 'active',
                membership: 'member'
            }
        });

        console.log('✅ Admin user created!');
        console.log('========================');
        console.log(`👤 Username: ${admin.username}`);
        console.log(`📧 Email: ${admin.email}`);
        console.log(`🔑 Password: ${adminData.password}`);
        console.log(`👑 Role: ${admin.role}`);
        console.log('========================');
        console.log('🔐 Please change password after login!');

    } catch (error) {
        console.error('❌ Error:', error.message);

        if (error.code === 'P2002') {
            console.error('User already exists with this username or email');
        }
    } finally {
        await prisma.$disconnect();
    }
}

createQuickAdmin();