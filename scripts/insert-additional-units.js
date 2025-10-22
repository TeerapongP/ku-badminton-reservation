const { PrismaClient } = require('../src/generated/prisma');

const prisma = new PrismaClient();

// Additional organizational units structure
const additionalUnitsData = {
    units: [
        {
            name_th: 'ศูนย์',
            name_en: 'Centers',
            short_code: 'ศูนย์'
        },
        {
            name_th: 'ห้องปฏิบัติการ',
            name_en: 'Laboratories',
            short_code: 'ห.ปฏิ.'
        },
        {
            name_th: 'สำนักส่งเสริมและฝึกอบรม กำแพงแสน',
            name_en: 'Extension and Training Institute Kamphaeng Saen',
            short_code: 'สสฝ.กส.'
        },
        {
            name_th: 'อื่นๆ',
            name_en: 'Others',
            short_code: 'อื่นๆ'
        }
    ],

    subUnits: [
        // Sub-units under ศูนย์
        {
            name_th: 'ศูนย์ข้อมูลเทคโนโลยีชีวภาพ',
            name_en: 'Biotechnology Information Center',
            short_code: 'ศขท.',
            parent_unit: 'ศูนย์'
        },
        {
            name_th: 'ศูนย์เทคโนโลยีชีวภาพเกษตร',
            name_en: 'Agricultural Biotechnology Center',
            short_code: 'ศทช.',
            parent_unit: 'ศูนย์'
        },
        {
            name_th: 'ศูนย์วิทยาศาสตร์ข้าว',
            name_en: 'Rice Science Center',
            short_code: 'ศวข.',
            parent_unit: 'ศูนย์'
        },
        {
            name_th: 'ศูนย์สาธิตการผลิตโคเนื้อครบวงจร',
            name_en: 'Integrated Beef Cattle Production Demonstration Center',
            short_code: 'ศสผ.',
            parent_unit: 'ศูนย์'
        },
        {
            name_th: 'ศูนย์ความเป็นเลิศทางวิชาการด้านไหม',
            name_en: 'Center of Excellence for Silk',
            short_code: 'ศคล.',
            parent_unit: 'ศูนย์'
        },
        {
            name_th: 'ศูนย์ปฏิบัติการ DNA เทคโนโลยี',
            name_en: 'DNA Technology Laboratory Center',
            short_code: 'ศปด.',
            parent_unit: 'ศูนย์'
        },

        // Sub-units under ห้องปฏิบัติการ
        {
            name_th: 'ห้องปฏิบัติการการวิเคราะห์ดิน น้ำ ปุ๋ย และพืช',
            name_en: 'Soil, Water, Fertilizer and Plant Analysis Laboratory',
            short_code: 'ห.ปฏิ.วิเคราะห์',
            parent_unit: 'ห้องปฏิบัติการ'
        },
        {
            name_th: 'ห้องปฏิบัติการวิเคราะห์อาหารสัตว์',
            name_en: 'Animal Feed Analysis Laboratory',
            short_code: 'ห.ปฏิ.อาหารสัตว์',
            parent_unit: 'ห้องปฏิบัติการ'
        },
        {
            name_th: 'บริการวิชาการของฝ่ายปฏิบัติการวิจัยฯ',
            name_en: 'Academic Services of Research Operations',
            short_code: 'บวก.',
            parent_unit: 'ห้องปฏิบัติการ'
        },

        // Sub-units under อื่นๆ
        {
            name_th: 'ฝ่ายเครื่องจักรกลการเกษตรแห่งชาติ',
            name_en: 'National Agricultural Machinery Division',
            short_code: 'ฝจก.',
            parent_unit: 'อื่นๆ'
        },
        {
            name_th: 'โครงการวิชาบูรณาการ',
            name_en: 'Integrated Studies Program',
            short_code: 'ควบ.',
            parent_unit: 'อื่นๆ'
        },
        {
            name_th: 'โรงเรียนสาธิตแห่ง มก.กพส.',
            name_en: 'Kasetsart University Laboratory School Kamphaeng Saen',
            short_code: 'รร.สาธิต มก.กส.',
            parent_unit: 'อื่นๆ'
        }
    ]
};

async function insertAdditionalUnits() {
    try {
        console.log('🏛️ Inserting Additional KU Kamphaeng Saen Units...');

        // Insert units
        console.log('\n🏢 Creating additional units...');
        const unitIds = new Map();
        let unitCount = 0;

        for (const unit of additionalUnitsData.units) {
            // Check if unit already exists
            let existingUnit = await prisma.units.findFirst({
                where: { name_th: unit.name_th }
            });

            let createdUnit;
            if (existingUnit) {
                // Update existing unit
                createdUnit = await prisma.units.update({
                    where: { unit_id: existingUnit.unit_id },
                    data: {
                        name_en: unit.name_en,
                        short_code: unit.short_code,
                        updated_at: new Date()
                    }
                });
                console.log(`🔄 Updated: ${unit.name_th}`);
            } else {
                // Create new unit
                createdUnit = await prisma.units.create({
                    data: {
                        name_th: unit.name_th,
                        name_en: unit.name_en,
                        short_code: unit.short_code,
                        created_at: new Date(),
                        updated_at: new Date()
                    }
                });
                console.log(`✅ Created: ${unit.name_th}`);
            }

            unitIds.set(unit.name_th, createdUnit.unit_id);
            unitCount++;

        }

        // Insert sub-units
        console.log('\n🏢 Creating sub-units...');
        let subUnitCount = 0;

        for (const subUnit of additionalUnitsData.subUnits) {
            const parentUnitId = unitIds.get(subUnit.parent_unit);

            if (parentUnitId) {
                // Check if sub-unit already exists
                let existingSubUnit = await prisma.sub_units.findFirst({
                    where: {
                        unit_id: parentUnitId,
                        name_th: subUnit.name_th
                    }
                });

                if (existingSubUnit) {
                    // Update existing sub-unit
                    await prisma.sub_units.update({
                        where: { sub_unit_id: existingSubUnit.sub_unit_id },
                        data: {
                            name_en: subUnit.name_en,
                            short_code: subUnit.short_code,
                            updated_at: new Date()
                        }
                    });
                    console.log(`🔄 Updated: ${subUnit.name_th} (${subUnit.parent_unit})`);
                } else {
                    // Create new sub-unit
                    await prisma.sub_units.create({
                        data: {
                            name_th: subUnit.name_th,
                            name_en: subUnit.name_en,
                            short_code: subUnit.short_code,
                            unit_id: parentUnitId,
                            created_at: new Date(),
                            updated_at: new Date()
                        }
                    });
                    console.log(`✅ Created: ${subUnit.name_th} (${subUnit.parent_unit})`);
                }

                subUnitCount++;
            } else {
                console.log(`❌ Parent unit not found for: ${subUnit.name_th}`);
            }
        }

        // Summary
        const totalUnits = await prisma.units.count();
        const totalSubUnits = await prisma.sub_units.count();

        console.log('\n🎯 Additional Units Summary:');
        console.log(`🏛️ Units created/updated: ${unitCount}`);
        console.log(`🏢 Sub-units created/updated: ${subUnitCount}`);
        console.log(`📊 Total units in database: ${totalUnits}`);
        console.log(`📊 Total sub-units in database: ${totalSubUnits}`);

        console.log('\n📋 Unit Structure:');
        console.log('🔬 ศูนย์ (Centers):');
        console.log('  • ศูนย์ข้อมูลเทคโนโลยีชีวภาพ');
        console.log('  • ศูนย์เทคโนโลยีชีวภาพเกษตร');
        console.log('  • ศูนย์วิทยาศาสตร์ข้าว');
        console.log('  • ศูนย์สาธิตการผลิตโคเนื้อครบวงจร');
        console.log('  • ศูนย์ความเป็นเลิศทางวิชาการด้านไหม');
        console.log('  • ศูนย์ปฏิบัติการ DNA เทคโนโลยี');

        console.log('\n🧪 ห้องปฏิบัติการ (Laboratories):');
        console.log('  • ห้องปฏิบัติการการวิเคราะห์ดิน น้ำ ปุ๋ย และพืช');
        console.log('  • ห้องปฏิบัติการวิเคราะห์อาหารสัตว์');
        console.log('  • บริการวิชาการของฝ่ายปฏิบัติการวิจัยฯ');

        console.log('\n📚 สำนักส่งเสริมและฝึกอบรม กำแพงแสน (Independent Unit)');

        console.log('\n🏢 อื่นๆ (Others):');
        console.log('  • ฝ่ายเครื่องจักรกลการเกษตรแห่งชาติ');
        console.log('  • โครงการวิชาบูรณาการ');
        console.log('  • โรงเรียนสาธิตแห่ง มก.กพส.');

        console.log('\n🎉 Additional organizational units inserted successfully!');

    } catch (error) {
        console.error('❌ Error inserting additional units:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
if (require.main === module) {
    insertAdditionalUnits()
        .then(() => {
            console.log('Script completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Script failed:', error);
            process.exit(1);
        });
}

module.exports = { insertAdditionalUnits };