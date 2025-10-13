"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useToast } from "@/components/ToastProvider";

interface ToastType {
  showWarn: (message: string, detail?: string) => void;
  showSuccess: (message: string, detail?: string) => void;
}

interface UseSessionTimeoutOptions {
  timeoutMinutes?: number;
  warningMinutes?: number;
  onTimeout?: () => void;
  onWarning?: (remainingMinutes: number) => void;
}

export function useSessionTimeout({
  timeoutMinutes = 30,
  warningMinutes = 5,
  onTimeout,
  onWarning
}: UseSessionTimeoutOptions = {}) {
  const { data: session } = useSession();
  const toast: ToastType = useToast();

  // ใช้ชนิดที่ถูกต้องสำหรับเบราว์เซอร์ + ค่าเริ่มต้นเป็น null
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const isWarningShownRef = useRef<boolean>(false);

  const timeoutMs = timeoutMinutes * 60 * 1000;
  // กันค่าติดลบ ถ้า warningMinutes >= timeoutMinutes จะเตือนทันที
  const warningMs = Math.max(0, (timeoutMinutes - warningMinutes) * 60 * 1000);

  const forceLogout = useCallback(async () => {
    try {
      toast.showWarn("หมดเวลาใช้งาน", "คุณจะถูกออกจากระบบเนื่องจากไม่มีการใช้งาน");

      setTimeout(async () => {
        await signOut({
          redirect: true,
          callbackUrl: "/login?reason=timeout"
        });
      }, 2000);

      onTimeout?.();
    } catch (error) {
      console.error("Force logout error:", error);
    }
  }, [toast, onTimeout]);

  const showWarning = useCallback(() => {
    if (isWarningShownRef.current) return;

    isWarningShownRef.current = true;
    const remainingMinutes = Math.max(0, warningMinutes);

    toast.showWarn(
      "แจ้งเตือน",
      `คุณจะถูกออกจากระบบใน ${remainingMinutes} นาที หากไม่มีการใช้งาน`
    );

    onWarning?.(remainingMinutes);
  }, [warningMinutes, toast, onWarning]);

  const clearTimers = () => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningRef.current !== null) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }
  };

  const resetTimer = useCallback(() => {
    if (!session) return;

    lastActivityRef.current = Date.now();
    isWarningShownRef.current = false;

    clearTimers();

    // ตั้งเวลาการเตือน
    warningRef.current = setTimeout(() => {
      showWarning();
    }, warningMs);

    // ตั้งเวลา timeout
    timeoutRef.current = setTimeout(() => {
      forceLogout();
    }, timeoutMs);
  }, [session, warningMs, timeoutMs, showWarning, forceLogout]);

  const handleActivity = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    if (!session) {
      clearTimers();
      return;
    }

    const events: (keyof DocumentEventMap)[] = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click"
    ];

    events.forEach((event) => {
      document.addEventListener(event, handleActivity, true);
    });

    resetTimer();

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity, true);
      });
      clearTimers();
    };
  }, [session, handleActivity, resetTimer]);

  const getRemainingTime = useCallback(() => {
    if (!session) return 0;

    const elapsed = Date.now() - lastActivityRef.current;
    const remaining = timeoutMs - elapsed;

    return Math.max(0, Math.floor(remaining / 1000)); // วินาที
  }, [session, timeoutMs]);

  const extendSession = useCallback(() => {
    if (!session) return;

    resetTimer();
    toast.showSuccess("ขยายเวลา", "เวลาใช้งานได้รับการขยายแล้ว");
  }, [session, resetTimer, toast]);

  return {
    getRemainingTime,
    extendSession,
    resetTimer: handleActivity,
    isActive: !!session
  };
}
