"use client";
import "bootstrap/dist/css/bootstrap.min.css";
import { useEffect, useState, useContext } from "react";
import Footer from "@/components/footer";
import { FaStar, FaStarHalfAlt, FaShoppingCart, FaMinus, FaPlus, FaTimes, FaExpand, FaTruck, FaShieldAlt, FaListUl, FaInfoCircle } from "react-icons/fa";
import JDStyleHeader from "@/components/JDStyleHeader";
import { useToast } from "@/hooks/useToast";
import { TOAST_MESSAGES } from "@/types/toast";
import { getItem } from "@/utils/SecureStorage";
import { useCart } from "@/components/CartManager";
import { useRouter } from "next/navigation";
import { CartContext } from "@/components/CartGlobalManager";

export default function ProductDetailPage({ params }: { params: any }) {
  const [product, setProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [mainImageIndex, setMainImageIndex] = useState(0);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const { cartItems, addToCart } = useCart();
  const { openCart } = useContext(CartContext);
  const router = useRouter();
  const { success, error } = useToast();
  const [fullScreenMode, setFullScreenMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'description' | 'specs'>('description');
  const [galleryImages, setGalleryImages] = useState<string[]>([]);

  useEffect(() => {
    const data = localStorage.getItem("productDetail");
    if (data) {
      const parsedProduct = JSON.parse(data);
      setProduct(parsedProduct);
      
      const images: string[] = [];
      if (parsedProduct?.cr1bb_imageurlproduct) images.push(parsedProduct.cr1bb_imageurlproduct);
      if (parsedProduct?.cr1bb_imageurl && parsedProduct.cr1bb_imageurl !== parsedProduct.cr1bb_imageurlproduct) {
        images.push(parsedProduct.cr1bb_imageurl);
      }
      while (images.length < 4) images.push('/images/no-image.png');
      setGalleryImages(images.slice(0, 4));
    }
  }, []);

  if (!product) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const getProductBasePrice = (product: any): number => {
    if (product?.cr1bb_json_gia) {
      let giaArr = product.cr1bb_json_gia;
      if (typeof giaArr === 'string') {
        try { giaArr = JSON.parse(giaArr); } catch {}
      }
      if (Array.isArray(giaArr) && giaArr.length > 0) {
        const valid = giaArr.filter((g: any) => g.crdfd_trangthaihieulucname === 'Còn hiệu lực' || g.crdfd_trangthaihieuluc === 191920000);
        const chosen = (valid.length > 0 ? valid : giaArr)[0];
        if (chosen) {
          const khongVat = Number(chosen.cr1bb_giakhongvat || chosen.crdfd_giatheovc || chosen.crdfd_gia || 0);
          if (khongVat > 0) return khongVat;
        }
      }
    }
    if (product?.cr1bb_giakhongvat) return Number(product.cr1bb_giakhongvat);
    return Number(product?.cr1bb_giaban || 0);
  };

  const formatPrice = (price: string | number | null | undefined) => {
    if (!price || price === 0 || price === "0" || price === "null" || price === "undefined") return "Liên hệ";
    const numPrice = parseFloat(price.toString());
    if (isNaN(numPrice) || numPrice === 0) return "Liên hệ";
    return `${Math.round(numPrice).toLocaleString('vi-VN')}đ`;
  };

  const handleAddToCart = () => {
    if (quantity <= 0) { error(TOAST_MESSAGES.ERROR.QUANTITY_INVALID); return; }
    if (!product) { error("Không tìm thấy sản phẩm"); return; }
    const userId = getItem("id");
    const userType = getItem("type");
    if (!userId || !userType) { error("Vui lòng đăng nhập"); return; }
    const originalPrice = getProductBasePrice(product);
    if (!originalPrice || originalPrice === 0) { error("Liên hệ để báo giá"); return; }
    try {
      setIsAddingToCart(true);
      const productToAdd = {
        ...product,
        crdfd_productsid: product.crdfd_productsid || product.productId || product.crdfd_masanpham,
        crdfd_name: product.crdfd_name || product.crdfd_fullname || product.crdfd_tensanphamtext,
        crdfd_masanpham: product.crdfd_masanpham || product.productId,
        cr1bb_giaban: originalPrice?.toString() || "0",
        price: originalPrice?.toString() || "0",
        cr1bb_imageurlproduct: product.cr1bb_imageurlproduct || product.cr1bb_imageurl || "",
      };
      addToCart(productToAdd, quantity);
      success(TOAST_MESSAGES.SUCCESS.ADD_TO_CART);
    } catch (err) {
      error(TOAST_MESSAGES.ERROR.ADD_TO_CART);
    } finally {
      setIsAddingToCart(false);
    }
  };

  const basePrice = getProductBasePrice(product);
  const originalPrice = basePrice * 1.15;
  const discountPercent = 15;

  return (
    <div className="bg-gray-50 min-h-screen">
      <JDStyleHeader cartItemsCount={cartItems.length} onSearch={() => {}} onCartClick={openCart} />

      <main className="max-w-5xl mx-auto px-4 py-4 pt-20" style={{ marginTop: '95px' }}>
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm mb-3 text-gray-500">
          <button onClick={() => router.push("/")} className="hover:text-orange-500">Trang chủ</button>
          <span>/</span>
          <button onClick={() => router.push("/san-pham")} className="hover:text-orange-500">Sản phẩm</button>
          <span>/</span>
          <span className="text-gray-800 font-medium">{product?.crdfd_name}</span>
        </nav>

        {/* Product Card */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-4">
          
          {/* Top Section: Info Left, Images Right */}
          <div className="grid grid-cols-1 md:grid-cols-2">
            
            {/* LEFT: Product Info */}
            <div className="p-4 border-r border-gray-100">
              {/* Title */}
              <h1 className="text-lg font-bold text-gray-900 mb-2">{product.crdfd_name}</h1>
              
              {/* Meta Info Row */}
              <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map((star) => (
                    <span key={star} className="text-yellow-400">
                      {star <= 4 ? <FaStar className="w-3 h-3 fill-current" /> : <FaStarHalfAlt className="w-3 h-3 fill-current" />}
                    </span>
                  ))}
                  <span className="ml-1">(12)</span>
                </div>
                <span>|</span>
                <span>SKU: <span className="text-gray-700">{product.crdfd_masanpham}</span></span>
              </div>

              {/* Price Box */}
              <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded p-3 mb-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-red-600">{formatPrice(basePrice.toString())}</span>
                  <span className="text-base text-gray-400 line-through">{formatPrice(originalPrice.toString())}</span>
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded">-{discountPercent}%</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Đơn vị: {product.don_vi_DH || 'cái'} {product.crdfd_quycach && `• ${product.crdfd_quycach}`}
                </div>
              </div>

              {/* Quantity Row */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-gray-700 text-sm font-medium">Số lượng:</span>
                <div className="flex items-center border border-gray-300 rounded">
                  <button className="w-8 h-8 flex items-center justify-center hover:bg-gray-100" onClick={() => setQuantity(q => Math.max(1, q - 1))}>
                    <FaMinus className="w-3 h-3" />
                  </button>
                  <input
                    type="number"
                    className="w-10 h-8 text-center border-0 focus:ring-0 text-sm font-medium"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    min="1"
                  />
                  <button className="w-8 h-8 flex items-center justify-center hover:bg-gray-100" onClick={() => setQuantity(q => q + 1)}>
                    <FaPlus className="w-3 h-3" />
                  </button>
                </div>
                <span className="text-xs text-green-600 font-medium">Còn hàng</span>
              </div>

              {/* Total Row */}
              <div className="flex justify-between items-center bg-gray-50 rounded px-3 py-2 mb-3">
                <span className="text-sm text-gray-600">Thành tiền</span>
                <span className="text-lg font-bold text-gray-900">{formatPrice((basePrice * quantity).toString())}</span>
              </div>

              {/* Buttons */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  onClick={handleAddToCart}
                  disabled={isAddingToCart}
                  className="h-9 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded transition-colors flex items-center justify-center gap-1 text-sm"
                >
                  <FaShoppingCart className="w-4 h-4" />
                  MUA NGAY
                </button>
                <button
                  onClick={handleAddToCart}
                  disabled={isAddingToCart}
                  className="h-9 bg-white border border-gray-300 hover:border-gray-400 text-gray-700 font-bold rounded transition-colors text-sm"
                >
                  THÊM VÀO GIỎ
                </button>
              </div>

              {/* Trust Icons */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { icon: <FaTruck />, text: 'Freeship &gt;1tr' },
                  { icon: <FaShieldAlt />, text: 'Bảo hành 12 tháng' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1 text-gray-600 bg-gray-50 px-2 py-1.5 rounded">
                    <span className="text-orange-500">{item.icon}</span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT: Images */}
            <div className="p-4">
              {/* Main Image */}
              <div className="aspect-square bg-gray-50 rounded overflow-hidden relative group">
                <img
                  src={galleryImages[mainImageIndex] || "/images/no-image.png"}
                  alt={product.crdfd_name}
                  className="w-full h-full object-contain p-3"
                  onError={(e) => { (e.target as HTMLImageElement).src = "/images/no-image.png"; }}
                />
                <button
                  onClick={() => setFullScreenMode(true)}
                  className="absolute bottom-2 right-2 w-8 h-8 bg-white rounded shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <FaExpand className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section - Full Width */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Tab Headers */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('description')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'description' 
                  ? 'text-orange-600 bg-orange-50 border-b-2 border-orange-600' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FaInfoCircle className="w-4 h-4" />
              Mô tả sản phẩm
            </button>
            <button
              onClick={() => setActiveTab('specs')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'specs' 
                  ? 'text-orange-600 bg-orange-50 border-b-2 border-orange-600' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FaListUl className="w-4 h-4" />
              Thông số kỹ thuật
            </button>
          </div>
          
          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'description' && (
              <div className="prose max-w-none">
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Mô tả sản phẩm</h3>
                  <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {product.crdfd_mota || 'Đang cập nhật...'}
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'specs' && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Thông số kỹ thuật</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-gray-200 rounded-lg overflow-hidden">
                  {[
                    { label: 'Mã sản phẩm', value: product.crdfd_masanpham },
                    { label: 'Tên sản phẩm', value: product.crdfd_name },
                    { label: 'Thương hiệu', value: product.crdfd_thuonghieu || '-' },
                    { label: 'Quy cách', value: product.crdfd_quycach || '-' },
                    { label: 'Chất liệu', value: product.crdfd_chatlieu || '-' },
                    { label: 'Công suất', value: product.crdfd_congsuat || '-' },
                    { label: 'Kích thước', value: product.crdfd_kichthuoc || '-' },
                    { label: 'Trọng lượng', value: product.crdfd_trongluong || '-' },
                    { label: 'Hoàn thiện', value: product.crdfd_hoanthienbemat || '-' },
                    { label: 'Tốc độ', value: product.crdfd_tocdo || '-' },
                  ].map((row, idx) => (
                    <div key={idx} className="bg-white p-4">
                      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{row.label}</div>
                      <div className="font-semibold text-gray-900">{row.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hotline Banner */}
        <div className="mt-4 bg-green-500 rounded-lg p-3 text-center text-white">
          <span className="text-sm font-medium">Cần hỗ trợ? Gọi ngay </span>
          <a href="tel:0378339009" className="text-lg font-bold hover:underline">037 833 9009</a>
        </div>
      </main>

      {/* Fullscreen Modal */}
      {fullScreenMode && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
          <button onClick={() => setFullScreenMode(false)} className="absolute top-4 right-4 text-white p-2">
            <FaTimes className="w-6 h-6" />
          </button>
          <img
            src={galleryImages[mainImageIndex] || "/images/no-image.png"}
            alt={product.crdfd_name}
            className="max-w-[85vw] max-h-[85vh] object-contain"
          />
        </div>
      )}

      <Footer />
    </div>
  );
}
