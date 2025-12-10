import React from 'react';
import { Settings, EyeOff, Plus } from 'lucide-react';
import { Button } from '@/components/Button';
import Loading from '@/components/Loading';
import { CourtCard } from './CourtCard';
import { Court } from '@/lib/Court';
import { Facility } from '@/lib/Facility';

interface CourtGridProps {
    courts: Court[];
    selectedCourts: string[];
    selectedFacilityData: Facility | undefined;
    courtsLoading: boolean;
    onCourtSelection: (courtId: string) => void;
    onSelectAllCourts: () => void;
    onShowBlackoutForm: () => void;
    onShowMultiBookingForm: () => void;
}

export const CourtGrid: React.FC<CourtGridProps> = ({
    courts,
    selectedCourts,
    selectedFacilityData,
    courtsLoading,
    onCourtSelection,
    onSelectAllCourts,
    onShowBlackoutForm,
    onShowMultiBookingForm
}) => {
    if (courtsLoading) {
        return (
            <div className="tw-bg-white tw-rounded-2xl tw-shadow-xl tw-p-6 tw-mb-8 tw-border tw-border-indigo-100">
                <div className="tw-flex tw-justify-center tw-py-12">
                    <Loading />
                </div>
            </div>
        );
    }

    if (courts.length === 0) {
        return (
            <div className="tw-bg-white tw-rounded-2xl tw-shadow-xl tw-p-6 tw-mb-8 tw-border tw-border-indigo-100">
                <div className="tw-text-center tw-py-12 tw-text-indigo-600 tw-bg-indigo-50 tw-rounded-xl tw-border tw-border-dashed tw-border-indigo-300">
                    ไม่พบสนามในอาคารนี้ กรุณาเลือกอาคารอื่น
                </div>
            </div>
        );
    }

    const activeCourts = courts.filter(c => c.is_active);
    const isAllSelected = selectedCourts.length === activeCourts.length;
    const buttonText = isAllSelected ? 'ยกเลิกเลือกทั้งหมด' : 'เลือกสนามที่เปิดทั้งหมด';

    return (
        <div className="tw-bg-white tw-rounded-2xl tw-shadow-xl tw-p-6 tw-mb-8 tw-border tw-border-indigo-100">

            <div className="tw-flex tw-flex-col sm:tw-flex-row tw-items-start sm:tw-items-center tw-justify-between tw-mb-6 tw-gap-4">
                <h2 className="tw-text-2xl tw-font-bold tw-text-slate-800 tw-flex tw-items-center tw-gap-3">
                    <Settings className="tw-w-6 tw-h-6 tw-text-indigo-700" />
                    สนามในอาคาร {selectedFacilityData?.name_th}
                </h2>

                <div className="tw-flex tw-gap-3">

                    {/* ปุ่มปิดสนาม */}
                    <Button
                        onClick={onShowBlackoutForm}
                        disabled={courts.length === 0}
                        className="
            tw-flex-1 tw-h-12 
            tw-flex tw-items-center tw-justify-center tw-gap-2
            tw-text-base tw-font-semibold
            tw-rounded-xl tw-shadow-md
            tw-transition-all tw-duration-200
            hover:tw-scale-105 hover:tw-shadow-lg
            active:tw-scale-95
            tw-border-0 tw-outline-none
            disabled:tw-opacity-50 disabled:tw-cursor-not-allowed
        "
                        colorClass="
            tw-bg-gradient-to-r tw-from-red-500 tw-to-red-600
            hover:tw-from-red-600 hover:tw-to-red-700
            tw-text-white
        "
                    >
                        <EyeOff className="tw-w-5 tw-h-5" />
                        ปิดสนาม
                    </Button>

                    {/* ปุ่มจองหลายสนาม */}
                    <Button
                        onClick={onShowMultiBookingForm}
                        disabled={selectedCourts.length === 0}
                        className="
            tw-flex-1 tw-h-12
            tw-flex tw-items-center tw-justify-center tw-gap-2
            tw-text-base tw-font-semibold
            tw-rounded-xl tw-shadow-md
            tw-transition-all tw-duration-200
            hover:tw-scale-105 hover:tw-shadow-lg
            active:tw-scale-95
            tw-border-0 tw-outline-none
            disabled:tw-opacity-50 disabled:tw-cursor-not-allowed
        "
                        colorClass="tw-bg-gradient-to-r tw-from-emerald-500 tw-to-emerald-600 hover:tw-from-emerald-600 hover:tw-to-emerald-700 tw-text-white focus:tw-ring-4 focus:tw-ring-emerald-300"

                    >
                        <Plus className="tw-w-5 tw-h-5" />
                        จองหลายสนาม ({selectedCourts.length})
                    </Button>

                </div>


            </div>

            <div className="tw-flex tw-items-center tw-gap-4 tw-mb-6 tw-p-4 tw-bg-indigo-50 tw-rounded-xl tw-border tw-border-indigo-200">
                <Button
                    onClick={onSelectAllCourts}
                    variant="secondary"
                    className="
        tw-flex tw-items-center tw-justify-center tw-gap-2
        tw-font-medium tw-text-sm tw-h-8 tw-px-3
        tw-rounded-lg tw-transition-all tw-duration-200
        tw-shadow-sm hover:tw-shadow-md
        tw-border-0 tw-outline-none focus:tw-outline-none
    "
                    colorClass="
        tw-bg-indigo-100
        tw-text-indigo-700
        hover:tw-bg-indigo-200
        focus:tw-ring-2 focus:tw-ring-indigo-300
    "
                >
                    {buttonText}
                </Button>

                <span className="tw-text-base tw-font-semibold tw-text-indigo-800">
                    เลือกแล้ว {selectedCourts.length} จาก {activeCourts.length} สนามที่เปิด
                </span>
            </div>

            <div
                className="
    tw-grid 
    tw-grid-cols-1 
    sm:tw-grid-cols-2 
    lg:tw-grid-cols-3 
    xl:tw-grid-cols-4 
    tw-gap-6 tw-mt-4
  "
            >
                {courts.map((court) => (
                    <div
                        key={court.court_id}
                        className="
        tw-transition-all tw-duration-300 
        tw-transform hover:tw-scale-[1.03]
        hover:tw-shadow-[0_4px_15px_rgba(79,70,229,0.35)]
        hover:tw-border hover:tw-border-indigo-300
        tw-rounded-xl
      "
                    >
                        <CourtCard
                            court={court}
                            isSelected={selectedCourts.includes(court.court_id)}
                            onSelect={onCourtSelection}
                            bgCorlor="
        /* Default State: ใช้ Sky Pastel Tone */
        tw-bg-sky-50 
        tw-text-gray-800
        tw-border tw-border-sky-200 
        tw-shadow-md tw-rounded-xl
    "
                            bgCorlorSelected="
        /* Selected State: ใช้ Indigo Pastel Tone ที่เข้มกว่าเล็กน้อย */
        tw-bg-indigo-100 
        tw-text-indigo-800
        tw-border-2 tw-border-indigo-600
        tw-shadow-xl tw-rounded-xl
    "
                        />
                    </div>
                ))}
            </div>

        </div>
    );
};