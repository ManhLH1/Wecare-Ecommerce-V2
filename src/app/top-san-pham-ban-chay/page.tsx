"use client";
import React, { useState, useEffect } from "react";
import JDStyleHeader from "@/components/JDStyleHeader";
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

  // State cho danh mục sản phẩm (giữ để đồng bộ data, dù không render sidebar)
  const [categoryGroups, setCategoryGroups] = useState<any[]>([]);
  const [categoryHierarchy, setCategoryHierarchy] = useState<any>(null);
  const [loadingCategory, setLoadingCategory] = useState(true);

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
            {/* Main Content - full width */}
            <div className="flex-1">
              <main className="w-full px-4 py-6">
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
