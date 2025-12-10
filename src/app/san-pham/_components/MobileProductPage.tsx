"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { FaCamera } from "react-icons/fa";
import MobileCategoryView from "./MobileCategoryView";

interface MobileProductPageProps {
  onCategorySelect: (item: any) => void;
  onAddToCart: (product: any, quantity: number) => void;
}

const MobileProductPage: React.FC<MobileProductPageProps> = ({
  onCategorySelect,
  onAddToCart,
}) => {
  const [categoryGroups, setCategoryGroups] = useState<any[]>([]);
  const [categoryHierarchy, setCategoryHierarchy] = useState<any>(null);
  const [loadingCategory, setLoadingCategory] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

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

  const handleSearch = useCallback((term: string) => {
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
  }, []);

  const handleOpenFileDialog = () => {
    setAiError(null);
    fileInputRef.current?.click();
  };

  const handleImageUpload = async (file?: File | null) => {
    if (!file) return;
    try {
      setIsUploading(true);
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result));
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/searchProductsByImage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: base64, mimeType: file.type || 'image/jpeg' }),
      });

      if (!res.ok) throw new Error('Phân tích hình ảnh thất bại');
      const data = await res.json();
      if (!data.success || !data.keywords) throw new Error(data.error || 'Không nhận được từ khóa');

      const searchKeywords: string = data.keywords.productName || '';
      const toSlug = (str: string) =>
        str
          .toLowerCase()
          .normalize("NFD")
          .replace(/\p{Diacritic}/gu, "")
          .replace(/[đĐ]/g, "d")
          .replace(/[^a-z0-9\s]/g, "")
          .replace(/\s+/g, "-");
      const slug = toSlug(searchKeywords);

      // Lưu keywords để trang kết quả có thể hiển thị bổ sung
      try {
        localStorage.setItem('imageSearch:aiKeywords', JSON.stringify(data.keywords));
      } catch {}

      window.location.href = `/san-pham/${slug}?search=${encodeURIComponent(searchKeywords)}`;
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {/* Mobile Category Section */}
      <div className="w-full">
        <MobileCategoryView
          categoryHierarchy={categoryHierarchy}
          categoryGroups={categoryGroups}
          loadingCategory={loadingCategory}
          onCategorySelect={onCategorySelect}
          showCloseButton={false}
        />
      </div>

      {/* Mobile Search Section */}
      <div className="w-full bg-white border-t border-gray-100 p-4">
        <div className="max-w-md mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch(searchTerm);
            }}
            className="w-full"
          >
            <div className="relative flex items-stretch bg-white border-2 border-[#049DBF] rounded-lg overflow-hidden shadow-sm">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm sản phẩm..."
                className="flex-1 px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none bg-transparent text-sm"
                aria-label="Tìm kiếm"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageUpload(e.target.files?.[0] || null)}
              />
              <button
                type="button"
                onClick={handleOpenFileDialog}
                className="px-3 bg-white text-[#049DBF] border-l border-[#049DBF] hover:bg-[#e8f7fb] transition-all duration-200 text-sm flex items-center justify-center"
                aria-label="Tìm bằng hình ảnh"
                title="Tìm bằng hình ảnh"
              >
                <FaCamera />
              </button>
              <button
                type="submit"
                className="px-6 bg-[#049DBF] hover:bg-[#038aa5] text-white font-semibold transition-all duration-200 text-sm"
                aria-label="Search"
              >
                Tìm
              </button>
            </div>
            {aiError && (
              <p className="mt-2 text-xs text-red-500">{aiError}</p>
            )}
            {isUploading && (
              <p className="mt-2 text-xs text-gray-500">Đang phân tích hình ảnh...</p>
            )}
          </form>
        </div>
      </div>

    </div>
  );
};

export default MobileProductPage;
