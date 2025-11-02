'use client';

import Image from 'next/image';
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
                        <Image
                            src="/images/badminton_banner.png"
                            alt="Badminton Court - มหาวิทยาลัยเกษตรศาสตร์ วิทยาเขตกำแพงแสน"
                            width={600}
                            height={384}
                            className="tw-w-full tw-h-96 tw-object-contain tw-rounded-lg"
                            priority
                        />
                        {/* Right Side - Contact Information */}
                        <div>
                            <h2 className="tw-text-2xl tw-font-bold tw-text-black tw-mb-6">ติดต่อสอบถาม</h2>

                            {/* Contact Information */}
                            <div className="tw-space-y-3 tw-text-black">
                                <div className="tw-border-b tw-border-black tw-pb-2">
                                    <strong>กองบริหารการกีฬา ท่องเที่ยว และศิลปวัฒนธรรม</strong>
                                </div>
                                <div className="tw-border-b tw-border-black tw-pb-2">
                                    มหาวิทยาลัยเกษตรศาสตร์ วิทยาเขตกำแพงแสน
                                </div>
                                <div className="tw-border-b tw-border-black tw-pb-2">
                                    อาคารพลศึกษา 2
                                </div>
                                <div className="tw-border-b tw-border-black tw-pb-2">
                                    เลขที่ 1 หมู่ 6 ต.กำแพงแสน อ.กำแพงแสน
                                </div>
                                <div className="tw-border-b tw-border-black tw-pb-2">
                                    จ.นครปฐม 73140
                                </div>
                                <div className="tw-border-b tw-border-black tw-pb-2">
                                    <strong>โทรศัพท์:</strong> 034-355570
                                </div>
                            </div>


                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}