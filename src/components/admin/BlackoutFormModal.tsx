import React from 'react';
import { EyeOff } from 'lucide-react';
import { Button } from '@/components/Button';
import { InputField } from '@/components/InputField';
import { DropdownField } from '@/components/DropdownField';
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

    const getSplitDateTime = (dt: string) => {
        const parts = dt.split('T');
        return { 
            date: parts[0] || new Date().toISOString().split('T')[0], 
            time: parts[1] || '' 
        };
    };

    const startSplit = getSplitDateTime(blackoutForm.start_datetime);
    const endSplit = getSplitDateTime(blackoutForm.end_datetime);

    const handleDateChange = (type: 'start' | 'end', dateValue: string) => {
        setBlackoutForm((prev) => {
            const currentDateTime = prev[type === 'start' ? 'start_datetime' : 'end_datetime'];
            const currentTime = currentDateTime.split('T')[1] || (type === 'start' ? '00:00' : '23:59');
            return {
                ...prev,
                [type === 'start' ? 'start_datetime' : 'end_datetime']: `${dateValue}T${currentTime}`
            };
        });
    };

    const handleTimeChange = (type: 'start' | 'end', timeValue: string) => {
        setBlackoutForm((prev) => {
            const currentDateTime = prev[type === 'start' ? 'start_datetime' : 'end_datetime'];
            const currentDate = currentDateTime.split('T')[0] || new Date().toISOString().split('T')[0];
            return {
                ...prev,
                [type === 'start' ? 'start_datetime' : 'end_datetime']: `${currentDate}T${timeValue}`
            };
        });
    };

    return (
        <ModalWrapper 
            title={<><EyeOff className="tw-w-5 tw-h-5 tw-text-red-600" /> ปิดสนาม</>} 
            onClose={onClose}
        >
            <form onSubmit={handleCreateBlackout} className="tw-space-y-5">
                <DropdownField
                    label="สนามที่ต้องการปิด"
                    value={blackoutForm.court_id}
                    onChange={(value: string | number) => setBlackoutForm((prev) => ({ ...prev, court_id: String(value) }))}
                    options={[
                        { label: `ปิดทั้งอาคาร (${selectedFacility?.name_th})`, value: '' },
                        ...courts.map((court: { name: any; court_code: any; court_id: any; }) => ({
                            label: court.name || `สนาม ${court.court_code}`,
                            value: court.court_id
                        }))
                    ]}
                />

                <div className="tw-grid tw-grid-cols-2 tw-gap-4">
                    {/* Start Date */}
                    <div>
                        <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700 tw-mb-1">
                            วันที่เริ่มต้น
                        </label>
                        <input
                            type="date"
                            value={startSplit.date}
                            onChange={(e) => handleDateChange('start', e.target.value)}
                            required
                            className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-md tw-shadow-sm focus:tw-outline-none focus:tw-ring-indigo-500 focus:tw-border-indigo-500"
                        />
                    </div>
                    {/* Start Time */}
                    <div>
                        <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700 tw-mb-1">
                            เวลาเริ่มต้น
                        </label>
                        <input
                            type="time"
                            value={startSplit.time}
                            onChange={(e) => handleTimeChange('start', e.target.value)}
                            required
                            className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-md tw-shadow-sm focus:tw-outline-none focus:tw-ring-indigo-500 focus:tw-border-indigo-500"
                        />
                    </div>
                </div>
                
                <div className="tw-grid tw-grid-cols-2 tw-gap-4">
                    {/* End Date */}
                    <div>
                        <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700 tw-mb-1">
                            วันที่สิ้นสุด
                        </label>
                        <input
                            type="date"
                            value={endSplit.date}
                            onChange={(e) => handleDateChange('end', e.target.value)}
                            required
                            className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-md tw-shadow-sm focus:tw-outline-none focus:tw-ring-indigo-500 focus:tw-border-indigo-500"
                        />
                    </div>
                    {/* End Time */}
                    <div>
                        <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700 tw-mb-1">
                            เวลาสิ้นสุด
                        </label>
                        <input
                            type="time"
                            value={endSplit.time}
                            onChange={(e) => handleTimeChange('end', e.target.value)}
                            required
                            className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-md tw-shadow-sm focus:tw-outline-none focus:tw-ring-indigo-500 focus:tw-border-indigo-500"
                        />
                    </div>
                </div>

                <InputField
                    label="เหตุผล (ไม่บังคับ)"
                    value={blackoutForm.reason}
                    onChange={(value: string | number) => setBlackoutForm((prev) => ({ ...prev, reason: String(value) }))}
                    placeholder="ระบุเหตุผลในการปิดสนาม"
                />

                <div className="tw-flex tw-gap-3 tw-pt-4">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        className="tw-flex-1"
                        disabled={submitting}
                    >
                        ยกเลิก
                    </Button>
                    <Button
                        type="submit"
                        className="tw-flex-1 tw-bg-red-600 hover:tw-bg-red-700 focus:tw-ring-red-500"
                        disabled={!blackoutForm.start_datetime || !blackoutForm.end_datetime || submitting}
                    >
                        {submitting ? 'กำลังปิดสนาม...' : 'ปิดสนาม'}
                    </Button>
                </div>
            </form>
        </ModalWrapper>
    );
};