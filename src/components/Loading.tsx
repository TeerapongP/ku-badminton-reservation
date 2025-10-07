"use client";

import React from "react";

interface LoadingProps {
    size?: 'sm' | 'md' | 'lg';
    text?: string;
    fullScreen?: boolean;
    color?: 'blue' | 'green' | 'teal' | 'emerald';
}

export default function Loading({
    size = 'md',
    text = 'กำลังโหลด...',
    fullScreen = true,
    color = 'emerald'
}: LoadingProps) {
    const sizeMap = {
        sm: 24,
        md: 48,
        lg: 64
    };

    const colorMap = {
        blue: '#2563eb',
        green: '#16a34a',
        teal: '#0d9488',
        emerald: '#059669'
    };

    const spinnerSize = sizeMap[size];
    const spinnerColor = colorMap[color];

    const containerStyle = fullScreen
        ? { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }
        : { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' };

    return (
        <div style={containerStyle}>
            <div style={{ textAlign: 'center' }}>
                {/* Spinner */}
                <div style={{ position: 'relative', margin: '0 auto' }}>
                    <div
                        style={{
                            width: spinnerSize,
                            height: spinnerSize,
                            border: '4px solid #e5e7eb',
                            borderTop: `4px solid ${spinnerColor}`,
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            margin: '0 auto'
                        }}
                    ></div>
                </div>

                {/* Loading text */}
                <p style={{
                    marginTop: '1rem',
                    color: '#6b7280',
                    fontWeight: '500',
                    fontSize: size === 'sm' ? '14px' : size === 'md' ? '16px' : '18px'
                }}>
                    {text}
                </p>

                {/* Loading dots */}
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem', gap: '4px' }}>
                    {[0, 150, 300].map((delay, index) => (
                        <div
                            key={index}
                            style={{
                                width: '8px',
                                height: '8px',
                                backgroundColor: spinnerColor,
                                borderRadius: '50%',
                                animation: `bounce 1.4s ease-in-out ${delay}ms infinite both`
                            }}
                        ></div>
                    ))}
                </div>
            </div>

            <style jsx>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                @keyframes bounce {
                    0%, 80%, 100% {
                        transform: scale(0);
                    }
                    40% {
                        transform: scale(1);
                    }
                }
            `}</style>
        </div>
    );
}

// Inline loading component for smaller spaces
export function InlineLoading({
    size = 'sm',
    text = 'กำลังโหลด...',
    color = 'emerald'
}: Omit<LoadingProps, 'fullScreen'>) {
    return <Loading size={size} text={text} fullScreen={false} color={color} />;
}

// Button loading component
export function ButtonLoading({ size = 'sm' }: { size?: 'sm' | 'md' }) {
    const spinnerSize = size === 'sm' ? 16 : 20;

    return (
        <div
            style={{
                width: spinnerSize,
                height: spinnerSize,
                border: '2px solid transparent',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
            }}
        >
            <style jsx>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}