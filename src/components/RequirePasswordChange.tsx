"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Loading from "./Loading";

/**
 * Component ที่ตรวจสอบว่า user ต้องเปลี่ยนรหัสผ่านหรือไม่
 * ถ้าเป็น student และยังไม่เคยเปลี่ยนรหัสผ่าน (first login) จะ redirect ไปหน้าเปลี่ยนรหัสผ่าน
 */
export default function RequirePasswordChange({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (status === "loading") return;

        // ถ้าไม่ได้ login ให้ผ่านไป (จะถูกจัดการโดย ProtectedRoute)
        if (!session) return;

        // ถ้าอยู่ในหน้าเปลี่ยนรหัสผ่านอยู่แล้ว ให้ผ่านไป
        if (pathname === "/forgot-password") return;

        // ตรวจสอบว่าเป็น student และยังไม่เคยเปลี่ยนรหัสผ่าน
        const isStudent = session.user?.role === "student";
        const isFirstLogin = (session.user as any)?.isFirstLogin === true;

        console.log("🔍 RequirePasswordChange check:", {
            pathname,
            role: session.user?.role,
            isStudent,
            isFirstLogin,
        });

        if (isStudent && isFirstLogin) {
            router.push("/forgot-password");
        }
    }, [session, status, pathname, router]);

    // แสดง loading ถ้ากำลังตรวจสอบ
    if (status === "loading") {
        return <Loading size="lg" text="กำลังตรวจสอบ..." color="blue" fullScreen={true} />;
    }

    // ถ้าเป็น first login และไม่ได้อยู่ในหน้าเปลี่ยนรหัสผ่าน แสดง loading
    const isStudent = session?.user?.role === "student";
    const isFirstLogin = (session?.user as any)?.isFirstLogin === true;
    
    if (isStudent && isFirstLogin && pathname !== "/forgot-password") {
        return <Loading size="lg" text="กำลังเปลี่ยนเส้นทาง..." color="blue" fullScreen={true} />;
    }

    return <>{children}</>;
}
