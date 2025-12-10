"use client";
import React, { useState, useCallback } from "react";
import Header from "@/components/header";
import Footer from "@/components/footer";
import Link from "next/link";

export default function NotFound() {
  const [cartItemsCount, setCartItemsCount] = useState(0);

  const handleSearch = useCallback((query: string) => {}, []);

  function toggleCart(): void {
    console.log("Cart toggled - NotFound - line 13: ");
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header
        cartItemsCount={cartItemsCount}
        onSearch={handleSearch}
      />
      <main className="flex-grow flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 pt-32 sm:pt-40 md:pt-48 pb-20 sm:pb-24 md:pb-32">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="rounded-full bg-sky-100 p-3 inline-block mx-auto">
            <svg
              className="h-12 w-12 text-sky-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">
            Rất tiếc, trang không tìm thấy
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Xin lỗi, chúng tôi không thể tìm thấy trang bạn đang tìm kiếm.
          </p>
          <div className="mt-6">
            <Link
              href="/"
              className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-gradient-to-r from-sky-400 to-sky-600 hover:from-sky-500 hover:to-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-all duration-200"
            >
              Trở về trang chủ
              <svg
                className="ml-2 -mr-1 w-5 h-5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
