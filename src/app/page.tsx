
import Banner from '@/components/Banner';

export default function Home() {
  return (
    <>
      <Banner />
      <div className="tw-container tw-mx-auto tw-px-4 tw-py-8">
        <div className="tw-text-center">
          <h1 className="tw-text-3xl tw-font-bold tw-text-gray-800 tw-mb-4">
            ระบบจองสนามแบดมินตัน
          </h1>
          <p className="tw-text-lg tw-text-gray-600">
            มหาวิทยาลัยเกษตรศาสตร์
          </p>
        </div>
      </div>
    </>
  );
}
