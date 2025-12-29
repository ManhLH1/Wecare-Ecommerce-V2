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
    <section className="w-full max-w-[1920px] mx-auto mt-4 mb-6">
      <div className="bg-white rounded-xl shadow-md border border-gray-100 px-4 py-6 md:px-6 md:py-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 md:gap-7 items-stretch">
            {items.map((it, idx) => (
              <Link key={idx} href={it.href} className="group block">
                <div className="rounded-xl overflow-hidden bg-gradient-to-br from-gray-50 to-white hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center min-h-[120px] md:min-h-[140px]">
                  <img
                    src={it.img}
                    alt={it.alt}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeBenefitsPanel;


