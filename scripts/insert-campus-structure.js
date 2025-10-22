const { PrismaClient } = require('../src/generated/prisma');

const prisma = new PrismaClient();

// Campus organizational structure
const campusStructureData = {
    unit: {
        name_th: 'สำนักงานวิทยาเขตกำแพงแสน',
        name_en: 'Kamphaeng Saen Campus Office',
        short_code: 'สวก.'
    },

    subUnits: [
        {
            name_th: 'กองบริหารทั่วไป',
            name_en: 'General Administration Division',
            short_code: 'กบท.'
        },
        {
            name_th: 'กองบริหารการศึกษา',
            name_en: 'Academic Affairs Division',
            short_code: 'กบศ.'
        },
        {
            name_th: 'กองบริหารการวิจัยและบริการวิชาการ',
            name_en: 'Research and Academic Services Division',
            short_code: 'กบว.'
        },
        {
            name_th: 'กองบริการกลาง',
            name_en: 'Central Services Division',
            short_code: 'กบก.'
        },
        {
            name_th: 'กองบริหารกิจการนิสิต',
            name_en: 'Student Affairs Division',
            short_code: 'กบน.'
        },
        {
            name_th: 'กองบริหารทรัพย์สิน',
            name_en: 'Property Management Division',
            short_code: 'กบส.'
        },
        {
            name_th: 'กองบริหารการกีฬา ท่องเที่ยว และศิลปวัฒนธรรม',
            name_en: 'Sports, Tourism and Arts Culture Division',
            short_code: 'กกท.'
        },
        {
            name_th: 'สถานพยาบาลมหาวิทยาลัยเกษตรศาสตร์ กำแพงแสน',
            name_en: 'Kasetsart University Hospital Kamphaeng Saen',
            short_code: 'รพ.มก.กส.'
        },
        {
            name_th: 'สำนักงานบริหารจัดการทรัพยากรการเรียนรู้',
            name_en: 'Learning Resource Management Office',
            short_code: 'สบท.'
        }
    ]
};

async function insertCampusStructure() {
    try {
        console.log('🏛️ Inserting KU Kamphaeng Saen Campus Structure...');

        // Insert main unit
        console.log('\n🏢 Creating main unit...');

        // Check if main unit already exists
        let existingMainUnit = await prisma.units.findFirst({
            where: { name_th: campusStructureData.unit.name_th }
        });

        let mainUnit;
        if (existingMainUnit) {
            // Update existing unit
            mainUnit = await prisma.units.update({
                where: { unit_id: existingMainUnit.unit_id },
                data: {
                    name_en: campusStructureData.unit.name_en,
                    short_code: campusStructureData.unit.short_code,
                    updated_at: new Date()
                }
            });
            console.log(`🔄 Updated: ${campusStructureData.unit.name_th}`);
        } else {
            // Create new unit
            mainUnit = await prisma.units.create({
                data: {
                    name_th: campusStructureData.unit.name_th,
                    name_en: campusStructureData.unit.name_en,
                    short_code: campusStructureData.unit.short_code,
                    created_at: new Date(),
                    updated_at: new Date()
                }
            });
            console.log(`✅ Created: ${campusStructureData.unit.name_th}`);
        }

        // Insert sub-units
        console.log('\n🏢 Creating sub-units...');
        let subUnitCount = 0;

        for (const subUnit of campusStructureData.subUnits) {
            // Check if sub-unit already exists
            let existingSubUnit = await prisma.sub_units.findFirst({
                where: {
                    unit_id: mainUnit.unit_id,
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
                console.log(`🔄 Updated: ${subUnit.name_th}`);
            } else {
                // Create new sub-unit
                await prisma.sub_units.create({
                    data: {
                        name_th: subUnit.name_th,
                        name_en: subUnit.name_en,
                        short_code: subUnit.short_code,
                        unit_id: mainUnit.unit_id,
                        created_at: new Date(),
                        updated_at: new Date()
                    }
                });
                console.log(`✅ Created: ${subUnit.name_th}`);
            }

            subUnitCount++;
        }

        // Summary
        const totalUnits = await prisma.units.count();
        const totalSubUnits = await prisma.sub_units.count();

        console.log('\n🎯 Campus Structure Summary:');
        console.log(`🏛️ Main unit: ${campusStructureData.unit.name_th}`);
        console.log(`🏢 Sub-units created/updated: ${subUnitCount}`);
        console.log(`📊 Total units in database: ${totalUnits}`);
        console.log(`📊 Total sub-units in database: ${totalSubUnits}`);

        console.log('\n📋 Sub-units under Campus Office:');
        campusStructureData.subUnits.forEach((subUnit, index) => {
            console.log(`${index + 1}. ${subUnit.name_th} (${subUnit.short_code})`);
        });

        console.log('\n🎉 Campus organizational structure inserted successfully!');

    } catch (error) {
        console.error('❌ Error inserting campus structure:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
if (require.main === module) {
    insertCampusStructure()
        .then(() => {
            console.log('Script completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Script failed:', error);
            process.exit(1);
        });
}

module.exports = { insertCampusStructure };