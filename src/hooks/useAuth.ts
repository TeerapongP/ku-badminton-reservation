"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState } from "react";

export function useAuth() {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  const login = async (loginData: any) => {
    setIsLoading(true);
    try {
      const result = await signIn("credentials", {
        identifier: loginData.identifier,
        password: loginData.password,
        type: loginData.type,
        originalIdentifier: loginData.originalIdentifier,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      // รอให้ session อัปเดต
      await new Promise(resolve => setTimeout(resolve, 1000));

      // ดึง session ใหม่
      const response = await fetch('/api/auth/session');
      const sessionData = await response.json();

      return { 
        success: true,
        user: sessionData?.user
      };
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
    try {
      // เรียก custom logout API เพื่อบันทึก log
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include"
      });
    } catch (error) {
      console.error("Logout API error:", error);
      // ถ้า API error ก็ยัง logout ได้
    }
    
    // ใช้ NextAuth signOut
    await signOut({ redirect: true, callbackUrl: "/login" });
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
        return {
          success: false,
          error: data.error ?? "เกิดข้อผิดพลาดในการสมัครสมาชิก"
        };
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



  return {
    user: session?.user,
    isAuthenticated: !!session,
    isLoading: status === "loading" || isLoading,
    login,
    logout,
    register,
  };
}