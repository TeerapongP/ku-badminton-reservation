"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Loading from "@/components/Loading";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string[];
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return; // Still loading

    if (!session) {
      router.push("/login");
      return;
    }

    if (requiredRole && !requiredRole.includes(session.user.role)) {
      router.push("/"); // Redirect to home if role not allowed
      return;
    }
  }, [session, status, router, requiredRole]);

  if (status === "loading") {
    return (
      <Loading 
        text="กำลังตรวจสอบสิทธิ์..." 
        color="emerald" 
        size="md" 
        fullScreen={true} 
      />
    );
  }

  if (!session) {
    return (
      <Loading 
        text="กำลังเปลี่ยนเส้นทาง..." 
        color="emerald" 
        size="md" 
        fullScreen={true} 
      />
    );
  }

  if (requiredRole && !requiredRole.includes(session.user.role)) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-gray-50">
        <div className="tw-text-center">
          <h1 className="tw-text-2xl tw-font-bold tw-text-gray-900 tw-mb-4">ไม่ได้รับอนุญาต</h1>
          <p className="tw-text-gray-600">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}