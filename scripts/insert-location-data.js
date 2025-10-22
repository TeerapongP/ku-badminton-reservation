const { PrismaClient } = require('../src/generated/prisma');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function insertLocationData() {
    try {
        console.log('Starting location data insertion...');

        // Read CSV file
        const csvPath = path.join(__dirname, '../prisma/ThepExcel-Thailand-Tambon.xlsx - TambonDatabase.csv');
        const csvContent = fs.readFileSync(csvPath, 'utf-8');
        const lines = csvContent.trim().split('\n');

        // Skip header row
        const dataLines = lines.slice(1);

        // Maps to track unique entries and their IDs
        const provinceMap = new Map();
        const districtMap = new Map();
        const subDistrictMap = new Map();

        console.log(`Processing ${dataLines.length} records...`);

        // Process each line
        for (let i = 0; i < dataLines.length; i++) {
            const line = dataLines[i];
            if (!line.trim()) continue;

            const [tambonThai, districtThai, provinceThai, provinceEng, postcode] = line.split(',');

            if (!tambonThai || !districtThai || !provinceThai || !postcode) {
                console.warn(`Skipping invalid line ${i + 2}: ${line}`);
                continue;
            }

            // Clean data
            const cleanProvinceThai = provinceThai.trim();
            const cleanProvinceEng = provinceEng ? provinceEng.trim() : null;
            const cleanDistrictThai = districtThai.trim();
            const cleanTambonThai = tambonThai.trim();
            const cleanPostcode = postcode.trim();

            // Insert or get province
            let provinceId;
            if (provinceMap.has(cleanProvinceThai)) {
                provinceId = provinceMap.get(cleanProvinceThai);
            } else {
                // Check if province exists
                let province = await prisma.provinces.findUnique({
                    where: { name_th: cleanProvinceThai }
                });

                if (!province) {
                    province = await prisma.provinces.create({
                        data: {
                            name_th: cleanProvinceThai,
                            name_en: cleanProvinceEng
                        }
                    });
                    console.log(`Created province: ${cleanProvinceThai}`);
                }

                provinceId = province.province_id;
                provinceMap.set(cleanProvinceThai, provinceId);
            }

            // Insert or get district
            const districtKey = `${cleanDistrictThai}-${provinceId}`;
            let districtId;
            if (districtMap.has(districtKey)) {
                districtId = districtMap.get(districtKey);
            } else {
                // Check if district exists
                let district = await prisma.districts.findFirst({
                    where: {
                        name_th: cleanDistrictThai,
                        province_id: provinceId
                    }
                });

                if (!district) {
                    district = await prisma.districts.create({
                        data: {
                            name_th: cleanDistrictThai,
                            province_id: provinceId
                        }
                    });
                    console.log(`Created district: ${cleanDistrictThai} in ${cleanProvinceThai}`);
                }

                districtId = district.district_id;
                districtMap.set(districtKey, districtId);
            }

            // Insert or get sub-district
            const subDistrictKey = `${cleanTambonThai}-${districtId}`;
            let subDistrictId;
            if (subDistrictMap.has(subDistrictKey)) {
                subDistrictId = subDistrictMap.get(subDistrictKey);
            } else {
                // Check if sub-district exists
                let subDistrict = await prisma.sub_districts.findFirst({
                    where: {
                        name_th: cleanTambonThai,
                        district_id: districtId
                    }
                });

                if (!subDistrict) {
                    subDistrict = await prisma.sub_districts.create({
                        data: {
                            name_th: cleanTambonThai,
                            district_id: districtId
                        }
                    });
                    console.log(`Created sub-district: ${cleanTambonThai} in ${cleanDistrictThai}`);
                }

                subDistrictId = subDistrict.sub_district_id;
                subDistrictMap.set(subDistrictKey, subDistrictId);
            }

            // Insert postcode if it doesn't exist
            const existingPostcode = await prisma.postcodes.findFirst({
                where: {
                    sub_district_id: subDistrictId,
                    postcode: cleanPostcode
                }
            });

            if (!existingPostcode) {
                await prisma.postcodes.create({
                    data: {
                        sub_district_id: subDistrictId,
                        postcode: cleanPostcode
                    }
                });
            }

            if ((i + 1) % 100 === 0) {
                console.log(`Processed ${i + 1}/${dataLines.length} records...`);
            }
        }

        console.log('Location data insertion completed successfully!');

        // Print summary
        const provinceCount = await prisma.provinces.count();
        const districtCount = await prisma.districts.count();
        const subDistrictCount = await prisma.sub_districts.count();
        const postcodeCount = await prisma.postcodes.count();

        console.log('\nSummary:');
        console.log(`Provinces: ${provinceCount}`);
        console.log(`Districts: ${districtCount}`);
        console.log(`Sub-districts: ${subDistrictCount}`);
        console.log(`Postcodes: ${postcodeCount}`);

    } catch (error) {
        console.error('Error inserting location data:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
if (require.main === module) {
    insertLocationData()
        .then(() => {
            console.log('Script completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Script failed:', error);
            process.exit(1);
        });
}

module.exports = { insertLocationData };