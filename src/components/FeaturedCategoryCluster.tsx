import React from "react";
import Link from "next/link";
import Image from "next/image";

type ClusterItem = {
  id: string;
  title: string;
  image?: string;
  price?: string;
  badge?: string;
  sold?: string;
  href?: string;
};

const sampleItems: ClusterItem[] = [
  {
    id: "1",
    title: "Máy rửa xe mini gia đình Kumisai KMS 07",
    image: "/assets/img/sample-product-1.jpg",
    price: "1.550.000 đ",
    badge: "MUA ONLINE 40%",
    sold: "Đã bán 100 sản phẩm",
    href: "/san-pham/may-rua-xe-kumisai-kms-07",
  },
  {
    id: "2",
    title: "Máy rửa xe công nghiệp Kumisai KMS C8",
    image: "/assets/img/sample-product-2.jpg",
    price: "1.750.000 đ",
    badge: "MUA ONLINE 40%",
    sold: "Đã bán 100 sản phẩm",
    href: "/san-pham/may-rua-xe-kumisai-kms-c8",
  },
  {
    id: "3",
    title: "Máy rửa xe gia đình Kumisai KMS 08",
    image: "/assets/img/sample-product-3.jpg",
    price: "1.500.000 đ",
    badge: "MUA ONLINE 40%",
    sold: "Đã bán 100 sản phẩm",
    href: "/san-pham/may-rua-xe-kumisai-kms-08",
  },
  {
    id: "4",
    title: "Máy rửa xe đa năng Kumisai KMS 1600",
    image: "/assets/img/sample-product-4.jpg",
    price: "1.600.000 đ",
    badge: "MUA ONLINE 40%",
    sold: "Đã bán 331 sản phẩm",
    href: "/san-pham/may-rua-xe-kumisai-kms-1600",
  },
];

const FeaturedCategoryCluster = ({
  items = sampleItems,
}: {
  items?: ClusterItem[];
}) => {
  return (
    <section
      aria-label="Cụm sản phẩm nổi bật"
      className="py-6 md:py-10 px-[5px] md:px-[50px]"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg md:text-2xl font-semibold text-gray-900">
          DANH MỤC NỔI BẬT
        </h3>
        <Link
          href="/san-pham"
          className="text-sm text-blue-600 hover:underline no-underline"
        >
          Xem tất cả
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
        {items.map((it) => (
          <Link
            key={it.id}
            href={it.href || "/san-pham"}
            className="product-card relative bg-white rounded-lg p-3 hover-lift overflow-hidden no-underline"
            style={{ textDecoration: "none" }}
          >
            <div className="relative w-full h-40 md:h-44 mb-3 rounded-md bg-gray-100 flex items-center justify-center overflow-hidden">
              {it.image ? (
                // Use next/image when image exists in public or assets
                // Fallback to plain img if needed
                <Image
                  src={it.image}
                  alt={it.title}
                  width={400}
                  height={300}
                  className="object-contain"
                />
              ) : (
                <div className="text-gray-400">No image</div>
              )}
            </div>

            <div className="text-sm font-medium text-gray-800 truncate mb-1">
              {it.title}
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex flex-col">
                <span className="text-orange-600 font-bold text-base">
                  {it.price}
                </span>
                <span className="text-xs text-gray-500 mt-1">{it.sold}</span>
              </div>
              <div className="flex flex-col items-end">
                <div className="bg-blue-600 text-white text-xs px-2 py-1 rounded-md">
                  {it.badge}
                </div>
                <div className="text-xs text-gray-400 mt-2">★ ★ ★ ★ ☆</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default FeaturedCategoryCluster;


