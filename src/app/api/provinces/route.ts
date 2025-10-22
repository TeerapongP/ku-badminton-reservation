import { PrismaClient } from '../../../generated/prisma';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const districtId = searchParams.get('districtId');
        const take = parseInt(searchParams.get('take') || '10');
        const skip = parseInt(searchParams.get('skip') || '0');

        if (!districtId) {
            return NextResponse.json(
                { error: 'districtId parameter is required' },
                { status: 400 }
            );
        }

        // Find the district first to get its province
        const district = await prisma.districts.findUnique({
            where: {
                district_id: BigInt(districtId)
            },
            include: {
                provinces: true
            }
        });

        if (!district) {
            return NextResponse.json(
                { error: 'District not found' },
                { status: 404 }
            );
        }

        // Format the response
        const formattedResult = {
            province_id: Number(district.provinces.province_id),
            name_th: district.provinces.name_th,
            name_en: district.provinces.name_en,
            label: district.provinces.name_th,
            value: String(district.provinces.province_id)
        };

        return NextResponse.json({
            data: [formattedResult],
            total: 1,
            query: {
                districtId,
                take,
                skip
            }
        });

    } catch (error) {
        console.error('Error fetching provinces:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
    }
}