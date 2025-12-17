import React from 'react';
import { X } from 'lucide-react';

interface ModalWrapperProps {
    children: React.ReactNode;
    title: React.ReactNode;
    onClose: () => void;
}

export const ModalWrapper: React.FC<ModalWrapperProps> = ({ children, title, onClose }) => (
    <div className="tw-fixed tw-inset-0 tw-z-50 tw-flex tw-items-center tw-justify-center tw-p-4">
        <button 
            className="tw-absolute tw-inset-0 tw-bg-slate-900/60 tw-backdrop-blur-[6px] tw-transition-opacity tw-border-0 tw-p-0 tw-cursor-default" 
            onClick={onClose}
            aria-label="Close modal"
        />

        <div className="
            tw-relative tw-bg-white tw-w-full tw-max-w-md tw-mx-auto
            tw-rounded-[2rem] tw-shadow-[0_20px_50px_rgba(0,0,0,0.2)]
            tw-overflow-hidden tw-border tw-border-slate-100
            tw-transform tw-transition-all
        ">
            <div className="tw-px-8 tw-pt-8 tw-pb-4 tw-flex tw-items-center tw-justify-between">
                <div className="tw-flex tw-flex-col">
                    <h3 className="tw-text-2xl tw-font-extrabold tw-text-slate-800 tw-tracking-tight tw-flex tw-items-center tw-gap-3">
                        {title}
                    </h3>
                    <div className="tw-h-1 tw-w-8 tw-bg-indigo-600 tw-rounded-full tw-mt-1" /> 
                </div>

                <button
                    onClick={onClose}
                    className="
                        tw-group tw-flex tw-items-center tw-justify-center
                        tw-w-10 tw-h-10 tw-rounded-full
                        tw-bg-slate-50 tw-text-slate-400
                        tw-transition-all tw-duration-200
                        hover:tw-bg-red-50 hover:tw-text-red-500
                        tw-border-0 tw-outline-none
                    "
                >
                    <X className="tw-w-5 tw-h-5 tw-transition-transform group-hover:tw-rotate-90" />
                </button>
            </div>

            <div className="tw-px-8 tw-pb-8">
                <div className="tw-text-slate-600">
                    {children}
                </div>
            </div>
        </div>
    </div>
);