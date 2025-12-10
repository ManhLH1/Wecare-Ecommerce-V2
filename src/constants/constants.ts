// src/constants/messages.ts

export const MESSAGES = {
  PRICING: {
    CONTACT_FOR_PRICE: "Liên hệ để được báo giá",
    CURRENCY_SUFFIX: "đ",
  },
  PRODUCT: {
    ADD_TO_CART: "Thêm vào giỏ hàng",
    OUT_OF_STOCK: "Hết hàng",
    LIEN_HE_DE_DUOC_BAO_GIA: "Liên hệ để được báo giá...",
  },
  ERRORS: {
    GENERAL: "Đã xảy ra lỗi. Vui lòng thử lại sau.",
    NOT_FOUND: "Không tìm thấy dữ liệu.",
  },
  // Thêm các message khác ở đây
};

// Hàm tiện ích để format giá
export const formatPrice = (
  price: number | string | null | undefined
): string => {
  if (price === null || price === undefined || price === 0 || price === "") {
    return MESSAGES.PRICING.CONTACT_FOR_PRICE;
  }
  const numPrice = typeof price === "string" ? parseFloat(price) : price;
  return isNaN(numPrice)
    ? MESSAGES.PRICING.CONTACT_FOR_PRICE
    : `${numPrice.toLocaleString()} ${MESSAGES.PRICING.CURRENCY_SUFFIX}`;
};
