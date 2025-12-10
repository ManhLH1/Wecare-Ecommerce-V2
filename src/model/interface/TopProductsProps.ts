import Products from "../Product";

export interface TopProduct {
  crdfd_tensanphamtext: string;
  productId: string;
  cr1bb_imageurl: string;
  cr1bb_giaban: number;
  crdfd_onvichuantext: string;
  don_vi_DH: string;
  total: number;
  crdfd_giatheovc: string;
  crdfd_thuonghieu?: string;
  crdfd_quycach?: string;
  crdfd_hoanthienbemat?: string;
  crdfd_masanpham?: string;
  cr1bb_tylechuyenoi?: string;
  crdfd_onvichuan?: string; 
  _crdfd_productgroup_value?: string;
  crdfd_nhomoituongtext?: string;
  _crdfd_onvi_value?: string;
  promotion?: {
    name: string;
    conditions: string;
    value: string;
    value2?: string;
    soluongcondon?: string;
    soluongapdung?: string;
    type: string;
    vn: string;
    promotionId?: string;
    adjustedValue?: string;
  };
}

export interface TopProductsListProps {
  products?: TopProduct[];
  onAddToCart: (product: Products, quantity: number) => void;
  isSidebarSearch?: boolean;
}

export interface LocalState {
  loading: boolean;
  error: Error | null;
  openProduct: string | null;
  quantities: Record<string, number>;
  localProducts: TopProduct[];
  visibleItems: number;
  showViewMore: boolean;
}

export interface ViewConfig {
  itemsPerLoad: number;
  initialItems: {
    mobile: number;
    desktop: number;
  };
} 