"use client";
import axios from "axios";
import React, { useEffect, useState, useCallback, useContext } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import Head from "next/head";
import JDStyleHeader from "@/components/JDStyleHeader";
import Footer from "@/components/footer";
import Toolbar from "@/components/toolbar";
import PreOrdersTableProps from "./Table-PreOrders/table-preorders";
import SaleOrderTable from "./Table-Orders/table-orders";
import Products from "../../../src/model/Product";
import { EmptyState } from "@/components/ui/empty-state";
import { getItem } from "@/utils/SecureStorage";
import { useDebounce } from 'use-debounce';
import { formatDateToDDMMYYYY } from '@/utils/utils';
import { useCart } from "@/components/CartManager";
import { CartContext } from "@/components/CartGlobalManager";

const OrdersComponent = () => {
  const [filteredPreOders, setFilteredPreOders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOders] = useState<any[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [activeTab, setActiveTab] = useState("xacnhan"); // Tab mặc định
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [cartItems, setCartItems] = useState<
    (Products & { quantity: number })[]
  >([]);
  const [loading, setLoading] = useState(true);

  const toggleCart = () => setIsCartOpen((prev) => !prev);

  // Get cart context
  const { cartItems: globalCartItems, addToCart, updateQuantity, removeItem, clearCart } = useCart();
  const { openCart } = useContext(CartContext);

  const handleSearch = (term: string) => {
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
  };

  // Kiểm tra trạng thái đăng nhập và lấy tên người dùng từ localStorage
  useEffect(() => {
    const storedName = getItem("userName");
    const loggedIn = !!storedName; // Xác định đã đăng nhập chưa

    setIsLoggedIn(loggedIn);
  }, []);

  useEffect(() => {
    // Ngày hiện tại
    const currentDate = new Date();

    // Ngày 60 ngày trước
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(currentDate.getDate() - 60);

    // Format date to YYYY-MM-DD for input type="date"
    const formatDateForInput = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Thiết lập giá trị mặc định cho fromDate và toDate
    setFromDate(formatDateForInput(sixtyDaysAgo));
    setToDate(formatDateForInput(currentDate));
  }, []);

  const fetchPreOrders = useCallback(async () => {
    const storedId = getItem("id"); // Lấy id từ localStorage
    const typelogin = getItem("type");
    if (storedId) {
      try {
        setLoading(true);
        axios
          .get(
            `/api/getPreOdersData?id_khachhang=${storedId}&type_Login=${typelogin}`
          ) // Gửi id qua query parameters
          .then((response) => {
            const filteredPreOders = response.data.filter(
              (PreOder: { crdfd_ngayaton: Date }) => {
                const orderDate = new Date(PreOder.crdfd_ngayaton);
                const startDate = fromDate
                  ? new Date(fromDate)
                  : null;
                const endDate = toDate ? new Date(toDate) : null;
                // Kiểm tra ngày bắt đầu và ngày kết thúc
                return (
                  (!startDate || orderDate >= startDate) &&
                  (!endDate || orderDate <= endDate)
                );
              }
            );
            // Cập nhật danh sách đã lọc
            setFilteredPreOders(filteredPreOders);
          })
          .catch((error) => {
            console.error("Error fetching Orders - fetchPreOrders - line 90:", error);
          });
      } catch (error) {
        console.error("Error fetching Orders - fetchPreOrders - line 93:", error);
      } finally {
        setLoading(false);
      }
    }
  }, [fromDate, toDate]);

  const debouncedFetchPreOrders = useDebounce(fetchPreOrders, 300)[0];

  useEffect(() => {
    debouncedFetchPreOrders();
  }, [debouncedFetchPreOrders]);

  //get data order
  useEffect(() => {
    const storedId = getItem("id");
    if (storedId) {
      axios
        .get(`/api/getSaleOrdersData?id_khachhang=${storedId}`) // Gửi id qua query parameters
        .then((response) => {
          const filteredOrders = response.data.filter(
            (Order: { crdfd_ngaytaoonhang: Date }) => {
              const orderDate = new Date(Order.crdfd_ngaytaoonhang);
              const startDate = fromDate
                ? new Date(fromDate)
                : null;
              const endDate = toDate ? new Date(toDate) : null;

              return (
                (!startDate || orderDate >= startDate) &&
                (!endDate || orderDate <= endDate)
              );
            }
          );
          // Cập nhật danh sách đã lọc
          setFilteredOders(filteredOrders);
        })
        .catch((error) => {
          console.error("Error fetching Orders - fetchPreOrders - line 132:", error);
        });
    }
  }, [fromDate, toDate]);

  const itemsPerPage = 10; // Số item mỗi trang
  // Tính toán số trang
  const totalPagesPreOders = Math.ceil(filteredPreOders.length / itemsPerPage);
  const totalPagesOders = Math.ceil(filteredOrders.length / itemsPerPage);
  const cartItemsCount = cartItems.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const handleDateChange = (value: string, setDate: (date: string) => void) => {
    setDate(value);
  };

  return (
    <>
      <div className="bg-gray-50 min-h-screen flex flex-col overflow-x-hidden">
        {/* JD Style Layout */}
        <div className="bg-white">
          {/* Header with Search */}
          <JDStyleHeader
            cartItemsCount={globalCartItems.length}
            onSearch={handleSearch}
            onCartClick={openCart}
          />

          {/* Main Layout - No Sidebar */}
          <div className="max-w-7xl mx-auto px-0 py-6" style={{ paddingTop: '140px' }}>
            <div className="flex flex-col">
              {/* Main Content - Full Width */}
              <div className="w-full">
                <main className="w-full px-4 py-6">
          {!isLoggedIn ? (
            <section className="py-12 bg-slate-100">
              <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden">
                <div className="p-8 text-center">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">
                    Yêu cầu đăng nhập
                  </h2>
                  <p className="text-gray-600">
                    Vui lòng đăng nhập để truy cập nội dung của trang web.
                  </p>
                  <a
                    href="/login"
                    className="mt-6 inline-block bg-customBlue hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-300"
                  >
                    Đến trang đăng nhập
                  </a>
                </div>
              </div>
            </section>
          ) : (
            <section className="py-10">
              <div className="max-w-screen-2xl mx-auto px-4 md:px-8">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-8">Lịch sử đặt hàng</h1>
                  {/* Filter ngày */}
                  <div className="flex flex-col md:flex-row justify-center gap-6 mb-8">
                    <div className="flex flex-col w-full md:w-1/4">
                      <label htmlFor="from-date" className="block mb-1 text-xs font-medium text-gray-500">Từ ngày</label>
                      <input
                        type="date"
                        id="from-date"
                        value={fromDate}
                        onChange={(e) => handleDateChange(e.target.value, setFromDate)}
                        className="border border-gray-200 p-3 rounded-xl w-full focus:outline-none focus:border-blue-500 bg-white text-gray-700 text-base"
                        style={{ colorScheme: 'normal' }}
                        placeholder="dd/mm/yyyy"
                      />
                    </div>
                    <div className="flex flex-col w-full md:w-1/4">
                      <label htmlFor="to-date" className="block mb-1 text-xs font-medium text-gray-500">Đến ngày</label>
                      <input
                        type="date"
                        id="to-date"
                        value={toDate}
                        onChange={(e) => handleDateChange(e.target.value, setToDate)}
                        className="border border-gray-200 p-3 rounded-xl w-full focus:outline-none focus:border-blue-500 bg-white text-gray-700 text-base"
                        style={{ colorScheme: 'normal' }}
                        placeholder="dd/mm/yyyy"
                      />
                    </div>
                  </div>
                  {/* Tab chuyển đổi */}
                  <div className="flex justify-center gap-4 mb-8">
                    <button
                      className={`flex items-center gap-2 py-3 px-6 rounded-xl text-base font-semibold transition-all border-2 ${
                        activeTab === "xacnhan"
                          ? "bg-blue-50 text-blue-700 border-blue-500 shadow-sm"
                          : "bg-white text-gray-700 border-gray-200 hover:bg-blue-50 hover:text-blue-700"
                      }`}
                      onClick={() => setActiveTab("xacnhan")}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" /></svg>
                      Chờ xác nhận
                    </button>
                    <button
                      className={`flex items-center gap-2 py-3 px-6 rounded-xl text-base font-semibold transition-all border-2 ${
                        activeTab === "dat"
                          ? "bg-blue-50 text-blue-700 border-blue-500 shadow-sm"
                          : "bg-white text-gray-700 border-gray-200 hover:bg-blue-50 hover:text-blue-700"
                      }`}
                      onClick={() => setActiveTab("dat")}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      Đã đặt
                    </button>
                  </div>
                  {/* Bảng dữ liệu */}
                  <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-0 md:p-2">
                    {loading ? (
                      <EmptyState isLoading description="Đang tải dữ liệu..." />
                    ) : (
                      <>
                        {activeTab === "xacnhan" && (
                          <PreOrdersTableProps
                            items={filteredPreOders}
                            totalPagesPreOders={totalPagesPreOders}
                            fromDate={fromDate}
                            toDate={toDate}
                          />
                        )}
                        {activeTab === "dat" && (
                          <SaleOrderTable
                            items={filteredOrders}
                            totalPagesSaleOrder={totalPagesOders}
                          />
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}
                </main>
              </div>
            </div>
          </div>
        </div>

        <Toolbar />
        <Footer />
      </div>
    </>
  );
};

export default OrdersComponent;
