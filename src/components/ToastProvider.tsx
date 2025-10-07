'use client';

import React, { createContext, useContext, useRef } from 'react';
import { Toast } from 'primereact/toast';

interface ToastContextType {
    showSuccess: (message: string, detail?: string) => void;
    showError: (message: string, detail?: string) => void;
    showWarn: (message: string, detail?: string) => void;
    showInfo: (message: string, detail?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

interface ToastProviderProps {
    children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
    const toast = useRef<Toast>(null);

    const showSuccess = (message: string, detail?: string) => {
        toast.current?.show({
            severity: 'success',
            summary: message,
            detail: detail,
            life: 3000,
        });
    };

    const showError = (message: string, detail?: string) => {
        toast.current?.show({
            severity: 'error',
            summary: message,
            detail: detail,
            life: 5000,
        });
    };

    const showWarn = (message: string, detail?: string) => {
        toast.current?.show({
            severity: 'warn',
            summary: message,
            detail: detail,
            life: 4000,
        });
    };

    const showInfo = (message: string, detail?: string) => {
        toast.current?.show({
            severity: 'info',
            summary: message,
            detail: detail,
            life: 3000,
        });
    };

    const value = {
        showSuccess,
        showError,
        showWarn,
        showInfo,
    };

    return (
        <ToastContext.Provider value={value}>
            {children}
            <Toast ref={toast} position="top-right" />
        </ToastContext.Provider>
    );
};