import React from 'react';
import { EyeOff } from 'lucide-react';
import { Button } from '@/components/Button';
import { InputField } from '@/components/InputField';
import { DropdownField } from '@/components/DropdownField';
import { DateField } from '@/components/DateField'; // ใช้ DateField ตัวใหม่
import { ModalWrapper } from './ModalWrapper';
import { BlackoutFormModalProps } from '../../types/BlackoutForm';

export const BlackoutFormModal: React.FC<BlackoutFormModalProps> = ({
    show,
    courts,
    selectedFacility,
    blackoutForm,
    setBlackoutForm,
    handleCreateBlackout,
    submitting,
    onClose
}) => {
    if (!show) return null;

    // แยกวันที่และเวลาออกจาก ISO String
    const getSplitDateTime = (dt: string) => {
        const parts = dt.split('T');
        return {
            date: parts[0] || new Date().toISOString().split('T')[0],
            time: parts[1] || ''
        };
    };

    const startSplit = getSplitDateTime(blackoutForm.start_datetime);
    const endSplit = getSplitDateTime(blackoutForm.end_datetime);

    const handleDateChange = (type: 'start' | 'end', date: Date | null) => {
        if (!date) return;
        const dateValue = date.toISOString().split('T')[0];
        setBlackoutForm((prev) => {
            const field = type === 'start' ? 'start_datetime' : 'end_datetime';
            const currentTime = prev[field].split('T')[1] || (type === 'start' ? '00:00' : '23:59');
            return { ...prev, [field]: `${dateValue}T${currentTime}` };
        });
    };

    const handleTimeChange = (type: 'start' | 'end', time: Date | null) => {
        if (!time) return;
        const timeValue = time.toTimeString().slice(0, 5);
        setBlackoutForm((prev) => {
            const field = type === 'start' ? 'start_datetime' : 'end_datetime';
            const currentDate = prev[field].split('T')[0] || new Date().toISOString().split('T')[0];
            return { ...prev, [field]: `${currentDate}T${timeValue}` };
        });
    };

    return (
        <ModalWrapper
            title={<><EyeOff className="tw-w-6 tw-h-6 tw-text-red-600" /> ปิดสนาม</>}
            onClose={onClose}
        >
            <form onSubmit={handleCreateBlackout} className="tw-space-y-6">

                {/* เลือกสนาม */}
                <DropdownField
                    label="สนามที่ต้องการปิด"
                    value={blackoutForm.court_id}
                    onChange={(value: string | number) => setBlackoutForm((prev) => ({ ...prev, court_id: String(value) }))}
                    options={[
                        { label: `ปิดทั้งอาคาร (${selectedFacility?.name_th})`, value: '' },
                        ...courts.map((court) => ({
                            label: court.name || `สนาม ${court.court_code}`,
                            value: court.court_id
                        }))
                    ]}
                />

                {/* วันที่และเวลาเริ่มต้น */}
                <div className="tw-grid tw-grid-cols-2 tw-gap-4">
                    <div className="tw-flex tw-flex-col tw-gap-2">
                        <label className="tw-text-sm tw-font-bold tw-text-slate-600 tw-px-1">วันที่เริ่มต้น</label>
                        <div className="tw-bg-slate-50 tw-rounded-2xl tw-border tw-border-slate-200 focus-within:tw-ring-4 focus-within:tw-ring-indigo-50 focus-within:tw-border-indigo-500 tw-transition-all">
                            <DateField
                                value={new Date(startSplit.date)}
                                onChange={(date) => handleDateChange('start', date)}
                                placeholder="เลือกวันที่"
                                showIcon={false}
                                className="tw-border-0 tw-bg-transparent"
                            />
                        </div>
                    </div>
                    <div className="tw-flex tw-flex-col tw-gap-2">
                        <label className="tw-text-sm tw-font-bold tw-text-slate-600 tw-px-1">เวลาเริ่มต้น</label>
                        <div className="tw-bg-slate-50 tw-rounded-2xl tw-border tw-border-slate-200 focus-within:tw-ring-4 focus-within:tw-ring-indigo-50 focus-within:tw-border-indigo-500 tw-transition-all">
                            <DateField
                                timeOnly
                                value={startSplit.time ? new Date(`1970-01-01T${startSplit.time}`) : null}
                                onChange={(time) => handleTimeChange('start', time)}
                                placeholder="00:00"
                                showIcon={false}
                                className="tw-border-0 tw-bg-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* วันที่และเวลาสิ้นสุด */}
                <div className="tw-grid tw-grid-cols-2 tw-gap-4">
                    <div className="tw-flex tw-flex-col tw-gap-2">
                        <label className="tw-text-sm tw-font-bold tw-text-slate-600 tw-px-1">วันที่สิ้นสุด</label>
                        <div className="tw-bg-slate-50 tw-rounded-2xl tw-border tw-border-slate-200 focus-within:tw-ring-4 focus-within:tw-ring-indigo-50 focus-within:tw-border-indigo-500 tw-transition-all">
                            <DateField
                                value={new Date(endSplit.date)}
                                onChange={(date) => handleDateChange('end', date)}
                                placeholder="เลือกวันที่"
                                showIcon={false}
                                minDate={new Date(startSplit.date)}
                                className="tw-border-0 tw-bg-transparent"
                            />
                        </div>
                    </div>
                    <div className="tw-flex tw-flex-col tw-gap-2">
                        <label className="tw-text-sm tw-font-bold tw-text-slate-600 tw-px-1">เวลาสิ้นสุด</label>
                        <div className="tw-bg-slate-50 tw-rounded-2xl tw-border tw-border-slate-200 focus-within:tw-ring-4 focus-within:tw-ring-indigo-50 focus-within:tw-border-indigo-500 tw-transition-all">
                            <DateField
                                timeOnly
                                value={endSplit.time ? new Date(`1970-01-01T${endSplit.time}`) : null}
                                onChange={(time) => handleTimeChange('end', time)}
                                placeholder="23:59"
                                showIcon={false}
                                minDate={startSplit.date === endSplit.date && startSplit.time ? new Date(`1970-01-01T${startSplit.time}`) : undefined}
                                className="tw-border-0 tw-bg-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* เหตุผล */}
                <InputField
                    label="เหตุผล (ไม่บังคับ)"
                    value={blackoutForm.reason}
                    onChange={(value) => setBlackoutForm((prev) => ({ ...prev, reason: String(value) }))}
                    placeholder="ระบุเหตุผลในการปิดสนาม"
                />

                {/* ปุ่ม Action */}
                {/* Action Buttons */}
                <div className="tw-flex tw-gap-4 tw-pt-6 tw-mt-2">
                    {/* ปุ่มยกเลิก - เน้นความเรียบง่ายแต่กดง่าย */}
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

                    {/* ปุ่มยืนยันปิดสนาม - ใช้สีแดงที่ดูชัดเจนแต่ไม่ดุจนเกินไป */}
                    <Button
                        type="submit"
                        disabled={!blackoutForm.start_datetime || !blackoutForm.end_datetime || submitting}
                        className="
            tw-flex-1 tw-h-12 
            tw-text-base tw-font-bold 
            tw-rounded-2xl tw-transition-all 
            tw-shadow-sm
            tw-border-0 tw-outline-none
            disabled:tw-opacity-40 disabled:tw-grayscale-[0.5]
        "
                        colorClass="tw-bg-red-600 tw-text-white hover:tw-bg-red-700"
                    >
                        {submitting ? (
                            <div className="tw-flex tw-items-center tw-justify-center tw-gap-2">
                                <div className="tw-w-4 tw-h-4 tw-border-2 tw-border-white/30 tw-border-t-white tw-rounded-full tw-animate-spin" />
                                <span>กำลังบันทึก...</span>
                            </div>
                        ) : (
                            'ยืนยันปิดสนาม'
                        )}
                    </Button>
                </div>
            </form>
        </ModalWrapper>
    );
};