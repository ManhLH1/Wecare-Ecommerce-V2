import axios from "axios";
import Swal from "sweetalert2";
import { getItem } from "@/utils/SecureStorage";
import { CartItem } from "@/model/interface/ProductCartData";

interface ExtendedPromotion {
  crdfd_value: string;
  cr1bb_vn: string;
  vn: number;
  value: string;
  value2?: string;
  value3?: string;
  name: string;
  conditions?: string;
  congdonsoluong?: boolean;
  soluongapdung?: number;
  soluongapdungmuc3?: number;
  discountAmount?: string;
  appliedValue?: string;
  isValue2Applied?: boolean;
  isValue3Applied?: boolean;
  ieuKhoanThanhToanApDung?: string;
  soluongcondon?: number;
  promotionId: string;
  maSanPhamMuaKem?: string;
  tenSanPhamMuaKem?: string;
  maNhomSPMuaKem?: string;
  maNhomSPMultiple?: string;
  tongTienApDung?: string;
  productCodes?: string;
  promotion_id?: string;
}

declare module "@/model/interface/ProductCartData" {
  interface CartItem {
    promotion?: ExtendedPromotion;
    cr1bb_json_gia?: Array<{
      crdfd_baogiachitietid?: string;
      [key: string]: any;
    }>;
  }
}

interface CustomerData {
  crdfd_customerid: string;
  crdfd_name: string;
  sdt: string;
  crdfd_address: string;
  saleonline: string;
  saledirect: string;
  potentialProducts: any[];
}

export interface PaymentMethod {
  label: string;
  value: string;
}

export const PAYMENT_METHODS: PaymentMethod[] = [
  { label: "Thanh toán sau khi nhận hàng", value: "0" },
  { label: "Thanh toán 2 lần vào ngày 10 và 25", value: "14" },
  { label: "Thanh toán vào ngày 5 hàng tháng", value: "30" },
  { label: "Tiền mặt", value: "283640000" },
  { label: "Công nợ 7 ngày", value: "283640001" },
  { label: "Công nợ 30 ngày", value: "283640002" },
  { label: "Công nợ 45 ngày", value: "283640003" },
  { label: "Công nợ 60 ngày", value: "283640004" },
  { label: "Thanh toán trước khi nhận hàng", value: "283640005" }
];

export const getPaymentMethodLabel = (value: string | undefined | null): string => {
  if (!value) return "";
  
  // Chuẩn hóa giá trị bằng cách loại bỏ dấu phẩy nếu có
  const normalizedValue = value.replace(/,/g, '');
  
  // Tìm phương thức thanh toán trong danh sách
  const method = PAYMENT_METHODS.find(m => m.value === normalizedValue);
  
  if (!method) {
    return "";
  }
  
  return method.label;
};

export const calculateTotalQuantityByPromotion = (items: CartItem[] | undefined, promotionId: string) => {
  if (!items || !Array.isArray(items)) {
    return 0;
  }
  
  const total = items.reduce((total, item) => {
    const isMatch = item.promotion?.promotionId === promotionId && 
                   item.promotion?.congdonsoluong && 
                   item.isApplyPromotion === true;
    
    if (isMatch) {
      return total + (item.quantity || 0);
    }
    return total;
  }, 0);

  return total;
};

// Hàm kiểm tra xem sản phẩm mua kèm có trong giỏ hàng hay không
export const hasBundledProductInCart = (item: CartItem, allItems?: CartItem[]) => {
  // Kiểm tra các điều kiện cần thiết
  if (!item.promotion) return true;
  if (!allItems || !Array.isArray(allItems)) return true;
  
  // Kiểm tra xem promotion có maSanPhamMuaKem không
  const bundledProductCode = item.promotion.maSanPhamMuaKem;
  if (!bundledProductCode) return true;
  
  // Tách mã sản phẩm (an toàn vì đã kiểm tra null/undefined ở trên)
  const codes = bundledProductCode.toString().split(',').map(code => code.trim()).filter(Boolean);
  if (codes.length === 0) return true;
  
  // Kiểm tra xem có ít nhất một sản phẩm mua kèm trong giỏ hàng không
  return allItems.some(cartItem => 
    cartItem.crdfd_productsid !== item.crdfd_productsid && // Không phải sản phẩm hiện tại
    cartItem.crdfd_masanpham && // Phải có mã sản phẩm
    codes.includes(cartItem.crdfd_masanpham)  // Mã sản phẩm nằm trong danh sách mua kèm
  );
};

export const calculateDiscountedPrice = (item: CartItem, allItems?: CartItem[]) => {
  if (allItems) {
    console.log('[cartUtils] allItems in calculateDiscountedPrice:', allItems);
  }
  // Kiểm tra và lấy giá gốc
  const originalPrice = parseFloat(item.regularPrice || item.cr1bb_giaban || "0");
  if (isNaN(originalPrice) || originalPrice < 0) {
    return 0;
  }

  // Nếu không có khuyến mãi hoặc không áp dụng khuyến mãi, trả về giá gốc
  if (!item.promotion || !item.isApplyPromotion) {
    return Math.round(originalPrice);
  }

  // Kiểm tra sản phẩm mua kèm
  if (item.promotion.maSanPhamMuaKem && !hasBundledProductInCart(item, allItems)) {
    return Math.round(originalPrice);
  }

  // --- BẮT ĐẦU: Logic tongTienApDung ---
  if (item.promotion.tongTienApDung && item.promotion.productCodes && allItems) {
    // Chuyển đổi productCodes thành mảng
    const codes = Array.isArray(item.promotion.productCodes)
      ? item.promotion.productCodes
      : (item.promotion.productCodes || '').split(',').map(c => c.trim());

    // Tính tổng giá trị của tất cả sản phẩm thuộc danh sách codes
    const totalProductValue = allItems
      .filter(cartItem => {
        const itemId = cartItem.productId || cartItem.crdfd_masanpham;
        return itemId && codes.includes(itemId);
      })
      .reduce((sum, cartItem) => {
        const price = parseFloat(cartItem.regularPrice || cartItem.cr1bb_giaban || "0");
        return sum + (price * (cartItem.quantity || 1));
      }, 0);

    // Chuyển đổi tongTienApDung sang số
    const tongTienApDungNum = parseFloat(String(item.promotion.tongTienApDung));

    // Xác định mức giảm giá dựa vào tổng tiền
    let promotionValue;
    if (totalProductValue <= tongTienApDungNum) {
      promotionValue = parseFloat(String(item.promotion.value));
    } else {
      promotionValue = parseFloat(String(item.promotion.value2));
    }

    // Tính giá sau khuyến mãi
    let discountedPrice;
    if (item.promotion.vn === 191920000) { // Giảm theo %
      discountedPrice = originalPrice * (1 - promotionValue / 100);
    } else { // Giảm theo số tiền
      discountedPrice = originalPrice - promotionValue;
    }

    // Cập nhật thông tin khuyến mãi
    item.promotion.isValue2Applied = totalProductValue > tongTienApDungNum;
    item.promotion.isValue3Applied = false;
    item.promotion.appliedValue = promotionValue.toString();

    return Math.max(0, Math.round(discountedPrice));
  }

  // --- Logic cũ cho các loại khuyến mãi khác ---
  let totalQuantity = item.quantity || 0;
  if (item.promotion.promotionId && allItems && Array.isArray(allItems)) {
    totalQuantity = calculateTotalQuantityByPromotion(allItems, item.promotion.promotionId);
  }

  let promotionValue = parseFloat(item.promotion.value) || 0;
  const value2 = parseFloat(item.promotion.value2 || "0");
  const value3 = parseFloat(item.promotion.value3 || "0");
  const soluongapdung = parseInt(String(item.promotion.soluongapdung || "0"), 10);
  const soluongapdungmuc3 = parseInt(String(item.promotion.soluongapdungmuc3 || "0"), 10);

  const isValue3Applied = value3 > 0 &&
                         soluongapdungmuc3 > 0 &&
                         totalQuantity >= soluongapdungmuc3;

  const isValue2Applied = value2 > 0 &&
                         soluongapdung > 0 &&
                         totalQuantity >= soluongapdung &&
                         !isValue3Applied;

  if (isValue3Applied) {
    promotionValue = value3;
  } else if (isValue2Applied) {
    promotionValue = value2;
  }

  let discountedPrice = originalPrice;
  if (item.promotion.vn === 191920000) {
    discountedPrice = originalPrice * (1 - promotionValue / 100);
  } else {
    discountedPrice = originalPrice - promotionValue;
  }

  if (item.promotion) {
    item.promotion.isValue2Applied = isValue2Applied;
    item.promotion.isValue3Applied = isValue3Applied;
    item.promotion.appliedValue = promotionValue.toString();
  }

  return Math.max(0, Math.round(discountedPrice));
};

export const getCurrentDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${day}/${month}/${year}`;
};

export const fetchCustomerData = async (customerSelectId: string) => {
  try {
    const response = await axios.get<CustomerData[]>(
      `/api/getCustomerData?customerId=${customerSelectId}`
    );
    if (response.data && response.data.length > 0) {
      return response.data[0];
    }
    return null;
  } catch (error) {
    console.error("Error fetching customer data:", error);
    return null;
  }
};

export const createOrder = async (
  items: CartItem[],
  customerData: CustomerData | null,
  paymentMethod: string,
  setIsLoading: (loading: boolean) => void,
  onClearCart: () => void,
  onClose: () => void,
  isExportInvoice: boolean // Đổi tên tham số cho rõ ràng
) => {
  console.log('[cartUtils] items in createOrder:', items);
  if (setIsLoading) setIsLoading(true);

  try {
    const userId = getItem("id");
    const userName = getItem("userName");
    const userPhone = getItem("userPhone");
    const typelogin = getItem("type");

    // Kiểm tra đăng nhập
    if (!userId || !userName) {
      window.location.href = '/login'; // Chuyển hướng đến trang đăng nhập
      return;
    }

    // Không tính toán VAT cho từng sản phẩm nữa, chỉ giữ lại các trường giá, khuyến mãi
    const processedItems = items.map((item) => {
      const originalPrice = parseFloat(item.cr1bb_giaban ?? "0");
      const quantity = Math.max(1, item.quantity || 1);
      const discountedPrice = item.isApplyPromotion && item.promotion ? calculateDiscountedPrice(item, items) : originalPrice;
      const discountValue = item.isApplyPromotion && item.promotion 
        ? (item.promotion.isValue2Applied && item.promotion.value2 
            ? item.promotion.value2 
            : item.promotion.value) 
        : "0";
      const discountUnit = item.isApplyPromotion && item.promotion 
        ? (item.promotion.vn ?? "VNĐ") 
        : "VNĐ";
      return {
        crdfd_chieckhau: parseFloat(discountValue),
        cr1bb_onvichietkhau: String(discountUnit),
        _crdfd_onvi_value: item._crdfd_onvi_value,
        priceChangeReason: item.priceChangeReason,
        crdfd_idsanpham: item.crdfd_productsid,
        crdfd_tensanpham: item.crdfd_name,
        crdfd_soluong: quantity,
        crdfd_onvi: item.unit,
        crdfd_giagoc: originalPrice,
        crdfd_giaexuat: discountedPrice,
        crdfd_giasauchietkhau: discountedPrice,
        crdfd_thanhtien: discountedPrice * quantity,
        crdfd_dongiacu: parseFloat(item.oldPrice ?? "0"),
        isApplyPromotion: item.isApplyPromotion,
        cr1bb_promotion: item.promotionId || (item.promotion?.promotionId) || '',
        promotionid: item.promotionId || (item.promotion?.promotionId) || '',
        promotion_Id: item.promotion?.promotion_id || '',
        cr1bb_json_gia: item.cr1bb_json_gia || [], // Bổ sung trường giá chi tiết
      };
    });

    let orderData;
    if (typelogin === "sale" && customerData) {
      orderData = {
        crdfd_id_khachhang: customerData.crdfd_customerid,
        crdfd_tenkhachhang: customerData.crdfd_name,
        crdfd_so_dien_thoai: customerData.sdt,
        crdfd_address: customerData.crdfd_address,
        crdfd_idnhanviensaledirect: customerData.saledirect,
        crdfd_idnhanviensaleonline: customerData.saleonline,
        crdfd_nhanviensalephutrach: userName,
        crdfd_nguoitaoon: userName,
        paymentMethod: paymentMethod,
        cr1bb_maso: `SO_${getCurrentDate()}_${customerData.crdfd_name}_${userName}`,
        items: processedItems,
        cr1bb_kenhtiepnhanso: "283640002",
        crdfd_vat: isExportInvoice ? 191920000 : 191920001,
        isOrderWithVAT: isExportInvoice,
      };
    } else {
      orderData = {
        crdfd_id_khachhang: userId,
        crdfd_tenkhachhang: userName,
        crdfd_so_dien_thoai: userPhone,
        crdfd_nhanviensalephutrach: userName,
        crdfd_nguoitaoon: userName,
        paymentMethod: paymentMethod,
        cr1bb_maso: `SO_${getCurrentDate()}_${userName}_Customer`,
        items: processedItems,
        cr1bb_kenhtiepnhanso: "283640003",
        crdfd_vat: isExportInvoice ? 191920000 : 191920001,
        isOrderWithVAT: isExportInvoice
      };
    }

    await axios.post(`/api/postDataDathangSO`, orderData);
    Swal.fire({
      title: "Thành công!",
      html: `
        <p>Đơn hàng đã được tạo thành công!</p>
        <p>Chúng tôi sẽ liên hệ bạn trong vài phút.</p>
        <p>Rất cảm ơn quý khách đã tin tưởng và sử dụng sản phẩm của Wecare.</p>
      `,
      icon: "success",
      confirmButtonText: "OK",
    });

    localStorage.removeItem("cartItems");
    onClearCart();
    onClose();
  } catch (error) {
    console.error("Error creating order:", error);
    Swal.fire({
      title: "Lỗi!",
      text: "Có lỗi xảy ra khi tạo đơn hàng. Vui lòng thử lại.",
      icon: "error",
      confirmButtonText: "OK",
    });
  } finally {
    if (setIsLoading) setIsLoading(false);
  }
};

// Xóa các hàm getFinalProductPrice, getProductVATAmount và mọi tính toán VAT 

// Ví dụ hàm lấy crdfd_baogiachitietid từ item trong cartUtils
export const getBaoGiaChiTietId = (item: CartItem): string | undefined => {
  return item.cr1bb_json_gia?.[0]?.crdfd_baogiachitietid;
}; 