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
    <section className="w-full mt-3 mb-3">
      {/* Mobile: 2-column card grid for better visual balance */}
      <div className="block lg:hidden px-4">
        <div className="grid grid-cols-2 gap-3">
          {items.map((it, idx) => (
            <Link
              key={idx}
              href={it.href}
              className="no-underline"
            >
              <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 p-0 flex flex-col items-stretch text-center">
                <div className="w-full h-20 overflow-hidden mb-0 flex items-center justify-center bg-gray-50">
                  <img
                    src={it.img}
                    alt={it.alt}
                    className="w-full h-full object-contain"
                    style={{ display: 'block' }}
                  />
                </div>
                <div className="p-3">
                  <span className="text-sm font-semibold text-gray-800">{it.alt}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Desktop: 4-column grid (preserve behavior) */}
      <div className="hidden lg:grid grid-cols-4 gap-2 px-0">
        {items.map((it, idx) => (
          <Link key={idx} href={it.href} className="group block no-underline">
            <div className="overflow-hidden rounded-md hover:shadow-md transition-all duration-300">
              <img
                src={it.img}
                alt={it.alt}
                className="w-full h-auto object-cover"
              />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default HomeBenefitsPanel;


