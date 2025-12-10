import React from 'react';
import { MapPin } from 'lucide-react';
import { DropdownField } from '@/components/DropdownField';

interface Facility {
    facility_id: string;
    facility_code: string;
    name_th: string;
    name_en: string | null;
    active: boolean;
    image_path: string | null;
}

interface FacilitySelectorProps {
    facilities: Facility[];
    selectedFacility: string;
    selectedFacilityData: Facility | undefined;
    onFacilityChange: (facilityId: string) => void;
}

export const FacilitySelector: React.FC<FacilitySelectorProps> = ({
    facilities,
    selectedFacility,
    selectedFacilityData,
    onFacilityChange
}) => {
    return (
        <div className="tw-bg-white tw-rounded-2xl tw-shadow-xl tw-p-6 tw-mb-8 tw-border tw-border-gray-100">
            <h2 className="tw-text-2xl tw-font-semibold tw-text-gray-900 tw-mb-4 tw-flex tw-items-center tw-gap-2">
                <MapPin className="tw-w-6 tw-h-6 tw-text-indigo-600" />
                เลือกอาคาร
            </h2>
            <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-3 tw-gap-6 tw-items-end">
                <DropdownField
                    label="อาคาร"
                    value={selectedFacility}
                    onChange={onFacilityChange}
                    options={facilities.map(facility => ({
                        label: facility.name_th,
                        value: facility.facility_id
                    }))}
                    required
                />
                {selectedFacilityData && (
                    <div className="tw-col-span-1 md:tw-col-span-2 tw-flex tw-items-center tw-gap-4 tw-p-3 tw-bg-gray-50 tw-rounded-lg tw-border tw-border-gray-200">
                        <span className="tw-font-medium tw-text-gray-700">อาคาร: {selectedFacilityData.name_th}</span>
                        <span className={`tw-px-3 tw-py-1 tw-rounded-full tw-text-sm tw-font-medium ${
                            selectedFacilityData.active 
                                ? 'tw-bg-green-100 tw-text-green-800' 
                                : 'tw-bg-red-100 tw-text-red-800'
                        }`}>
                            {selectedFacilityData.active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};