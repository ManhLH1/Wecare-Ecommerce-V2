export interface Promotion {
  name: string;
  value: string;
  cr1bb_vn: string;
  conditions?: string;
  ieuKhoanThanhToanApDung?: string;
}

export interface OrderItem {
  crdfd_tensanpham: string;
  crdfd_idsanpham: string;
  crdfd_soluong: number;
  crdfd_ongia: number;
  crdfd_dongiacu: number;
  crdfd_onvi: string;
  priceChangeReason: string;
  crdfd_chieckhau: number;
  crdfd_loaichietkhau: 'percent' | 'amount';
  crdfd_chietkhau_phanhang?: number;
  _crdfd_onvi_value: string;
  crdfd_giaexuat: number;
  cr1bb_onvichietkhau: string;
  crdfd_giagoc: number;
  promotion?: Promotion;
  isApplyPromotion: boolean;
  cr1bb_promotion?: string;
  promotion_Id?: string;
  crdfd_gtgt_value?: number;
  crdfd_giasauchietkhau?: number; // Giá sau khuyến mãi, chưa VAT
} 