"use client";
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FaStar, FaArrowLeft, FaArrowRight, FaChevronLeft, FaChevronRight, FaPlay, FaPause, FaEye, FaHeart, FaShare, FaExpand, FaShoppingCart } from 'react-icons/fa';
import axios from 'axios';
import { getItem } from '@/utils/SecureStorage';
import { generateProductUrl } from '@/utils/urlGenerator';
import { useProductGroupHierarchy } from '@/hooks/useProductGroupHierarchy';

interface ProductCard {
  id: string;
  image: string;
  title: string;
  rating?: number;
  price?: string;
  description?: string;
  crdfd_masanpham?: string; // Mã sản phẩm từ API
  crdfd_productsid?: string; // ID sản phẩm từ API
  _crdfd_productsid_value?: string; // ID sản phẩm value từ API
  originalProduct?: TopProduct; // Lưu toàn bộ object TopProduct
}

interface TopProduct {
  crdfd_tensanphamtext: string;
  total: number;
  productId: string;
  crdfd_productsid?: string; // Thêm trường này
  _crdfd_productsid_value?: string; // Thêm trường này
  cr1bb_imageurl?: string;
  cr1bb_imageurlproduct?: string;
  crdfd_thuonghieu?: string;
  crdfd_quycach?: string;
  crdfd_hoanthienbemat?: string;
  crdfd_masanpham?: string;
  _crdfd_productgroup_value?: string;
  crdfd_gtgt?: number;
  crdfd_gtgt_value?: number | null;
  cr1bb_giaban: string | number;
  crdfd_giatheovc?: string;
  cr1bb_nhomsanpham?: string;
  crdfd_onvi?: string;
  _crdfd_onvi_value?: string;
  crdfd_onvichuantext?: string;
  crdfd_maonvi?: string;
  cr1bb_tylechuyenoi?: string | number;
  crdfd_nhomoituongtext?: string;
  don_vi_DH?: string;
  has_promotion?: boolean;
  promotion?: any | null;
}

interface BestPromotion {
  promotion_id: string;
  name: string;
  conditions: string;
  type: string;
  value: number;
  vn?: number;
  startDate: string;
  endDate: string;
  image?: string;
}

interface BusinessOpportunitySectionProps {
  className?: string;
}

const BusinessOpportunitySection: React.FC<BusinessOpportunitySectionProps> = ({ className = "" }) => {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);
  const { hierarchy } = useProductGroupHierarchy();
  const [topRankingProducts, setTopRankingProducts] = useState<ProductCard[]>([]);
  const [latestProducts, setLatestProducts] = useState<ProductCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [latestLoading, setLatestLoading] = useState(true);
  const [bestPromotions, setBestPromotions] = useState<BestPromotion[]>([]);
  const [promotionsLoading, setPromotionsLoading] = useState(true);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const [currentBestIndex, setCurrentBestIndex] = useState(0);
  const bestIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // Generate unique keys for components
  const generateUniqueKey = React.useCallback((prefix: string, index: number, id?: string) => {
    return `${prefix}-${id || 'item'}-${index}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Fetch data from API
  useEffect(() => {
    const fetchTopProducts = async () => {
      try {
        setLoading(true);
        const customerId = getItem("id");
        const response = await axios.get("/api/getTop30ProductsWithPromotion", {
          params: { customerId }
        });

        // Convert API data to ProductCard format
        const products = (response.data || []).slice(0, 8).map((product: TopProduct, index: number) => {
          const rawImage = product.cr1bb_imageurlproduct || product.cr1bb_imageurl || '';
          const safeImage = /via\.placeholder\.com/i.test(rawImage) ? '/placeholder-image.jpg' : (rawImage || '/placeholder-image.jpg');
          return {
            id: `top-product-${product.crdfd_productsid || product.productId || 'product'}-${index}`,
            image: safeImage,
            title: product.crdfd_tensanphamtext || 'Sản phẩm',
            rating: 4.8, // Mock rating since API doesn't provide it
            description: product.crdfd_thuonghieu || product.crdfd_quycach || 'Sản phẩm chất lượng cao',
            price: product.cr1bb_giaban ? `${Number(product.cr1bb_giaban).toLocaleString('vi-VN')} VNĐ` : undefined,
            crdfd_masanpham: product.crdfd_masanpham, // Chỉ sử dụng crdfd_masanpham như trong TopProductsList
            crdfd_productsid: product.crdfd_productsid, // Lưu ID sản phẩm
            _crdfd_productsid_value: product._crdfd_productsid_value, // Thêm trường này
            originalProduct: product // Lưu toàn bộ object TopProduct để sử dụng khi xem chi tiết
          };
        });

        setTopRankingProducts(products);
      } catch (error) {
        console.error("Error fetching top products:", error);
        // Fallback to mock data if API fails
        setTopRankingProducts([
          {
            id: '1',
            image: '/placeholder-image.jpg',
            title: 'LED Tail Lights',
            rating: 4.8,
            description: 'GR LED Light G-VIEW',
            crdfd_masanpham: 'LED001',
            crdfd_productsid: '1',
            _crdfd_productsid_value: '1',
            originalProduct: {
              productId: '1',
              crdfd_tensanphamtext: 'LED Tail Lights',
              cr1bb_giaban: '100000',
              cr1bb_imageurl: '/placeholder-image.jpg',
              crdfd_thuonghieu: 'GR LED Light G-VIEW',
              crdfd_masanpham: 'LED001',
              crdfd_productsid: '1',
              _crdfd_productsid_value: '1'
            } as TopProduct
          },
          {
            id: '2',
            image: '/placeholder-image.jpg',
            title: 'LED Light Bulb',
            description: 'FREE DESIGN OF BOX',
            crdfd_masanpham: 'LED002',
            crdfd_productsid: '2',
            _crdfd_productsid_value: '2',
            originalProduct: {
              productId: '2',
              crdfd_tensanphamtext: 'LED Light Bulb',
              cr1bb_giaban: '150000',
              cr1bb_imageurl: '/placeholder-image.jpg',
              crdfd_thuonghieu: 'FREE DESIGN OF BOX',
              crdfd_masanpham: 'LED002',
              crdfd_productsid: '2',
              _crdfd_productsid_value: '2'
            } as TopProduct
          },
          {
            id: '3',
            image: '/placeholder-image.jpg',
            title: 'Car Tail Lights',
            description: 'Rear view with red LED',
            crdfd_masanpham: 'LED003',
            crdfd_productsid: '3',
            _crdfd_productsid_value: '3',
            originalProduct: {
              productId: '3',
              crdfd_tensanphamtext: 'Car Tail Lights',
              cr1bb_giaban: '200000',
              cr1bb_imageurl: '/placeholder-image.jpg',
              crdfd_thuonghieu: 'Rear view with red LED',
              crdfd_masanpham: 'LED003',
              crdfd_productsid: '3',
              _crdfd_productsid_value: '3'
            } as TopProduct
          },
          {
            id: '4',
            image: '/placeholder-image.jpg',
            title: 'Red LED Tail Lights',
            description: 'Vertical light bars',
            crdfd_masanpham: 'LED004',
            crdfd_productsid: '4',
            _crdfd_productsid_value: '4',
            originalProduct: {
              productId: '4',
              crdfd_tensanphamtext: 'Red LED Tail Lights',
              cr1bb_giaban: '180000',
              cr1bb_imageurl: '/placeholder-image.jpg',
              crdfd_thuonghieu: 'Vertical light bars',
              crdfd_masanpham: 'LED004',
              crdfd_productsid: '4',
              _crdfd_productsid_value: '4'
            } as TopProduct
          },
          {
            id: '5',
            image: '/placeholder-image.jpg',
            title: 'LED Strip Lights',
            description: 'RGB Color Changing',
            crdfd_masanpham: 'LED005',
            crdfd_productsid: '5',
            _crdfd_productsid_value: '5',
            originalProduct: {
              productId: '5',
              crdfd_tensanphamtext: 'LED Strip Lights',
              cr1bb_giaban: '120000',
              cr1bb_imageurl: '/placeholder-image.jpg',
              crdfd_thuonghieu: 'RGB Color Changing',
              crdfd_masanpham: 'LED005',
              crdfd_productsid: '5',
              _crdfd_productsid_value: '5'
            } as TopProduct
          },
          {
            id: '6',
            image: '/placeholder-image.jpg',
            title: 'LED Panel Light',
            description: 'Ceiling Mounted',
            crdfd_masanpham: 'LED006',
            crdfd_productsid: '6',
            _crdfd_productsid_value: '6',
            originalProduct: {
              productId: '6',
              crdfd_tensanphamtext: 'LED Panel Light',
              cr1bb_giaban: '250000',
              cr1bb_imageurl: '/placeholder-image.jpg',
              crdfd_thuonghieu: 'Ceiling Mounted',
              crdfd_masanpham: 'LED006',
              crdfd_productsid: '6',
              _crdfd_productsid_value: '6'
            } as TopProduct
          },
          {
            id: '7',
            image: '/placeholder-image.jpg',
            title: 'LED Flood Light',
            description: 'Outdoor Security',
            crdfd_masanpham: 'LED007',
            crdfd_productsid: '7',
            _crdfd_productsid_value: '7',
            originalProduct: {
              productId: '7',
              crdfd_tensanphamtext: 'LED Flood Light',
              cr1bb_giaban: '300000',
              cr1bb_imageurl: '/placeholder-image.jpg',
              crdfd_thuonghieu: 'Outdoor Security',
              crdfd_masanpham: 'LED007',
              crdfd_productsid: '7',
              _crdfd_productsid_value: '7'
            } as TopProduct
          },
          {
            id: '8',
            image: '/placeholder-image.jpg',
            title: 'LED Track Light',
            description: 'Commercial Lighting',
            crdfd_masanpham: 'LED008',
            crdfd_productsid: '8',
            _crdfd_productsid_value: '8',
            originalProduct: {
              productId: '8',
              crdfd_tensanphamtext: 'LED Track Light',
              cr1bb_giaban: '220000',
              cr1bb_imageurl: '/placeholder-image.jpg',
              crdfd_thuonghieu: 'Commercial Lighting',
              crdfd_masanpham: 'LED008',
              crdfd_productsid: '8',
              _crdfd_productsid_value: '8'
            } as TopProduct
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    const fetchLatestProducts = async () => {
      try {
        setLatestLoading(true);
        const response = await axios.get("/api/getLatestProducts");

        // Convert API data to ProductCard format
        const products = (response.data || []).slice(0, 24).map((product: any, index: number) => {
          const rawImage = product.cr1bb_imageurlproduct || product.cr1bb_imageurl || '';
          const safeImage = /via\.placeholder\.com/i.test(rawImage) ? '/placeholder-image.jpg' : (rawImage || '/placeholder-image.jpg');
          return {
            id: `latest-product-${product.crdfd_productsid || 'product'}-${index}`,
            image: safeImage,
            title: product.crdfd_name || 'Sản phẩm mới',
            rating: 4.0, // Mock rating for new products
            description: 'Sản phẩm mới nhất',
            price: 'Liên hệ',
            crdfd_masanpham: product.crdfd_masanpham,
            crdfd_productsid: product.crdfd_productsid,
            _crdfd_productgroup_value: product._crdfd_productgroup_value,
            originalProduct: {
              crdfd_masanpham: product.crdfd_masanpham,
              crdfd_tensanphamtext: product.crdfd_name,
              cr1bb_imageurl: product.cr1bb_imageurl,
              cr1bb_imageurlproduct: product.cr1bb_imageurlproduct,
              crdfd_productsid: product.crdfd_productsid,
              _crdfd_productsid_value: product.crdfd_productsid,
              _crdfd_productgroup_value: product._crdfd_productgroup_value
            } as any
          };
        });

        setLatestProducts(products);
      } catch (error) {
        console.error("Error fetching latest products:", error);
        // Fallback to mock data if API fails
        setLatestProducts([
          {
            id: 'latest-1',
            image: '/placeholder-image.jpg',
            title: 'Sản phẩm mới 1',
            rating: 4.0,
            description: 'Sản phẩm mới nhất'
          },
          {
            id: 'latest-2',
            image: '/placeholder-image.jpg',
            title: 'Sản phẩm mới',
            rating: 4.0,
            description: 'Sản phẩm mới nhất'
          },
          {
            id: 'latest-3',
            image: '/placeholder-image.jpg',
            title: 'Sản phẩm mới 3',
            rating: 4.0,
            description: 'Sản phẩm mới nhất'
          },
          {
            id: 'latest-4',
            image: '/placeholder-image.jpg',
            title: 'Sản phẩm mới 4',
            rating: 4.0,
            description: 'Sản phẩm mới nhất'
          }
        ]);
      } finally {
        setLatestLoading(false);
      }
    };

    const fetchBestPromotions = async () => {
      try {
        setPromotionsLoading(true);
        const response = await axios.get('/api/getBestPromotions');

        if (response.data && Array.isArray(response.data)) {
          setBestPromotions(response.data);
        }
      } catch (error) {
        console.error('Error fetching best promotions:', error);
        setBestPromotions([]);
      } finally {
        setPromotionsLoading(false);
      }
    };

    fetchTopProducts();
    fetchLatestProducts();
    fetchBestPromotions();
  }, []);

  // Auto-rotate main best promotion
  useEffect(() => {
    // Clear existing interval before setting a new one
    if (bestIntervalRef.current) {
      clearInterval(bestIntervalRef.current);
      bestIntervalRef.current = null;
    }
    if (!isAutoPlay) return;
    if (!bestPromotions || bestPromotions.length === 0) return;
    bestIntervalRef.current = setInterval(() => {
      setCurrentBestIndex((prev) => (prev + 1) % bestPromotions.length);
    }, 2500);
    return () => {
      if (bestIntervalRef.current) {
        clearInterval(bestIntervalRef.current);
        bestIntervalRef.current = null;
      }
    };
  }, [isAutoPlay, bestPromotions]);

  const primaryPromotion = bestPromotions[currentBestIndex] || bestPromotions[0];
  const secondaryPromotions = React.useMemo(() => {
    if (!bestPromotions || bestPromotions.length <= 1) return [] as BestPromotion[];
    const base = bestPromotions.slice(1); // static list after the first item
    if (base.length === 0) return [] as BestPromotion[];
    const targetCount = 6;
    const result: BestPromotion[] = [];
    for (let i = 0; i < targetCount; i += 1) {
      result.push(base[i % base.length]);
    }
    return result;
  }, [bestPromotions]);

  // newArrivalsProducts is now replaced by latestProducts from API

  const topDealsProducts = [
    {
      id: '1',
      image: '/placeholder-image.jpg',
      title: 'Transforming Toy',
      description: 'Robot and drone combination',
      price: '180-day lowest price'
    },
    {
      id: '2',
      image: '/placeholder-image.jpg',
      title: 'Sling Bag',
      description: 'Blue and brown with lock',
      price: 'Best seller deal'
    }
  ];

  const nextSlide = () => {
    if (topRankingProducts.length > 0) {
      setCurrentSlide((prev) => (prev + 1) % topRankingProducts.length);
    }
  };

  const prevSlide = () => {
    if (topRankingProducts.length > 0) {
      setCurrentSlide((prev) => (prev - 1 + topRankingProducts.length) % topRankingProducts.length);
    }
  };

  const toggleAutoPlay = () => {
    setIsAutoPlay(!isAutoPlay);
  };

  // Ensure we always render a full 4x4 grid by filling with placeholders
  const displayLatestProducts = React.useMemo(() => {
    const targetCount = 16;
    const result = (latestProducts || []).slice(0, targetCount);
    for (let i = result.length; i < targetCount; i += 1) {
      result.push({
        id: `latest-placeholder-${i}`,
        image: '/placeholder-image.jpg',
        title: ''
      } as ProductCard);
    }
    return result;
  }, [latestProducts]);

  // Hàm xử lý click vào sản phẩm để xem chi tiết
  const handleProductClick = React.useCallback((product: ProductCard) => {
    console.log('Product clicked:', {
      title: product.title,
      crdfd_masanpham: product.crdfd_masanpham,
      crdfd_productsid: product.crdfd_productsid,
      _crdfd_productsid_value: product._crdfd_productsid_value,
      id: product.id
    }); // Debug log chi tiết

    // Ưu tiên điều hướng theo mã sản phẩm để chính xác tuyệt đối
    const masanpham = product.crdfd_masanpham;
    if (masanpham) {
      const productToStore = product.originalProduct || product;
      localStorage.setItem("productDetail", JSON.stringify(productToStore));
      router.push(`/san-pham/chi-tiet/${masanpham}`);
      return;
    }

    // Fallback: nếu không có mã, dùng SEO URL (ít ưu tiên hơn)
    const productToStore = product.originalProduct || product;
    localStorage.setItem("productDetail", JSON.stringify(productToStore));
    const newUrl = generateProductUrl(productToStore, hierarchy);
    console.log('Navigating to:', newUrl); // Debug log
    router.push(newUrl);
  }, [router]);

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlay || topRankingProducts.length === 0) return;

    const interval = setInterval(() => {
      nextSlide();
    }, 3000); // Change slide every 3 seconds

    return () => clearInterval(interval);
  }, [isAutoPlay, topRankingProducts.length]);

  return (
    // <section className={`bg-transparent shadow-none px-0 md:px-0 mt-2 mb-3 ${className}`}>
    <div className="p-2 md:p-4 lg:p-6">
      {/* Main Title */}

      {/* Three Columns Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4 items-stretch">

        {/* Top Ranking Column */}
        <div className="space-y-3 bg-white rounded-xl p-2 md:p-4 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base md:text-xl font-bold text-gray-900">Xếp hạng cao</h2>
              <p className="text-xs text-gray-600 mt-1">Sản phẩm bán chạy nhất</p>
            </div>
            <Link href="/top-san-pham-ban-chay" className="text-blue-600 hover:text-blue-700 text-xs font-medium inline-flex items-center gap-1 group">
              Xem thêm
              <svg className="w-3 h-3 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="space-y-3">
            {loading ? (
              // Loading skeleton
              <div className="space-y-3">
                <div className="animate-pulse">
                  <div className="bg-gray-200 rounded-lg h-48 md:h-56 mb-2"></div>
                  <div className="bg-gray-200 rounded h-3 mb-1"></div>
                  <div className="bg-gray-200 rounded h-2 w-2/3"></div>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {[...Array(8)].map((_, idx) => (
                    <div key={generateUniqueKey('top-loading', idx)} className="bg-gray-200 rounded-md h-12 md:h-14 animate-pulse"></div>
                  ))}
                </div>
              </div>
            ) : topRankingProducts.length > 0 ? (
              <>
                <div>
                  <div className="relative">
                    {/* Main Product Carousel */}
                    <div
                      className="relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg overflow-hidden h-48 md:h-72 group hover:shadow-lg transition-all duration-300 shadow-md cursor-pointer"
                      onClick={() => handleProductClick(topRankingProducts[currentSlide])}
                    >
                      <div className="relative w-full h-full flex items-center justify-center p-2">
                        <div className="relative w-full h-full flex items-center justify-center">
                          <Image
                            src={topRankingProducts[currentSlide].image}
                            alt={topRankingProducts[currentSlide].title}
                            width={500}
                            height={500}
                            className="object-contain group-hover:scale-110 transition-transform duration-500 ease-out"
                            style={{
                              maxWidth: '95%',
                              maxHeight: '95%',
                              width: 'auto',
                              height: 'auto',
                              objectFit: 'contain'
                            }}
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            priority={currentSlide === 0}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/placeholder-image.jpg';
                            }}
                          />

                          {/* Product Info Overlay */}
                          <div className="absolute bottom-0 left-0 right-0 p-3">
                            <div className="flex items-center justify-between">
                              <h4 className="font-bold text-gray-800 text-sm line-clamp-1 leading-tight drop-shadow-lg flex-1 mr-2">
                                {topRankingProducts[currentSlide].title}
                              </h4>
                              <div className="flex flex-col items-end gap-1">
                                {topRankingProducts[currentSlide].price && (
                                  <p className="text-white font-bold text-xs bg-gradient-to-r from-orange-500 to-red-500 px-2 py-0.5 rounded-full inline-block shadow-lg flex-shrink-0">
                                    {topRankingProducts[currentSlide].price}
                                  </p>
                                )}

                              </div>
                            </div>
                          </div>
                        </div>
                        {topRankingProducts[currentSlide].rating && (
                          <div className="absolute top-4 left-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-lg">
                            <FaStar className="text-white text-sm" />
                            <span className="text-sm font-bold text-white">{topRankingProducts[currentSlide].rating}</span>
                          </div>
                        )}

                        {/* Slide Indicator */}
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-xs font-medium">
                          {currentSlide + 1} / {topRankingProducts.length}
                        </div>

                        {/* View Detail Button */}
                        {/* Removed explicit detail button; entire card is clickable */}
                      </div>


                    </div>

                    {/* Product Title */}

                  </div>
                </div>

                {/* Smaller Product Previews */}
                <div className="grid grid-cols-4 gap-1">
                  {topRankingProducts.slice(0, 8).map((product, index) => (
                    <button
                      key={generateUniqueKey('top-ranking', index, product.id)}
                      onClick={() => setCurrentSlide(index)}
                      className={`relative rounded-md overflow-hidden h-8 md:h-10 hover:scale-110 transition-transform duration-300 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 group ${currentSlide === index ? 'ring-2 ring-blue-500 shadow-lg border-blue-300' : 'border-blue-200 hover:border-blue-300 hover:shadow-md'
                        }`}
                      onDoubleClick={() => handleProductClick(product)}
                      title="Double click để xem chi tiết"
                    >
                      <div className="relative w-full h-full flex items-center justify-center p-0.5">
                        <Image
                          src={product.image}
                          alt={product.title}
                          width={80}
                          height={80}
                          className="object-contain hover:scale-110 transition-transform duration-300"
                          style={{
                            maxWidth: '98%',
                            maxHeight: '98%',
                            width: 'auto',
                            height: 'auto',
                            objectFit: 'contain'
                          }}
                          sizes="(max-width: 768px) 25vw, 20vw"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/placeholder-image.jpg';
                          }}
                        />


                      </div>
                    </button>
                  ))}
                </div>
                {/* Slide Counter */}
                <div className="flex justify-center items-center gap-1 mt-1">
                  <span className="text-xs text-gray-500 font-medium bg-white px-2 py-0.5 rounded-full shadow-sm">
                    {currentSlide + 1} / {topRankingProducts.length}
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Không có sản phẩm nào
              </div>
            )}
          </div>
        </div>

        {/* New Arrivals Column */}
        <div className="space-y-3 bg-white rounded-xl p-2 md:p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base md:text-xl font-bold text-gray-900 mb-1">
                Sản phẩm mới
              </h2>
              <p className="text-xs md:text-sm text-gray-600">15+ sản phẩm mới nhất</p>
            </div>
            <Link href="/new-arrivals" className="text-blue-600 hover:text-blue-700 text-xs font-medium inline-flex items-center gap-1 group">
              Xem thêm
              <svg className="w-3 h-3 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="space-y-4">
            <div>
              <div className="grid grid-cols-4 gap-2 md:gap-3">
                {latestLoading ? (
                  // Loading skeleton
                  [...Array(16)].map((_, idx) => (
                    <div key={generateUniqueKey('latest-loading', idx)} className="bg-gray-200 rounded-md aspect-square animate-pulse"></div>
                  ))
                ) : latestProducts.length > 0 ? (
                  displayLatestProducts.map((product, index) => {
                    const imgSrc = (product.image && typeof product.image === 'string' && product.image.trim() !== '') ? product.image : '/placeholder-image.jpg';
                    return (
                      <div
                        key={generateUniqueKey('latest-product', index, product.id)}
                        className={`group relative bg-gray-100 rounded-md overflow-hidden aspect-square hover:shadow-md transition-all duration-300 border border-gray-100 ${product.crdfd_masanpham ? 'cursor-pointer' : 'cursor-default'}`}
                        onClick={() => { if (product.crdfd_masanpham) handleProductClick(product); }}
                        title={product.title}
                      >
                        <div className="relative w-full h-full p-2 md:p-3">
                          <Image
                            src={imgSrc}
                            alt={product.title || 'Sản phẩm mới'}
                            fill
                            className="object-contain group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/placeholder-image.jpg';
                            }}
                          />
                        </div>
                        {/* Hidden title for a cleaner grid; available via title tooltip */}
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-4 text-center py-4 text-gray-500 text-xs">
                    Không có sản phẩm mới
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Best Promotions Column */}
        <div className="space-y-3 bg-white rounded-xl p-2 md:p-4 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm md:text-base font-bold text-gray-900">Ưu đãi tốt nhất</h2>
              {/* Hidden subtitle to keep layout compact */}
            </div>
            <Link href="/promotion" className="text-blue-600 hover:text-blue-700 text-xs font-medium inline-flex items-center gap-1 group">
              Xem thêm
              <svg className="w-3 h-3 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="space-y-3">
            {promotionsLoading ? (
              // Loading skeleton
              [...Array(3)].map((_, idx) => (
                <div key={generateUniqueKey('promotion-loading', idx)} className="relative bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden h-24 md:h-28 animate-pulse">
                  <div className="absolute top-2 left-2 bg-gray-300 rounded w-8 h-4"></div>
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="bg-gray-300 rounded h-3 mb-1"></div>
                    <div className="bg-gray-300 rounded h-2 w-2/3"></div>
                  </div>
                </div>
              ))
            ) : bestPromotions.length > 0 ? (
              <>
                {/* Main Featured Promotion */}
                {primaryPromotion && (
                  <Link href={`/promotion/detail/${primaryPromotion.promotion_id}`} className="block no-underline">
                    <div className="relative bg-gradient-to-br from-red-500 via-orange-500 to-yellow-500 rounded-lg overflow-hidden h-32 md:h-36 hover:shadow-lg transition-all duration-300 group cursor-pointer">
                      {primaryPromotion.image ? (
                        <Image
                          src={primaryPromotion.image}
                          alt={primaryPromotion.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                          <div className="text-white font-bold text-2xl md:text-3xl drop-shadow-lg mb-1">
                            SALE
                          </div>
                          <div className="flex flex-wrap justify-center gap-1">
                            {primaryPromotion.vn && primaryPromotion.vn > 0 && primaryPromotion.value && (
                              <div className="text-white font-bold text-sm md:text-base drop-shadow-lg">
                                -{primaryPromotion.value}{primaryPromotion.vn % 10 === 1 ? ' VND' : '%'}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>

                      {/* Content */}
                      <div className="absolute bottom-0 left-0 right-0 p-3"></div>
                    </div>
                  </Link>
                )}

                {/* Secondary Promotions Grid */}
                <div className="grid grid-cols-2 gap-2">
                  {secondaryPromotions.map((promotion, index) => (
                    <Link key={generateUniqueKey('secondary-promotion', index, promotion.promotion_id)} href={`/promotion/detail/${promotion.promotion_id}`} className="block no-underline">
                      <div className="relative bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg overflow-hidden h-20 md:h-24 hover:shadow-md transition-all duration-300 group cursor-pointer">
                        {promotion.image ? (
                          <Image
                            src={promotion.image}
                            alt={promotion.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                            <div className="text-blue-600 font-bold text-lg md:text-xl mb-1">
                              SALE
                            </div>
                            <div className="flex flex-wrap justify-center gap-1 text-blue-600">
                              {promotion.vn && promotion.vn > 0 && promotion.value && (
                                <div className="font-bold text-sm">
                                  -{promotion.value}{promotion.vn % 10 === 1 ? ' VND' : '%'}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>

                        {/* Content */}
                        <div className="absolute bottom-0 left-0 right-0 p-2"></div>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                </div>
                <p className="text-sm font-medium">Không có ưu đãi nào</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    // </section>
  );
};

export default BusinessOpportunitySection;
