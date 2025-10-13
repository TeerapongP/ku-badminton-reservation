"use client";

import { ReactNode, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import { ProgressBar } from "primereact/progressbar";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";

interface SessionTimeoutProviderProps {
  children: ReactNode;
  timeoutMinutes?: number;
  warningMinutes?: number;
}

export default function SessionTimeoutProvider({ 
  children, 
  timeoutMinutes = 30,
  warningMinutes = 5 
}: SessionTimeoutProviderProps) {
  const { data: session } = useSession();
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const { getRemainingTime, extendSession } = useSessionTimeout({
    timeoutMinutes,
    warningMinutes,
    onWarning: (remainingMinutes) => {
      setShowWarningDialog(true);
      setCountdown(remainingMinutes * 60); // Convert to seconds
    },
    onTimeout: () => {
      setShowWarningDialog(false);
    }
  });

  // Countdown timer for warning dialog
  useEffect(() => {
    if (!showWarningDialog || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setShowWarningDialog(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showWarningDialog, countdown]);

  const handleExtendSession = () => {
    extendSession();
    setShowWarningDialog(false);
    setCountdown(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!session) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      
      {/* Warning Dialog */}
      <Dialog
        visible={showWarningDialog}
        onHide={() => {}} // ป้องกันการปิดด้วยการคลิกนอก dialog
        header="⚠️ แจ้งเตือนหมดเวลาใช้งาน"
        modal
        closable={false}
        className="tw-w-full tw-max-w-md"
        contentClassName="tw-text-center tw-p-6"
      >
        <div className="tw-space-y-4">
          <div className="tw-text-lg tw-text-gray-800">
            คุณจะถูกออกจากระบบใน
          </div>
          
          <div className="tw-text-3xl tw-font-bold tw-text-red-600">
            {formatTime(countdown)}
          </div>
          
          <ProgressBar 
            value={((warningMinutes * 60 - countdown) / (warningMinutes * 60)) * 100}
            className="tw-h-2"
            color="#ef4444"
          />
          
          <div className="tw-text-sm tw-text-gray-600">
            หากต้องการใช้งานต่อ กรุณาคลิก "ขยายเวลา"
          </div>
          
          <div className="tw-flex tw-gap-3 tw-justify-center">
            <Button
              label="ขยายเวลา"
              icon="pi pi-clock"
              onClick={handleExtendSession}
              className="p-button-success"
              autoFocus
            />
          </div>
        </div>
      </Dialog>
    </>
  );
}