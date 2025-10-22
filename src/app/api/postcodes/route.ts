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

        // Search for postcodes by sub-district ID
        const postcodes = await prisma.postcodes.findMany({
            where: {
                sub_district_id: BigInt(subDistrictId)
            },
            include: {
                sub_districts: {
                    include: {
                        districts: {
                            include: {
                                provinces: true
                            }
                        }
                    }
                }
            },
            take,
            skip,
            orderBy: {
                postcode: 'asc'
            }
        });

        // Format the response
        const formattedResults = postcodes.map(pc => ({
            postcode_id: Number(pc.postcode_id),
            postcode: pc.postcode,
            label: pc.postcode,
            value: pc.postcode,
            sub_district: {
                sub_district_id: Number(pc.sub_districts.sub_district_id),
                name_th: pc.sub_districts.name_th
            },
            district: {
                district_id: Number(pc.sub_districts.districts.district_id),
                name_th: pc.sub_districts.districts.name_th
            },
            province: {
                province_id: Number(pc.sub_districts.districts.provinces.province_id),
                name_th: pc.sub_districts.districts.provinces.name_th,
                name_en: pc.sub_districts.districts.provinces.name_en
            }
        }));

        return NextResponse.json({
            data: formattedResults,
            total: formattedResults.length,
            query: {
                subDistrictId,
                take,
                skip
            }
        });

    } catch (error) {
        console.error('Error fetching postcodes:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
    }
}