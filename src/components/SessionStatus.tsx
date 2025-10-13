"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { Badge } from "primereact/badge";
import { Button } from "primereact/button";

interface SessionStatusProps {
  showRemainingTime?: boolean;
  showExtendButton?: boolean;
  className?: string;
}

export default function SessionStatus({ 
  showRemainingTime = true,
  showExtendButton = true,
  className = ""
}: SessionStatusProps) {
  const { data: session } = useSession();
  const { getRemainingTime, extendSession } = useSessionTimeout();
  const [remainingTime, setRemainingTime] = useState(0);

  useEffect(() => {
    if (!session) return;

    const updateTimer = () => {
      setRemainingTime(getRemainingTime());
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [session, getRemainingTime]);

  if (!session) return null;

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    if (remainingTime > 600) return "success"; // > 10 นาที
    if (remainingTime > 300) return "warning"; // > 5 นาที
    return "danger"; // <= 5 นาที
  };

  return (
    <div className={`tw-flex tw-items-center tw-gap-3 ${className}`}>
      {showRemainingTime && (
        <div className="tw-flex tw-items-center tw-gap-2">
          <span className="tw-text-sm tw-text-gray-600">เวลาที่เหลือ:</span>
          <Badge 
            value={formatTime(remainingTime)}
            severity={getStatusColor()}
            className="tw-text-xs"
          />
        </div>
      )}
      
      {showExtendButton && remainingTime < 900 && ( // แสดงปุ่มเมื่อเหลือน้อยกว่า 15 นาที
        <Button
          label="ขยายเวลา"
          icon="pi pi-clock"
          size="small"
          text
          onClick={extendSession}
          className="tw-text-xs"
          tooltip="ขยายเวลาใช้งานอีก 30 นาที"
        />
      )}
    </div>
  );
}