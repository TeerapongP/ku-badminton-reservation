import { PrismaClient } from '../../../generated/prisma';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const subDistrictId = searchParams.get('subDistrictId');
        const take = parseInt(searchParams.get('take') || '10');
        const skip = parseInt(searchParams.get('skip') || '0');

        if (!subDistrictId) {
            return NextResponse.json(
                { error: 'subDistrictId parameter is required' },
                { status: 400 }
            );
        }

        // Find the sub-district first to get its district
        const subDistrict = await prisma.sub_districts.findUnique({
            where: {
                sub_district_id: BigInt(subDistrictId)
            },
            include: {
                districts: {
                    include: {
                        provinces: true
                    }
                }
            }
        });

        if (!subDistrict) {
            return NextResponse.json(
                { error: 'Sub-district not found' },
                { status: 404 }
            );
        }

        // Format the response
        const formattedResult = {
            district_id: Number(subDistrict.districts.district_id),
            name_th: subDistrict.districts.name_th,
            label: subDistrict.districts.name_th,
            value: String(subDistrict.districts.district_id),
            province: {
                province_id: Number(subDistrict.districts.provinces.province_id),
                name_th: subDistrict.districts.provinces.name_th,
                name_en: subDistrict.districts.provinces.name_en
            }
        };

        return NextResponse.json({
            data: [formattedResult],
            total: 1,
            query: {
                subDistrictId,
                take,
                skip
            }
        });

    } catch (error) {
        console.error('Error fetching districts:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
    }
}