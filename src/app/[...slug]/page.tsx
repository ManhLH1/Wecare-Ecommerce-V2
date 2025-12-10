"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { parseProductUrl, isNewProductUrlFormat } from "@/utils/urlGenerator";
import axios from "axios";

export default function SEOProductPage() {
  const params = useParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleSEOUrl = async () => {
      try {
        // Get the slug from params
        const slug = Array.isArray(params?.slug) ? params.slug.join('/') : params?.slug;
        
        if (!slug) {
          setError("URL không hợp lệ");
          setIsLoading(false);
          return;
        }

        // Check if this is a new format URL
        const fullPath = `/${slug}`;
        
        if (!isNewProductUrlFormat(fullPath)) {
          // This is not a new format URL, redirect to 404 or handle accordingly
          router.push('/not-found');
          return;
        }

        // Parse the URL to extract components
        const { industryCategory, productName, specifications } = parseProductUrl(fullPath);
        
        if (!industryCategory || !productName) {
          setError("URL không đúng định dạng");
          setIsLoading(false);
          return;
        }

        // Try to find the product by searching for similar names
        // This is a simplified approach - in production, you might want to use a more sophisticated search
        const searchQuery = `${productName} ${specifications}`.trim();
        
        try {
          // Search for products using the new API
          const response = await axios.get('/api/searchProductByUrl', {
            params: {
              industryCategory,
              productName,
              specifications
            }
          });

          if (response.data) {
            const product = response.data;
            
            // Store product data for the detail page
            localStorage.setItem("productDetail", JSON.stringify(product));
            
            // Redirect to the actual product detail page
            // We'll use the old format for now, but the product detail page will handle the new URL
            router.push(`/san-pham/chi-tiet/${product.crdfd_masanpham}`);
          } else {
            setError("Không tìm thấy sản phẩm");
            setIsLoading(false);
          }
        } catch (apiError) {
          console.error('Error searching for product:', apiError);
          setError("Lỗi khi tìm kiếm sản phẩm");
          setIsLoading(false);
        }

      } catch (err) {
        console.error('Error handling SEO URL:', err);
        setError("Có lỗi xảy ra");
        setIsLoading(false);
      }
    };

    handleSEOUrl();
  }, [params?.slug, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải sản phẩm...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Không tìm thấy sản phẩm</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  return null;
}
