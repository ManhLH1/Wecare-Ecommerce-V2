"use client";
import React, {
  useCallback,
  useEffect,
  useState,
  Suspense,
  useMemo,
  lazy,
  useContext,
} from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import JDStyleHeader from "@/components/JDStyleHeader";
import Footer from "@/components/footer";
import Toolbar from "@/components/toolbar";
import Cart from "../product-list/_components/cart/cart";
import { useCart } from "@/components/CartManager";
import { getItem } from "@/utils/SecureStorage";
import TopProductsSection from "../product-list/_components/top-products/TopProductsSection";
import { CartItem as CartItemInterface } from "@/model/interface/ProductCartData";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { CartContext } from "@/components/CartGlobalManager";

const ProductTree = lazy(() => import("./_components/ProductTree"));
const ProductGroupList = lazy(() => import("../product-list/productgroup-list"));
const MobileProductPage = lazy(() => import("./_components/MobileProductPage"));
const Loading = () => {
  return (
    <div className="flex justify-center items-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
};
// Tạo một component con để sử dụng useCart
const HomeContent = () => {
  const { cartItems, addToCart, updateQuantity, removeItem, clearCart } =
    useCart();
  const { openCart } = useContext(CartContext); // Add global cart context
  
  // Create a wrapper for addToCart to ensure it always exists
  const handleAddToCart = useCallback((product: any, quantity: number) => {
    try {
      addToCart(product, quantity);
      // Removed openCart() - no auto-open cart after adding product
    } catch (error) {
      console.error('Error in addToCart:', error);
    }
  }, [addToCart]);
    
  const [searchTerm, setSearchTerm] = useState("");
  const [searchKey, setSearchKey] = useState("");
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [selectedGroupImage, setSelectedGroupImage] = useState("");
  const [selectedGroupMinPrice, setSelectedGroupMinPrice] = useState<
    number | null
  >(null);
  const [selectedGroupMaxPrice, setSelectedGroupMaxPrice] = useState<
    number | null
  >(null);
  const [selectedProductGroup, setSelectedProductGroup] = useState<
    string | null
  >(null);
  const [breadcrumb, setBreadcrumb] = useState<string[]>([]);
  // Remove local isCartOpen state - use global cart instead
  const [isDesktop, setIsDesktop] = useState(false);
  const userId = getItem("id");
  const searchParams = useSearchParams();
  const [isSidebarSearch, setIsSidebarSearch] = useState(false);

  // State cho danh mục sản phẩm
  const [categoryGroups, setCategoryGroups] = useState<any[]>([]);
  const [categoryHierarchy, setCategoryHierarchy] = useState<any>(null);
  const [loadingCategory, setLoadingCategory] = useState(true);
  
  // State cho sidebar toggle
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebarCollapsed') === 'true';
    }
    return false;
  });

  // Remove toggleCart - use openCart from context instead
  const toggleSidebar = useCallback(() => setSidebarOpen((prev) => !prev), []);

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

  const toggleSidebarCollapse = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    // Lưu trạng thái vào localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarCollapsed', newState.toString());
    }
  };

  // Check if the URL contains /san-pham/ and stay in route (noop kept for compatibility)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentUrl = window.location.href;
      if (currentUrl.includes('/san-pham/')) {
        // no-op
      }
    }
  }, []);

  // Function to check if it's desktop view
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    handleResize(); // Initialize on mount
    window.addEventListener("resize", handleResize); // Listen for resize events

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Check if the page is loaded with a product_group_Id parameter from the sidebar
  useEffect(() => {
    if (!searchParams) return;
    
    const productGroupId = searchParams.get('product_group_Id');
    setIsSidebarSearch(!!productGroupId);
    
    if (productGroupId) {
      // Fetch the product group hierarchy to get the name for creating the slug
      const fetchProductGroupHierarchy = async () => {
        try {
          const response = await axios.get('/api/getProductGroupHierarchy');
          const hierarchyData = response.data;
          
          // Find the current product group and build breadcrumb path
          const buildBreadcrumbPath = (groupId: string) => {
            // Create a flat map of all product groups for easy lookup
            const allGroups = new Map();
            
            // Function to extract all groups from the hierarchical structure
            const extractGroups = (groups: any[]) => {
              groups.forEach(group => {
                allGroups.set(group.crdfd_productgroupid, group);
                if (group.children && group.children.length > 0) {
                  extractGroups(group.children);
                }
              });
            };
            
            // Extract all groups from the hierarchy
            if (hierarchyData.hierarchy) {
              extractGroups(hierarchyData.hierarchy);
            }
            
            // Get the selected group
            const selectedGroup = allGroups.get(groupId);
            if (selectedGroup) {
              // Create a slug from the product name
              const productNameSlug = selectedGroup.crdfd_productname
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '') // Remove accents
                .replace(/[đĐ]/g, 'd')
                .replace(/[^a-z0-9\s]/g, '') // Remove special characters
                .replace(/\s+/g, '-'); // Replace spaces with hyphens
              
              // Redirect to the new URL format
              window.location.href = `/san-pham/${productNameSlug}`;
              return;
            }
            
            // Build breadcrumb path (this part will only run if the redirect doesn't happen)
            const breadcrumbPath: string[] = [];
            let currentGroup = allGroups.get(groupId);
            
            if (currentGroup) {
              // Add the current group name
              breadcrumbPath.unshift(currentGroup.crdfd_productname);
              
              // Navigate up the hierarchy adding parent names
              while (currentGroup && currentGroup._crdfd_nhomsanphamcha_value) {
                const parentId = currentGroup._crdfd_nhomsanphamcha_value;
                currentGroup = allGroups.get(parentId);
                
                if (currentGroup) {
                  breadcrumbPath.unshift(currentGroup.crdfd_productname);
                }
              }
              
              // Set breadcrumb and other group details
              setBreadcrumb(breadcrumbPath);
              
              // Get the selected group to set its details
              const selectedGroup = allGroups.get(groupId);
              if (selectedGroup) {
                setSelectedProductGroup(selectedGroup.crdfd_productname);
                setSelectedGroupImage(selectedGroup.crdfd_image_url || "");
                
                // Set dummy price range if actual data isn't available
                // This will be overridden by actual product data later
                setSelectedGroupMinPrice(0);
                setSelectedGroupMaxPrice(9999999);
              }
            }
          };
          
          // Build the breadcrumb path
          buildBreadcrumbPath(productGroupId);
          
        } catch (error) {
          console.error("Error fetching product group hierarchy:", error);
        }
      };
      
      fetchProductGroupHierarchy();
    } else {
      // Reset breadcrumb when not using sidebar search
      setBreadcrumb([]);
    }
  }, [searchParams]);

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

  const handleSelectGroup = (
    groupName: string | null,
    image: string,
    giaMin: string,
    giaMax: string
  ) => {
    setSelectedProductGroup(groupName);
    setSelectedGroupImage(image);
    setSelectedGroupMinPrice(parseFloat(giaMin));
    setSelectedGroupMaxPrice(parseFloat(giaMax));
    setBreadcrumb((prev) => (groupName ? [...prev, groupName] : []));
  };

  const cartItemsCount = cartItems.length;

  // Now it's safe to access localStorage
  const check = getItem("temple");
  const Idlogin = getItem("id");
  const chua_login = check === "my" && !Idlogin;

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col overflow-x-hidden">
      {/* JD Style Layout */}
      <div className="bg-white">
        {/* Header with Search */}
        <JDStyleHeader
          cartItemsCount={cartItemsCount}
          onSearch={handleSearch}
          onCartClick={openCart}
          hideSearch={true}
        />

        {/* Mobile Layout */}
        <div className="w-full lg:hidden" style={{ paddingTop: '60px' }}>
          {/* Main Content - Full Width Mobile */}
          <div className="w-full">
            <main className="w-full">
              {chua_login ? (
                <section className="pb-4 sm:pt-100 bg-slate-100">
                  <div className=" max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden">
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
                // Full Mobile UI
                <section className="bg-transparent">
                  <div className="w-full">
                    <Suspense fallback={<Loading />}>
                      {searchTerm ? (
                        <div className="w-full">
                          {/* @ts-ignore existing lazy import elsewhere */}
                          <ProductGroupList
                            searchTerm={searchTerm}
                            searchKey={searchKey}
                            selectedProductGroup={selectedProductGroup}
                            selectedGroupImage={selectedGroupImage}
                            selectedGroupMinPrice={selectedGroupMinPrice}
                            selectedGroupMaxPrice={selectedGroupMaxPrice}
                            breadcrumb={[`Kết quả tìm kiếm cho "${searchTerm}"`]}
                            quantity={0}
                            onAddToCart={handleAddToCart}
                            customerSelectId={""}
                          />
                        </div>
                      ) : (
                        <MobileProductPage
                          onCategorySelect={handleCategorySelect}
                          onAddToCart={handleAddToCart}
                        />
                      )}
                    </Suspense>
                  </div>
                </section>
              )}
            </main>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:block w-full" style={{ paddingTop: '140px' }}>
          <div className="max-w-7xl mx-auto px-4">
            <Suspense fallback={<Loading />}>
              <ProductTree
                onCategorySelect={handleCategorySelect}
                onSearchProduct={handleSearch}
              />
            </Suspense>
          </div>
        </div>
      </div>

      <Toolbar />
      <Footer />
    </div>
  );
};

// Main Home component
export default function Home() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    // Render a placeholder or nothing on the server side
    return null;
  }

  return (
    <HomeContent />
  );
}
