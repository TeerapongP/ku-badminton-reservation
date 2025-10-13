"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect } from "react";

export function useAuth() {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" 
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await signOut({ redirect: true, callbackUrl: "/" });
  };

  const register = async (userData: any) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการสมัครสมาชิก");
      }

      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" 
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Check for timeout in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const reason = urlParams.get('reason');
    
    if (reason === 'timeout') {
      // แสดงข้อความแจ้งเตือนว่าถูก logout เพราะ timeout
      console.log("Session expired due to inactivity");
      // สามารถเพิ่ม toast notification ได้ที่นี่
    }
  }, []);

  return {
    user: session?.user,
    isAuthenticated: !!session,
    isLoading: status === "loading" || isLoading,
    login,
    logout,
    register,
  };
}