"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import BannerManagementContainer from "@/container/admin/BannerManagementContainer";
import Loading from "@/components/Loading";

export default function BannerManagementPage() {
    const { data: session, status } = useSession();

    if (status === "loading") {
        return (
            <Loading
                text="กำลังโหลด..."
                color="emerald"
                size="md"
                fullScreen={true}
            />
        );
    }

    if (!session?.user) {
        redirect("/auth/login");
    }

    // ตรวจสอบสิทธิ์ admin หรือ super-admin
    if (!['admin', 'super-admin'].includes(session.user.role)) {
        redirect("/");
    }

    return <BannerManagementContainer />;
}