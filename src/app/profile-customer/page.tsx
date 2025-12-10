"use client";
import Head from "next/head";
import "bootstrap/dist/css/bootstrap.min.css";
import JDStyleHeader from "@/components/JDStyleHeader";
import Footer from "@/components/footer";
import React, { useState, useEffect, useCallback } from "react";
import Toolbar from "@/components/toolbar";
import axios from "axios";
import { getItem } from "@/utils/SecureStorage";
import { CustomerProfileData } from "@/model/interface/CustomerProfileData";
import { Tooltip } from "@/components/ui/tooltip";
import PermissionInfo from "@/components/PermissionInfo";

export default function Home() {
  const [customerData, setCustomerData] = useState<CustomerProfileData | null>(null);
  const [employeeData, setEmployeeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cartItemsCount, setCartItemsCount] = useState(0);
  const [userName, setUserName] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [diachi, setdiachi] = useState<string | null>(null);
  const [typelogin, setTypeLogin] = useState<string | null>(null);
  const [Email, setEmail] = useState<string | null>(null);
  const [mst, setmst] = useState<string | null>(null);

  const rankRules = [
    {
      name: "Kim cương",
      order: 30,
      revenue: 100_000_000,
      productGroup: 40,
      color: "from-blue-300 to-blue-500",
      icon: "💎",
      desc: "Nhóm lớn, mua đa dạng & liên tục – ưu tiên chính sách giá",
      condition: "Số đơn hàng >= 30 & Doanh thu >= 100 triệu & Số nhóm sản phẩm >= 40",
    },
    {
      name: "Vàng",
      order: 15,
      revenue: 50_000_000,
      productGroup: 20,
      color: "from-yellow-200 to-yellow-400",
      icon: "🥇",
      desc: "Khách ổn định, tiềm năng tăng trưởng",
      condition: "Số đơn hàng >= 15 & Doanh thu >= 50 triệu & Số nhóm sản phẩm >= 20",
    },
    {
      name: "Bạc",
      order: 10,
      revenue: 20_000_000,
      productGroup: 10,
      color: "from-gray-300 to-gray-500",
      icon: "🥈",
      desc: "Giữ quan hệ, thúc đẩy cross-sell",
      condition: "Số đơn hàng >= 10 & Doanh thu >= 20 triệu & Số nhóm sản phẩm >= 10",
    },
    {
      name: "Đồng",
      order: 0,
      revenue: 0,
      productGroup: 0,
      color: "from-orange-200 to-orange-400",
      icon: "🥉",
      desc: "Nhóm mới/thấp; nuôi dưỡng bằng combo nhỏ & khuyến khích đặt lặp",
      condition: "Còn lại",
    },
  ];

  function getProgress(value: number, max: number) {
    if (max === 0) return 100;
    return Math.min(100, Math.round((value / max) * 100));
  }

  function getRankByName(rankName: string) {
    return rankRules.find(rule => rule.name === rankName) || rankRules[rankRules.length - 1];
  }

  function getRankIndex(rankName: string) {
    return rankRules.findIndex(rule => rule.name === rankName);
  }

  function getNextRank(index: number) {
    if (index === 0) return null; // Đã là Kim cương
    return rankRules[index - 1];
  }

  // Hàm xác định trạng thái thăng/giữ/giảm hạng
  function getRankStatus(prevRankName: string, currentRankName: string) {
    const prevIndex = getRankIndex(prevRankName);
    const currIndex = getRankIndex(currentRankName);
    if (currIndex > prevIndex) return { status: "Thăng hạng", color: "text-green-600", icon: "⬆️" };
    if (currIndex < prevIndex) return { status: "Giảm hạng", color: "text-red-500", icon: "⬇️" };
    return { status: "Giữ hạng", color: "text-blue-500", icon: "⏸️" };
  }

  useEffect(() => {
    const Idlogin = getItem("id");
    const userEmail = getItem("email");
    const userType = getItem("type");

    const fetchData = async () => {
      if (!Idlogin) {
        console.error("ID đăng nhập không tồn tại - fetchData - line 45: ");
        setError("ID đăng nhập không tồn tại - fetchData - line 46: ");
        setLoading(false);
        return;
      }

      try {
        // Fetch customer data
        if (userType !== "sale") {
          const customerResponse = await axios.get(
            `/api/getCustomerData?customerId=${Idlogin}`
          );

          if (Array.isArray(customerResponse.data) && customerResponse.data.length > 0) {
            const customerInfo = customerResponse.data[0];
            setCustomerData(customerInfo);
          } else {
            setError("Không tìm thấy thông tin khách hàng");
          }
        }

        // Fetch employee data if user is sale
        if (userType === "sale" && userEmail) {
          try {
            const employeeResponse = await axios.get(
              `/api/getEmployeData?user=${userEmail}`
            );
            setEmployeeData(employeeResponse.data);
          } catch (employeeErr) {
            console.error("Lỗi khi lấy dữ liệu nhân viên:", employeeErr);
            // Don't set error for employee data, just log it
          }
        }
      } catch (err) {
        console.error("Lỗi khi lấy dữ liệu - fetchData - line 63: ", err);
        setError("Không thể lấy thông tin dữ liệu - fetchData - line 64: ");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const storedUserName = getItem("userName");
    const storedPhoneNumber = getItem("userPhone");
    const storeddiachi = getItem("diachi");
    const storedemail = getItem("email");
    const storedmst = getItem("mst");
    const typelogin = getItem("type");

    setUserName(storedUserName);
    setPhoneNumber(storedPhoneNumber);
    setdiachi(storeddiachi);
    setTypeLogin(typelogin);
    setmst(storedmst);
    setEmail(storedemail);

  }, []);

  const handleCartToggle = useCallback(() => {}, []);

  const handleSearch = useCallback((query: string) => {}, []);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return "";
    }
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <JDStyleHeader
        cartItemsCount={cartItemsCount}
        onSearch={handleSearch}
        onCartClick={() => {}}
        hideSearch={false}
      />

      <main className="container mx-auto px-2 md:px-8 pb-20 max-w-4xl font-sans" style={{ paddingTop: '140px' }}>
        {/* Card thông tin nhân viên lên trên */}
        {typelogin === "sale" && employeeData && (
          <section className="bg-white shadow-2xl rounded-3xl overflow-hidden mb-10 p-10 flex flex-col md:flex-row gap-10 items-center border border-blue-100">
            <div className="flex-shrink-0 flex flex-col items-center gap-3">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-blue-200 to-blue-500 flex items-center justify-center text-5xl text-white font-bold shadow-xl border-4 border-blue-400">
                {employeeData.name?.charAt(0) || "E"}
              </div>
              <span className="text-2xl font-bold text-blue-800 flex items-center gap-2">
                {employeeData.name}
                <span className="ml-2 px-2 py-1 bg-gradient-to-r from-blue-300 to-blue-500 text-white rounded-full text-xs font-bold shadow">Nhân viên</span>
              </span>
            </div>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center gap-2 text-gray-700 text-base">
                <span className="text-blue-500">👨‍💼</span>
                <span className="font-medium">Chức vụ:</span> {employeeData.chucVuText || <span className="italic text-gray-400">Chưa cập nhật</span>}
              </div>
              <div className="flex items-center gap-2 text-gray-700 text-base">
                <span className="text-blue-500">📞</span>
                <span className="font-medium">Số điện thoại:</span> {employeeData.phone || <span className="italic text-gray-400">Chưa cập nhật</span>}
              </div>
              <div className="flex items-center gap-2 text-gray-700 text-base">
                <span className="text-blue-500">📧</span>
                <span className="font-medium">Email:</span> {employeeData.email || <span className="italic text-gray-400">Chưa cập nhật</span>}
              </div>
              <div className="flex items-center gap-2 text-gray-700 text-base">
                <span className="text-blue-500">🆔</span>
                <span className="font-medium">Mã nhân viên:</span> {employeeData.customerId || <span className="italic text-gray-400">Chưa cập nhật</span>}
              </div>
            </div>
          </section>
        )}
        {/* Permission Info xuống dưới */}
        <div className="mb-6">
          <PermissionInfo />
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-96">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 border-solid"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-8 mb-12 rounded-2xl shadow-2xl flex flex-col items-center">
            <span className="text-5xl mb-2">⚠️</span>
            <p className="font-bold text-2xl mb-2">Lỗi</p>
            <p className="text-lg">{error}</p>
          </div>
        ) : (typelogin !== "sale" && !customerData) ? (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-8 mt-12 rounded-2xl shadow-2xl flex flex-col items-center">
            <span className="text-5xl mb-2">⚠️</span>
            <p className="font-bold text-2xl mb-2">Chú ý</p>
            <p className="text-lg">Không có thông tin khách hàng.</p>
          </div>
        ) : null}

        {/* Card thông tin cá nhân */}
        {customerData && (
          <section className="bg-white shadow-2xl rounded-3xl overflow-hidden mb-10 p-10 flex flex-col md:flex-row gap-10 items-center border border-blue-100">
            <div className="flex-shrink-0 flex flex-col items-center gap-3">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-blue-200 to-blue-500 flex items-center justify-center text-5xl text-white font-bold shadow-xl border-4 border-blue-400">
                {userName?.charAt(0) || "U"}
              </div>
              <span className="text-2xl font-bold text-blue-800 flex items-center gap-2">
                {userName}
                {/* Badge xác thực nếu là VIP */}
                {customerData.crdfd_json_phan_hang_chu_ky_hien_tai?.Hang_Chinh_Thuc === 'Kim cương' && <span className="ml-2 px-2 py-1 bg-gradient-to-r from-yellow-300 to-yellow-500 text-yellow-900 rounded-full text-xs font-bold shadow">VIP</span>}
              </span>
            </div>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center gap-2 text-gray-700 text-base">
                <span className="text-blue-500">🏠</span>
                <span className="font-medium">Địa chỉ:</span> {diachi || <span className="italic text-gray-400">Chưa cập nhật</span>}
              </div>
              <div className="flex items-center gap-2 text-gray-700 text-base">
                <span className="text-blue-500">📞</span>
                <span className="font-medium">Số điện thoại:</span> {phoneNumber || <span className="italic text-gray-400">Chưa cập nhật</span>}
              </div>
              <div className="flex items-center gap-2 text-gray-700 text-base">
                <span className="text-blue-500">🧾</span>
                <span className="font-medium">Mã số thuế:</span> {mst || <span className="italic text-gray-400">Chưa cập nhật</span>}
              </div>
              <div className="flex items-center gap-2 text-gray-700 text-base">
                <span className="text-blue-500">📧</span>
                <span className="font-medium">Email:</span> {Email || <span className="italic text-gray-400">Chưa cập nhật</span>}
              </div>
            </div>
          </section>
        )}

        {/* Card hạng khách hàng & chart */}
        {typelogin !== "sale" && (() => {
          // Sử dụng dữ liệu phân hạng từ API
          let currentData = null;
          let prevData = null;
          let currentRank = rankRules[rankRules.length - 1]; // Mặc định là Đồng
          let currentRankIndex = rankRules.length - 1;
          
          // Nếu có dữ liệu phân hạng từ API, sử dụng dữ liệu đó
          if (customerData && customerData.crdfd_json_phan_hang_chu_ky_hien_tai) {
            currentData = customerData.crdfd_json_phan_hang_chu_ky_hien_tai;
            prevData = customerData.crdfd_json_phan_hang_chu_ky_truoc;
            
            // Lấy hạng từ dữ liệu API với validation
            const currentRankName = currentData?.Hang_Chinh_Thuc || "Đồng";
            currentRank = getRankByName(currentRankName);
            currentRankIndex = getRankIndex(currentRankName);
            
            // Đảm bảo dữ liệu số hợp lệ
            if (currentData) {
              currentData.SoDonHang = Number(currentData.SoDonHang) || 0;
              currentData.TongTien = Number(currentData.TongTien) || 0;
              currentData.SoNSP = Number(currentData.SoNSP) || 0;
            }
            
            if (prevData) {
              prevData.SoDonHang = Number(prevData.SoDonHang) || 0;
              prevData.TongTien = Number(prevData.TongTien) || 0;
              prevData.SoNSP = Number(prevData.SoNSP) || 0;
            }
          }
          
          const nextRank = getNextRank(currentRankIndex);
          const progressTarget = nextRank || currentRank;
          const prevRankName = prevData?.Hang_Truoc || "Đồng";
          const currentRankName = currentRank.name;
          const rankStatus = getRankStatus(prevRankName, currentRankName);
          const isMaxRank = currentRankIndex === 0; // Đã đạt hạng cao nhất
          
          return (
            <>
            <section className="bg-gradient-to-br from-white via-blue-50 to-blue-100 shadow-lg rounded-2xl overflow-hidden mb-6 p-6 border border-blue-200">
              <div className="flex flex-col md:flex-row items-center gap-6 mb-4">
                {/* Icon hạng khách hàng */}
                <div className="relative">
                  <div className={`flex items-center justify-center w-20 h-20 rounded-full shadow-lg text-5xl bg-gradient-to-br ${currentRank.color} text-white border-4 border-white ring-2 ring-blue-200`}>
                    {currentRank.icon}
                  </div>
                  {/* Badge VIP cho hạng Kim cương */}
                  {currentRank.name === 'Kim cương' && (
                    <div className="absolute -top-1 -right-1 bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900 px-2 py-0.5 rounded-full text-xs font-bold shadow-md border border-yellow-300">
                      VIP
                    </div>
                  )}
                </div>
                
                {/* Thông tin hạng */}
                <div className="flex-1">
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-3 mb-3">
                    <h2 className="text-3xl font-bold text-blue-800">
                      <span className="bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">
                        {currentRank.name}
                      </span>
                    </h2>
                    
                    {/* Hiển thị trạng thái thăng/giữ/giảm hạng */}
                    {prevData && (
                      <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full ${rankStatus.color} bg-white/90 shadow-md border border-white/50 font-medium text-sm`}>
                        <span>{rankStatus.icon}</span>
                        <span>{rankStatus.status}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Thông tin chi tiết */}
                  <div className="space-y-2">
                    {currentData ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-white/70 rounded-lg p-3 border border-white/50">
                          <div className="text-xs font-semibold text-blue-700 mb-1">📊 Chu kỳ hiện tại</div>
                          <div className="text-sm font-bold text-gray-800">
                            <span className="text-blue-600">{currentData.SoDonHang}</span> đơn • 
                            <span className="text-green-600"> {formatCurrency(currentData.TongTien)}</span> • 
                            <span className="text-purple-600"> {currentData.SoNSP}</span> nhóm SP
                          </div>
                        </div>
                        
                        {prevData && (
                          <div className="bg-white/70 rounded-lg p-3 border border-white/50">
                            <div className="text-xs font-semibold text-gray-600 mb-1">📈 Chu kỳ trước</div>
                            <div className="text-sm font-bold text-gray-700">
                              <span className="text-blue-600">{prevData.SoDonHang}</span> đơn • 
                              <span className="text-green-600"> {formatCurrency(prevData.TongTien)}</span> • 
                              <span className="text-purple-600"> {prevData.SoNSP}</span> nhóm SP
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="text-yellow-800 font-medium text-sm">🎯 Chưa có dữ liệu phân hạng</div>
                        <div className="text-yellow-700 text-xs">Hãy đặt hàng để được xếp hạng!</div>
                      </div>
                    )}
                    
                    {/* Thông tin chu kỳ */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                      <div className="text-blue-700 text-xs font-medium flex items-center gap-1">
                        <span>📅</span>
                        <span>Chu kỳ phân hạng: 6 tháng (Đầu năm & Cuối năm)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Chart tiến độ - chỉ hiển thị khi có dữ liệu và chưa đạt hạng cao nhất */}
              {currentData && !isMaxRank && (
                <div className="bg-white/80 rounded-xl p-4 border border-white/50 shadow-md mt-4">
                  <h3 className="text-lg font-bold text-blue-800 mb-4 text-center">🎯 Tiến độ nâng hạng</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Số đơn hàng */}
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                      <div className="flex items-center justify-between mb-3">
                        <Tooltip content={`Số đơn hàng trong chu kỳ hiện tại. Quy tắc: ≥ ${progressTarget.order} (${progressTarget.name})`}>
                          <span className="text-sm font-bold text-blue-800 flex items-center gap-1 cursor-help">
                            <span className="text-lg">🛒</span> Số đơn hàng
                          </span>
                        </Tooltip>
                        <div className="text-right">
                          <div className="text-lg font-bold text-blue-600">{currentData.SoDonHang}</div>
                          <div className="text-xs text-blue-500">/ {progressTarget.order}</div>
                        </div>
                      </div>
                      
                      <div className="relative mb-3">
                        <div className="w-full bg-blue-200 rounded-full h-3 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-blue-400 to-blue-600 h-3 rounded-full transition-all duration-500 flex items-center justify-end pr-1 text-xs text-white font-bold"
                            style={{
                              width: `${getProgress(currentData.SoDonHang, progressTarget.order)}%`,
                            }}
                          >
                            {getProgress(currentData.SoDonHang, progressTarget.order)}%
                          </div>
                        </div>
                      </div>
                      
                      {currentData.SoDonHang >= progressTarget.order ? (
                        <div className="bg-green-100 border border-green-300 rounded-lg p-2 text-center">
                          <span className="text-green-700 font-bold text-xs">✅ Đã đạt</span>
                        </div>
                      ) : (
                        <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-2 text-center">
                          <div className="text-yellow-800 font-bold text-xs">Còn thiếu</div>
                          <div className="text-yellow-700 text-xs">
                            <b>{progressTarget.order - currentData.SoDonHang}</b> đơn để lên <b>{progressTarget.name}</b>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Doanh thu */}
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                      <div className="flex items-center justify-between mb-3">
                        <Tooltip content={`Tổng doanh thu trong chu kỳ hiện tại. Quy tắc: ≥ ${formatCurrency(progressTarget.revenue)} (${progressTarget.name})`}>
                          <span className="text-sm font-bold text-green-800 flex items-center gap-1 cursor-help">
                            <span className="text-lg">💰</span> Doanh thu
                          </span>
                        </Tooltip>
                        <div className="text-right">
                          <div className="text-sm font-bold text-green-600">{formatCurrency(currentData.TongTien)}</div>
                          <div className="text-xs text-green-500">/ {formatCurrency(progressTarget.revenue)}</div>
                        </div>
                      </div>
                      
                      <div className="relative mb-3">
                        <div className="w-full bg-green-200 rounded-full h-3 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all duration-500 flex items-center justify-end pr-1 text-xs text-white font-bold"
                            style={{
                              width: `${getProgress(currentData.TongTien, progressTarget.revenue)}%`,
                            }}
                          >
                            {getProgress(currentData.TongTien, progressTarget.revenue)}%
                          </div>
                        </div>
                      </div>
                      
                      {currentData.TongTien >= progressTarget.revenue ? (
                        <div className="bg-green-100 border border-green-300 rounded-lg p-2 text-center">
                          <span className="text-green-700 font-bold text-xs">✅ Đã đạt</span>
                        </div>
                      ) : (
                        <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-2 text-center">
                          <div className="text-yellow-800 font-bold text-xs">Còn thiếu</div>
                          <div className="text-yellow-700 text-xs">
                            <b>{formatCurrency(progressTarget.revenue - currentData.TongTien)}</b> để lên <b>{progressTarget.name}</b>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Số nhóm sản phẩm */}
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                      <div className="flex items-center justify-between mb-3">
                        <Tooltip content={`Số nhóm sản phẩm đã mua trong chu kỳ hiện tại. Quy tắc: ≥ ${progressTarget.productGroup} (${progressTarget.name})`}>
                          <span className="text-sm font-bold text-purple-800 flex items-center gap-1 cursor-help">
                            <span className="text-lg">📦</span> Nhóm sản phẩm
                          </span>
                        </Tooltip>
                        <div className="text-right">
                          <div className="text-lg font-bold text-purple-600">{currentData.SoNSP}</div>
                          <div className="text-xs text-purple-500">/ {progressTarget.productGroup}</div>
                        </div>
                      </div>
                      
                      <div className="relative mb-3">
                        <div className="w-full bg-purple-200 rounded-full h-3 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-purple-400 to-purple-600 h-3 rounded-full transition-all duration-500 flex items-center justify-end pr-1 text-xs text-white font-bold"
                            style={{
                              width: `${getProgress(currentData.SoNSP, progressTarget.productGroup)}%`,
                            }}
                          >
                            {getProgress(currentData.SoNSP, progressTarget.productGroup)}%
                          </div>
                        </div>
                      </div>
                      
                      {currentData.SoNSP >= progressTarget.productGroup ? (
                        <div className="bg-green-100 border border-green-300 rounded-lg p-2 text-center">
                          <span className="text-green-700 font-bold text-xs">✅ Đã đạt</span>
                        </div>
                      ) : (
                        <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-2 text-center">
                          <div className="text-yellow-800 font-bold text-xs">Còn thiếu</div>
                          <div className="text-yellow-700 text-xs">
                            <b>{progressTarget.productGroup - currentData.SoNSP}</b> nhóm để lên <b>{progressTarget.name}</b>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Thông báo đã đạt hạng cao nhất */}
              {currentData && isMaxRank && (
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-200 border border-yellow-300 rounded-xl p-4 text-center mt-4">
                  <div className="text-3xl mb-2">🏆</div>
                  <h3 className="text-xl font-bold text-yellow-800 mb-2">
                    <span className="bg-gradient-to-r from-yellow-600 to-yellow-800 bg-clip-text text-transparent">
                      Chúc mừng!
                    </span>
                  </h3>
                  <div className="bg-white/80 rounded-lg p-3 border border-yellow-300">
                    <p className="text-sm font-bold text-yellow-800 mb-2">
                      Bạn đã đạt hạng <span className="text-yellow-900 underline">{currentRank.name}</span>
                    </p>
                    <p className="text-sm text-yellow-700 mb-2">
                      🎉 Hạng cao nhất trong hệ thống!
                    </p>
                    <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 rounded-lg p-2 border border-yellow-300">
                      <p className="text-yellow-800 font-semibold text-xs">💎 Tiếp tục duy trì để nhận được những ưu đãi tốt nhất!</p>
                    </div>
                  </div>
                </div>
              )}
            </section>
            
            </>
          );
        })()}

        

        {/* Card công nợ */}
        {typelogin !== "sale" && (
          <section className="bg-white shadow-2xl rounded-3xl overflow-hidden p-10 mb-8 border border-blue-100">
            <h2 className="text-2xl font-bold mb-6 text-blue-800">Thông tin công nợ</h2>
            {customerData && customerData.debtInfo ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="flex items-center gap-2 text-gray-700 text-base">
                  <span className="text-blue-500">💳</span>
                  <span className="font-medium">Hạn mức công nợ:</span> {formatCurrency(customerData.debtInfo.cr1bb_hanmuccongnonen) || "0 ₫"}
                </div>
                <div className="flex items-center gap-2 text-gray-700 text-base">
                  <span className="text-blue-500">💸</span>
                  <span className="font-medium">Tổng công nợ:</span> {formatCurrency(customerData.debtInfo.cr1bb_tongcongno) || "0 ₫"}
                </div>
                <div className="flex items-center gap-2 text-gray-700 text-base">
                  <span className="text-blue-500">⏳</span>
                  <span className="font-medium">Công nợ chưa tới hạn:</span> {formatCurrency(customerData.debtInfo.cr1bb_congnochuatoihan) || "0 ₫"}
                </div>
                <div className="flex items-center gap-2 text-gray-700 text-base">
                  <span className="text-blue-500">⚠️</span>
                  <span className="font-medium">Công nợ quá hạn:</span> {formatCurrency(customerData.debtInfo.cr1bb_congnoquahan) || "0 ₫"}
                </div>
                <div className="flex items-center gap-2 text-gray-700 text-base md:col-span-2">
                  <span className="text-blue-500">📄</span>
                  <span className="font-medium">Điều khoản thanh toán:</span> {customerData.debtInfo.cr1bb_ieukhoanthanhtoan || ""}
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-base italic">Chưa có thông tin công nợ</p>
            )}
          </section>
        )}
      </main>

      <Toolbar />
      <Footer />
    </div>
  );
}
