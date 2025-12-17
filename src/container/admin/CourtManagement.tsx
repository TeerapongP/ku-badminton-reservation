'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { useToast } from "@/components/ToastProvider";
import { Button } from '@/components/Button';
import Loading from '@/components/Loading';
import { BlackoutFormModal } from '@/components/admin/BlackoutFormModal';
import { FacilitySelector } from '@/components/admin/FacilitySelector';
import { MultiBookingFormModal } from '@/components/admin/MultiBookingFormModal';

import { Court } from '@/lib/Court';
import { Facility } from '@/lib/Facility';
import { CourtTable } from '@/components/admin/CourtTable';

// --- Main Component: CourtManagement ---
export default function CourtManagement() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const toast = useToast();

    const [facilities, setFacilities] = useState<Facility[]>([]);
    const [courts, setCourts] = useState<Court[]>([]);
    const [selectedFacility, setSelectedFacility] = useState<string>('');
    const [selectedCourts, setSelectedCourts] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [courtsLoading, setCourtsLoading] = useState(false);
    const [showBlackoutForm, setShowBlackoutForm] = useState(false);
    const [showMultiBookingForm, setShowMultiBookingForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Blackout form state
    const [blackoutForm, setBlackoutForm] = useState({
        court_id: '',
        start_datetime: '',
        end_datetime: '',
        reason: ''
    });

    // Multi-booking form state
    const [multiBookingForm, setMultiBookingForm] = useState({
        booking_date: '',
        start_time: '',
        end_time: '',
        note: ''
    });

    // --- Data Fetching Functions ---
    const fetchFacilities = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/facilities');
            const data = await response.json();

            if (data.success) {
                setFacilities(data.data);
            } else {
                toast?.showError("เกิดข้อผิดพลาด", "ไม่สามารถดึงข้อมูลอาคารได้");
            }
        } catch (error) {
            console.error('Error fetching facilities:', error);
            toast?.showError("เกิดข้อผิดพลาด", "ไม่สามารถดึงข้อมูลอาคารได้");
        } finally {
            setLoading(false);
        }
    }, [toast]);

    const fetchCourts = useCallback(async (facilityId: string) => {
        try {
            setCourtsLoading(true);
            const response = await fetch(`/api/courts?facilityId=${facilityId}`);
            const data = await response.json();

            if (data.success) {
                setCourts(data.data);
                setSelectedCourts([]);
            } else {
                toast?.showError("เกิดข้อผิดพลาด", "ไม่สามารถดึงข้อมูลสนามได้");
            }
        } catch (error) {
            console.error('Error fetching courts:', error);
            toast?.showError("เกิดข้อผิดพลาด", "ไม่สามารถดึงข้อมูลสนามได้");
        } finally {
            setCourtsLoading(false);
        }
    }, [toast]);

    // Check authentication and initial data load
    useEffect(() => {
        if (status === "loading") return;

        if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
            toast?.showError("ไม่มีสิทธิ์เข้าถึง", "คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
            router.push("/");
            return;
        }

        fetchFacilities();
    }, [session, status, router, toast, fetchFacilities]);

    // --- Handlers ---
    const handleFacilityChange = (facilityId: string) => {
        setSelectedFacility(facilityId);
        if (facilityId) {
            fetchCourts(facilityId);
        } else {
            setCourts([]);
            setSelectedCourts([]);
        }
    };

    const handleCourtSelection = (courtId: string) => {
        setSelectedCourts(prev =>
            prev.includes(courtId)
                ? prev.filter(id => id !== courtId)
                : [...prev, courtId]
        );
    };

    const handleSelectAllCourts = () => {
        const activeCourts = courts.filter(c => c.is_active);
        if (selectedCourts.length === activeCourts.length) {
            setSelectedCourts([]);
        } else {
            setSelectedCourts(activeCourts.map(court => court.court_id));
        }
    };

    const handleCreateBlackout = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedFacility || !blackoutForm.start_datetime || !blackoutForm.end_datetime) {
            toast?.showError("ข้อมูลไม่ครบถ้วน", "กรุณากรอกข้อมูลที่จำเป็น");
            return;
        }

        try {
            setSubmitting(true);
            const response = await fetch('/api/admin/blackouts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    facility_id: selectedFacility,
                    court_id: blackoutForm.court_id || null,
                    start_datetime: blackoutForm.start_datetime,
                    end_datetime: blackoutForm.end_datetime,
                    reason: blackoutForm.reason
                })
            });

            const data = await response.json();

            if (data.success) {
                toast?.showSuccess("สำเร็จ", "ปิดสนามเรียบร้อยแล้ว");
                setShowBlackoutForm(false);
                setBlackoutForm({ court_id: '', start_datetime: '', end_datetime: '', reason: '' });
            } else {
                toast?.showError("เกิดข้อผิดพลาด", data.message || "ไม่สามารถปิดสนามได้");
            }
        } catch (error) {
            console.error('Error creating blackout:', error);
            toast?.showError("เกิดข้อผิดพลาด", "ไม่สามารถปิดสนามได้");
        } finally {
            setSubmitting(false);
        }
    };

    const handleMultiBooking = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedFacility || selectedCourts.length === 0 || !multiBookingForm.booking_date || !multiBookingForm.start_time || !multiBookingForm.end_time) {
            toast?.showError("ข้อมูลไม่ครบถ้วน", "กรุณากรอกข้อมูลที่จำเป็น");
            return;
        }

        try {
            setSubmitting(true);
            const response = await fetch('/api/admin/multi-booking', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    facility_id: selectedFacility,
                    court_ids: selectedCourts,
                    booking_date: multiBookingForm.booking_date,
                    start_time: multiBookingForm.start_time,
                    end_time: multiBookingForm.end_time,
                    note: multiBookingForm.note
                })
            });

            const data = await response.json();

            if (data.success) {
                toast?.showSuccess("สำเร็จ", `จองสนาม ${selectedCourts.length} สนามเรียบร้อยแล้ว`);
                setShowMultiBookingForm(false);
                setMultiBookingForm({ booking_date: '', start_time: '', end_time: '', note: '' });
                setSelectedCourts([]);
            } else {
                toast?.showError("เกิดข้อผิดพลาด", data.message || "ไม่สามารถจองสนามได้");
            }
        } catch (error) {
            console.error('Error creating multi-booking:', error);
            toast?.showError("เกิดข้อผิดพลาด", "ไม่สามารถจองสนามได้");
        } finally {
            setSubmitting(false);
        }
    };

    // --- Derived State ---
    const selectedFacilityData = useMemo(() =>
        facilities.find(f => f.facility_id === selectedFacility)
        , [facilities, selectedFacility]);

    // --- Render Logic ---
    if (status === "loading" || loading) {
        return <Loading />;
    }

    if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
        return null;
    }

    return (
        <div className="tw-min-h-screen tw-bg-gradient-to-br tw-from-slate-50 tw-via-blue-50 tw-to-indigo-50 tw-px-6 tw-py-8">
            {/* Header */}
            <div className="tw-mb-8">
                <div className="tw-flex tw-items-center tw-gap-6 tw-mb-6">
                    <Button
                        onClick={() => router.push("/admin")}
                        variant="secondary"
                        className="tw-px-4 tw-py-2 tw-font-medium tw-rounded-xl tw-transition-all tw-duration-200 tw-bg-indigo-50 tw-text-indigo-700 tw-border tw-border-transparent tw-flex tw-items-center tw-justify-center hover:tw-bg-indigo-100 active:tw-bg-indigo-200 focus:tw-ring-0 focus:tw-outline-none"
                    >
                        <ArrowLeft className="tw-w-4 tw-h-4 tw-mr-2 tw-text-indigo-600" />
                        กลับ
                    </Button>

                    <div>
                        <h1 className="tw-text-3xl md:tw-text-4xl tw-font-bold tw-bg-gradient-to-r tw-from-teal-600 tw-via-blue-600 tw-to-purple-600 tw-bg-clip-text tw-text-transparent">
                           ระบบจัดการคอร์ทแบด
                        </h1>
                    </div>
                </div>
                <div className="tw-h-1 tw-w-32 tw-bg-gradient-to-r tw-from-teal-500 tw-via-blue-500 tw-to-purple-500 tw-rounded-full" />
            </div>

            {/* Facility Selection */}
            <FacilitySelector
                facilities={facilities}
                selectedFacility={selectedFacility}
                selectedFacilityData={selectedFacilityData}
                onFacilityChange={handleFacilityChange}
            />

            {/* Courts Display and Actions */}
            {selectedFacility && (
                <CourtTable
                    courts={courts}
                    selectedCourts={selectedCourts}
                    selectedFacilityData={selectedFacilityData}
                    courtsLoading={courtsLoading}
                    onCourtSelection={handleCourtSelection}
                    onSelectAllCourts={handleSelectAllCourts}
                    onShowBlackoutForm={() => setShowBlackoutForm(true)}
                    onShowMultiBookingForm={() => setShowMultiBookingForm(true)}
                />
            )}

            {/* Blackout Modal */}
            <BlackoutFormModal
                show={showBlackoutForm}
                courts={courts}
                selectedFacility={selectedFacilityData}
                blackoutForm={blackoutForm}
                setBlackoutForm={setBlackoutForm}
                handleCreateBlackout={handleCreateBlackout}
                submitting={submitting}
                onClose={() => {
                    setShowBlackoutForm(false);
                    setBlackoutForm({ court_id: '', start_datetime: '', end_datetime: '', reason: '' });
                }}
            />

            {/* Multi-Booking Modal */}
            <MultiBookingFormModal
                show={showMultiBookingForm}
                courts={courts}
                selectedCourts={selectedCourts}
                multiBookingForm={multiBookingForm}
                setMultiBookingForm={setMultiBookingForm}
                handleMultiBooking={handleMultiBooking}
                submitting={submitting}
                onClose={() => setShowMultiBookingForm(false)}
            />
        </div>
    );
}