"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export interface PromotionData {
  id: string;
  title: string;
  shortDescription: string;
  icon: React.ReactNode;
  color: string;
  bgGradient: string;
  href: string;
}

interface PromotionCardProps {
  promotion: PromotionData;
}

const PromotionCard: React.FC<PromotionCardProps> = ({ promotion }) => {
  return (
    <Link
      href={promotion.href}
      className="group block h-full no-underline"
    >
      <div className={`
        h-full rounded-2xl p-6 
        ${promotion.bgGradient}
        shadow-lg hover:shadow-2xl
        transition-all duration-300 ease-in-out
        transform hover:-translate-y-2
        border border-white/20
        cursor-pointer
      `}>
        {/* Icon */}
        <div className={`
          w-16 h-16 rounded-2xl 
          ${promotion.color}
          flex items-center justify-center
          mb-5 transition-transform duration-300 group-hover:scale-110
          shadow-md
        `}>
          {promotion.icon}
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-700 transition-colors">
          {promotion.title}
        </h3>

        {/* Short Description */}
        <p className="text-gray-600 text-sm leading-relaxed line-clamp-3 group-hover:text-gray-700">
          {promotion.shortDescription}
        </p>

        {/* CTA Button */}
        <div className="mt-5 flex items-center text-sm font-semibold text-blue-600 group-hover:text-blue-700 transition-colors">
          <span>Xem chi tiết</span>
          <svg 
            className="w-4 h-4 ml-2 transform transition-transform duration-300 group-hover:translate-x-1" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
};

export default PromotionCard;
