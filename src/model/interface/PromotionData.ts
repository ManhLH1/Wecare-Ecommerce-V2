export interface PromotionDetails {
  cr1bb_urlimage?: string;
  crdfd_name: string;
  crdfd_conditions: string;
  crdfd_multiple_manhomsp: string;
  crdfd_multiple_tennhomsp: string;
  crdfd_masanpham_multiple: string;
  crdfd_tensanpham_multiple: string;
  crdfd_type: string;
}

export interface CustomerPromotion {
  _wc001_promotion_value: string;
  crdfd_promotiontext: string;
  crdfd_value: string;
  cr1bb_vn: string;
  cr1bb_startdate: string;
  cr1bb_enddate: string;
  cr1bb_urlimage?: string;
  crdfd_multiple_tennhomsp?: string;
  crdfd_tensanpham_multiple?: string;
  crdfd_conditions?: string;
  crdfd_name?: string;
} 