const { PrismaClient } = require('../src/generated/prisma');

const prisma = new PrismaClient();

// Faculty data from SQL file
const facultiesData = [
    { id: 5, name: 'ศิลปศาสตร์และวิทยาศาสตร์' },
    { id: 11, name: 'อุตสาหกรรมบริการ' },
    { id: 13, name: 'เกษตร กำแพงแสน' },
    { id: 14, name: 'วิศวกรรมศาสตร์ กำแพงแสน' },
    { id: 15, name: 'วิทยาศาสตร์การกีฬาและสุขภาพ' },
    { id: 16, name: 'ศึกษาศาสตร์และพัฒนศาสตร์' },
    { id: 17, name: 'สัตวแพทยศาสตร์' },
    { id: 18, name: 'ประมง' },
    { id: 19, name: 'สิ่งแวดล้อม' }
];

// Department data from SQL file
const departmentsData = [
    { id: 5, name: 'เทคโนโลยีสารสนเทศ (ภาคปกติ)', faculty_id: 5 },
    { id: 11, name: 'จุลชีววิทยา', faculty_id: 5 },
    { id: 16, name: 'ภาษาอังกฤษ (ภาคปกติ)', faculty_id: 5 },
    { id: 17, name: 'ภาษาอังกฤษ (ภาคพิเศษ)', faculty_id: 5 },
    { id: 18, name: 'เทคโนโลยีสารสนเทศ (ภาคพิเศษ)', faculty_id: 5 },
    { id: 19, name: 'วิทยาการคอมพิวเตอร์ (ภาคปกติ)', faculty_id: 5 },
    { id: 20, name: 'วิทยาการคอมพิวเตอร์ (ภาคพิเศษ)', faculty_id: 5 },
    { id: 21, name: 'วิทยาศาสตร์ชีวภาพ', faculty_id: 5 },
    { id: 22, name: 'เคมี', faculty_id: 5 },
    { id: 23, name: 'ฟิสิกส์', faculty_id: 5 },
    { id: 24, name: 'การจัดการ (ภาคปกติ)', faculty_id: 5 },
    { id: 25, name: 'การจัดการ (ภาคพิเศษ)', faculty_id: 5 },
    { id: 27, name: 'การตลาด (ภาคปกติ)', faculty_id: 5 },
    { id: 28, name: 'การตลาด (ภาคพิเศษ)', faculty_id: 5 },
    { id: 29, name: 'คณิตศาสตร์ประยุกต์', faculty_id: 5 },
    { id: 30, name: 'การเมืองและการปกครอง', faculty_id: 5 },
    { id: 31, name: 'การบัญชี (ภาคปกติ)', faculty_id: 5 },
    { id: 32, name: 'การบัญชี (ภาคพิเศษ)', faculty_id: 5 },
    { id: 33, name: 'พฤกษนวัตกรรม', faculty_id: 5 },
    { id: 34, name: 'ภาษาอังกฤษเพื่ออุตสาหกรรมบริการ (ภาคปกติ)', faculty_id: 11 },
    { id: 35, name: 'ภาษาอังกฤษเพื่ออุตสาหกรรมบริการ (ภาคพิเศษ)', faculty_id: 11 },
    { id: 36, name: 'การจัดการธุรกิจการบิน (ภาคปกติ)', faculty_id: 11 },
    { id: 37, name: 'การจัดการธุรกิจการบิน (ภาคพิเศษ)', faculty_id: 11 },
    { id: 38, name: 'การจัดการโรงแรม ภัตตาคาร และเรือสำราญ (ภาคปกติ)', faculty_id: 11 },
    { id: 39, name: 'การจัดการโรงแรม ภัตตาคาร และเรือสำราญ (ภาคพิเศษ)', faculty_id: 11 },
    { id: 40, name: 'การจัดการท่องเที่ยว โรงแรม และอีเวนต์ (ภาคพิเศษ)', faculty_id: 11 },
    { id: 41, name: 'การจัดการท่องเที่ยว โรงแรม และอีเวนต์ (ภาคปกติ)', faculty_id: 11 },
    { id: 42, name: 'การท่องเที่ยวและนันทนาการ (ภาคปกติ)', faculty_id: 11 },
    { id: 43, name: 'การท่องเที่ยวและนันทนาการ (ภาคพิเศษ)', faculty_id: 11 },
    { id: 44, name: 'อุตสาหกรรมการท่องเที่ยวและบริการ (ภาคปกติ)', faculty_id: 11 },
    { id: 45, name: 'อุตสาหกรรมการท่องเที่ยวและบริการ (ภาคพิเศษ)', faculty_id: 11 },
    { id: 46, name: 'การจัดการธุรกิจบริการและอุตสาหกรรมไมซ์ (ภาคปกติ)', faculty_id: 11 },
    { id: 47, name: 'การจัดการธุรกิจบริการและอุตสาหกรรมไมซ์ (ภาคพิเศษ)', faculty_id: 11 },
    { id: 48, name: 'เครื่องจักรกลและเมคคาทรอนิกส์เกษตร', faculty_id: 13 },
    { id: 49, name: 'สัตวศาสตร์', faculty_id: 13 },
    { id: 50, name: 'เทคโนโลยีชีวภาพทางการเกษตร', faculty_id: 13 },
    { id: 51, name: 'พืชสวน', faculty_id: 13 },
    { id: 52, name: 'พืชไร่นา', faculty_id: 13 },
    { id: 53, name: 'ส่งเสริมและนิเทศศาสตร์เกษตร', faculty_id: 13 },
    { id: 54, name: 'กีฏวิทยา', faculty_id: 13 },
    { id: 55, name: 'เกษตรศาสตร์', faculty_id: 13 },
    { id: 56, name: 'เพาะเลี้ยงสัตว์น้ำ', faculty_id: 18 },
    { id: 57, name: 'วิทยาศาสตร์การกีฬาและการออกกำลังกาย', faculty_id: 15 },
    { id: 58, name: 'วิศวกรรมเครื่องกล', faculty_id: 14 },
    { id: 59, name: 'วิศวกรรมโยธา-ชลประทาน', faculty_id: 14 },
    { id: 60, name: 'วิศวกรรมอาหาร', faculty_id: 14 },
    { id: 61, name: 'วิศวกรรมอุตสาหการ-โลจิสติกส์', faculty_id: 14 },
    { id: 62, name: 'วิศวกรรมคอมพิวเตอร์', faculty_id: 14 },
    { id: 63, name: 'วิศวกรรมเครื่องกล-เกษตร', faculty_id: 14 },
    { id: 64, name: 'วิศวกรรมโยธา-โครงสร้างพื้นฐาน', faculty_id: 14 },
    { id: 65, name: 'วิศวกรรมนวัตกรรมเพื่อการเกษตรและอุตสาหกรรม(โครงการพิเศษ)', faculty_id: 14 },
    { id: 66, name: 'เกษตรและสิ่งแวดล้อมศึกษา', faculty_id: 16 },
    { id: 67, name: 'การจัดการเรียนรู้พลศึกษาและสุขศึกษา', faculty_id: 16 },
    { id: 68, name: 'การจัดการเรียนรู้ภาษาอังกฤษศึกษา', faculty_id: 16 },
    { id: 69, name: 'การจัดการเรียนรู้คณิตศาสตร์ศึกษา', faculty_id: 16 },
    { id: 70, name: 'การจัดการเรียนรู้วิทยาศาสตร์ศึกษา', faculty_id: 16 },
    { id: 71, name: 'การจัดการเรียนรู้ดนตรีศึกษา', faculty_id: 16 },
    { id: 72, name: 'วิทยาศาสตร์และเทคโนโลยีสิ่งแวดล้อม', faculty_id: 19 },
    { id: 73, name: 'ไม่จำกัดสาขา', faculty_id: 17 },
    { id: 74, name: 'โรคพืช', faculty_id: 13 },
    { id: 75, name: 'ปฐพีวิทยา', faculty_id: 13 }
];

async function insertFacultiesAndDepartments() {
    try {
        console.log('🚀 Starting faculties and departments insertion...');

        // Insert faculties
        console.log('📚 Inserting faculties...');
        let facultyCount = 0;

        for (const faculty of facultiesData) {
            try {
                await prisma.faculties.upsert({
                    where: { faculty_name_th: faculty.name },
                    update: {},
                    create: {
                        faculty_name_th: faculty.name,
                        status: 'active',
                        created_at: new Date(),
                        updated_at: new Date()
                    }
                });
                facultyCount++;
                console.log(`✅ Faculty: ${faculty.name}`);
            } catch (error) {
                console.log(`⚠️  Faculty already exists: ${faculty.name}`);
            }
        }

        // Get faculty mappings for departments
        const facultyMappings = new Map();
        for (const faculty of facultiesData) {
            const dbFaculty = await prisma.faculties.findUnique({
                where: { faculty_name_th: faculty.name }
            });
            if (dbFaculty) {
                facultyMappings.set(faculty.id, dbFaculty.id);
            }
        }

        // Insert departments
        console.log('\n🏢 Inserting departments...');
        let departmentCount = 0;

        for (const department of departmentsData) {
            const facultyDbId = facultyMappings.get(department.faculty_id);

            if (!facultyDbId) {
                console.log(`❌ Faculty not found for department: ${department.name}`);
                continue;
            }

            try {
                await prisma.departments.upsert({
                    where: {
                        faculty_id_department_name_th: {
                            faculty_id: facultyDbId,
                            department_name_th: department.name
                        }
                    },
                    update: {},
                    create: {
                        department_name_th: department.name,
                        faculty_id: facultyDbId,
                        created_at: new Date(),
                        updated_at: new Date()
                    }
                });
                departmentCount++;
                console.log(`✅ Department: ${department.name}`);
            } catch (error) {
                console.log(`⚠️  Department already exists: ${department.name}`);
            }
        }

        // Summary
        console.log('\n📊 Summary:');
        console.log(`✅ Faculties processed: ${facultyCount}/${facultiesData.length}`);
        console.log(`✅ Departments processed: ${departmentCount}/${departmentsData.length}`);

        // Final counts
        const totalFaculties = await prisma.faculties.count();
        const totalDepartments = await prisma.departments.count();

        console.log('\n🎯 Database totals:');
        console.log(`📚 Total faculties: ${totalFaculties}`);
        console.log(`🏢 Total departments: ${totalDepartments}`);

        console.log('\n🎉 Data insertion completed successfully!');

    } catch (error) {
        console.error('❌ Error inserting data:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
if (require.main === module) {
    insertFacultiesAndDepartments()
        .then(() => {
            console.log('Script completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Script failed:', error);
            process.exit(1);
        });
}

module.exports = { insertFacultiesAndDepartments };