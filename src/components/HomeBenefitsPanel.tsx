'use client';

import React from 'react';
import Link from 'next/link';
// Use static images from public/images
const items = [
  { img: '/images/KHUNG SALE-01.png', href: '/doi-tra', alt: 'Đổi trả' },
  { img: '/images/KHUNG SALE-02.png', href: '/freeship', alt: 'Free ship' },
  { img: '/images/KHUNG SALE-03.png', href: '/chinh-hang', alt: 'Hàng chính hãng' },
  { img: '/images/KHUNG SALE-04.png', href: '/thanh-toan', alt: 'Thanh toán tại nhà' },
];

const HomeBenefitsPanel: React.FC = () => {
  return (
    <section 
      className="w-full bg-white pt-0 pb-0 md:pt-0 md:pb-0 -mt-4 lg:mt-0" 
      style={{ lineHeight: '0', color: 'rgba(55, 65, 81, 1)' }}
    >
      <div className="w-full max-w-[2560px] mx-auto px-0">
        {/* Mobile: 2-column card grid for better visual balance */}
        <div className="block lg:hidden">
          <div className="grid grid-cols-2 gap-3 pt-0 pb-0">
            {items.map((it, idx) => (
              <Link
                key={idx}
                href={it.href}
                className="no-underline"
              >
                <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 p-0 flex flex-col items-stretch text-center">
                  <div className="w-full h-20 overflow-hidden mb-0 flex items-center justify-center bg-gray-50">
                    <img
                      src={it.img}
                      alt={it.alt}
                      className="w-full h-full object-contain"
                      style={{ display: 'block' }}
                    />
                  </div>
                  {/* Caption removed — labels are embedded in the banner images */}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Desktop: 4-column grid with fixed height */}
        <div className="hidden lg:grid grid-cols-4 gap-2 px-0" style={{ height: '130px' }}>
          {items.map((it, idx) => (
            <Link key={idx} href={it.href} className="group block no-underline h-full">
              <div className="overflow-hidden rounded-md hover:shadow-md transition-all duration-300 flex justify-center items-center h-full">
                <img
                  src={it.img}
                  alt={it.alt}
                  className="w-[90%] h-auto object-contain max-h-full"
                />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HomeBenefitsPanel;


