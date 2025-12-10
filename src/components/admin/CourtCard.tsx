import { CourtCardProps } from '@/types/CourtCardProps';
import React from 'react';

export const CourtCard: React.FC<CourtCardProps> = ({ court, isSelected, onSelect }) => {
    return (
        <button
            type="button"
            className={`tw-border-2 tw-rounded-xl tw-p-5 tw-transition-all tw-duration-200 tw-block tw-w-full tw-text-left ${
                isSelected
                    ? 'tw-border-indigo-600 tw-bg-indigo-50 tw-shadow-lg'
                    : 'tw-border-gray-200 hover:tw-border-indigo-300 hover:tw-shadow-md'
            } ${court.is_active 
                ? 'tw-cursor-pointer' 
                : 'tw-opacity-60 tw-cursor-not-allowed tw-bg-gray-100'}`
            }
            onClick={() => court.is_active && onSelect(court.court_id)}
            disabled={!court.is_active}
            aria-pressed={isSelected}
        >
            <div className="tw-flex tw-items-center tw-justify-between tw-mb-2">
                <h3 className="tw-font-bold tw-text-xl tw-text-gray-900">
                    {court.name || `สนาม ${court.court_code}`}
                </h3>
                <div className={`tw-w-5 tw-h-5 tw-rounded tw-border-2 tw-flex tw-items-center tw-justify-center ${
                    isSelected
                        ? 'tw-bg-indigo-600 tw-border-indigo-600'
                        : 'tw-border-gray-300'
                }`}>
                    {isSelected && (
                        <svg className="tw-w-3 tw-h-3 tw-text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                    )}
                </div>
            </div>
            <div className="tw-flex tw-items-center tw-justify-between tw-text-sm tw-text-gray-500">
                <span>รหัส: {court.court_code}</span>
                <span className={`tw-px-3 tw-py-1 tw-rounded-full tw-text-xs tw-font-medium ${
                    court.is_active 
                        ? 'tw-bg-green-100 tw-text-green-800' 
                        : 'tw-bg-red-100 tw-text-red-800'
                }`}>
                    {court.is_active ? 'เปิด' : 'ปิด'}
                </span>
            </div>
        </button>
    );
};