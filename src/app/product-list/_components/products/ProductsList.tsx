import React from "react";
import Image from "next/image";
import { formatPrice } from "@/utils/format";

interface Product {
  productId: string;
  crdfd_tensanphamtext?: string;
  cr1bb_imageurl?: string;
  cr1bb_giaban?: number;
  don_vi_DH?: string;
}

interface ProductsListProps {
  products: Product[];
  onAddToCart?: (product: any, quantity: number) => void;
  loading?: boolean;
  error?: Error | null;
}

const ProductsList: React.FC<ProductsListProps> = ({ products = [], onAddToCart, loading = false, error = null }) => {
  if (loading) {
    return <div className="py-8 text-center text-gray-500">Đang tải...</div>;
  }

  if (error) {
    return (
      <div className="max-w-sm mx-auto mt-4 bg-white shadow-md rounded-lg overflow-hidden">
        <div className="bg-red-100 text-red-700 px-3 py-2 text-sm font-semibold">Error</div>
        <div className="p-3 text-sm">
          <p>An error occurred: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 px-4 mt-4 bg-gray-50 rounded-lg">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((p) => (
          <div key={p.productId} className="bg-white rounded-lg border border-gray-100 shadow-sm p-4 flex flex-col">
            <div className="flex-1 flex items-center justify-center mb-3">
              <div className="w-full max-w-[180px] h-[120px] flex items-center justify-center bg-gray-50 rounded-md p-2">
                {p.cr1bb_imageurl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.cr1bb_imageurl} alt={p.crdfd_tensanphamtext || "product"} className="object-contain max-h-full max-w-full" />
                ) : (
                  <div className="text-xs text-gray-400">No image</div>
                )}
              </div>
            </div>

            <div className="text-sm font-semibold text-gray-800 line-clamp-2 mb-3">{p.crdfd_tensanphamtext}</div>

            <div className="flex items-center justify-between mt-auto">
              <div className="text-red-600 font-bold">
                {p.cr1bb_giaban ? formatPrice(p.cr1bb_giaban) : "Liên hệ"}
                <span className="text-xs text-gray-400 ml-2">/{p.don_vi_DH || ""}</span>
              </div>
              <button
                onClick={() => onAddToCart && onAddToCart(p, 1)}
                className="ml-4 px-3 py-1.5 bg-[#F5F9FF] border border-[#003C71] text-[#003C71] rounded-md text-sm hover:bg-[#003C71] hover:text-white transition"
              >
                Thêm
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default React.memo(ProductsList);


