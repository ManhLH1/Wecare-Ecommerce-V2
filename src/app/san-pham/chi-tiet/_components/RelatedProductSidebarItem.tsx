import React from "react";
import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/utils/format";
import { useRouter } from "next/navigation";
import { generateProductUrl } from "@/utils/urlGenerator";
import { useProductGroupHierarchy } from "@/hooks/useProductGroupHierarchy";

interface RelatedProductSidebarItemProps {
  product: {
    crdfd_productsid: string;
    crdfd_fullname: string;
    crdfd_name?: string;
    cr1bb_imageurlproduct?: string | null;
    cr1bb_imageurl?: string | null;
    cr1bb_giaban?: string | number;
  };
}

const RelatedProductSidebarItem: React.FC<RelatedProductSidebarItemProps> = ({ product }) => {
  const router = useRouter();
  const { hierarchy } = useProductGroupHierarchy();
  const productName = product.crdfd_fullname || product.crdfd_name || "Sản phẩm";
  const productImage = product.cr1bb_imageurlproduct || product.cr1bb_imageurl || "/images/no-image.png";
  const productPrice = product.cr1bb_giaban ? formatPrice(Number(product.cr1bb_giaban)) : "Liên hệ";
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    localStorage.setItem("productDetail", JSON.stringify(product));
    
    // Generate new SEO-friendly URL with hierarchy
    const newUrl = generateProductUrl(product, hierarchy);
    router.push(newUrl);
  };
  
  return (
    <div
      onClick={handleClick}
      className="flex items-center gap-3 p-2 rounded-lg hover:bg-blue-50 transition cursor-pointer border-b last:border-b-0"
    >
      <div className="w-14 h-14 flex-shrink-0 relative rounded bg-white border overflow-hidden">
        <Image
          src={productImage}
          alt={productName}
          fill
          className="object-contain p-1"
          sizes="56px"
          onError={(e: any) => { e.target.src = "/images/no-image.png"; }}
        />
      </div>
              <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-gray-800 truncate" title={productName}>{productName}</div>
          <div className="text-xs font-bold text-blue-600 mt-1">{productPrice}</div>
        </div>
      </div>
    );
};

export default RelatedProductSidebarItem; 