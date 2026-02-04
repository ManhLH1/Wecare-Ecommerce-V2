/**
 * Unified Promotion Types
 * Định nghĩa types thống nhất cho toàn bộ hệ thống promotion
 */

// Enum cho discount type (vn field từ CRM)
export enum DiscountType {
  PERCENTAGE = '191920000',  // Giảm theo %
  FIXED_AMOUNT = '191920001' // Giảm theo số tiền
}

// Interface chính cho Promotion từ CRM
export interface Promotion {
  // ID & Info
  promotionId?: string;
  id?: string;
  name?: string;
  crdfd_name?: string;
  description?: string;
  crdfd_conditions?: string;
  conditions?: string;
  imageUrl?: string;
  cr1bb_urlimage?: string;
  
  // Discount Values
  value?: string | number;
  value2?: string | number;
  value3?: string | number;
  crdfd_value?: string | number;
  cr1bb_value2?: string | number;
  crdfd_value3?: string | number;
  
  // Discount Type
  vn?: string;                    // 191920000: %, 191920001: VNĐ
  crdfd_vn?: string;
  cr1bb_vn?: string;
  
  // Quantity Conditions
  cumulativeQuantity?: boolean;    // congdonsoluong: true = cộng dồn, false = không
  congdonsoluong?: boolean;
  quantityThreshold?: number;     // soluongapdung
  soluongapdung?: number;
  quantityThreshold3?: number;    // soluongapdungmuc3
  soluongapdungmuc3?: number;
  
  // Total Amount Condition (tongTienApDung)
  totalAmountThreshold?: number;   // cr1bb_tongtienapdung
  tongTienApDung?: number | string;
  productCodes?: string;          // Danh sách mã sản phẩm áp dụng (string từ CRM)
  crdfd_masanpham_multiple?: string;
  
  // Product Groups
  productGroupCodes?: string;     // Mã nhóm sản phẩm
  productGroupNames?: string;     // Tên nhóm sản phẩm
  crdfd_multiple_manhomsp?: string;
  crdfd_multiple_tennhomsp?: string;
  
  // Dates
  startDate?: string;
  endDate?: string;
  crdfd_start_date?: string;
  crdfd_end_date?: string;
  cr1bb_startdate?: string;
  cr1bb_enddate?: string;
  
  // Status
  status?: string;
  statecode?: number;
  crdfd_promotion_deactive?: string;
  
  // Customer
  customerGroupText?: string;
  customerGroupIds?: string[];
  crdfd_customergrouptext?: string;
  _crdfd_customergroup_value?: string;
  
  // Payment Terms
  paymentTerms?: string;
  ieuKhoanThanhToanApDung?: string;
  cr1bb_ieukhoanthanhtoanapdung?: string;
  
  // Buy Together (Mua kèm)
  buyTogetherProducts?: string;
  buyTogetherGroups?: string;
  tenSanPhamMuaKem?: string;
  maSanPhamMuaKem?: string;
  tenNhomSPMuaKem?: string;
  maNhomSPMuaKem?: string;
  cr3b9_tensanphammuakem?: string;
  cr1bb_masanphammuakem?: string;
  cr3b9_tennhomspmuakem?: string;
  cr1bb_manhomspmuakem?: string;
  
  // Type
  type?: string;
  crdfd_type?: string;
  promotionType?: string;
  crdfd_promotiontypetext?: string;
  
  // Customer specific
  maKhachHangApDung?: string;
  cr3b9_ma_khachhang_apdung?: string;
  customerCodes?: string;
}

// Interface cho promotion đã được normalize (dùng trong code)
export interface NormalizedPromotion {
  // ID & Info
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  
  // Discount Values (normalized as number)
  value: number;
  value2?: number;
  value3?: number;
  
  // Discount Type
  discountType: DiscountType.PERCENTAGE | DiscountType.FIXED_AMOUNT;
  
  // Conditions
  isCumulative: boolean;              // Cộng dồn số lượng
  quantityThreshold?: number;           // Số lượng áp dụng value2
  quantityThreshold3?: number;          // Số lượng áp dụng value3
  
  // Total Amount Condition
  totalAmountThreshold?: number;
  productCodes?: string[];
  
  // Dates
  startDate?: Date;
  endDate?: Date;
  
  // Status
  isActive: boolean;
}

// Kết quả tính giá khuyến mãi cho một sản phẩm
export interface CalculatedPromotion {
  finalPrice: number;              // Giá sau khuyến mãi
  appliedValue: number;            // Giá trị KM đã áp dụng
  isValue2Applied: boolean;        // Đã đạt mức 2 chưa
  isValue3Applied: boolean;        // Đã đạt mức 3 chưa
  discountAmount: number;          // Số tiền giảm
  promotion?: NormalizedPromotion;
}

// Cart item với promotion
export interface CartItemWithPromotion {
  productId: string;
  productName: string;
  quantity: number;
  originalPrice: number;
  promotedPrice?: number;
  promotionId?: string;
  appliedValue?: number;
  isValue2Applied?: boolean;
}

// Promotion API Response
export interface PromotionGroupResponse {
  customerId: string;
  customerGroupId: string;
  customerCode?: string;
  customerName?: string;
  customerGroupName?: string;
  customerPromotionJson?: string;
  promotions: Promotion[];
}

// API Response types
export interface GetPromotionsResponse {
  promotions: PromotionGroupResponse[];
}

export interface GetPromotionProductsResponse {
  products: any[];
  total: number;
}

// Helper type guards
export function isPercentageDiscount(vn: string | undefined): boolean {
  return vn === DiscountType.PERCENTAGE || vn === '191920000';
}

export function isFixedAmountDiscount(vn: string | undefined): boolean {
  return vn === DiscountType.FIXED_AMOUNT || vn === '191920001';
}
