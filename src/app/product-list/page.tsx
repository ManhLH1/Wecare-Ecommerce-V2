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
import Cart from "./_components/cart/cart";
import { useCart } from "@/components/CartManager";
import { getItem } from "@/utils/SecureStorage";
import TopProductsSection from "./_components/top-products/TopProductsSection";
import PurchasedProductsSection from "./_components/purchased-products/PurchasedProductsSection";
import { CartItem as CartItemInterface } from "@/model/interface/ProductCartData";
import ProductListByGroup from "./_components/ProductListByGroup";
import axios from "axios";
import { CartContext } from "@/components/CartGlobalManager";
import { useToast } from "@/hooks/useToast";
import { TOAST_MESSAGES } from "@/types/toast";

const ProductGroupList = lazy(() => import("./productgroup-list"));
const Loading = () => {
  return (
    <div className="flex justify-center items-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
};
// Tạo một component con để sử dụng useCart
const HomeContent = () => {
  const { cartItems, addToCart, updateQuantity, removeItem, clearCart } = useCart();
  const { openCart } = useContext(CartContext);
  const { success, error } = useToast();
  
  // Create a wrapper for addToCart to ensure it always exists and logs errors
  const handleAddToCart = useCallback((product: any, quantity: number) => {
    try {
      addToCart(product, quantity);
      // Removed openCart() - no auto-open cart after adding product
      success(TOAST_MESSAGES.SUCCESS.ADD_TO_CART);
    } catch (err) {
      console.error('Error in addToCart:', err);
      error(TOAST_MESSAGES.ERROR.ADD_TO_CART);
    }
  }, [addToCart, success, error]);

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
  const [loading, setLoading] = useState(true);
  const [productGroups, setProductGroups] = useState<any>({ data: {}, pagination: null });
  const [currentPage, setCurrentPage] = useState(1);

  // Remove toggleCart - use openCart from context instead
  const toggleSidebar = useCallback(() => setSidebarOpen((prev) => !prev), []);

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

  // Add event listener for product group selection from sidebar
  useEffect(() => {
    const handleProductGroupSelection = (event: CustomEvent) => {
      if (event.detail && event.detail.productGroupId) {
        // Clear the current search term
        setSearchTerm("");
        
        // If breadcrumb is provided, update the breadcrumb state
        if (event.detail.breadcrumb) {
          const breadcrumbArray = event.detail.breadcrumb.split('/');
          setBreadcrumb(breadcrumbArray);
        }
      }
    };

    window.addEventListener('productGroupSelected', handleProductGroupSelection as EventListener);
    
    return () => {
      window.removeEventListener('productGroupSelected', handleProductGroupSelection as EventListener);
    };
  }, []);

  const handleSearch = (term: React.SetStateAction<string>) => {
    setSearchTerm(term);
    // You can add additional filtering logic here if needed
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
  const doiTuong = getItem("customerGroupIds");
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const customerGroupIds = JSON.parse(doiTuong || "[]");
        const response = await axios.get(`/api/getProductsOnly?page=${currentPage}&pageSize=10&customerGroupIds=${customerGroupIds}`);
        setProductGroups(response.data);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  const renderMainContent = () => (
    <div className="w-full px-2 py-2">

      {/* Main Content - Full width, minimal margins */}
      <div className="space-y-3">
        <PurchasedProductsSection onAddToCart={addToCart} />
        <TopProductsSection onAddToCart={addToCart} />
        <Suspense fallback={<Loading />}>
          {!searchTerm && (
            <></>
          )}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 md:p-3">
            <ProductGroupList
              searchTerm={searchTerm}
              searchKey={searchKey}
              selectedProductGroup={selectedProductGroup}
              selectedGroupImage={selectedGroupImage}
              selectedGroupMinPrice={selectedGroupMinPrice}
              selectedGroupMaxPrice={selectedGroupMaxPrice}
              breadcrumb={breadcrumb}
              quantity={0}
              onAddToCart={handleAddToCart}
              customerSelectId={""}
            />
          </div>
        </Suspense>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-50 min-h-screen">
      <JDStyleHeader
        cartItemsCount={cartItems.length}
        onSearch={handleSearch}
        onCartClick={openCart}
        hideSearch={false}
      />
      {/* Không render Cart ở đây, Cart sẽ được quản lý toàn cục */}
      <main className="px-0" style={{ paddingTop: '100px' }}>
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
          renderMainContent()
        )}
      </main>
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


