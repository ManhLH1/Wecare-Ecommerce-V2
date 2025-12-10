"use client";
import React, { useState, useEffect } from "react";
import JDStyleHeader from "@/components/JDStyleHeader";
import JDStyleCategorySidebar from "@/components/JDStyleCategorySidebar";
import Footer from "@/components/footer";
import Toolbar from "@/components/toolbar";
import { useCart } from "@/components/CartManager";
import { CartContext } from "@/components/CartGlobalManager";
import TopProductsList from "@/app/product-list/_components/top-products/top-products-list";
import Products from "@/model/Product";
import axios from "axios";

const TopProductsPage = () => {
  const { cartItems, addToCart } = useCart();
  const { openCart } = React.useContext(CartContext);

  // State cho danh mục sản phẩm
  const [categoryGroups, setCategoryGroups] = useState<any[]>([]);
  const [categoryHierarchy, setCategoryHierarchy] = useState<any>(null);
  const [loadingCategory, setLoadingCategory] = useState(true);
  
  // State cho sidebar toggle - lưu trạng thái vào localStorage
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebarCollapsed') === 'true';
    }
    return false;
  });

  // Fetch danh mục sản phẩm
  useEffect(() => {
    const fetchProductGroups = async () => {
      setLoadingCategory(true);
      try {
        const res = await axios.get("/api/getProductGroupHierarchyLeftpanel");
        if (res.data && res.data.byLevel && res.data.byLevel["1"]) {
          setCategoryGroups(res.data.byLevel["1"]);
          setCategoryHierarchy(res.data);
        } else {
          setCategoryGroups([]);
          setCategoryHierarchy(null);
        }
      } catch (e) {
        setCategoryGroups([]);
        setCategoryHierarchy(null);
      } finally {
        setLoadingCategory(false);
      }
    };
    fetchProductGroups();
  }, []);

  // Hàm icon cho từng nhóm với màu sắc nhẹ nhàng
  const getIcon = (groupName: string) => {
    const normalized = groupName
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[đĐ]/g, "d");

    // Máy móc & Thiết bị công nghiệp
    if (normalized.includes("may moc") || normalized.includes("maymoc"))
      return "⚙️";
    if (
      normalized.includes("thiet bi cong nghiep") ||
      normalized.includes("thietbicongnghiep")
    )
      return "🏭";
    if (
      normalized.includes("thiet bi") &&
      !normalized.includes("van chuyen") &&
      !normalized.includes("bao ho")
    )
      return "🔧";

    // Thiết bị vận chuyển
    if (
      normalized.includes("thiet bi van chuyen") ||
      normalized.includes("vanchuyen") ||
      normalized.includes("van chuyen")
    ) {
      return "🚚";
    }

    // Bảo hộ lao động
    if (
      normalized.includes("bao ho") ||
      normalized.includes("an toan") ||
      normalized.includes("lao dong")
    ) {
      return "🛡️";
    }

    // Bao bì & Đóng gói
    if (normalized.includes("bao bi") || normalized.includes("dong goi")) {
      return "📦";
    }

    // Phụ tùng thay thế
    if (normalized.includes("phu tung") || normalized.includes("thay the")) {
      return "🔧";
    }

    // Vật tư tiêu hao
    if (
      normalized.includes("vat tu tieu hao") ||
      normalized.includes("tieu hao")
    ) {
      return "♻️";
    }

    // Kim khí & Phụ kiện
    if (normalized.includes("kim khi") || normalized.includes("phu kien")) {
      return "📦";
    }

    // Công cụ - Dụng cụ
    if (normalized.includes("cong cu") || normalized.includes("dung cu")) {
      return "🔨";
    }

    // Hóa chất
    if (normalized.includes("hoa chat") || normalized.includes("hoachat")) {
      return "🧪";
    }

    // Điện & Điện tử
    if (normalized.includes("dien") || normalized.includes("dien tu")) {
      return "⚡";
    }

    // Nhà máy & Xưởng
    if (normalized.includes("nha may") || normalized.includes("xuong")) {
      return "🏭";
    }

    // Lưu kho & Vận chuyển
    if (normalized.includes("luu kho") || normalized.includes("kho hang")) {
      return "🚚";
    }

    // Default icon
    return "📋";
  };

  // Hàm chọn danh mục
  const handleCategorySelect = (item: any) => {
    const productGroupId = item.crdfd_productgroupid;
    if (!productGroupId) return;
    const productNameSlug = item.crdfd_productname
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[đĐ]/g, "d")
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "-");
    const newUrl = `/san-pham/${productNameSlug}`;
    window.location.href = newUrl;
  };

  const handleAddToCart = async (product: any, quantity: number) => {
    await addToCart(product, quantity);
  };

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

  const toggleSidebar = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    // Lưu trạng thái vào localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarCollapsed', newState.toString());
    }
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

        {/* Main Layout */}
        <div className="max-w-7xl mx-auto px-0 py-6" style={{ paddingTop: '140px' }}>
          <div className="flex flex-col lg:flex-row gap-2">
            {/* Category Sidebar - Hidden on mobile */}
            <div className={`hidden lg:block transition-all duration-300 ease-in-out ${
              isSidebarCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-64 opacity-100'
            }`}>
              <JDStyleCategorySidebar
                categoryGroups={categoryGroups}
                categoryHierarchy={categoryHierarchy}
                loadingCategory={loadingCategory}
                onCategorySelect={handleCategorySelect}
                getIcon={getIcon}
                isCollapsed={isSidebarCollapsed}
                onToggle={toggleSidebar}
              />
            </div>

            {/* Toggle Button when sidebar is collapsed */}
            {isSidebarCollapsed && (
              <div className="hidden lg:flex items-start pt-2">
                <button
                  onClick={toggleSidebar}
                  className="bg-white border border-gray-200 rounded-lg p-2 shadow-sm hover:shadow-md transition-all duration-200 hover:bg-gray-50 z-10"
                  title="Hiện danh mục"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}

            {/* Main Content */}
            <div className="flex-1">
              <main className="w-full px-4 py-6">

                {/* Sử dụng component TopProductsList có sẵn */}
                <TopProductsList
                  onAddToCart={handleAddToCart}
                  isSidebarSearch={false}
                />
              </main>
            </div>
          </div>
        </div>
      </div>

      <Footer />
      <Toolbar />
    </div>
  );
};

export default TopProductsPage;
