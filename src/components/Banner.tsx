'use client';

import { useState, useEffect } from 'react';

export default function Banner() {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const banners = [
    {
      title: "BANNER FOR PUBLIC RELATION #1",
      subtitle: "AUTO CHANGE EVERY 5 SEC"
    },
    {
      title: "BANNER FOR PUBLIC RELATION #2", 
      subtitle: "AUTO CHANGE EVERY 5 SEC"
    },
    {
      title: "BANNER FOR PUBLIC RELATION #3",
      subtitle: "AUTO CHANGE EVERY 5 SEC"
    }
  ];

  // Auto change banner every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [banners.length]);

  return (
    <div className="tw-bg-gray-300 tw-h-[50vh] tw-text-center tw-relative tw-flex tw-items-center tw-justify-center">
      <div className="tw-container tw-mx-auto tw-px-4">
        <h1 className="tw-text-2xl tw-font-bold tw-text-black tw-mb-2">
          {banners[currentSlide].title}
        </h1>
        <p className="tw-text-lg tw-text-black">
          {banners[currentSlide].subtitle}
        </p>
      </div>
      
      {/* Pagination Dots */}
      <div className="tw-absolute tw-bottom-6 tw-left-1/2 tw-transform tw--translate-x-1/2 tw-flex tw-space-x-2">
        {banners.map((_, index) => (
          <div
            key={index}
            className={`tw-w-3 tw-h-3 tw-rounded-full tw-cursor-pointer ${
              index === currentSlide ? 'tw-bg-white' : 'tw-bg-black'
            }`}
            onClick={() => setCurrentSlide(index)}
          />
        ))}
      </div>
    </div>
  );
}