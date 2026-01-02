"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import axios from "axios";

const PromotionPopup = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) {
      return;
    }
    fetched.current = true;

    const fetchBannerData = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get("/api/getDataContent?type=191920001");
        if (
          response.data.success &&
          response.data.data.value &&
          response.data.data.value.length > 0
        ) {
          const randomIndex = Math.floor(
            Math.random() * response.data.data.value.length
          );
          const imageUrl = response.data.data.value[randomIndex].cr1bb_img_url;
          if (imageUrl) {
            setBannerUrl(imageUrl);
            // Kiểm tra xem user đã đóng popup trong session này chưa
            const hasClosedPopup = sessionStorage.getItem('promotion-popup-closed');
            if (!hasClosedPopup) {
              setIsOpen(true); // Chỉ mở popup khi có ảnh và chưa đóng trong session
            }
          }
        } else {
          // Nếu không có dữ liệu thì không hiển thị popup
          setIsOpen(false);
        }
      } catch (error) {
        console.error("Failed to fetch promotion banner:", error);
        setIsOpen(false); // Không hiển thị popup nếu có lỗi
      } finally {
        setIsLoading(false);
      }
    };

    fetchBannerData();
  }, []);

  // Effect để chặn scroll của body khi popup mở
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    // Cleanup function để đảm bảo scroll được reset khi component unmount
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
    // Lưu trạng thái đã đóng popup trong session
    sessionStorage.setItem('promotion-popup-closed', 'true');
  };

  if (isLoading || !isOpen || !bannerUrl) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[9999] transition-opacity duration-300"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      onClick={handleClose} // Thêm sự kiện click vào nền để đóng
    >
      <div
        className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all duration-300 scale-95 animate-in fade-in-0 zoom-in-95"
        onClick={(e) => e.stopPropagation()} // Ngăn sự kiện click từ content lan ra nền
      >
        <button
          onClick={handleClose}
          className="absolute -top-3 -right-3 bg-gray-800 text-white rounded-full p-1.5 z-10 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          aria-label="Close promotion"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <div className="p-1">
          <Link href="/promotion" onClick={handleClose}>
            <Image
              src={bannerUrl}
              alt="Wecare Promotion Banner"
              width={800}
              height={600}
              className="rounded-md w-full h-auto"
              priority
            />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PromotionPopup;
