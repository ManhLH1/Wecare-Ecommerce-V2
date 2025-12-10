export interface Promotion {
  cr1bb_urlimage?: string;
  crdfd_name?: string;
  crdfd_value?: string;
  cr1bb_vn?: string;
  cr1bb_startdate?: string;
  cr1bb_enddate?: string;
  crdfd_conditions?: string;
  promotionId?: string;
  value?: string;
  value2?: string;
  value3?: string;
  congdonsoluong?: boolean;
  soluongapdung?: number;
  ieuKhoanThanhToanApDung?: string;
  name?: string;
  conditions?: string;
  discountAmount?: string;
  products?: any[];
  vn?: string;
  crdfd_customergrouptext?: string;
  cr1bb_value2?: string;
  crdfd_value3?: string;
  cr1bb_soluongapdung?: number;
  crdfd_soluongapdungmuc3?: number;
  cr3b9_tensanphammuakem?: string;
  cr3b9_tennhomspmuakem?: string;
  crdfd_tensanpham_multiple?: string;
  statstatuscode?: string;
}

export interface Customer {
  crdfd_customerid: string;
  crdfd_name: string;
}

export interface CustomerOption {
  value: string;
  label: string;
}

export interface PromotionState {
  promotions: Promotion[];
  isLoggedIn: boolean;
  imageError: boolean;
  loading: boolean;
  expandedPromotionId: number | null;
  cartItemsCount: number;
  listcustomers: Customer[];
  selectedCustomer: CustomerOption | null;
  userType: string | null;
}

export interface ImageHandlers {
  handleImageError: () => void;
  getImageSrc: (base64String: string) => string;
  isValidBase64: (str: string) => boolean;
}

export interface SelectHandlers {
  customFilter: (option: any, inputValue: string) => boolean;
  handleCustomerChange: (selectedOption: CustomerOption | null) => void;
  removeDiacritics: (str: string) => string;
}

export interface ExtendedPromotion {
  promotionId: string;
  value: string;
  value2?: string;
  cr1bb_vn: string;
  name: string;
  conditions?: string;
  congdonsoluong?: boolean;
  soluongapdung?: number;
  discountAmount?: string;
  ieuKhoanThanhToanApDung?: string;
} 