'use client';

import { useState, useEffect } from 'react';

interface BannerData {
  id: number;
  title: string;
  subtitle?: string | null;
  image_path: string;
  display_order: number;
}

export default function Banner() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [banners, setBanners] = useState<BannerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch banners from API
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const response = await fetch('/api/banners');
        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.data)) {
            setBanners(data.data);
          }
        }
      } catch (error) {
        console.error('Error fetching banners:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBanners();
  }, []);

  // Auto change banner every 5 seconds
  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [banners.length]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="tw-bg-gray-300 tw-h-[50vh] tw-text-center tw-relative tw-flex tw-items-center tw-justify-center">
        <div className="tw-container tw-mx-auto tw-px-4">
          <div className="tw-animate-pulse">
            <div className="tw-h-8 tw-bg-gray-400 tw-rounded tw-mb-4 tw-mx-auto tw-w-3/4"></div>
            <div className="tw-h-4 tw-bg-gray-400 tw-rounded tw-mx-auto tw-w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  // Show default banner if no banners available
  if (banners.length === 0) {
    return (
      <div className="tw-bg-gradient-to-r tw-from-blue-500 tw-to-green-500 tw-h-[50vh] tw-text-center tw-relative tw-flex tw-items-center tw-justify-center">
        <div className="tw-container tw-mx-auto tw-px-4">
          <h1 className="tw-text-4xl tw-font-bold tw-text-white tw-mb-4 tw-drop-shadow-lg">
            ยินดีต้อนรับสู่ระบบจองสนามแบดมินตัน
          </h1>
          <p className="tw-text-xl tw-text-white tw-drop-shadow-md">
            จองสนามแบดมินตันได้ง่ายๆ ผ่านระบบออนไลน์
          </p>
        </div>
      </div>
    );
  }

  const currentBanner = banners[currentSlide];

  return (
    <div className="tw-relative tw-h-[50vh] tw-overflow-hidden">
      {/* Banner Image Background */}
      <div
        className="tw-absolute tw-inset-0 tw-bg-cover tw-bg-center tw-bg-no-repeat tw-transition-all tw-duration-1000"
        style={{
          backgroundImage: `url(${currentBanner.image_path})`,
        }}
      >
        {/* Overlay */}
        <div className="tw-absolute tw-inset-0 tw-bg-black tw-bg-opacity-40"></div>
      </div>

      {/* Pagination Dots */}
      {banners.length > 1 && (
        <div className="tw-absolute tw-bottom-6 tw-left-1/2 tw-transform tw--translate-x-1/2 tw-flex tw-space-x-3">
          {banners.map((_, index) => (
            <button
              key={index}
              className={`tw-w-3 tw-h-3 tw-rounded-full tw-transition-all tw-duration-300 tw-border-2 tw-border-white ${index === currentSlide
                ? 'tw-bg-white tw-scale-125'
                : 'tw-bg-transparent hover:tw-bg-white hover:tw-bg-opacity-50'
                }`}
              onClick={() => setCurrentSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Navigation Arrows (for manual control) */}
      {banners.length > 1 && (
        <>
          <button
            className="tw-absolute tw-left-4 tw-top-1/2 tw-transform tw--translate-y-1/2 tw-bg-black tw-bg-opacity-50 hover:tw-bg-opacity-75 tw-text-white tw-p-2 tw-rounded-full tw-transition-all tw-duration-300"
            onClick={() => setCurrentSlide((prev) => (prev - 1 + banners.length) % banners.length)}
            aria-label="Previous slide"
          >
            <svg className="tw-w-6 tw-h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            className="tw-absolute tw-right-4 tw-top-1/2 tw-transform tw--translate-y-1/2 tw-bg-black tw-bg-opacity-50 hover:tw-bg-opacity-75 tw-text-white tw-p-2 tw-rounded-full tw-transition-all tw-duration-300"
            onClick={() => setCurrentSlide((prev) => (prev + 1) % banners.length)}
            aria-label="Next slide"
          >
            <svg className="tw-w-6 tw-h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}