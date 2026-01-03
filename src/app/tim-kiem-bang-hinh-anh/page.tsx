'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
// Icons sẽ được định nghĩa inline

// Import types
interface Product {
  crdfd_productsid: string;
  crdfd_fullname: string;
  crdfd_name?: string;
  crdfd_masanpham: string;
  _crdfd_productgroup_value?: string;
  crdfd_thuonghieu: string;
  crdfd_quycach: string;
  crdfd_chatlieu?: string;
  crdfd_hoanthienbemat?: string;
  cr1bb_imageurlproduct?: string;
  cr1bb_imageurl?: string;
  crdfd_gia?: number;
  crdfd_onvichuantext?: string;
  crdfd_nhomsanphamtext?: string;
  cr1bb_json_gia?: string;
}

interface ProductGroup {
  products: Product[];
  count: number;
}

interface PaginationData {
  currentPage: number;
  pageSize: number;
  totalGroups: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface GeminiKeywords {
  productName: string;
  brand: string | null;
  specification: string | null;
  material: string | null;
  surfaceFinish: string | null;
  synonyms: string[];
}

interface FilterOptions {
  brands: string[];
  specifications: string[];
  materials: string[];
}

interface ActiveFilters {
  brand?: string;
  specification?: string;
  material?: string;
}

// Mock data - sẽ được thay thế bằng API thực tế
const mockDatabase: Product[] = [
  { "crdfd_productsid": "prod_001", "crdfd_fullname": "Gạch Granite 60x60cm Prime 8801", "crdfd_masanpham": "P8801", "crdfd_nhomsanphamtext": "Gạch ốp lát", "crdfd_thuonghieu": "Prime", "crdfd_quycach": "60x60 cm", "crdfd_chatlieu": "Granite", "crdfd_hoanthienbemat": "Bóng", "cr1bb_imageurlproduct": "https://picsum.photos/seed/prod_001/500/500", "cr1bb_json_gia": JSON.stringify([{ "crdfd_gia": 250000, "crdfd_trangthaihieulucname": "Còn hiệu lực" }]), "crdfd_onvichuantext": "m²" },
  { "crdfd_productsid": "prod_002", "crdfd_fullname": "Gạch Ceramic 30x60cm Viglacera T3612", "crdfd_masanpham": "VGT3612", "crdfd_nhomsanphamtext": "Gạch ốp lát", "crdfd_thuonghieu": "Viglacera", "crdfd_quycach": "30x60 cm", "crdfd_chatlieu": "Ceramic", "crdfd_hoanthienbemat": "Mờ", "cr1bb_imageurlproduct": "https://picsum.photos/seed/prod_002/500/500", "cr1bb_json_gia": JSON.stringify([{ "crdfd_gia": 180000, "crdfd_trangthaihieulucname": "Còn hiệu lực" }]), "crdfd_onvichuantext": "m²" },
  { "crdfd_productsid": "prod_003", "crdfd_fullname": "Gạch thẻ trang trí Prime 7.5x30cm 09101", "crdfd_masanpham": "P09101", "crdfd_nhomsanphamtext": "Gạch ốp lát", "crdfd_thuonghieu": "Prime", "crdfd_quycach": "7.5x30 cm", "crdfd_chatlieu": "Ceramic", "crdfd_hoanthienbemat": "Bóng", "cr1bb_imageurlproduct": "https://picsum.photos/seed/prod_003/500/500", "cr1bb_json_gia": JSON.stringify([{ "crdfd_gia": 210000, "crdfd_trangthaihieulucname": "Còn hiệu lực" }]), "crdfd_onvichuantext": "hộp" },
  { "crdfd_productsid": "prod_004", "crdfd_fullname": "Bồn cầu 1 khối INAX AC-902VN", "crdfd_masanpham": "INAX-AC902", "crdfd_nhomsanphamtext": "Thiết bị vệ sinh", "crdfd_thuonghieu": "INAX", "crdfd_quycach": "1 khối", "crdfd_chatlieu": "Sứ cao cấp", "crdfd_hoanthienbemat": "Tráng men", "cr1bb_imageurlproduct": "https://picsum.photos/seed/prod_004/500/500", "cr1bb_json_gia": JSON.stringify([{ "crdfd_gia": 7500000, "crdfd_trangthaihieulucname": "Còn hiệu lực" }]), "crdfd_onvichuantext": "cái" },
  { "crdfd_productsid": "prod_005", "crdfd_fullname": "Vòi chậu nóng lạnh TOTO TLG04301V", "crdfd_masanpham": "TOTO-TLG04301V", "crdfd_nhomsanphamtext": "Thiết bị vệ sinh", "crdfd_thuonghieu": "TOTO", "crdfd_quycach": "Thân cao", "crdfd_chatlieu": "Đồng mạ Chrome", "crdfd_hoanthienbemat": "Bóng", "cr1bb_imageurlproduct": "https://picsum.photos/seed/prod_005/500/500", "cr1bb_json_gia": JSON.stringify([{ "crdfd_gia": 2350000, "crdfd_trangthaihieulucname": "Hết hiệu lực" }, { "crdfd_gia": 2450000, "crdfd_trangthaihieulucname": "Còn hiệu lực" }]), "crdfd_onvichuantext": "cái" },
  { "crdfd_productsid": "prod_006", "crdfd_fullname": "Sơn nội thất Dulux EasyClean lau chùi hiệu quả A991", "crdfd_masanpham": "DULUX-A991", "crdfd_nhomsanphamtext": "Sơn nội thất", "crdfd_thuonghieu": "Dulux", "crdfd_quycach": "5L", "crdfd_chatlieu": "Nhựa Acrylic", "crdfd_hoanthienbemat": "Bóng mờ", "cr1bb_imageurlproduct": "https://picsum.photos/seed/prod_006/500/500", "cr1bb_json_gia": JSON.stringify([{ "crdfd_gia": 950000, "crdfd_trangthaihieulucname": "Còn hiệu lực" }]), "crdfd_onvichuantext": "thùng" },
  { "crdfd_productsid": "prod_007", "crdfd_fullname": "Sơn lót chống kiềm Jotun Jotashield Primer", "crdfd_masanpham": "JOTUN-JSP", "crdfd_nhomsanphamtext": "Sơn nội thất", "crdfd_thuonghieu": "Jotun", "crdfd_quycach": "17L", "crdfd_chatlieu": "Nhựa Acrylic", "crdfd_hoanthienbemat": "Mờ", "cr1bb_imageurlproduct": "https://picsum.photos/seed/prod_007/500/500", "cr1bb_json_gia": JSON.stringify([{ "crdfd_gia": 2100000, "crdfd_trangthaihieulucname": "Còn hiệu lực" }]), "crdfd_onvichuantext": "thùng" },
  { "crdfd_productsid": "prod_008", "crdfd_fullname": "Gạch bóng kiếng Viglacera 80x80", "crdfd_masanpham": "VG8080", "crdfd_nhomsanphamtext": "Gạch ốp lát", "crdfd_thuonghieu": "Viglacera", "crdfd_quycach": "80x80 cm", "crdfd_chatlieu": "Granite", "crdfd_hoanthienbemat": "Bóng", "cr1bb_imageurlproduct": "https://picsum.photos/seed/prod_008/500/500", "cr1bb_json_gia": JSON.stringify([{ "crdfd_gia": 320000, "crdfd_trangthaihieulucname": "Còn hiệu lực" }]), "crdfd_onvichuantext": "m²" },
  { "crdfd_productsid": "prod_009", "crdfd_fullname": "Sen tắm cây TOTO TBW01003B", "crdfd_masanpham": "TOTO-TBW01", "crdfd_nhomsanphamtext": "Thiết bị vệ sinh", "crdfd_thuonghieu": "TOTO", "crdfd_quycach": "Cây sen", "crdfd_chatlieu": "Đồng mạ Chrome", "crdfd_hoanthienbemat": "Bóng", "cr1bb_imageurlproduct": "https://picsum.photos/seed/prod_009/500/500", "cr1bb_json_gia": JSON.stringify([{ "crdfd_gia": 11500000, "crdfd_trangthaihieulucname": "Còn hiệu lực" }]), "crdfd_onvichuantext": "bộ" },
  { "crdfd_productsid": "prod_010", "crdfd_fullname": "Sơn ngoại thất Nippon WeatherGard", "crdfd_masanpham": "NIPPON-WG", "crdfd_nhomsanphamtext": "Sơn ngoại thất", "crdfd_thuonghieu": "Nippon", "crdfd_quycach": "15L", "crdfd_chatlieu": "Nhựa Acrylic", "crdfd_hoanthienbemat": "Bóng", "cr1bb_imageurlproduct": "https://picsum.photos/seed/prod_010/500/500", "cr1bb_json_gia": JSON.stringify([{ "crdfd_gia": 2800000, "crdfd_trangthaihieulucname": "Còn hiệu lực" }]), "crdfd_onvichuantext": "thùng" },
];

// Components
const ImageDropzone: React.FC<{
  onImageUpload: (file: File | null) => void;
  uploadedFile: File | null;
}> = ({ onImageUpload, uploadedFile }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Cleanup URL when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFile = useCallback((file: File | undefined) => {
    if (file && ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      // Cleanup previous URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      
      onImageUpload(file);
      const newPreviewUrl = URL.createObjectURL(file);
      setPreviewUrl(newPreviewUrl);
    } else {
      alert('Vui lòng upload file ảnh hợp lệ (JPG, PNG, WEBP).');
    }
  }, [onImageUpload, previewUrl]);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0]);
  };

  return (
    <div className="w-full">
      <label
        htmlFor="image-upload"
        className={`relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-300
        ${isDragging ? 'border-blue-400 bg-gray-100' : 'border-gray-300 bg-white hover:bg-gray-50'}`}
      >
        <div
          className="absolute inset-0"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        />
        {previewUrl ? (
          <div className="relative w-full h-full p-2">
            <div className="relative w-full h-full">
              <Image
                src={previewUrl}
                alt="Uploaded product preview"
                fill
                unoptimized
                className="object-contain rounded-md bg-gray-50"
                sizes="(max-width: 1024px) 100vw, 33vw"
                onError={(e) => {
                  console.error('Error loading image preview:', e);
                }}
                onLoad={() => {
                  console.log('Image preview loaded successfully');
                }}
              />
            </div>
            {/* Remove button */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (previewUrl) {
                  URL.revokeObjectURL(previewUrl);
                }
                setPreviewUrl(null);
                onImageUpload(null as any); // Clear uploaded file
              }}
              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              title="Xóa hình ảnh"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {/* Fallback for broken images */}
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-md opacity-0 hover:opacity-100 transition-opacity">
              <div className="text-center">
                <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-xs text-gray-500">Hình ảnh đã upload</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <svg className="w-10 h-10 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="mb-2 text-sm text-gray-500">
              <span className="font-semibold text-blue-600">Click để upload</span> hoặc kéo thả
            </p>
            <p className="text-xs text-gray-500">PNG, JPG hoặc WEBP</p>
          </div>
        )}
      </label>
      <input
        id="image-upload"
        type="file"
        className="hidden"
        accept="image/png, image/jpeg, image/webp"
        onChange={handleFileChange}
      />
    </div>
  );
};

const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const getCurrentPrice = (jsonGia: string) => {
    try {
      const prices = JSON.parse(jsonGia);
      const activePrice = prices.find((p: any) => p.crdfd_trangthaihieulucname === 'Còn hiệu lực');
      return activePrice ? activePrice.crdfd_gia : prices[0]?.crdfd_gia;
    } catch {
      return 0;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <div className="aspect-square relative">
        <Image
          src={product.cr1bb_imageurlproduct || '/images/no-image.png'}
          alt={product.crdfd_fullname}
          fill
          unoptimized
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2">
          {product.crdfd_fullname}
        </h3>
        <div className="space-y-1 text-xs text-gray-600">
          <p><span className="font-medium">Mã SP:</span> {product.crdfd_masanpham}</p>
          <p><span className="font-medium">Thương hiệu:</span> {product.crdfd_thuonghieu}</p>
          <p><span className="font-medium">Quy cách:</span> {product.crdfd_quycach}</p>
          {product.crdfd_chatlieu && (
            <p><span className="font-medium">Chất liệu:</span> {product.crdfd_chatlieu}</p>
          )}
        </div>
        {product.cr1bb_json_gia && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-lg font-bold text-red-600">
              {formatPrice(getCurrentPrice(product.cr1bb_json_gia))}
              <span className="text-sm font-normal text-gray-500 ml-1">
                / {product.crdfd_onvichuantext}
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const ResultsGrid: React.FC<{
  groupedProducts: Record<string, ProductGroup>;
  isLoading: boolean;
  hasSearched: boolean;
}> = ({ groupedProducts, isLoading, hasSearched }) => {
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
            <div className="aspect-square bg-gray-200"></div>
            <div className="p-4 space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const groups = Object.entries(groupedProducts);

  if (hasSearched && groups.length === 0) {
    return (
      <div className="text-center py-16 px-6 bg-white rounded-lg border border-gray-200">
        <h3 className="text-xl font-semibold text-gray-700">Không tìm thấy sản phẩm</h3>
        <p className="text-gray-500 mt-2">
          Hãy thử điều chỉnh từ khóa tìm kiếm hoặc upload hình ảnh khác.
        </p>
      </div>
    );
  }
  
  if (!hasSearched) {
    return null;
  }

  
  return (
    <div className="space-y-8">
      {groups.map(([groupName, groupData]) => {
        return (
          <section key={groupName}>
            <h2 className="text-2xl font-bold text-blue-600 mb-6 border-b-2 border-gray-200 pb-2">
              {groupName} <span className="text-base font-normal text-gray-500">({groupData.count} sản phẩm)</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {groupData.products.map((product) => (
                <ProductCard key={product.crdfd_productsid} product={product} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
};

// Main component
export default function TimKiemBangHinhAnh() {
  // State for search and results
  const [searchTerm, setSearchTerm] = useState('');
  const [productResults, setProductResults] = useState<Record<string, ProductGroup>>({});
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // State for image upload and Gemini analysis
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);
  const [geminiKeywords, setGeminiKeywords] = useState<GeminiKeywords | null>(null);

  // State for filters
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ brands: [], specifications: [], materials: [] });
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({});

  // State for search history
  const [searchHistory, setSearchHistory] = useState<Array<{
    id: string;
    timestamp: Date;
    searchTerm: string;
    keywords?: GeminiKeywords;
    imagePreview?: string;
    resultCount: number;
  }>>([]);

  // State for API debugging
  const [apiDebug, setApiDebug] = useState<{
    payload: any;
    response: any;
    error: any;
    isLoading: boolean;
  }>({
    payload: null,
    response: null,
    error: null,
    isLoading: false,
  });

  // Load search history from localStorage
  useEffect(() => {
    // Nếu mở từ popup và có ảnh/từ khóa pending thì tự động nạp
    try {
      const pendingKeywords = localStorage.getItem('imageSearch:aiKeywords');
      if (pendingKeywords) {
        const parsed: GeminiKeywords = JSON.parse(pendingKeywords);
        setGeminiKeywords(parsed);
        setSearchTerm(parsed.productName || '');
        setActiveFilters({
          brand: parsed.brand ?? undefined,
          specification: parsed.specification ?? undefined,
          material: parsed.material ?? undefined,
        });
        // Dọn sau khi dùng
        localStorage.removeItem('imageSearch:aiKeywords');
      }
    } catch {}

    const savedHistory = localStorage.getItem('product-search-history');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        // Convert timestamp strings back to Date objects
        const historyWithDates = parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
        setSearchHistory(historyWithDates);
      } catch (error) {
        console.error('Error loading search history:', error);
      }
    }
  }, []);

  // Fetch initial filter options
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const response = await fetch('/api/getProductFilters');
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setFilterOptions(result.filters);
            return;
          }
        }
      } catch (error) {
        console.error('Error fetching filters:', error);
      }
      
      // Fallback to mock data
      const brands = [...new Set(mockDatabase.map(p => p.crdfd_thuonghieu).filter(Boolean))] as string[];
      const specifications = [...new Set(mockDatabase.map(p => p.crdfd_quycach).filter(Boolean))] as string[];
      const materials = [...new Set(mockDatabase.map(p => p.crdfd_chatlieu).filter(Boolean))] as string[];
      
      setFilterOptions({
        brands: brands.sort(),
        specifications: specifications.sort(),
        materials: materials.sort(),
      });
    };

    fetchFilters();
  }, []);

  // Function to save search history
  const saveSearchHistory = useCallback((searchTerm: string, keywords?: GeminiKeywords, imagePreview?: string, resultCount: number = 0) => {
    const newHistoryItem = {
      id: Date.now().toString(),
      timestamp: new Date(),
      searchTerm,
      keywords,
      imagePreview,
      resultCount,
    };

    setSearchHistory(prev => {
      const updated = [newHistoryItem, ...prev].slice(0, 10); // Keep only last 10 searches
      localStorage.setItem('product-search-history', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Function to clear search history
  const clearSearchHistory = useCallback(() => {
    setSearchHistory([]);
    localStorage.removeItem('product-search-history');
  }, []);

  // Search function
  const executeSearch = useCallback(async (page = 1, currentSearchTerm: string, currentFilters: ActiveFilters) => {
    if (!currentSearchTerm.trim() && !Object.keys(currentFilters).length) {
        setProductResults({});
        setPagination(null);
        setHasSearched(false);
        return;
    }
    
    setIsSearchLoading(true);
    setHasSearched(true);

    try {
      // Tạo search params
      const searchParams = new URLSearchParams({
        searchTerm: currentSearchTerm,
        page: page.toString(),
        pageSize: '20',
      });

      // Thêm filters
      if (currentFilters.brand) {
        searchParams.append('brand', currentFilters.brand);
      }
      if (currentFilters.specification) {
        searchParams.append('specification', currentFilters.specification);
      }
      if (currentFilters.material) {
        searchParams.append('material', currentFilters.material);
      }

      // Gọi API tìm kiếm sản phẩm mới
      const response = await fetch(`/api/searchProductsByKeywords?${searchParams}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.data && Object.keys(data.data).length > 0) {
          setProductResults(data.data);
          setPagination(data.pagination);
          // Save to search history
          const resultCount = Object.values(data.data).reduce((total: number, group: any) => total + (group.count || 0), 0);
          saveSearchHistory(currentSearchTerm, undefined, undefined, resultCount);
        } else {
          console.log('No data in search response');
          setProductResults({});
          setPagination(null);
        }
      } else {
        throw new Error('Lỗi khi tìm kiếm sản phẩm');
      }
    } catch (error) {
      console.error('Error searching products:', error);
      
      // Fallback to mock data
      let results = [...mockDatabase];

      if (currentSearchTerm) {
        const normalizedSearch = currentSearchTerm.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        const searchWords = normalizedSearch.split(/\s+/).filter(word => word.length > 1);
        results = results.filter(product => {
          if (!product.crdfd_fullname) return false;
          const productFullName = product.crdfd_fullname.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
          if (productFullName.includes(normalizedSearch)) return true;
          return searchWords.every(word => productFullName.includes(word));
        });
      }

      if (currentFilters.brand) {
        results = results.filter(p => p.crdfd_thuonghieu === currentFilters.brand);
      }
      if (currentFilters.specification) {
        results = results.filter(p => p.crdfd_quycach === currentFilters.specification);
      }
      if (currentFilters.material) {
        results = results.filter(p => p.crdfd_chatlieu === currentFilters.material);
      }

      // Group products
      const groupedProducts: Record<string, ProductGroup> = {};
      results.forEach(product => {
        const parentCategory = product.crdfd_nhomsanphamtext || 'Uncategorized';
        if (!groupedProducts[parentCategory]) {
          groupedProducts[parentCategory] = { products: [], count: 0 };
        }
        groupedProducts[parentCategory].products.push(product);
        groupedProducts[parentCategory].count++;
      });

      setProductResults(groupedProducts);
      setPagination({ 
        currentPage: 1, 
        pageSize: 10, 
        totalGroups: Object.keys(groupedProducts).length, 
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false
      });
      
      // Save to search history (fallback)
      const resultCount = results.length;
      saveSearchHistory(currentSearchTerm, undefined, undefined, resultCount);
    } finally {
      setIsSearchLoading(false);
    }
  }, [saveSearchHistory]);

  // Function to repeat search from history
  const repeatSearch = useCallback((historyItem: typeof searchHistory[0]) => {
    setSearchTerm(historyItem.searchTerm);
    if (historyItem.keywords) {
      setGeminiKeywords(historyItem.keywords);
      const newFilters = {
        brand: historyItem.keywords.brand ?? undefined,
        specification: historyItem.keywords.specification ?? undefined,
        material: historyItem.keywords.material ?? undefined,
      };
      setActiveFilters(newFilters);
    }
    executeSearch(1, historyItem.searchTerm, historyItem.keywords ? {
      brand: historyItem.keywords.brand ?? undefined,
      specification: historyItem.keywords.specification ?? undefined,
      material: historyItem.keywords.material ?? undefined,
    } : {});
  }, [executeSearch]);

  // Handle image upload and trigger Gemini
  const handleImageUpload = async (file: File | null) => {
    if (!file) {
      setUploadedFile(null);
      setGeminiKeywords(null);
      setSearchTerm('');
      setActiveFilters({});
      return;
    }

    setUploadedFile(file);
    setIsGeminiLoading(true);
    setGeminiKeywords(null);
    
    try {
      // Chuyển đổi file thành base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          }
        };
        reader.readAsDataURL(file);
      });

      // Tạo payload
      const payload = {
        imageData: base64.substring(0, 100) + '...', // Chỉ hiển thị một phần để không làm chậm UI
        mimeType: file.type,
        fileName: file.name,
        fileSize: file.size,
        timestamp: new Date().toISOString(),
      };

      // Cập nhật debug state
      setApiDebug({
        payload,
        response: null,
        error: null,
        isLoading: true,
      });

      // Gọi API phân tích hình ảnh
      const response = await fetch('/api/searchProductsByImage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: base64,
          mimeType: file.type,
        }),
      });

      if (!response.ok) {
        throw new Error('Lỗi khi phân tích hình ảnh');
      }

      const result = await response.json();
      
      // Cập nhật debug state với response
      setApiDebug(prev => ({
        ...prev,
        response: result,
        isLoading: false,
      }));
      
      if (result.success) {
        // Sử dụng productName chính và synonyms để tìm kiếm
        // API sẽ tự động phân tách thành các từ khóa nhỏ
        const searchKeywords = result.keywords.productName || '';
        
        // Chuyển đổi từ khóa thành slug và redirect đến trang san-pham
        const toSlug = (str: string) =>
          str
            .toLowerCase()
            .normalize("NFD")
            .replace(/\p{Diacritic}/gu, "")
            .replace(/[đĐ]/g, "d")
            .replace(/[^a-z0-9\s]/g, "")
            .replace(/\s+/g, "-");
        
        const slug = toSlug(searchKeywords);
        
        // Lưu keywords vào localStorage để trang san-pham có thể sử dụng
        localStorage.setItem('imageSearch:aiKeywords', JSON.stringify(result.keywords));
        
        // Lưu vào lịch sử tìm kiếm trước khi redirect
        saveSearchHistory(result.keywords.productName, result.keywords, base64, 0);
        
        // Redirect đến trang san-pham với slug ngay lập tức
        window.location.replace(`/san-pham/${slug}?search=${encodeURIComponent(searchKeywords)}`);
        
        // Không cần set state nữa vì đã redirect
        return;
      } else {
        throw new Error(result.error || 'Lỗi không xác định');
      }
    } catch (error) {
      console.error('Error analyzing image:', error);
      
      // Cập nhật debug state với error
      setApiDebug(prev => ({
        ...prev,
        error: {
          message: error instanceof Error ? error.message : 'Lỗi không xác định',
          timestamp: new Date().toISOString(),
        },
        isLoading: false,
      }));
      
      alert('Lỗi khi phân tích hình ảnh: ' + (error instanceof Error ? error.message : 'Lỗi không xác định'));
    } finally {
      setIsGeminiLoading(false);
    }
  };
  
  // Effect to trigger search when search term or filters change (debounced)
  // Skip this effect if we're processing AI keywords (to avoid conflict with redirect)
  useEffect(() => {
    // Don't trigger search if we're currently processing AI keywords
    if (isGeminiLoading) {
      return;
    }
    
    const handler = setTimeout(() => {
        executeSearch(1, searchTerm, activeFilters);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm, activeFilters, executeSearch, isGeminiLoading]);

  const handleKeywordClick = (keyword: string) => {
    setSearchTerm(keyword);
  };

  // Function to load products based on keywords
  const loadProductsByKeywords = useCallback(async (keywords: GeminiKeywords, page: number = 1) => {
    setIsSearchLoading(true);
    
    try {
      // Create search params with AI keywords
      const searchParams = new URLSearchParams({
        searchTerm: keywords.productName, // Fallback
        keywords: JSON.stringify(keywords), // Send full AI keywords object
        page: page.toString(),
        pageSize: '10',
      });

      // Add customer ID if available (you can get this from your auth context)
      // searchParams.append('customerId', 'your-customer-id');

      // Call the new API
      const response = await fetch(`/api/searchProductsByKeywords?${searchParams}`);
      
      if (!response.ok) {
        throw new Error('Lỗi khi tìm kiếm sản phẩm');
      }

      const result = await response.json();
      
      if (result.data && Object.keys(result.data).length > 0) {
        setProductResults(result.data);
        setPagination(result.pagination);
        setHasSearched(true);
        
        // Update search history with actual result count
        const resultCount = Object.values(result.data).reduce((total: number, group: any) => total + (group.count || 0), 0);
        saveSearchHistory(keywords.productName, keywords, undefined, resultCount);
        
      } else {
        setProductResults({});
        setPagination(null);
        setHasSearched(true);
      }
    } catch (error) {
      console.error('Error loading products by keywords:', error);
      alert('Lỗi khi tìm kiếm sản phẩm: ' + (error instanceof Error ? error.message : 'Lỗi không xác định'));
    } finally {
      setIsSearchLoading(false);
    }
  }, [saveSearchHistory]);

  // Handle pagination change
  const handlePageChange = (newPage: number) => {
    if (pagination && newPage > 0 && newPage <= pagination.totalPages) {
      // If we have keywords from AI, use the keywords API
      if (geminiKeywords) {
        loadProductsByKeywords(geminiKeywords, newPage);
      } else {
        executeSearch(newPage, searchTerm, activeFilters);
      }
      document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleFilterChange = (filterType: keyof ActiveFilters, value: string) => {
    setActiveFilters(prev => {
        const newFilters = { ...prev };
        if (value) {
            newFilters[filterType] = value;
        } else {
            delete newFilters[filterType];
        }
        return newFilters;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">
            Tìm Kiếm Sản Phẩm Bằng Hình Ảnh
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Tìm kiếm vật liệu xây dựng nhanh chóng. Upload hình ảnh hoặc nhập từ khóa để bắt đầu.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="lg:col-span-1">
            <h2 className="text-xl font-bold mb-4 text-gray-700">1. Upload Hình Ảnh</h2>
            <ImageDropzone onImageUpload={handleImageUpload} uploadedFile={uploadedFile} />
          </div>

          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold text-gray-700">2. Tinh Chỉnh Từ Khóa</h2>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ví dụ: 'Gạch men bóng kiếng' hoặc tìm kiếm bằng hình ảnh"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {isGeminiLoading && (
                <div className="flex items-center justify-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <svg className="w-6 h-6 mr-3 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <p className="text-gray-700">Đang phân tích hình ảnh với AI...</p>
                </div>
            )}

            {geminiKeywords && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center mb-3">
                        <svg className="w-6 h-6 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <h3 className="text-lg font-semibold text-gray-800">Từ Khóa AI Tạo Ra - Đang chuyển hướng...</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {[
                          geminiKeywords.productName,
                          ...geminiKeywords.synonyms,
                          geminiKeywords.brand || undefined,
                          geminiKeywords.specification || undefined,
                          geminiKeywords.material || undefined,
                          geminiKeywords.surfaceFinish || undefined,
                        ].filter((kw): kw is string => Boolean(kw)).map(kw => (
                          <button 
                              key={kw} 
                              onClick={() => handleKeywordClick(kw)}
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded-full hover:bg-blue-700 transition-colors"
                          >
                              {kw}
                          </button>
                        ))}
                    </div>
                    {geminiKeywords.brand && (
                        <div className="mt-3 pt-3 border-t border-blue-200">
                            <p className="text-sm text-gray-600">
                                <span className="font-medium">Thương hiệu:</span> {geminiKeywords.brand}
                            </p>
                            {geminiKeywords.specification && (
                                <p className="text-sm text-gray-600">
                                    <span className="font-medium">Quy cách:</span> {geminiKeywords.specification}
                                </p>
                            )}
                            {geminiKeywords.material && (
                                <p className="text-sm text-gray-600">
                                    <span className="font-medium">Chất liệu:</span> {geminiKeywords.material}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}
          </div>
        </div>
        
        <div className="mb-8 p-6 bg-white border border-gray-200 rounded-lg">
            <h2 className="text-xl font-bold mb-4 text-gray-700">3. Lọc Kết Quả</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Thương hiệu</label>
                <select
                  value={activeFilters.brand || ''}
                  onChange={(e) => handleFilterChange('brand', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Tất cả thương hiệu</option>
                  {filterOptions.brands.map(brand => (
                    <option key={brand} value={brand}>{brand}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quy cách</label>
                <select
                  value={activeFilters.specification || ''}
                  onChange={(e) => handleFilterChange('specification', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Tất cả quy cách</option>
                  {filterOptions.specifications.map(spec => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Chất liệu</label>
                <select
                  value={activeFilters.material || ''}
                  onChange={(e) => handleFilterChange('material', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Tất cả chất liệu</option>
                  {filterOptions.materials.map(material => (
                    <option key={material} value={material}>{material}</option>
                  ))}
                </select>
              </div>
            </div>
        </div>

        <div id="results">
            <ResultsGrid 
                groupedProducts={productResults}
                isLoading={isSearchLoading}
                hasSearched={hasSearched}
            />
            
            {hasSearched && !isSearchLoading && Object.keys(productResults).length === 0 && (
                <div className="text-center py-12">
                    <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Không tìm thấy sản phẩm</h3>
                    <p className="text-gray-500 mb-4">
                        Không tìm thấy sản phẩm nào phù hợp với từ khóa &quot;{geminiKeywords?.productName || searchTerm}&quot;.
                    </p>
                    <div className="space-y-2">
                        <p className="text-sm text-gray-600">Gợi ý:</p>
                        <ul className="text-sm text-gray-600 space-y-1">
                            <li>• Thử sử dụng từ khóa ngắn hơn</li>
                            <li>• Kiểm tra chính tả</li>
                            <li>• Thử tìm kiếm với từ khóa khác</li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
        
        {pagination && pagination.totalPages > 1 && !isSearchLoading && (
            <div className="mt-8 flex justify-center">
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => handlePageChange(pagination.currentPage - 1)}
                        disabled={!pagination.hasPrevPage}
                        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Trước
                    </button>
                    
                    <div className="flex items-center space-x-1">
                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                            const pageNum = i + 1;
                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => handlePageChange(pageNum)}
                                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                                        pageNum === pagination.currentPage
                                            ? 'bg-blue-600 text-white'
                                            : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                    </div>
                    
                    <button
                        onClick={() => handlePageChange(pagination.currentPage + 1)}
                        disabled={!pagination.hasNextPage}
                        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Sau
                    </button>
                </div>
            </div>
        )}

        {/* API Debug Section */}
        {(apiDebug.payload || apiDebug.response || apiDebug.error) && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">API Debug Information</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Payload */}
              {apiDebug.payload && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Request Payload
                  </h3>
                  <div className="bg-gray-50 rounded-md p-3">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto">
                      {JSON.stringify(apiDebug.payload, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Response */}
              {apiDebug.response && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    API Response
                  </h3>
                  <div className="bg-gray-50 rounded-md p-3">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto">
                      {JSON.stringify(apiDebug.response, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Error */}
              {apiDebug.error && (
                <div className="bg-white rounded-lg border border-red-200 p-4">
                  <h3 className="text-lg font-semibold text-red-800 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Error Details
                  </h3>
                  <div className="bg-red-50 rounded-md p-3">
                    <pre className="text-sm text-red-700 whitespace-pre-wrap overflow-x-auto">
                      {JSON.stringify(apiDebug.error, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Clear Debug Button */}
            <div className="mt-4 text-center">
              <button
                onClick={() => setApiDebug({ payload: null, response: null, error: null, isLoading: false })}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Clear Debug Info
              </button>
            </div>
          </div>
        )}

        {/* Search History Section */}
        {searchHistory.length > 0 && (
          <div className="mt-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Lịch Sử Tìm Kiếm</h2>
              <button
                onClick={clearSearchHistory}
                className="px-4 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
              >
                Xóa tất cả
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchHistory.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => repeatSearch(item)}
                >
                  <div className="flex items-start space-x-3">
                    {item.imagePreview && (
                      <div className="flex-shrink-0">
                        <Image
                          src={item.imagePreview}
                          alt="Search preview"
                          width={48}
                          height={48}
                          unoptimized
                          className="w-12 h-12 object-cover rounded-md"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {item.searchTerm}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {item.timestamp.toLocaleString('vi-VN')}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        {item.resultCount} kết quả
                      </p>
                      {item.keywords && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {[item.keywords.brand, item.keywords.specification, item.keywords.material]
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((keyword, idx) => (
                              <span
                                key={idx}
                                className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                              >
                                {keyword}
                              </span>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <footer className="text-center py-6 text-gray-500 text-sm border-t border-gray-200 mt-16">
          Powered by AI & WeCare E-commerce
        </footer>
      </div>
    </div>
  );
}
