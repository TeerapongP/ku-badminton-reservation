'use client';

import Banner from '@/components/Banner';

export default function ContractPage() {

    return (
        <>
            <div className="tw-min-h-screen tw-bg-white">
                {/* Banner Section */}
                <Banner />

                {/* Main Content */}
                <div className="tw-container tw-mx-auto tw-px-4 tw-py-8">
                    <div className="tw-grid tw-grid-cols-1 lg:tw-grid-cols-2 tw-gap-8">
                        {/* Left Side - Image Placeholder */}
                        <div className="tw-bg-gray-300 tw-rounded-lg tw-flex tw-flex-col tw-items-center tw-justify-center tw-h-96">
                            <div className="tw-border-4 tw-border-black tw-rounded-lg tw-p-8 tw-bg-white tw-mb-4">
                                <div className="tw-flex tw-items-center tw-justify-center tw-space-x-4">
                                    <div className="tw-w-8 tw-h-8 tw-bg-black tw-rounded-full"></div>
                                    <div className="tw-w-0 tw-h-0 tw-border-l-[20px] tw-border-l-black tw-border-t-[15px] tw-border-t-transparent tw-border-b-[15px] tw-border-b-transparent"></div>
                                </div>
                            </div>
                            <h2 className="tw-text-2xl tw-font-bold tw-text-black">IMAGE PLACE</h2>
                        </div>

                        {/* Right Side - Contact Information */}
                        <div>
                            <h2 className="tw-text-2xl tw-font-bold tw-text-black tw-mb-6">ติดต่อสอบถาม</h2>

                            {/* Contact Information */}
                            <div className="tw-space-y-3 tw-text-black">
                                <div className="tw-border-b tw-border-black tw-pb-2">
                                    <strong>กองกีฬา ศิลปะและวัฒนธรรม</strong>
                                </div>
                                <div className="tw-border-b tw-border-black tw-pb-2">
                                    มหาวิทยาลัยเกษตรศาสตร์
                                </div>
                                <div className="tw-border-b tw-border-black tw-pb-2">
                                    เลขที่ 50 ถ.งามวงศ์วาน แขวงลาดยาว
                                </div>
                                <div className="tw-border-b tw-border-black tw-pb-2">
                                    จตุจักร กรุงเทพมหานคร 10900
                                </div>
                                <div className="tw-border-b tw-border-black tw-pb-2">
                                    <strong>Fanpage:</strong> KU COURT BOOKING
                                </div>
                                <div className="tw-border-b tw-border-black tw-pb-2">
                                    <strong>โทรศัพท์:</strong> 02 942 8772-3 # 122
                                </div>
                                <div className="tw-border-b tw-border-black tw-pb-2">
                                    <strong>เวลาทำการ:</strong> 8.30 – 16.30 น.
                                </div>
                                <div className="tw-border-b tw-border-black tw-pb-2">

                                </div>
                            </div>


                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}