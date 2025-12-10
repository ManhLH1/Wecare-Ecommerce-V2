"use client";
import React, { useState, useCallback, useEffect } from "react";
import Head from "next/head";
import "bootstrap/dist/css/bootstrap.min.css";
import Header from "@/components/header";
import Footer from "@/components/footer";
import Sidebar from "@/components/sidebar";
import img from "@/assets/img/wecare_thanh_toan_2.png";
import Image from "next/image";

export default function Home() {
  const handleCartToggle = useCallback(() => {}, []);

  const [cartItemsCount, setCartItemsCount] = useState(0);

  const handleSearch = useCallback((query: string) => {}, []);
  function toggleCart(): void {
    throw new Error("Function not implemented.");
  }

  return (
    <>
      <div className="bg-gray-50">
        <Header
          cartItemsCount={cartItemsCount}
          onSearch={handleSearch}
        />
        <main className="px-2 pt-14">
          <section className="bg-slate-100">
            <div className="flex flex-1">
              <div className="flex flex-1 pt-4 px-4 mb-8">
                <div className="flex flex-col flex-1 lg:ml-4 space-y-4">
                  <div className="p-4 bg-white rounded-lg shadow-md">
                    <div className="p-4 bg-white rounded-lg shadow-md">
                      <div className="text-lg font-semibold mb-4 border-b pb-2">
                        Thông tin thanh toán Wecare
                      </div>
                      <div className="space-y-2">
                        <Image
                          src={img}
                          alt="promotion image"
                          className="w-80 h-80 mr-4"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
}
