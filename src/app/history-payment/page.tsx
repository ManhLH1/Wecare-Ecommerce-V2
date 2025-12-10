"use client";
import Head from "next/head";
import "bootstrap/dist/css/bootstrap.min.css";
import JDStyleHeader from "@/components/JDStyleHeader";
import Footer from "@/components/footer";
import React, { useState, useEffect, useCallback } from "react";
import Toolbar from "@/components/toolbar";
import Link from "next/link";
import axios from "axios";
import { EmptyState } from "@/components/ui/empty-state";
import { getItem } from "@/utils/SecureStorage";
import { formatDateToDDMMYYYY } from '@/utils/utils';
import { FaHome, FaMoneyBillWave, FaUniversity, FaWallet, FaCalendarAlt, FaRegCopy } from "react-icons/fa";
import { Tooltip } from "@/components/ui/tooltip";
import { useCart } from "@/components/CartManager";
import { CartContext } from "@/components/CartGlobalManager";
import { useContext } from "react";

export default function Home() {
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [cartItemsCount, setCartItemsCount] = useState(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Get cart context
  const { cartItems } = useCart();
  const { openCart } = useContext(CartContext);

  useEffect(() => {
    const storedId = getItem("id");
    if (storedId) {
      setCustomerId(storedId);
    } else {
      setError("Không tìm thấy ID khách hàng trong localStorage");
      setLoading(false);
    }

    // Fetch cart items count (implement actual logic here)
    setCartItemsCount(0);
  }, []);

  useEffect(() => {
    const fetchHistoryPaymentData = async () => {
      if (!customerId) return;

      try {
        const response = await axios.get("/api/getHistoryPaymentData", {
          params: { id: customerId },
        });
        setHistoryData(response.data);
      } catch (err) {
        setError("Lỗi khi tải dữ liệu.");
        console.error("Error fetching History Payment - fetchHistoryPaymentData - line 44: ", err);
      } finally {
        setLoading(false);
      }
    };

    if (customerId) {
      fetchHistoryPaymentData();
    }
  }, [customerId]);

  const getPaymentMethod = (paymentMethodCode: number) => {
    switch (paymentMethodCode) {
      case 283640000:
        return "Tiền mặt trực tiếp";
      case 283640001:
        return "Chuyển khoản gián tiếp";
      case 283640002:
        return "Chuyển khoản trực tiếp";
      default:
        return "Phương thức thanh toán khác";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    date.setHours(date.getHours() + 7);
    return formatDateToDDMMYYYY(date);
  };

  const handleCartToggle = useCallback(() => {}, []);

  const handleSearch = useCallback((term: string) => {
    if (term.trim()) {
      const toSlug = (str: string) =>
        str
          .toLowerCase()
          .normalize("NFD")
          .replace(/\p{Diacritic}/gu, "")
          .replace(/[đĐ]/g, "d")
          .replace(/[^a-z0-9\s]/g, "")
          .replace(/\s+/g, "-");
      const slug = toSlug(term);
      window.location.href = `/san-pham/${slug}`;
    }
  }, []);

  // Tính tổng số giao dịch và tổng tiền
  const totalAmount = historyData.reduce((sum, item) => sum + (item.cr44a_sotien || 0), 0);

  // Icon cho phương thức thanh toán
  const getPaymentIcon = (paymentMethodCode: number) => {
    switch (paymentMethodCode) {
      case 283640000:
        return <FaMoneyBillWave className="text-green-500" title="Tiền mặt trực tiếp" />;
      case 283640001:
        return <FaUniversity className="text-blue-500" title="Chuyển khoản gián tiếp" />;
      case 283640002:
        return <FaWallet className="text-purple-500" title="Chuyển khoản trực tiếp" />;
      default:
        return <FaMoneyBillWave className="text-gray-400" title="Phương thức khác" />;
    }
  };

  // Copy số tiền
  const handleCopyAmount = (amount: number, idx: number) => {
    navigator.clipboard.writeText(amount.toLocaleString());
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 1200);
  };

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col overflow-x-hidden">
      {/* JD Style Layout */}
      <div className="bg-white">
        {/* Header with Search */}
        <JDStyleHeader
          cartItemsCount={cartItems.length}
          onSearch={handleSearch}
          onCartClick={openCart}
        />

        {/* Main Layout - No Sidebar */}
        <div className="max-w-7xl mx-auto px-0 py-6" style={{ paddingTop: '140px' }}>
          <div className="flex flex-col">
            {/* Main Content - Full Width */}
            <div className="w-full">
              <main className="w-full px-4 py-6">
        <section className="py-4 pr-10 bg-white mb-3 drop-shadow-lg inset-shadow-3xs rounded-lg">
          <div className="p-3">
            {/* Breadcrumb */}
            <nav className="flex items-center text-sm text-gray-500 mb-2 gap-1" aria-label="Breadcrumb">
              <FaHome className="inline mr-1 text-blue-500" />
              <Link href="/" className="hover:underline hover:text-blue-600">Trang chủ</Link>
              <span className="mx-1">/</span>
              <span className="text-gray-700 font-semibold">Lịch sử thanh toán</span>
            </nav>
            {/* Tiêu đề và mô tả */}
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Lịch sử thanh toán</h2>
            <p className="text-gray-500 mb-4">Xem lại các giao dịch đã thanh toán của bạn tại Wecare E-commerce.</p>
            {/* Tổng số giao dịch và tổng tiền */}
            <div className="flex flex-wrap gap-4 mb-4">
              <div className="bg-blue-50 text-blue-800 rounded-lg px-4 py-2 text-sm font-medium shadow-sm">
                Tổng giao dịch: {historyData.length}
              </div>
              <div className="bg-green-50 text-green-800 rounded-lg px-4 py-2 text-sm font-medium shadow-sm">
                Tổng tiền đã thanh toán: {totalAmount.toLocaleString()} <span className="font-bold">VNĐ</span>
              </div>
            </div>
            {/* Bảng responsive */}
            <div className="overflow-x-auto rounded-lg">
              {loading ? (
                <div className="py-6">
                  <EmptyState isLoading description="Đang tải lịch sử thanh toán..." />
                </div>
              ) : error ? (
                <div className="py-6">
                  <EmptyState title="Có lỗi xảy ra" description={error} />
                </div>
              ) : historyData.length === 0 ? (
                <div className="py-6">
                  <EmptyState title="Chưa có giao dịch" description="Bạn chưa thực hiện thanh toán nào trên hệ thống." />
                </div>
              ) : (
                <table className="min-w-full table-fixed bg-white border border-gray-200 rounded-lg overflow-hidden text-sm">
                  <colgroup>
                    <col className="w-1/2" />
                    <col className="w-1/4" />
                    <col className="w-1/4" />
                  </colgroup>
                  <thead className="sticky top-0 z-10 bg-gray-100 text-gray-700 font-semibold shadow-sm">
                    <tr>
                      <th className="p-3 text-left whitespace-nowrap">Phương thức</th>
                      <th className="p-3 text-right whitespace-nowrap">Số tiền</th>
                      <th className="p-3 text-left whitespace-nowrap">Ngày</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.map((item, index) => (
                      <tr key={index} className="border-b hover:bg-blue-50 transition-shadow hover:shadow-md group">
                        <td className="p-3 flex items-center gap-2">
                          <Tooltip content={getPaymentMethod(item.cr1bb_phuongthucthanhtoan)}>
                            {getPaymentIcon(item.cr1bb_phuongthucthanhtoan)}
                          </Tooltip>
                          <span>{getPaymentMethod(item.cr1bb_phuongthucthanhtoan)}</span>
                        </td>
                        <td className="p-3 text-green-700 font-semibold cursor-pointer select-all">
                          <div className="w-full flex items-center gap-2 justify-end" onClick={() => handleCopyAmount(item.cr44a_sotien, index)}>
                            <span>{item.cr44a_sotien.toLocaleString()}</span> <span className="text-xs font-normal">VNĐ</span>
                            <Tooltip content={copiedIndex === index ? 'Đã copy!' : 'Sao chép'}>
                              <FaRegCopy className={`ml-1 text-gray-400 hover:text-blue-500 transition-colors ${copiedIndex === index ? 'text-green-500' : ''}`} />
                            </Tooltip>
                          </div>
                        </td>
                        <td className="p-3 flex items-center gap-2 text-gray-700 whitespace-nowrap">
                          <FaCalendarAlt className="text-blue-400" />
                          {formatDate(item.cr44a_ngayhachtoan)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </section>
              </main>
            </div>
          </div>
        </div>
      </div>

      <Toolbar />
      <Footer />
    </div>
  );
}
