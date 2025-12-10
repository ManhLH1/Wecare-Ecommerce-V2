"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import JDStyleHeader from "@/components/JDStyleHeader";
import Footer from "@/components/footer";
import Toolbar from "@/components/toolbar";
import { useCart } from "@/components/CartManager";
import { CartContext } from "@/components/CartGlobalManager";
import { Products } from "@/model/interface/ProductCartData";
import { useRouter } from "next/navigation";
import axios from "axios";
import { generateProductUrl } from "@/utils/urlGenerator";
import { useProductGroupHierarchy } from "@/hooks/useProductGroupHierarchy";

type LatestProduct = {
  crdfd_productsid: string;
  crdfd_name: string;
  cr1bb_imageurl?: string;
  cr1bb_imageurlproduct?: string;
  cr1bb_giaban?: string | number;
  don_vi_DH?: string;
  crdfd_masanpham?: string;
};

const NewArrivalsPage: React.FC = () => {
  const { cartItems, addToCart } = useCart();
  const { openCart } = React.useContext(CartContext);
  const router = useRouter();
  const { hierarchy } = useProductGroupHierarchy();
  const [products, setProducts] = useState<LatestProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await axios.get("/api/getLatestProducts");
        const data: LatestProduct[] = res.data || [];
        setProducts(data);
      } catch (err) {
        setError("Không thể tải danh sách sản phẩm mới. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const convertToProduct = (p: LatestProduct): Products => {
    const priceValue = typeof p.cr1bb_giaban === "number" ? p.cr1bb_giaban.toString() : p.cr1bb_giaban || "0";
    return {
      crdfd_name: p.crdfd_name || "",
      unit: p.don_vi_DH || "",
      price: priceValue,
      priceChangeReason: "",
      crdfd_giatheovc: 0,
      isPriceUpdated: false,
      crdfd_thuonghieu: "",
      crdfd_quycach: "",
      crdfd_chatlieu: "",
      crdfd_hoanthienbemat: "",
      crdfd_nhomsanphamtext: "",
      crdfd_productgroup: "",
      crdfd_masanpham: p.crdfd_masanpham || "",
      cr1bb_giaban: priceValue,
      cr1bb_giaban_Bg: priceValue,
      cr1bb_nhomsanphamcha: "",
      crdfd_manhomsp: p.crdfd_masanpham || "",
      _crdfd_productgroup_value: "",
      crdfd_fullname: p.crdfd_name || "",
      crdfd_productsid: p.crdfd_productsid,
      crdfd_onvichuantext: "",
      _crdfd_onvi_value: "",
      cr1bb_tylechuyenoi: "",
      don_vi_DH: p.don_vi_DH || "",
      oldPrice: undefined,
      cr1bb_imageurl: p.cr1bb_imageurl || "",
      cr1bb_banchatgiaphatra: 0,
      crdfd_gtgt_value: 0,
      cr1bb_giakhongvat: 0,
      crdfd_onvichuan: "",
      crdfd_onvi: "",
      crdfd_trangthaihieulucname: "",
      crdfd_trangthaihieuluc: 0,
      cr1bb_imageurlproduct: p.cr1bb_imageurlproduct || "",
      cr1bb_json_gia: undefined,
      crdfd_gia: 0,
      promotion: undefined,
      promotions: undefined,
      crdfd_gtgt: 0,
    } as Products;
  };

  const handleQuantityChange = (id: string, value: number) => {
    setQuantities((prev) => ({ ...prev, [id]: Math.max(1, value) }));
  };

  const handleAddToCart = async (p: LatestProduct) => {
    const quantity = quantities[p.crdfd_productsid] || 1;
    const converted = convertToProduct(p);
    await addToCart(converted, quantity);
  };

  const handleViewDetails = (p: LatestProduct) => {
    localStorage.setItem("productDetail", JSON.stringify(p));
    const code = p.crdfd_masanpham || p.crdfd_productsid;
    
    // Generate new SEO-friendly URL with hierarchy
    const newUrl = generateProductUrl(p, hierarchy);
    router.push(newUrl);
  };

  return (
    <div className="bg-[#F6F9FC] min-h-screen">
      <JDStyleHeader
        cartItemsCount={cartItems.length}
        onSearch={() => {}}
        onCartClick={openCart}
        hideSearch={false}
      />

      <main className="container mx-auto px-4 py-6" style={{ paddingTop: '140px' }}>
        {/* Tiêu đề trang */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <span className="text-[#2B3445] font-medium">Sản phẩm mới</span>
          </div>
          
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-[#2B3445] mb-2">
                Sản phẩm mới
              </h1>
              <p className="text-[#4B566B]">
                Danh sách các sản phẩm vừa được cập nhật
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div
                key={idx}
                className="animate-pulse bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl h-48 md:h-60"
              />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg font-semibold">Chưa có sản phẩm mới</p>
            <p className="text-sm">Vui lòng quay lại sau</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((product) => {
              const rawImage = (product.cr1bb_imageurlproduct || product.cr1bb_imageurl || "").trim();
              const imageSrc = rawImage === "" ? "/placeholder-image.jpg" : rawImage;
              return (
                <div
                  key={product.crdfd_productsid}
                  className="relative bg-white rounded-lg border border-gray-200 hover:border-[#003C71] hover:shadow-md transition-all duration-300 group p-2"
                >
                  <div className="relative w-full pt-[80%] overflow-hidden rounded-lg">
                    <Image
                      src={imageSrc}
                      alt={product.crdfd_name}
                      fill
                      className="object-contain p-2"
                    />
                  </div>
                  <div className="p-2 space-y-2">
                    <h3 className="text-xs sm:text-sm font-medium text-gray-700 line-clamp-2 min-h-[32px]">
                      {product.crdfd_name}
                    </h3>
                    <div className="flex items-baseline text-gray-700 min-h-[24px]">
                      {product.cr1bb_giaban ? (
                        <div className="flex items-baseline">
                          <span className="text-xs sm:text-sm font-bold text-gray-700">
                            {Number(product.cr1bb_giaban).toLocaleString()}đ
                          </span>
                          {product.don_vi_DH && (
                            <span className="text-[10px] sm:text-xs text-gray-700 ml-0.5">/{product.don_vi_DH}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">Liên hệ CSKH</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex items-center border border-gray-200 rounded-md overflow-hidden">
                        <button
                          onClick={() => handleQuantityChange(product.crdfd_productsid, (quantities[product.crdfd_productsid] || 1) - 1)}
                          className="w-full h-6 flex items-center justify-center hover:bg-gray-50"
                        >
                          <span className="text-gray-600">−</span>
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={quantities[product.crdfd_productsid] || 1}
                          onChange={(e) => handleQuantityChange(product.crdfd_productsid, parseInt(e.target.value))}
                          onFocus={(e) => e.target.select()}
                          className="w-full h-6 text-center focus:outline-none text-xs border-x border-gray-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          onClick={() => handleQuantityChange(product.crdfd_productsid, (quantities[product.crdfd_productsid] || 1) + 1)}
                          className="w-full h-6 flex items-center justify-center hover:bg-gray-50"
                        >
                          <span className="text-gray-600 font-bold text-lg leading-none">+</span>
                        </button>
                      </div>
                      <button
                        onClick={() => handleAddToCart(product)}
                        className="group relative flex-1 px-2 py-1.5 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-all duration-200 ease-out whitespace-nowrap"
                      >
                        <span className="absolute inset-0 w-full h-full rounded-md border border-[#003C71] group-hover:bg-[#003C71]/10 transition-all duration-200 ease-out"></span>
                        <span className="relative flex items-center gap-1.5 text-[#003C71]">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h14l4-8H5.4M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span>Thêm</span>
                        </span>
                      </button>
                    </div>

                    <button
                      onClick={() => handleViewDetails(product)}
                      className="w-full group relative px-3 py-2 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-all duration-200 ease-out hover:bg-gray-50 border border-gray-200 hover:border-gray-300"
                    >
                      <span className="flex items-center gap-1.5 text-gray-600 group-hover:text-gray-800">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>Xem chi tiết</span>
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
      <Toolbar />
    </div>
  );
};

export default NewArrivalsPage;


