"use client";
import React from "react";
import Header from "@/components/header";
import Footer from "@/components/footer";
import Toolbar from "@/components/toolbar";
import { getItem } from "@/utils/SecureStorage";

const DebugInfoPage = () => {
  const [cartItemsCount, setCartItemsCount] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Lấy dữ liệu từ localStorage
  const debugData = {
    localStorage: {
      id: getItem("id"),
      userName: getItem("userName"),
      userPhone: getItem("userPhone"),
      email: getItem("email"),
      mst: getItem("mst"),
      diachi: getItem("diachi"),
      type: getItem("type"),
      accessToken: getItem("accessToken") ? "***HIDDEN***" : null
    }
  };

  const handleClearAll = () => {
    localStorage.clear();
    sessionStorage.clear();
    if ('caches' in window) {
      caches.keys().then(function(names) {
        for (let name of names) caches.delete(name);
      });
    }
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header cartItemsCount={cartItemsCount} onSearch={() => {}} />
      <main className="container mx-auto px-2 md:px-8 pt-32 pb-20 max-w-4xl font-sans">
        <section className="bg-gray-900 text-white shadow-2xl rounded-3xl overflow-hidden p-8 mb-8 border border-gray-700">
          <h2 className="text-2xl font-bold mb-6 text-yellow-400 flex items-center gap-2">
            <span>🐛</span>
            Debug Information - Thông tin đầy đủ từ đăng nhập
          </h2>
          <div className="mb-4">
            <button
              onClick={handleClearAll}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              🗑️ Clear Cache, LocalStorage & Reload
            </button>
          </div>
          <div className="bg-black p-4 rounded-lg overflow-auto max-h-96">
            <pre className="text-xs text-green-400 whitespace-pre-wrap">
              {JSON.stringify(debugData, null, 2)}
            </pre>
          </div>
        </section>
      </main>
      <Toolbar />
      <Footer />
    </div>
  );
};

export default DebugInfoPage;