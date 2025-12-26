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
    <section className="w-full max-w-[1920px] mx-auto px-4 md:px-6 lg:px-8 xl:px-16 mt-2">
      <div className="bg-white rounded-lg shadow-sm py-1">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 items-stretch">
            {items.map((it, idx) => (
              <Link key={idx} href={it.href} className="group">
                <div className="rounded-lg overflow-hidden bg-white flex items-center justify-center hover:shadow-lg transition-shadow">
                  <img
                    src={it.img}
                    alt={it.alt}
                    className="w-full h-24 md:h-36 object-cover"
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


