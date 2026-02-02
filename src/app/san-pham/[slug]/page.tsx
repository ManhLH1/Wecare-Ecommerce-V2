"use client";
import React, { useEffect, useState, lazy, Suspense, useCallback, useContext } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import JDStyleHeader from "@/components/JDStyleHeader";
import Footer from "@/components/footer";
import Toolbar from "@/components/toolbar";
import { useCart } from "@/components/CartManager";
import { getItem } from "@/utils/SecureStorage";
import { Products } from "@/model/interface/ProductCartData";
import { CartContext } from "@/components/CartGlobalManager";

const ProductGroupList = lazy(() => import("@/app/product-list/productgroup-list"));

const Loading = () => {
  return (
    <div className="flex justify-center items-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
};

// Function to convert slug to display text
const slugToText = (slug: string) => {
  return slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

// Define interface for product group
interface ProductGroup {
  crdfd_productgroupid: string;
  crdfd_productname: string;
  _crdfd_nhomsanphamcha_value?: string;
  children?: ProductGroup[];
}

// Function to convert display text to slug
const textToSlug = (text: string) => {
  return text.toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '-'); // Replace spaces with hyphens
};

// Component for the product page content
const ProductContent = () => {
  const { cartItems, addToCart, updateQuantity, removeItem, clearCart } = useCart();
  const { openCart } = useContext(CartContext);
  const params = useParams() as { slug: string };
  const router = useRouter();
  const searchParams = useSearchParams();

  // Create a wrapper for addToCart to ensure it always exists and logs errors
  const handleAddToCart = useCallback((product: Products, quantity: number) => {
    try {
      addToCart(product, quantity);
    } catch (error) {
      console.error('Error in addToCart:', error);
    }
  }, [addToCart]);

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

  const slug = params.slug;
  const displayName = slugToText(slug);

  const [productGroupId, setProductGroupId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [breadcrumb, setBreadcrumb] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);

  const userId = getItem("id");


  // Function to check if it's desktop view
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    handleResize(); // Initialize on mount
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Watch for quick search (?search=) and update state
  useEffect(() => {
    if (searchParams) {
      const term = (searchParams.get('search') || '').trim();
      setSearchTerm(term);
      if (term) {
        // When searching, clear group filter and show search breadcrumb
        setProductGroupId(null);
        setBreadcrumb([`Kết quả tìm kiếm cho "${term}"`]);
      }
    }

    // Check for AI keywords from image search
    try {
      const aiKeywords = localStorage.getItem('imageSearch:aiKeywords');
      if (aiKeywords && !searchTerm) {
        const parsedKeywords = JSON.parse(aiKeywords);
        console.log('=== SAN-PHAM PAGE DEBUG ===');
        console.log('AI Keywords from localStorage:', parsedKeywords);
        console.log('Product Name:', parsedKeywords.productName);
        console.log('Synonyms:', parsedKeywords.synonyms);
        console.log('===========================');

        // Use the productName as the main search term for display
        const searchTermFromAI = parsedKeywords.productName || '';
        if (searchTermFromAI) {
          setSearchTerm(searchTermFromAI);
          setProductGroupId(null);
          setBreadcrumb([`Kết quả tìm kiếm cho "${searchTermFromAI}"`]);

          // Store the full AI keywords for the API to use
          localStorage.setItem('imageSearch:aiKeywordsForAPI', aiKeywords);

          // Clear the original stored keywords after using them
          localStorage.removeItem('imageSearch:aiKeywords');
        }
      }
    } catch (error) {
      console.error('Error parsing AI keywords from localStorage:', error);
    }
  }, [searchParams, searchTerm]);

  // Handle product_group_Id and groupCode from URL query parameters
  useEffect(() => {
    if (searchParams) {
      const productGroupIdFromUrl = searchParams.get('product_group_Id');
      const groupCode = searchParams.get('groupCode');

      // If product_group_Id is present in URL, use it directly
      if (productGroupIdFromUrl && productGroupIdFromUrl.trim()) {
        console.log('=== SAN-PHAM PAGE DEBUG ===');
        console.log('product_group_Id from URL:', productGroupIdFromUrl);
        console.log('groupCode from URL:', groupCode);
        console.log('===========================');

        setProductGroupId(productGroupIdFromUrl);

        // Set breadcrumb based on groupCode or display name
        if (groupCode) {
          setBreadcrumb([`Nhóm sản phẩm: ${groupCode}`]);
        } else {
          setBreadcrumb([displayName]);
        }

        // Always dispatch event for product list component
        const event = new CustomEvent('productGroupSelected', {
          detail: {
            productGroupId: productGroupIdFromUrl,
            breadcrumb: groupCode ? `Nhóm sản phẩm: ${groupCode}` : displayName
          }
        });
        window.dispatchEvent(event);
      }
    }
  }, [searchParams, displayName]);

  // Fetch product group ID from slug (only when not searching and no product_group_Id in URL)
  useEffect(() => {
    const fetchProductGroupFromSlug = async () => {
      // Skip if we're in search mode OR if product_group_Id is already provided in URL
      if (searchTerm || productGroupId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Get all product groups
        const response = await axios.get('/api/getProductGroupHierarchy');
        const hierarchyData = response.data;

        // Create a flat map of all product groups for easy lookup by name
        const allGroups = new Map<string, ProductGroup>();
        let foundGroup: ProductGroup | null = null;

        // Function to extract all groups from the hierarchical structure
        const extractGroups = (groups: ProductGroup[]) => {
          groups.forEach(group => {
            // Create a slug from the group name
            const groupSlug = textToSlug(group.crdfd_productname);

            // If this slug matches our URL slug, we found our group
            if (groupSlug === slug) {
              foundGroup = group;
            }

            // Add to our map
            allGroups.set(groupSlug, group);

            // Process children recursively
            if (group.children && group.children.length > 0) {
              extractGroups(group.children);
            }
          });
        };

        // Extract all groups
        if (hierarchyData.hierarchy) {
          extractGroups(hierarchyData.hierarchy);
        }

        // If we found the group, set up the product filter
        if (foundGroup && !searchTerm) {
          const typedFoundGroup = foundGroup as ProductGroup;
          setProductGroupId(typedFoundGroup.crdfd_productgroupid);

          // Build breadcrumb path
          const breadcrumbPath: string[] = [];
          breadcrumbPath.unshift(typedFoundGroup.crdfd_productname);

          // Navigate up the hierarchy adding parent names
          let currentGroup: ProductGroup | null | undefined = typedFoundGroup;
          while (currentGroup && currentGroup._crdfd_nhomsanphamcha_value) {
            const parentId: string = currentGroup._crdfd_nhomsanphamcha_value;
            currentGroup = Array.from(allGroups.values()).find(
              (g: ProductGroup) => g.crdfd_productgroupid === parentId
            );

            if (currentGroup) {
              breadcrumbPath.unshift(currentGroup.crdfd_productname);
            }
          }

          setBreadcrumb(breadcrumbPath);

          // Dispatch a custom event for product list component
          // This maintains compatibility with the existing product list component
          const event = new CustomEvent('productGroupSelected', {
            detail: {
              productGroupId: typedFoundGroup.crdfd_productgroupid,
              breadcrumb: breadcrumbPath.join('/')
            }
          });
          window.dispatchEvent(event);
        } else {
          // Không tìm thấy nhóm: coi slug là cụm tìm kiếm tự do
          // Nếu đã có query ?search thì giữ nguyên. Nếu chưa, set searchTerm theo slug hiển thị
          if (!searchTerm) {
            const termFromSlug = displayName;
            setSearchTerm(termFromSlug);
            setProductGroupId(null);
            setBreadcrumb([`Kết quả tìm kiếm cho "${termFromSlug}"`]);
            // Phát sự kiện để list hiểu là đang ở chế độ search
            const event = new CustomEvent('productGroupSelected', {
              detail: {
                productGroupId: null,
                breadcrumb: `Tìm kiếm/${termFromSlug}`
              }
            });
            window.dispatchEvent(event);
          }
        }
      } catch (error) {
        console.error("Error fetching product groups:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (slug) {
      fetchProductGroupFromSlug();
    }
  }, [slug, router, searchTerm]);

  const cartItemsCount = cartItems.length;

  // Check login status
  const check = getItem("temple");
  const Idlogin = getItem("id");
  const chua_login = check === "my" && !Idlogin;

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col">
      {/* JD Style Layout */}
      <div className="bg-white">
        {/* Header with Search */}
        <JDStyleHeader
          cartItemsCount={cartItems.length}
          onSearch={handleSearch}
          onCartClick={openCart}
        />

        {/* Main Layout - Full Width */}
        <div className="w-full max-w-[1920px] mx-auto px-4 md:px-6 lg:px-8 py-6" style={{ paddingTop: '90px' }}>
          <div className="flex flex-col">
            {/* Main Content - Full Width */}
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
                  <section className="w-[full] rounded-[16px] shadow-sm px-2 md:px-6 py-0 md:py-2 mx-auto">
                    {/* Breadcrumb + Tiêu đề */}
                    <div className="mb-3">
                      <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-0 mt-8 section-header">{breadcrumb[breadcrumb.length - 1]}</h1>
                    </div>
                    {/* Danh sách sản phẩm */}
                    <div className="mt-2">
                      <Suspense fallback={<Loading />}>
                        <ProductGroupList
                          searchTerm={searchTerm}
                          productGroupId={productGroupId}
                          breadcrumb={breadcrumb}
                          onAddToCart={handleAddToCart}
                          customerSelectId={userId || ""}
                        />
                      </Suspense>
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
  );
};

// Wrapping with CartProvider to access cart functionality
export default function ProductSlugPage() {
  return (
    <ProductContent />
  );
}