import React from 'react';
import { Settings, EyeOff, Plus, CheckCircle2, Circle } from 'lucide-react';
import { Button } from '@/components/Button';
import Loading from '@/components/Loading';
import { Court } from '@/lib/Court';
import { Facility } from '@/lib/Facility';

interface CourtTableProps {
    courts: Court[];
    selectedCourts: string[];
    selectedFacilityData: Facility | undefined;
    courtsLoading: boolean;
    onCourtSelection: (courtId: string) => void;
    onSelectAllCourts: () => void;
    onShowBlackoutForm: () => void;
    onShowMultiBookingForm: () => void;
}

export const CourtTable: React.FC<CourtTableProps> = ({
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

            {/* Header Section */}
            <div className="tw-flex tw-flex-col sm:tw-flex-row tw-items-start sm:tw-items-center tw-justify-between tw-mb-6 tw-gap-4">
                <h2 className="tw-text-2xl tw-font-bold tw-text-slate-800 tw-flex tw-items-center tw-gap-3">
                    <Settings className="tw-w-6 tw-h-6 tw-text-indigo-700" />
                    สนามในอาคาร {selectedFacilityData?.name_th}
                </h2>

                <div className="tw-flex tw-gap-4">
                    <Button
                        onClick={onShowBlackoutForm}
                        disabled={courts.length === 0}
                        className="
            tw-flex-1 tw-h-12 
            tw-flex tw-items-center tw-justify-center tw-gap-2 
            tw-text-base tw-font-bold 
            tw-rounded-xl tw-shadow-sm
            tw-transition-colors tw-duration-200
            tw-border-0 tw-outline-none
            disabled:tw-opacity-40 disabled:tw-cursor-not-allowed
        "
                        colorClass="tw-bg-red-50 tw-text-red-600"
                    >
                        <EyeOff className="tw-w-5 tw-h-5" />
                        ปิดสนาม
                    </Button>
                    <Button
                        onClick={onShowMultiBookingForm}
                        disabled={selectedCourts.length === 0}
                        className="
            tw-flex-1 tw-h-12 
            tw-flex tw-items-center tw-justify-center tw-gap-2 
            tw-text-base tw-font-bold 
            tw-rounded-xl tw-shadow-sm
            tw-transition-colors tw-duration-200
            tw-border-0 tw-outline-none
            disabled:tw-opacity-40 disabled:tw-cursor-not-allowed
        "
                        colorClass="tw-bg-emerald-600 tw-text-white"
                    >
                        <Plus className="tw-w-5 tw-h-5" />
                        จองหลายสนาม ({selectedCourts.length})
                    </Button>
                </div>
            </div>

            {/* Selection Info Bar */}
            <div className="tw-relative tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-4 tw-mb-6 tw-p-5 tw-bg-gradient-to-r tw-from-indigo-50 tw-to-blue-50 tw-rounded-2xl tw-border tw-border-indigo-100 tw-shadow-sm">

                {/* Left Side: Stats with Icon */}
                <div className="tw-flex tw-items-center tw-gap-4">
                    <div className="tw-flex tw-items-center tw-justify-center tw-w-10 tw-h-10 tw-bg-white tw-rounded-xl tw-shadow-sm tw-border tw-border-indigo-200">
                        <CheckCircle2 className="tw-w-6 tw-h-6 tw-text-indigo-600" />
                    </div>
                    <div className="tw-flex tw-flex-col">
                        <span className="tw-text-xs tw-font-bold tw-text-indigo-400 tw-uppercase tw-tracking-wider">
                            สถานะการเลือก
                        </span>
                        <span className="tw-text-lg tw-font-bold tw-text-indigo-900 tw-leading-tight">
                            เลือกแล้ว <span className="tw-text-indigo-600">{selectedCourts.length}</span>
                            <span className="tw-mx-1 tw-text-indigo-300">/</span>
                            <span className="tw-text-slate-500">{activeCourts.length}</span> สนาม
                        </span>
                    </div>
                </div>

                {/* Right Side: Toggle Button */}
                <Button
                    onClick={onSelectAllCourts}
                    variant="secondary"
                    className="
            tw-group tw-flex tw-items-center tw-gap-2 
            tw-px-5 tw-py-2 tw-h-auto
            tw-font-bold tw-text-sm 
            tw-rounded-xl tw-transition-all tw-duration-300 
            tw-shadow-sm hover:tw-shadow-md
            tw-border-0 tw-outline-none
        "
                    colorClass={`
            ${isAllSelected
                            ? 'tw-bg-white tw-text-red-500 hover:tw-bg-red-50'
                            : 'tw-bg-indigo-600 tw-text-white hover:tw-bg-indigo-700'}
        `}
                >
                    {isAllSelected ? (
                        <EyeOff className="tw-w-4 tw-h-4 tw-transition-transform group-hover:tw-scale-110" />
                    ) : (
                        <Plus className="tw-w-4 tw-h-4 tw-transition-transform group-hover:tw-rotate-90" />
                    )}
                    {buttonText}
                </Button>

                {/* Decorative Background Element (Optional) */}
                <div className="tw-absolute tw-right-0 tw-top-0 tw-bottom-0 tw-w-32 tw-bg-gradient-to-l tw-from-indigo-100/20 tw-to-transparent tw-rounded-r-2xl tw-pointer-events-none" />
            </div>

            {/* Table Section */}
            <div className="tw-overflow-x-auto tw-rounded-xl tw-border tw-border-slate-200">
                <table className="tw-w-full tw-text-left tw-border-collapse">
                    <thead className="tw-bg-slate-50 tw-text-slate-600 tw-text-sm tw-uppercase">
                        <tr>
                            <th className="tw-px-6 tw-py-4 tw-font-bold tw-w-16">เลือก</th>
                            <th className="tw-px-6 tw-py-4 tw-font-bold">ชื่อสนาม</th>
                            <th className="tw-px-6 tw-py-4 tw-font-bold">ประเภท / รายละเอียด</th>
                            <th className="tw-px-6 tw-py-4 tw-font-bold">สถานะ</th>
                        </tr>
                    </thead>
                    <tbody className="tw-divide-y tw-divide-slate-100">
                        {courts.map((court) => {
                            const isSelected = selectedCourts.includes(court.court_id);
                            return (
                                <tr
                                    key={court.court_id}
                                    onClick={() => onCourtSelection(court.court_id)}
                                    className={`
                                        tw-cursor-pointer tw-transition-colors
                                        ${isSelected ? 'tw-bg-indigo-50/50' : 'hover:tw-bg-slate-50'}
                                    `}
                                >
                                    <td className="tw-px-6 tw-py-4">
                                        {isSelected ? (
                                            <CheckCircle2 className="tw-w-6 tw-h-6 tw-text-indigo-600" />
                                        ) : (
                                            <Circle className="tw-w-6 tw-h-6 tw-text-slate-300" />
                                        )}
                                    </td>
                                    <td className="tw-px-6 tw-py-4">
                                        <div className="tw-font-bold tw-text-slate-800 tw-text-lg">
                                            {court.name ?? `สนาม ${court.court_id}`}
                                        </div>
                                    </td>
                                    <td className="tw-px-6 tw-py-4">
                                        <span className="tw-text-sm tw-text-slate-500 tw-bg-slate-100 tw-px-2 tw-py-1 tw-rounded-md">
                                            {court.court_type ?? 'ทั่วไป'}
                                        </span>
                                    </td>
                                    <td className="tw-px-6 tw-py-4">
                                        {court.is_active ? (
                                            <span className="tw-inline-flex tw-items-center tw-px-2.5 tw-py-0.5 tw-rounded-full tw-text-xs tw-font-medium tw-bg-emerald-100 tw-text-emerald-800">
                                                เปิดให้บริการ
                                            </span>
                                        ) : (
                                            <span className="tw-inline-flex tw-items-center tw-px-2.5 tw-py-0.5 tw-rounded-full tw-text-xs tw-font-medium tw-bg-red-100 tw-text-red-800">
                                                ปิดให้บริการ
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};