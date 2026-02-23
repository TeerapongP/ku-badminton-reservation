"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminRole } from "@/hooks/useAdminRole";
import Loading from "@/components/Loading";
import BannerManagementContainer from "@/container/admin/BannerManagementContainer";

export default function BannerManagementPage() {
    const router = useRouter();
    const { session, status, isAdmin, loading: roleLoading } = useAdminRole();

    useEffect(() => {
        if (roleLoading || status === "loading") return;

        if (!session) {
            router.replace("/login");
        } else if (!isAdmin) {
            router.replace("/");
        }
    }, [session, status, isAdmin, roleLoading, router]);

    // แสดง loading ระหว่างตรวจสอบ
    if (roleLoading || status === "loading") {
        return (
            <Loading
                text="กำลังตรวจสอบสิทธิ์..."
                color="emerald"
                size="md"
                fullScreen={true}
            />
        );
    }

    // render เฉพาะเมื่อผ่านการตรวจสอบแล้ว
    if (session && isAdmin) {
        return <BannerManagementContainer />;
    }

    return null;
}