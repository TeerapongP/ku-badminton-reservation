import React from 'react';
import { X } from 'lucide-react';

interface ModalWrapperProps {
    children: React.ReactNode;
    title: React.ReactNode;
    onClose: () => void;
}

export const ModalWrapper: React.FC<ModalWrapperProps> = ({ children, title, onClose }) => (
    <div className="tw-fixed tw-inset-0 tw-bg-black tw-bg-opacity-60 tw-backdrop-blur-sm tw-flex tw-items-center tw-justify-center tw-z-50 tw-p-4">
        <div className="tw-bg-white tw-rounded-3xl tw-shadow-2xl tw-p-6 sm:tw-p-8 tw-w-full tw-max-w-md tw-mx-auto tw-transform tw-transition-all tw-duration-300 tw-scale-100">
            <div className="tw-flex tw-items-center tw-justify-between tw-mb-6 tw-pb-2 tw-border-b tw-border-gray-100">
                <h3 className="tw-text-2xl tw-font-bold tw-text-gray-900 tw-flex tw-items-center tw-gap-2">
                    {title}
                </h3>
                <button
                    onClick={onClose}
                    className="tw-text-gray-400 hover:tw-text-gray-600 tw-p-2 tw-rounded-full hover:tw-bg-gray-100 tw-transition"
                >
                    <X className="tw-w-6 tw-h-6" />
                </button>
            </div>
            {children}
        </div>
    </div>
);