import "primereact/resources/themes/lara-light-indigo/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import "primeflex/primeflex.css";

import "./globals.css";
import { Inter } from "next/font/google";
import { PrimeReactProvider } from "primereact/api";
import "primereact/resources/themes/lara-light-cyan/theme.css";
import "primereact/resources/primereact.min.css";
import ClientLayout from "@/components/ClientLayout";
import AuthProvider from "@/providers/AuthProvider";
import SessionTimeoutProvider from "@/providers/SessionTimeoutProvider";
import { ToastProvider } from "@/components/ToastProvider";


const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title: "KU Badminton Reservation",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body className={`${inter.variable} tw-antialiased tw-text-gray-900`}>
        <ToastProvider>
          <AuthProvider>
            <SessionTimeoutProvider timeoutMinutes={30} warningMinutes={5}>
              <PrimeReactProvider>
                <ClientLayout>{children}</ClientLayout>
              </PrimeReactProvider>
            </SessionTimeoutProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
