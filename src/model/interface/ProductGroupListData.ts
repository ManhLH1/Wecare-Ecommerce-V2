import { ReactNode } from 'react';
import { Products } from "./ProductCartData";
import productGroup from "../productGroup";

export interface TopProduct {
  crdfd_tensanphamtext: string;
  total: number;
  productId: string;
  cr1bb_imageurl: string;
  crdfd_thuonghieu: string;
  crdfd_quycach: string;
  crdfd_hoanthienbemat: string;
  crdfd_masanpham: string;
  cr1bb_giaban: string;
  crdfd_giatheovc: string;
  crdfd_onvichuantext: string;
  don_vi_DH: string;
  _crdfd_productgroup_value?: string;
  crdfd_nhomoituongtext?: string;
}

export interface TopProductsListProps {
  products: TopProduct[];
  onAddToCart: (product: TopProduct, quantity: number) => void;
}

export interface ProductListProps {
  searchTerm: string;
  quantity?: number;
  searchKey?: string;
  selectedProductGroup?: string | null;
  selectedGroupImage?: string;
  selectedGroupMinPrice?: number | null;
  selectedGroupMaxPrice?: number | null;
  breadcrumb?: string[];
  customerSelectId?: string;
  onAddToCart?: (product: Products, quantity: number) => void;
  productGroupId?: string | null;
  initialBreadcrumb?: string[];
  isSidebarSearch?: boolean;
  isPriceViewer?: boolean;
  sortBy?: string;
  filterBy?: string;
  refreshTimestamp?: number;
}

export interface GroupedProducts {
  [parentGroup: string]: {
    crdfd_productname: string;
    crdfd_image_url: any;
    crdfd_nhomsanphamchatext: string;
    crdfd_productgroup_value: string;
    cr1bb_urlimage: string;
    cr1bb_so_san_pham_co_gia: string;
    materials: {
      [material: string]: productGroup[];
    };
  };
}

export interface ProductGroupCount {
  productGroupId: string;
  productGroupName: string;
  count: number;
} 