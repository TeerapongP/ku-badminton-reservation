import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const subDistrict = searchParams.get('subDistrict');
        const take = parseInt(searchParams.get('take') || '10');
        const skip = parseInt(searchParams.get('skip') || '0');

        if (!subDistrict) {
            return NextResponse.json(
                { error: 'subDistrict parameter is required' },
                { status: 400 }
            );
        }

        // Search for sub-districts that match the name
        const subDistricts = await prisma.sub_districts.findMany({
            where: {
                name_th: {
                    contains: subDistrict
                }
            },
            include: {
                districts: {
                    include: {
                        provinces: true
                    }
                },
                postcodes: true
            },
            take,
            skip,
            orderBy: [
                { name_th: 'asc' },
                { sub_district_id: 'asc' }
            ],
            distinct: ['sub_district_id'] // Ensure unique sub-districts
        });

        // Format the response
        const formattedResults = subDistricts.map(subDist => ({
            sub_district_id: Number(subDist.sub_district_id),
            name_th: subDist.name_th,
            label: subDist.name_th,
            value: String(subDist.sub_district_id),
            district: {
                district_id: Number(subDist.districts.district_id),
                name_th: subDist.districts.name_th
            },
            province: {
                province_id: Number(subDist.districts.provinces.province_id),
                name_th: subDist.districts.provinces.name_th,
                name_en: subDist.districts.provinces.name_en
            },
            postcodes: subDist.postcodes.map((pc: any) => pc.postcode)
        }));

        return NextResponse.json({
            data: formattedResults,
            total: formattedResults.length,
            query: {
                subDistrict,
                take,
                skip
            }
        });

    } catch (error) {
        console.error('Error fetching sub-districts:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
    }
}