"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ToastProvider";
import { Facility } from "@/lib/Facility";
import { Button } from "@/components/Button";
import Loading, { ButtonLoading } from "@/components/Loading";

export default function BadmintonContainer() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const toast = useToast();

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState<string | null>(null);

  async function fetchFacility(): Promise<Facility[]> {
    try {
      const res = await fetch("/api/facilities", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json?.data ?? [];
    } finally {
      setLoading(false);
    }
  }

  // Check authentication
  useEffect(() => {
    if (status === "loading") return; // Still loading session
    
    if (!session) {
      toast?.showError("กรุณาเข้าสู่ระบบ", "คุณต้องเข้าสู่ระบบก่อนเข้าใช้งาน");
      router.push("/login");
      return;
    }
  }, [session, status, router, toast]);

  useEffect(() => {
    if (session) { // Only fetch data if authenticated
      fetchFacility()
        .then(setFacilities)
        .catch(() => {
          toast.showError("ไม่สามารถโหลดข้อมูลได้", "กรุณาลองใหม่อีกครั้ง");
          setFacilities([]);
        });
    }
  }, [session, toast]);

  const goToCourts = async (f: Facility) => {
    if (!f.active) return;

    setBookingLoading(f.facility_id);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      router.push(`/courts/${encodeURIComponent(f.facility_id)}`);
    } finally {
      setBookingLoading(null);
    }
  };

  // Show loading while checking authentication
  if (status === "loading") {
    return (
      <div className="tw-min-h-screen tw-bg-gradient-to-br tw-from-green-50 tw-via-emerald-50 tw-to-teal-50 tw-flex tw-items-center tw-justify-center">
        <Loading
          text="กำลังตรวจสอบการเข้าสู่ระบบ..."
          fullScreen={false}
          color="emerald"
          size="lg"
        />
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!session) {
    return null;
  }

  return (
    <div className="tw-min-h-screen tw-bg-gradient-to-br tw-from-green-50 tw-via-emerald-50 tw-to-teal-50 tw-px-6">
      <div className="tw-text-center">
        <h1 className="tw-text-4xl md:tw-text-6xl tw-font-bold tw-bg-gradient-to-r tw-from-green-600 tw-via-emerald-600 tw-to-teal-600 tw-bg-clip-text tw-text-transparent tw-mb-3">
          สนามแบดมินตัน
        </h1>
        <p className="tw-text-base md:tw-text-lg tw-text-gray-700 tw-font-medium">
          มหาวิทยาลัยเกษตรศาสตร์
        </p>
        <p className="tw-text-gray-500 tw-text-sm tw-mt-1">เลือกสนามที่คุณต้องการจอง</p>
        <div className="tw-mt-5 tw-mb-5 tw-h-1.5 tw-w-28 tw-bg-gradient-to-r tw-from-green-500 tw-via-emerald-500 tw-to-teal-500 tw-mx-auto tw-rounded-full" />
      </div>

      {loading ? (
        <Loading
          size="lg"
          text="กำลังโหลดข้อมูลสนาม..."
          color="emerald"
          fullScreen={false}
        />
      ) : facilities.length === 0 ? (
        <div className="tw-text-center tw-mt-20">
          <div className="tw-inline-block tw-p-8 tw-bg-white tw-rounded-2xl tw-shadow-lg">
            <div className="tw-w-20 tw-h-20 tw-bg-gray-100 tw-rounded-full tw-flex tw-items-center tw-justify-center tw-mx-auto tw-mb-4">
              <svg className="tw-w-10 tw-h-10 tw-text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="tw-text-gray-600 tw-font-medium tw-text-lg">ไม่มีข้อมูลสนาม</p>
            <p className="tw-text-gray-400 tw-text-sm tw-mt-1">กรุณาลองใหม่อีกครั้งภายหลัง</p>
          </div>
        </div>
      ) : (
        <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-8 tw-max-w-7xl tw-mx-auto">
          {facilities.map((f) => (
            <div key={f.facility_id} className="tw-group">
              <div className="tw-relative tw-bg-white tw-rounded-3xl tw-shadow-lg hover:tw-shadow-2xl tw-transition-all tw-duration-300 tw-overflow-hidden">
                <div className="tw-absolute tw-top-4 tw-right-4 tw-z-20">
                  <span
                    className={`tw-inline-flex tw-items-center tw-px-3 tw-py-1.5 tw-rounded-full tw-text-xs tw-font-bold tw-shadow tw-backdrop-blur-sm ${f.active ? "tw-bg-green-500/90 tw-text-white" : "tw-bg-gray-500/90 tw-text-white"
                      }`}
                  >
                    {f.active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                  </span>
                </div>

                <div className="tw-relative tw-h-56 tw-overflow-hidden">
                  <Image
                    src={f.image_path || "/images/default-facility.jpg"}
                    alt={f.name_th}
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="tw-object-cover tw-transition-transform tw-duration-500 group-hover:tw-scale-105"
                    priority={false}
                  />
                  <div className="tw-absolute tw-inset-0 tw-bg-gradient-to-t tw-from-black/30 tw-to-transparent" />
                </div>

                <div className="tw-p-8">
                  <h3 className="tw-text-2xl tw-font-bold tw-text-gray-800 tw-mb-1 group-hover:tw-text-green-600 tw-transition-colors">
                    {f.name_th}
                  </h3>
                  {f.name_en && <p className="tw-text-gray-600 tw-font-medium tw-mb-3">{f.name_en}</p>}

                  <div className="tw-mt-4">
                    <Button
                      onClick={() => goToCourts(f)}
                      disabled={!f.active || bookingLoading === f.facility_id}
                      className="tw-w-full tw-h-12 tw-text-lg tw-font-semibold tw-shadow-lg tw-rounded-xl tw-transition-all tw-duration-300 hover:tw-shadow-xl hover:tw-scale-105 active:tw-scale-95 tw-relative tw-overflow-hidden tw-border-0 tw-outline-none focus:tw-outline-none disabled:tw-opacity-60 disabled:hover:tw-scale-100"
                      colorClass="tw-bg-gradient-to-r tw-from-emerald-500 tw-to-emerald-600 hover:tw-from-emerald-600 hover:tw-to-emerald-700 tw-text-white focus:tw-ring-4 focus:tw-ring-emerald-300"
                      aria-disabled={!f.active || bookingLoading === f.facility_id}
                    >
                      <span className="tw-relative tw-flex tw-items-center tw-justify-center tw-gap-2">
                        {bookingLoading === f.facility_id ? (
                          <>
                            <ButtonLoading size="sm" />
                            กำลังเข้าสู่หน้าจอง...
                          </>
                        ) : f.active ? (
                          "จองสนามเลย"
                        ) : (
                          "ยังไม่เปิดใช้งาน"
                        )}
                      </span>
                    </Button>
                  </div>
                </div>

                <div className="tw-pointer-events-none tw-absolute tw-bottom-0 tw-right-0 tw-w-28 tw-h-28 tw-bg-gradient-to-tl tw-from-green-50 tw-to-transparent tw-rounded-tl-full tw-opacity-60" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
