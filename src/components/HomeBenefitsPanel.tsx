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
    <section className="w-full mt-1 mb-0 -mx-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-0.5">
        {items.map((it, idx) => (
          <Link
            key={idx}
            href={it.href}
            className="group block"
            style={{
              transform: `translateX(${idx === 0 ? -8 : idx * 10 + 8}px)`
            }}
          >
            <div className="overflow-hidden hover:shadow-md transition-all duration-300 transform hover:scale-[1.02]">
              <img
                src={it.img}
                alt={it.alt}
                className="w-full h-auto object-cover transform scale-[0.85] group-hover:scale-[0.9] transition-transform duration-300"
              />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default HomeBenefitsPanel;


