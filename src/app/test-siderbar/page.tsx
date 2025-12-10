"use client";

import React, { useEffect, useState, useCallback, useMemo, Suspense, lazy } from "react";
import axios from "axios";
import NewSidebar from '@/components/NewSidebar';
import Loading from "@/components/loading";
import Pagination from '@mui/material/Pagination';
import { getItem } from "@/utils/SecureStorage";
import ProductTableComponent, { sampleProducts, CustomProduct as TableCustomProduct } from './product-table-component';
import ProductDetailSection from './ProductDetailSection';
// Replace ui component imports with standard HTML elements
// import { Card } from '@/components/ui/card';
// import { Sidebar } from '@/components/sidebar';
// import { Skeleton } from '@/components/ui/skeleton';
// import { ProductListByGroup } from '@/components/ProductListByGroup';
// import { Button } from '@/components/ui/button';

// Lazy load components
const ProductGroupImage = lazy(() => import("@/app/product-list/_components/ProductGroupImage"));

// Add global style for the body and html elements
const GlobalStyles = () => {
  useEffect(() => {
    // Set the body and html background to white
    document.body.style.backgroundColor = 'white';
    document.documentElement.style.backgroundColor = 'white';
    
    return () => {
      // Cleanup when component unmounts
      document.body.style.backgroundColor = '';
      document.documentElement.style.backgroundColor = '';
    };
  }, []);
  
  return null;
};

interface Product {
  crdfd_productsid: string;
  crdfd_name: string;
  cr1bb_giaban: string;
  cr1bb_imageurl: string;
  cr1bb_imageurlproduct: string;
  _crdfd_productgroup_value: string;
  crdfd_quycach?: string;
  crdfd_hoanthienbemat?: string;
  [key: string]: any;
}

interface ProductGroup {
  count: number;
  products: Product[];
  priceRange: {
    min: number;
    max: number;
  };
  id?: string;
  name?: string;
  code?: string;
}

interface CustomProduct {
  id: string;
  name: string;
  spec: string;
  finish: string;
  pricePerUnit: number;
  pricePerKg: number;
  unit: string;
}

// Sample product data for the details view
const sampleDetailProduct = {
  name: "Đinh đóng gỗ DK 10F sắt không xi",
  groupName: "Đinh(23)",
  code: "SP-7041",
  groupCode: "NSP-00221",
  brand: "DK",
  spec: "10F",
  finish: "không xi",
  price: 22100,
  unit: "Kg",
  priceRange: { min: 18000, max: 24700 }
};

interface ProductData {
  data: {
    product_groups: ProductGroup[];
  }
}

export default function TestSidebarPage() {
  const [loading, setLoading] = useState(true);
  const [productGroups, setProductGroups] = useState<Record<string, ProductGroup>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState(true); // Set default to true to show prices
  const [isMobile, setIsMobile] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [activeGroupWithDetail, setActiveGroupWithDetail] = useState<string | null>(null);
  const groupsPerPage = 10;
  const [showDemoTable, setShowDemoTable] = useState(false); // Default to false to show API data
  const doiTuong = getItem("customerGroupIds");

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`/api/getProductsOnly?page=${currentPage}&pageSize=10`);
        setProductGroups(response.data.data);
        setTotalPages(response.data.pagination?.totalPages || 1);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if we're not showing the demo table
    if (!showDemoTable) {
      fetchProducts();
    } else {
      // If showing demo, set loading to false
      setLoading(false);
    }
  }, [currentPage, showDemoTable]);

  const toggleGroupPopup = useCallback((groupName: string, event: React.MouseEvent) => {
    // Get the clicked element
    const clickedElement = event.currentTarget;
    
    // When closing a group, also close any product details
    if (openGroup === groupName) {
      setSelectedProduct(null);
      setSelectedProductId(null);
      setActiveGroupWithDetail(null);
    }
    
    setOpenGroup((prev) => {
      const isOpening = prev !== groupName;
      
      if (isOpening) {
        // Use setTimeout to ensure the content is expanded before scrolling
        setTimeout(() => {
          const elementRect = clickedElement.getBoundingClientRect();
          const absoluteElementTop = elementRect.top + window.pageYOffset;
          const middle = absoluteElementTop - (window.innerHeight / 2) + (elementRect.height / 2);
          
          window.scrollTo({
            top: middle,
            behavior: 'smooth'
          });
        }, 100);
      }
      
      return prev === groupName ? null : groupName;
    });
  }, [openGroup]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
    // Reset selected product and open groups when changing page
    setSelectedProduct(null);
    setSelectedProductId(null);
    setOpenGroup(null);
    setActiveGroupWithDetail(null);
  };

  const getPaginatedGroups = useCallback(() => {
    if (isMobile) {
      const endIndex = currentPage * groupsPerPage;
      return Object.fromEntries(Object.entries(productGroups).slice(0, endIndex));
    } else {
      const startIndex = (currentPage - 1) * groupsPerPage;
      const endIndex = startIndex + groupsPerPage;
      return Object.fromEntries(
        Object.entries(productGroups).slice(startIndex, endIndex)
      );
    }
  }, [productGroups, currentPage, isMobile, groupsPerPage]);

  const handleAddToCart = useCallback((product: any, quantity: number) => {
    console.log("Adding to cart:", product, quantity);
    // Implement your cart logic here
  }, []);

  // Convert API product format to our custom format for ProductTableComponent
  const formatProductsForTable = useCallback((products: Product[]): TableCustomProduct[] => {
    return products.map((product, index) => {
      // Extract price from cr1bb_giaban or cr1bb_json_gia
      let price = 0;
      let unit = "Kg";
      
      if (product.cr1bb_json_gia && Array.isArray(product.cr1bb_json_gia) && product.cr1bb_json_gia.length > 0) {
        const priceInfo = product.cr1bb_json_gia[0];
        if (priceInfo.crdfd_gia) {
          price = parseFloat(priceInfo.crdfd_gia);
          unit = priceInfo.crdfd_onvichuantext || "Kg";
        }
      } else if (product.cr1bb_giaban) {
        const match = product.cr1bb_giaban.match(/\d+/);
        if (match) {
          price = parseFloat(match[0]);
        }
      }

      return {
        id: product.crdfd_productsid || index.toString(),
        name: product.crdfd_name || product.crdfd_fullname || "",
        spec: product.crdfd_quycach || "",
        finish: product.crdfd_hoanthienbemat || "",
        pricePerUnit: price,
        unit: unit
      };
    });
  }, []);

  const handleProductClick = useCallback((product: TableCustomProduct, groupName: string) => {
    // If clicking the same product again, toggle it off
    if (selectedProductId === product.id) {
      setSelectedProduct(null);
      setSelectedProductId(null);
      setActiveGroupWithDetail(null);
      return;
    }
    
    // Convert CustomProduct to the format expected by ProductDetailSection
    const detailProduct = {
      name: product.name,
      groupName: groupName || "Đinh(23)", // Use the group name if provided
      code: product.id,
      groupCode: "NSP-00221", // This would come from the group data
      brand: "DK", // This would come from the product data
      spec: product.spec,
      finish: product.finish,
      price: product.pricePerUnit,
      unit: product.unit,
      imageUrl: undefined, // Would be set from product data
      priceRange: { min: 18000, max: 24700 } // Would be calculated from group data
    };
    
    setSelectedProduct(detailProduct);
    setSelectedProductId(product.id);
    setActiveGroupWithDetail(groupName);
  }, [selectedProductId]);

  // For demo table sample product click
  const handleDemoProductClick = useCallback((product: TableCustomProduct) => {
    // If clicking the same product again, toggle it off
    if (selectedProductId === product.id) {
      setSelectedProduct(null);
      setSelectedProductId(null);
      setActiveGroupWithDetail(null);
      return;
    }
    
    const detailProduct = {
      ...sampleDetailProduct,
      name: product.name,
      spec: product.spec,
      finish: product.finish,
      price: product.pricePerUnit,
      unit: product.unit,
    };
    
    setSelectedProduct(detailProduct);
    setSelectedProductId(product.id);
    setActiveGroupWithDetail("Đinh(23)");
  }, [selectedProductId]);

  const handleCloseProductDetail = useCallback(() => {
    setSelectedProduct(null);
    setSelectedProductId(null);
    setActiveGroupWithDetail(null);
  }, []);

  return (
    <>
      <GlobalStyles />
      <style jsx global>{`
        body, html {
          background-color: white !important;
        }
        #__next, main {
          background-color: white !important;
        }
      `}</style>
      <div className="flex min-h-screen w-full bg-white" style={{backgroundColor: 'white'}}>
        <div className="w-64 border-r transition-all duration-300 ease-in-out bg-white" style={{backgroundColor: 'white'}}>
          <NewSidebar />
        </div>
        
        <main className="flex-1 p-8 bg-white" style={{backgroundColor: 'white'}}>
          <h1 className="text-2xl font-bold mb-6">Danh mục sản phẩm</h1>
          
          <div className="grid grid-cols-1 gap-6">
            {loading ? (
              <div className="h-[200px] w-full bg-gray-100 animate-pulse"></div>
            ) : (
              <>
                <ProductGroupsContent />
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center mt-8">
                    <Pagination 
                      count={totalPages} 
                      page={currentPage}
                      onChange={(e, page) => handlePageChange(page)}
                      variant="outlined"
                      shape="rounded"
                      sx={{
                        '& .MuiPaginationItem-root': {
                          backgroundColor: 'white',
                          color: '#333',
                          border: '1px solid #e0e0e0',
                        },
                        '& .Mui-selected': {
                          backgroundColor: '#f0f7ff',
                          color: '#2979ff',
                          border: '1px solid #2979ff',
                        }
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

async function ProductGroupsContent() {
  const productData = await getProductsOnly();
  
  // Client Component for interactivity
  return <ClientProductGroups initialData={productData} />;
}

function ClientProductGroups({ initialData }: { initialData: ProductData }) {
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<TableCustomProduct | null>(null);
  const [cart, setCart] = useState<Array<{product: TableCustomProduct, quantity: number}>>([]);
  const [activeGroupWithDetail, setActiveGroupWithDetail] = useState<string | null>(null);
  
  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId) 
        : [...prev, groupId]
    );
    // Clear selected product when collapsing a group
    setSelectedProduct(null);
  };

  const handleSelectProduct = (product: TableCustomProduct) => {
    if (selectedProduct?.id === product.id) {
      setSelectedProduct(null);
      setActiveGroupWithDetail(null);
    } else {
      setSelectedProduct(product);
      setActiveGroupWithDetail(product.id);
    }
  };
  
  const handleAddToCart = (product: TableCustomProduct, quantity: number) => {
    setCart(prev => {
      const existingItem = prev.find(item => item.product.id === product.id);
      if (existingItem) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + quantity } 
            : item
        );
      } else {
        return [...prev, { product, quantity }];
      }
    });
    
    // Optional: Show a confirmation or notification
    alert(`Added ${quantity} ${product.unit} of ${product.name} to cart`);
  };

  const handleCloseProductDetail = () => {
    setSelectedProduct(null);
    setActiveGroupWithDetail(null);
  };

  // Helper function to format products for the table
  const formatProductsFromDemo = (products: any[]): TableCustomProduct[] => {
    return products.map(product => ({
      id: product.id,
      name: product.name,
      spec: product.spec,
      finish: product.finish,
      pricePerUnit: product.price,
      unit: product.unit,
    }));
  };

  return (
    <>
      {initialData.data.product_groups.map((group: any) => (
        <div key={group.id} className="overflow-hidden border rounded-md mb-4 bg-white" style={{backgroundColor: 'white'}}>
          <div
            className="p-4 bg-white flex justify-between items-center cursor-pointer border-b"
            onClick={() => toggleGroup(group.id)}
            style={{backgroundColor: 'white'}}
          >
            <div>
              <h3 className="text-lg font-medium">{group.name}</h3>
              <p className="text-sm text-gray-500">Mã: {group.code}</p>
            </div>
            <button 
              className="h-8 text-sm px-4 py-1 border rounded-md bg-white hover:bg-gray-50"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                toggleGroup(group.id);
              }}
            >
              {expandedGroups.includes(group.id) ? 'Thu gọn' : 'Xem sản phẩm'}
            </button>
          </div>
          
          {expandedGroups.includes(group.id) && (
            <div className="p-4 bg-white" style={{backgroundColor: 'white'}}>
              <ProductTableComponent
                products={formatProductsFromDemo(group.products)}
                onSelectProduct={handleSelectProduct}
                renderDetailComponent={(product) => (
                  selectedProduct && 
                  selectedProduct.id === product.id ? (
                    <ProductDetailSection
                      product={selectedProduct}
                      onAddToCart={(product, quantity) => 
                        handleAddToCart(product, quantity)
                      }
                      onClose={handleCloseProductDetail}
                    />
                  ) : null
                )}
              />
            </div>
          )}
        </div>
      ))}
      
      {cart.length > 0 && (
        <div className="mt-6 p-4 border rounded-md bg-white" style={{backgroundColor: 'white'}}>
          <h3 className="text-lg font-medium mb-4">Giỏ hàng ({cart.reduce((sum, item) => sum + item.quantity, 0)} sản phẩm)</h3>
          <div className="space-y-2">
            {cart.map((item, index) => (
              <div key={index} className="flex justify-between items-center border-b pb-2">
                <div>
                  <p className="font-medium">{item.product.name}</p>
                  <p className="text-sm text-gray-500">
                    {item.quantity} {item.product.unit} x {item.product.pricePerUnit.toLocaleString('vi-VN')}đ
                  </p>
                </div>
                <p className="font-medium">
                  {(item.product.pricePerUnit * item.quantity).toLocaleString('vi-VN')}đ
                </p>
              </div>
            ))}
            <div className="flex justify-between items-center pt-2 font-bold">
              <p>Tổng tiền:</p>
              <p>
                {cart.reduce((sum, item) => sum + (item.product.pricePerUnit * item.quantity), 0).toLocaleString('vi-VN')}đ
              </p>
            </div>
            <button 
              className="w-full mt-4 px-4 py-2 bg-blue-100 text-blue-700 border border-blue-300 rounded-md hover:bg-blue-200"
              onClick={() => alert('Proceed to checkout')}
            >
              Tiến hành đặt hàng
            </button>
          </div>
        </div>
      )}
    </>
  );
}

async function getProductsOnly() {
  // Demo loading state
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Demo data for product groups
  return {
    data: {
      product_groups: [
        {
          name: "Gạch ốp lát cao cấp",
          id: "group1",
          code: "G001",
          products: [
            { id: "prod1", name: "Gạch ốp tường Diamond 30x60cm", spec: "30x60cm", finish: "Bóng", price: 250000, unit: "m²", image: "/images/products/tile1.jpg" },
            { id: "prod2", name: "Gạch lát nền Marble 60x60cm", spec: "60x60cm", finish: "Mờ", price: 350000, unit: "m²", image: "/images/products/tile2.jpg" },
            { id: "prod3", name: "Gạch trang trí Mosaic 30x30cm", spec: "30x30cm", finish: "Bóng", price: 450000, unit: "m²", image: "/images/products/tile3.jpg" }
          ]
        },
        {
          name: "Thiết bị vệ sinh",
          id: "group2",
          code: "G002",
          products: [
            { id: "prod4", name: "Bồn cầu thông minh Luxury", spec: "60x40x35cm", finish: "Trắng bóng", price: 12500000, unit: "chiếc", image: "/images/products/toilet1.jpg" },
            { id: "prod5", name: "Vòi sen cao cấp Rainforest", spec: "Đường kính 20cm", finish: "Chrome", price: 1850000, unit: "bộ", image: "/images/products/shower1.jpg" },
            { id: "prod6", name: "Chậu rửa mặt Royal", spec: "50x40cm", finish: "Trắng bóng", price: 980000, unit: "chiếc", image: "/images/products/sink1.jpg" }
          ]
        },
        {
          name: "Đèn trang trí",
          id: "group3",
          code: "G003",
          products: [
            { id: "prod7", name: "Đèn chùm pha lê Elegance", spec: "80x80x100cm", finish: "Pha lê trong", price: 28500000, unit: "bộ", image: "/images/products/chandelier1.jpg" },
            { id: "prod8", name: "Đèn treo tường Modern", spec: "25x15x40cm", finish: "Kim loại đen", price: 750000, unit: "chiếc", image: "/images/products/walllight1.jpg" },
            { id: "prod9", name: "Đèn sàn nghệ thuật Sculptor", spec: "30x30x150cm", finish: "Gỗ và vải", price: 1650000, unit: "chiếc", image: "/images/products/floorlamp1.jpg" }
          ]
        },
        {
          name: "Vật liệu xây dựng",
          id: "group4", 
          code: "G004",
          products: [
            { id: "prod10", name: "Xi măng Portland PC40", spec: "Bao 50kg", finish: "Xám", price: 85000, unit: "bao", image: "/images/products/cement1.jpg" },
            { id: "prod11", name: "Cát xây dựng tinh", spec: "M³", finish: "Vàng nhạt", price: 350000, unit: "m³", image: "/images/products/sand1.jpg" },
            { id: "prod12", name: "Gạch xây không nung 8x8x18cm", spec: "8x8x18cm", finish: "Đỏ", price: 2200, unit: "viên", image: "/images/products/brick1.jpg" }
          ]
        },
        {
          name: "Sơn và hóa chất",
          id: "group5",
          code: "G005",
          products: [
            { id: "prod13", name: "Sơn nội thất cao cấp", spec: "Thùng 18L", finish: "Nhiều màu", price: 1250000, unit: "thùng", image: "/images/products/paint1.jpg" },
            { id: "prod14", name: "Sơn chống thấm", spec: "Thùng 5L", finish: "Trắng", price: 650000, unit: "thùng", image: "/images/products/paint2.jpg" },
            { id: "prod15", name: "Keo dán gạch cao cấp", spec: "Bao 50kg", finish: "Xám", price: 180000, unit: "bao", image: "/images/products/adhesive1.jpg" }
          ]
        },
        {
          name: "Nội thất phòng tắm",
          id: "group6",
          code: "G006",
          products: [
            { id: "prod16", name: "Bồn tắm đứng kính cường lực", spec: "90x90x195cm", finish: "Kính trong + inox", price: 6500000, unit: "bộ", image: "/images/products/shower2.jpg" },
            { id: "prod17", name: "Tủ lavabo gỗ chống nước", spec: "80x50x75cm", finish: "Gỗ óc chó", price: 4800000, unit: "chiếc", image: "/images/products/vanity1.jpg" },
            { id: "prod18", name: "Gương phòng tắm LED", spec: "70x50cm", finish: "Kính + khung nhôm", price: 1350000, unit: "chiếc", image: "/images/products/mirror1.jpg" }
          ]
        },
        {
          name: "Sàn gỗ & Laminates",
          id: "group7",
          code: "G007",
          products: [
            { id: "prod19", name: "Sàn gỗ tự nhiên Chiu Liu", spec: "90x15x1.8cm", finish: "Phủ UV", price: 950000, unit: "m²", image: "/images/products/floor1.jpg" },
            { id: "prod20", name: "Sàn gỗ công nghiệp HDF", spec: "120x15x1.2cm", finish: "Vân gỗ sồi", price: 280000, unit: "m²", image: "/images/products/floor2.jpg" },
            { id: "prod21", name: "Sàn nhựa giả gỗ SPC", spec: "180x23x0.4cm", finish: "Vân gỗ tự nhiên", price: 320000, unit: "m²", image: "/images/products/floor3.jpg" }
          ]
        },
        {
          name: "Cửa và cửa sổ",
          id: "group8",
          code: "G008",
          products: [
            { id: "prod22", name: "Cửa gỗ tự nhiên 2 cánh", spec: "220x180x4cm", finish: "Gỗ lim sơn PU", price: 18500000, unit: "bộ", image: "/images/products/door1.jpg" },
            { id: "prod23", name: "Cửa sổ nhôm kính 2 lớp", spec: "120x150cm", finish: "Nhôm xám + kính mờ", price: 3800000, unit: "bộ", image: "/images/products/window1.jpg" },
            { id: "prod24", name: "Cửa thép vân gỗ an toàn", spec: "210x90x5cm", finish: "Vân gỗ sồi", price: 8500000, unit: "bộ", image: "/images/products/door2.jpg" }
          ]
        },
        {
          name: "Đá tự nhiên",
          id: "group9",
          code: "G009",
          products: [
            { id: "prod25", name: "Đá granite trắng Brazin", spec: "300x160x2cm", finish: "Đánh bóng", price: 4250000, unit: "tấm", image: "/images/products/stone1.jpg" },
            { id: "prod26", name: "Đá marble đen vân trắng", spec: "260x140x2cm", finish: "Đánh bóng", price: 5800000, unit: "tấm", image: "/images/products/stone2.jpg" },
            { id: "prod27", name: "Đá thạch anh nhân tạo", spec: "300x140x1.5cm", finish: "Mờ", price: 3200000, unit: "tấm", image: "/images/products/stone3.jpg" }
          ]
        },
        {
          name: "Vật tư điện nước",
          id: "group10",
          code: "G010",
          products: [
            { id: "prod28", name: "Dây điện đôi 2x2.5mm²", spec: "Cuộn 100m", finish: "Đỏ", price: 850000, unit: "cuộn", image: "/images/products/wire1.jpg" },
            { id: "prod29", name: "Ống nước PVC φ34", spec: "4m/ống", finish: "Trắng", price: 65000, unit: "ống", image: "/images/products/pipe1.jpg" },
            { id: "prod30", name: "Bộ ổ cắm âm tường", spec: "12x7x4cm", finish: "Trắng", price: 120000, unit: "bộ", image: "/images/products/socket1.jpg" }
          ]
        }
      ]
    }
  } as any;
}