import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/Button';
import { InputField } from '@/components/InputField';
import { ModalWrapper } from './ModalWrapper';

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
                <div className="tw-bg-indigo-50 tw-rounded-xl tw-p-4 tw-border tw-border-indigo-200">
                    <h4 className="tw-font-bold tw-text-indigo-800 tw-mb-2">สนามที่เลือก ({selectedCourts.length} สนาม):</h4>
                    <ul className="tw-space-y-1 tw-max-h-32 tw-overflow-y-auto">
                        {selectedCourtNames.map((name: string, index: number) => (
                            <li key={`court-name-${name}-${index}`} className="tw-text-sm tw-text-indigo-700">
                                • {name}
                            </li>
                        ))}
                    </ul>
                </div>

                <div>
                    <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700 tw-mb-1">
                        วันที่จอง
                    </label>
                    <input
                        type="date"
                        value={multiBookingForm.booking_date}
                        onChange={(e) => setMultiBookingForm((prev) => ({ ...prev, booking_date: e.target.value }))}
                        min={new Date().toISOString().split('T')[0]}
                        required
                        className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-md tw-shadow-sm focus:tw-outline-none focus:tw-ring-indigo-500 focus:tw-border-indigo-500"
                    />
                </div>
                
                <div className="tw-grid tw-grid-cols-2 tw-gap-4">
                    <div>
                        <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700 tw-mb-1">
                            เวลาเริ่มต้น
                        </label>
                        <input
                            type="time"
                            value={multiBookingForm.start_time}
                            onChange={(e) => setMultiBookingForm((prev) => ({ ...prev, start_time: e.target.value }))}
                            required
                            className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-md tw-shadow-sm focus:tw-outline-none focus:tw-ring-indigo-500 focus:tw-border-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700 tw-mb-1">
                            เวลาสิ้นสุด
                        </label>
                        <input
                            type="time"
                            value={multiBookingForm.end_time}
                            onChange={(e) => setMultiBookingForm((prev) => ({ ...prev, end_time: e.target.value }))}
                            required
                            className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-md tw-shadow-sm focus:tw-outline-none focus:tw-ring-indigo-500 focus:tw-border-indigo-500"
                        />
                    </div>
                </div>

                <InputField
                    label="หมายเหตุ (ไม่บังคับ)"
                    value={multiBookingForm.note}
                    onChange={(value) => setMultiBookingForm((prev) => ({ ...prev, note: value as string }))}
                    placeholder="หมายเหตุเพิ่มเติม"
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
                        className="tw-flex-1"
                        disabled={selectedCourts.length === 0 || !multiBookingForm.booking_date || !multiBookingForm.start_time || !multiBookingForm.end_time || submitting}
                    >
                        {submitting ? 'กำลังจอง...' : 'จองสนาม'}
                    </Button>
                </div>
            </form>
        </ModalWrapper>
    );
};