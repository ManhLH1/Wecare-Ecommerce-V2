import React, { useState, useEffect } from "react";
import axios from "axios";
import { setItem, getItem, removeItem } from "@/utils/SecureStorage";
import {
  getPermissionByChucVu,
  isDepartmentWithSpecialPermission,
} from "@/utils/permissionUtils";
import Image from "next/image";

export default function LoginForm() {
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberAccount, setRememberAccount] = useState(false);

  const isEmail = (input: string) => /\S+@\S+\.\S+/.test(input);

  // Prefill remembered account on first load
  useEffect(() => {
    try {
      const storedRemember = getItem("rememberAccount");
      const shouldRemember = storedRemember === true || storedRemember === "true";
      if (shouldRemember) {
        const savedUser = getItem("rememberedUser");
        if (typeof savedUser === "string" && savedUser.length > 0) {
          setUser(savedUser);
        }
        setRememberAccount(true);
      }
    } catch {}
  }, []);
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Reset messages và bắt đầu loading
    setLoginError("");
    setSuccessMessage("");
    setIsLoading(true);

    try {
      if (isEmail(user)) {
        //Sale đăng nhập
        const response = await axios.get(`/api/getEmployeData`, {
          params: { user: user },
        });
        if (response.status === 200) {
          const data = response.data;
          if (password === data.phone) {
            setItem("userName", data.name);
            setItem("email", data.email);
            setItem("id", data.customerId);
            setItem("phone", data.phone);
            setItem("temple", "all");
            if (
              data.chucVuVi === 283640072 ||
              data.chucVuVi === 283640045
            ) {
              setItem("type", "saleonline");
            } else {
              setItem("type", "saledirect");
            }

            setItem("saleName", data.name);

            // Xử lý permission cho phòng ban đặc biệt
            if (
              data.departmentId &&
              isDepartmentWithSpecialPermission(data.departmentId)
            ) {
              const permission = getPermissionByChucVu(data.chucVuVi);
              setItem("permissionType", permission.type);
              setItem("canViewPrice", permission.canViewPrice.toString());
              setItem("canCreateOrder", permission.canCreateOrder.toString());
              setItem("salesFlow", permission.salesFlow);
              setItem("departmentId", data.departmentId.toString());
              setItem("chucVuVi", data.chucVuVi.toString());
              setItem("chucVuText", data.chucVuText || "");
            }

            // Gọi API getPromotionDataNewVersion và lưu cache
            try {
              const promotionResponse = await axios.get(
                `/api/getPromotionDataNewVersion`,
                {
                  params: {
                    id: data.customerId,
                    MaKhachHang: data.cr44a_makhachhang,
                  },
                }
              );
              if (promotionResponse.status === 200 && promotionResponse.data) {
                setItem(
                  "promotionData",
                  JSON.stringify(promotionResponse.data)
                );
              } else {
                console.log(
                  "API trả về không thành công:",
                  promotionResponse.status
                );
              }
            } catch (promotionError) {
              console.error("Chi tiết lỗi khi gọi API:", promotionError);
            }

            // Hiển thị thông báo thành công cho sale
            setSuccessMessage("Đăng nhập thành công! Đang chuyển hướng...");

            // Delay một chút để user thấy thông báo trước khi chuyển hướng
            setTimeout(() => {
              window.location.href = "/"; // Điều hướng về trang chính
            }, 800);
          } else {
            setLoginError("Mật khẩu không chính xác!");
          }
        } else {
          setLoginError("Tài khoản không tồn tại!");
        }
      } else {
        //Khách hàng đăng nhập
        const response = await axios.get(`/api/getCustomerData`, {
          params: { customerId: user },
        });

        if (response.status === 200) {
          const data = response.data;
          if (password === data.sdt) {
            setItem("userName", data.name);
            setItem("userPhone", data.sdt);
            setItem("diachi", data.crdfd_address);
            setItem("email", data.email);
            setItem("mst", data.mst);
            setItem("id", data.customerId);
            setItem("type", "customer");
            setItem("temple", "all");
            setItem("MaKhachHang", data.cr44a_makhachhang);

            // Lưu customer group IDs và thông tin customer groups
            if (data.customerGroups && Array.isArray(data.customerGroups)) {
              const customerGroupIds = data.customerGroups.map(
                (group: { customerGroupId: string }) => group.customerGroupId
              );
              setItem("customerGroupIds", JSON.stringify(customerGroupIds));
            }

            // Gọi API getPromotionDataNewVersion và lưu cache
            try {
              const promotionResponse = await axios.get(
                `/api/getPromotionDataNewVersion`,
                {
                  params: {
                    id: data.customerId,
                    MaKhachHang: data.cr44a_makhachhang,
                  },
                }
              );
              if (promotionResponse.status === 200 && promotionResponse.data) {
                setItem(
                  "promotionData",
                  JSON.stringify(promotionResponse.data)
                );
              } else {
                console.log(
                  "API trả về không thành công:",
                  promotionResponse.status
                );
              }
            } catch (promotionError) {
              console.error("Chi tiết lỗi khi gọi API:", promotionError);
            }

            // Hiển thị thông báo thành công cho customer
            setSuccessMessage("Đăng nhập thành công! Đang chuyển hướng...");

            // Delay một chút để user thấy thông báo trước khi chuyển hướng
            setTimeout(() => {
              window.location.href = "/"; // Điều hướng về trang chính
            }, 1500);
          } else {
            setLoginError("Mật khẩu không chính xác!");
          }
        } else {
          setLoginError("Tài khoản không tồn tại!");
        }
      }
    } catch (error) {
      setLoginError("Tài khoản không tồn tại!");
    } finally {
      setIsLoading(false); // Tắt loading trong mọi trường hợp
    }
  };

  const handleGoBack = () => {
    window.history.back(); // Quay về trang trước đó
  };

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Left Side - Background */}
      <div className="hidden lg:flex lg:w-2/3 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 relative overflow-hidden">
        {/* Geometric Patterns */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-16 left-16 w-24 h-24 border-2 border-white transform rotate-45"></div>
          <div className="absolute top-32 right-24 w-20 h-20 border-2 border-white transform -rotate-12"></div>
          <div className="absolute bottom-24 left-24 w-20 h-20 border-2 border-white transform rotate-30"></div>
          <div className="absolute bottom-16 right-16 w-16 h-16 border-2 border-white transform -rotate-45"></div>
          <div className="absolute top-1/2 left-1/4 w-12 h-12 border-2 border-white transform rotate-15"></div>
          <div className="absolute top-1/3 right-1/4 w-10 h-10 border-2 border-white transform -rotate-30"></div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute bottom-1/3 left-1/4 w-6 h-12 bg-white opacity-30 rounded-full"></div>
        <div className="absolute bottom-1/3 left-1/4 ml-8 w-4 h-4 bg-yellow-300 rounded-full"></div>
        
        {/* Main Content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-8">
          {/* Logo */}
          <div className="mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center shadow-lg p-1">
                <Image
                  src="/Logo-Wecare.png"
                  alt="WECARE Logo"
                  width={48}
                  height={48}
                  className="object-contain"
                />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white mb-1">WECARE</h1>
                <p className="text-white/80 text-sm">Siêu thị công nghiệp</p>
              </div>
            </div>
          </div>
          

          {/* Company Information */}
          <div className="text-white/90 w-full max-w-md">
            <div className="bg-white/5 rounded-xl p-5 shadow-sm ring-1 ring-white/10 backdrop-blur-sm">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5 text-teal-300">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="text-sm leading-6">
                    <p className="uppercase tracking-wide text-xs text-white/80 font-semibold">Trụ sở 1</p>
                    <p className="text-white">14-16-18-20, Đường 36, P. Bình Phú, Q6, HCM</p>
                    <p className="flex items-center gap-2 text-amber-200"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>037 833 9009</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5 text-teal-300">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="text-sm leading-6">
                    <p className="uppercase tracking-wide text-xs text-white/80 font-semibold">Trụ sở 2</p>
                    <p className="text-white">Lô B39, Khu Công nghiệp Phú Tài, Phường Quy Nhơn Bắc, Tỉnh Gia Lai</p>
                    <p className="flex items-center gap-2 text-amber-200"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>+84 378 339 009</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-white/90">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>support@wecare.com.vn</span>
                </div>
              </div>
            </div>
          </div>

          {/* Company Description */}
          <div className="mt-8 text-center text-white/70 max-w-md">
            <p className="text-xs leading-relaxed">
              WECARE - Đối tác tin cậy của các doanh nghiệp trong lĩnh vực công nghiệp. 
              Chúng tôi cung cấp giải pháp toàn diện với chất lượng cao và dịch vụ chuyên nghiệp.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/3 flex items-center justify-center bg-white p-6">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-100 p-6">
          {/* Header with Logo */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center space-x-2 mb-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-md p-1">
                <Image
                  src="/Logo-Wecare.png"
                  alt="WECARE Logo"
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">WECARE</h1>
                <p className="text-gray-500 text-xs">Siêu thị công nghiệp</p>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Đăng Nhập</h2>
            <p className="text-gray-600 text-sm">Chào mừng bạn trở lại hệ thống</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field */}
            <div>
              <label htmlFor="user" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  type="text"
                  id="user"
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500 transition-colors text-sm placeholder:text-gray-400"
                  value={user}
                  onChange={(e) => {
                    const value = e.target.value;
                    setUser(value);
                    if (rememberAccount) {
                      setItem("rememberedUser", value);
                    }
                  }}
                  placeholder="Nhập email"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Mật khẩu
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500 transition-colors text-sm placeholder:text-gray-400"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <svg className="w-4 h-4 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {showPassword ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    )}
                  </svg>
                </button>
              </div>
            </div>

            {/* Options */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                
              </label>
        
            </div>

            {/* Error/Success Messages */}
            {loginError && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
                {loginError}
              </div>
            )}
            
            {successMessage && (
              <div className="p-2 bg-green-50 border border-green-200 rounded-lg text-green-700 text-xs">
                {successMessage}
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-2.5 px-4 rounded-lg font-semibold text-sm shadow-sm transition-all ${
                isLoading
                  ? "bg-gray-400 text-white cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-600 to-teal-500 text-white hover:from-blue-700 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500/40"
              }`}
            >
              {isLoading ? "Đang xử lý..." : "Đăng nhập"}
            </button>


            {/* Registration Link */}
            <div className="text-center text-xs text-gray-600">
              Bạn chưa có tài khoản?{" "}
              <a href="#" className="text-amber-600 hover:text-amber-700 font-medium">
                Đăng ký
              </a>
            </div>
          </form>

          {/* Back Button */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleGoBack}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              ← Quay về
            </button>
          </div>

          {/* Footer Info */}
          <div className="mt-4 pt-4 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">
              © {new Date().getFullYear()} WECARE. Tất cả quyền được bảo lưu.
            </p>
            <div className="flex justify-center space-x-3 mt-1 text-xs text-gray-400">
              <a href="/post/dieu-khoan-su-dung" className="hover:text-gray-600">Điều khoản sử dụng</a>
              <a href="/post/chinh-sach-bao-mat" className="hover:text-gray-600">Chính sách bảo mật</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
