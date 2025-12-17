import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/Button';
import { InputField } from '@/components/InputField';
import { ModalWrapper } from './ModalWrapper';
import { DateField } from '../DateField';

interface Court {
    court_id: string;
    court_code: string;
    name: string | null;
    is_active: boolean;
    image_path: string | null;
}

interface MultiBookingForm {
    booking_date: string;
    start_time: string;
    end_time: string;
    note: string;
}

interface MultiBookingFormModalProps {
    show: boolean;
    courts: Court[];
    selectedCourts: string[];
    multiBookingForm: MultiBookingForm;
    setMultiBookingForm: React.Dispatch<React.SetStateAction<MultiBookingForm>>;
    handleMultiBooking: (e: React.FormEvent) => void;
    submitting: boolean;
    onClose: () => void;
}

export const MultiBookingFormModal: React.FC<MultiBookingFormModalProps> = ({
    show,
    courts,
    selectedCourts,
    multiBookingForm,
    setMultiBookingForm,
    handleMultiBooking,
    submitting,
    onClose
}) => {
    if (!show) return null;

    const selectedCourtNames = selectedCourts.map((courtId: string) => {
        const court = courts.find((c) => c.court_id === courtId);
        return court?.name || `สนาม ${court?.court_code}`;
    });

    return (
        <ModalWrapper
            title={<><Plus className="tw-w-5 tw-h-5 tw-text-indigo-600" /> จองหลายสนาม</>}
            onClose={onClose}
        >
            <form onSubmit={handleMultiBooking} className="tw-space-y-5">
                <div className="tw-bg-slate-50 tw-rounded-2xl tw-p-5 tw-border tw-border-slate-100">
                    <div className="tw-flex tw-items-center tw-justify-between tw-mb-3">
                        <h4 className="tw-text-sm tw-font-bold tw-text-slate-500 tw-uppercase tw-tracking-wider">
                            สนามที่เลือก
                        </h4>
                        <span className="tw-bg-indigo-100 tw-text-indigo-700 tw-text-xs tw-font-bold tw-px-2.5 tw-py-1 tw-rounded-lg">
                            {selectedCourts.length} สนาม
                        </span>
                    </div>

                    {/* รายการสนามแบบ Badge Tags */}
                    <div className="tw-flex tw-flex-wrap tw-gap-2 tw-max-h-32 tw-overflow-y-auto tw-pr-2 custom-scrollbar">
                        {selectedCourtNames.length > 0 ? (
                            selectedCourtNames.map((name: string, index: number) => (
                                <div
                                    key={`court-tag-${name}-${index}`}
                                    className="
                        tw-flex tw-items-center tw-gap-1.5
                        tw-bg-white tw-border tw-border-slate-200 
                        tw-px-3 tw-py-1.5 tw-rounded-xl
                        tw-text-sm tw-font-medium tw-text-slate-700
                        tw-shadow-sm
                    "
                                >
                                    <div className="tw-w-1.5 tw-h-1.5 tw-bg-indigo-500 tw-rounded-full" />
                                    {name}
                                </div>
                            ))
                        ) : (
                            <span className="tw-text-sm tw-text-slate-400 tw-italic">ยังไม่ได้เลือกสนาม</span>
                        )}
                    </div>
                </div>
                <div className="tw-group tw-flex tw-flex-col tw-gap-2">
                    {/* Label with Icon */}
                    <div className="tw-flex tw-items-center tw-gap-2 tw-px-1">
                        <div className="tw-w-1 tw-h-4 tw-bg-indigo-500 tw-rounded-full" /> {/* เส้น Accent เล็กๆ ด้านหน้า */}
                        <label className="tw-text-sm tw-font-bold tw-text-slate-600 tw-tracking-wide">
                            วันที่จอง
                        </label>
                    </div>

                    {/* Input Wrapper */}
                    <div className="
        tw-relative tw-transition-all tw-duration-200
        tw-rounded-2xl tw-bg-slate-50 tw-border tw-border-slate-200
        focus-within:tw-bg-white focus-within:tw-border-indigo-500 focus-within:tw-ring-4 focus-within:tw-ring-indigo-50
    ">
                        <DateField
                            label=""
                            value={multiBookingForm.booking_date ? new Date(multiBookingForm.booking_date) : null}
                            onChange={(value) => setMultiBookingForm((prev) => ({
                                ...prev,
                                booking_date: value ? value.toISOString().split('T')[0] : ''
                            }))}
                            placeholder="เลือกวันที่ต้องการจอง"
                            // ถ้า DateField รองรับ className ลองส่งเข้าไปเพื่อลบขอบเดิมออกครับ
                            className="tw-w-full tw-bg-transparent tw-border-0 tw-px-4 tw-py-3 tw-text-slate-700 tw-placeholder-slate-400 focus:tw-ring-0"
                        />
                    </div>
                </div>

                <div className="tw-grid tw-grid-cols-2 tw-gap-4 tw-mt-4">
                    {/* เวลาเริ่มต้น */}
                    <div className="tw-flex tw-flex-col tw-gap-2">
                        <div className="tw-flex tw-items-center tw-gap-2 tw-px-1">
                            <div className="tw-w-1 tw-h-4 tw-bg-emerald-500 tw-rounded-full" />
                            <label className="tw-text-sm tw-font-bold tw-text-slate-600 tw-tracking-wide">
                                เวลาเริ่มต้น
                            </label>
                        </div>
                        <div className="tw-relative tw-transition-all tw-duration-200 tw-rounded-2xl tw-bg-slate-50 tw-border tw-border-slate-200 focus-within:tw-bg-white focus-within:tw-border-indigo-500 focus-within:tw-ring-4 focus-within:tw-ring-indigo-50">
                            <DateField
                                label=""
                                value={multiBookingForm.start_time ? new Date(`1970-01-01T${multiBookingForm.start_time}`) : null}
                                onChange={(value) => setMultiBookingForm((prev) => ({
                                    ...prev,
                                    start_time: value ? value.toTimeString().slice(0, 5) : ''
                                }))}
                                placeholder="00:00"
                                timeOnly={true}
                                minDate={new Date('1970-01-01T08:00:00')}
                                maxDate={new Date('1970-01-01T20:00:00')}
                                className="tw-w-full tw-bg-transparent tw-border-0 tw-px-4 tw-py-3 tw-text-slate-700 tw-font-medium tw-rounded-2xl focus:tw-ring-0 tw-outline-none"
                            />
                        </div>
                    </div>

                    {/* เวลาสิ้นสุด */}
                    <div className="tw-flex tw-flex-col tw-gap-2">
                        <div className="tw-flex tw-items-center tw-gap-2 tw-px-1">
                            <div className="tw-w-1 tw-h-4 tw-bg-red-400 tw-rounded-full" />
                            <label className="tw-text-sm tw-font-bold tw-text-slate-600 tw-tracking-wide">
                                เวลาสิ้นสุด
                            </label>
                        </div>
                        <div className="tw-relative tw-transition-all tw-duration-200 tw-rounded-2xl tw-bg-slate-50 tw-border tw-border-slate-200 focus-within:tw-bg-white focus-within:tw-border-indigo-500 focus-within:tw-ring-4 focus-within:tw-ring-indigo-50">
                            <DateField
                                label=""
                                value={multiBookingForm.end_time ? new Date(`1970-01-01T${multiBookingForm.end_time}`) : null}
                                onChange={(value) => setMultiBookingForm((prev) => ({
                                    ...prev,
                                    end_time: value ? value.toTimeString().slice(0, 5) : ''
                                }))}
                                placeholder="00:00"
                                timeOnly={true}
                                minDate={multiBookingForm.start_time ? new Date(`1970-01-01T${multiBookingForm.start_time}`) : new Date('1970-01-01T08:00:00')}
                                maxDate={new Date('1970-01-01T20:00:00')}
                                className="tw-w-full tw-bg-transparent tw-border-0 tw-px-4 tw-py-3 tw-text-slate-700 tw-font-medium tw-rounded-2xl focus:tw-ring-0 tw-outline-none"
                            />
                        </div>
                    </div>
                </div>

                <InputField
                    label="หมายเหตุ (ไม่บังคับ)"
                    value={multiBookingForm.note}
                    onChange={(value) => setMultiBookingForm((prev) => ({ ...prev, note: value as string }))}
                    placeholder="หมายเหตุเพิ่มเติม"
                />

                <div className="tw-flex tw-gap-4 tw-pt-6 tw-mt-2">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        disabled={submitting}
                        className="
            tw-flex-1 tw-h-12
            tw-text-base tw-font-bold
            tw-rounded-2xl tw-transition-colors
            tw-border-0 tw-outline-none
            disabled:tw-opacity-50
        "
                        colorClass="tw-bg-slate-100 tw-text-slate-600 hover:tw-bg-slate-200"
                    >
                        ยกเลิก
                    </Button>

                    <Button
                        type="submit"
                        disabled={selectedCourts.length === 0 || !multiBookingForm.booking_date || !multiBookingForm.start_time || !multiBookingForm.end_time || submitting}
                        className="
            tw-flex-1 tw-h-12
            tw-text-base tw-font-bold
            tw-rounded-2xl tw-transition-all
            tw-shadow-sm
            tw-border-0 tw-outline-none
            disabled:tw-opacity-40 disabled:tw-grayscale-[0.5]
        "
                        colorClass="tw-bg-indigo-600 tw-text-white hover:tw-bg-indigo-700"
                    >
                        {submitting ? (
                            <div className="tw-flex tw-items-center tw-justify-center tw-gap-2">
                                <div className="tw-w-4 tw-h-4 tw-border-2 tw-border-white/30 tw-border-t-white tw-rounded-full tw-animate-spin" />
                                <span>กำลังจอง...</span>
                            </div>
                        ) : (
                            'จองสนาม'
                        )}
                    </Button>
                </div>
            </form>
        </ModalWrapper>
    );
};