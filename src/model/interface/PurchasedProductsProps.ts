import Products from "../Product";

export interface PurchasedProduct {
  productId: string;
  productName: string;
  productCode: string;
  brand: string;
  specification: string;
  surfaceFinish: string;
  gia: number;
  giatheovc: number;
  onvichuantext: string;
  don_vi_DH: string;
  imageUrl: string;
  imageUrlProduct: string;
  _crdfd_onvi_value: string;
  onvi_value: string;
  _crdfd_productgroup_value: string;
}

export interface PurchasedProductsListProps {
  products: PurchasedProduct[];
  onAddToCart: (product: Products, quantity: number) => void;
}

export interface QuantityState {
  [key: string]: number;
}

export interface ViewState {
  visibleItems: number;
  showViewMore: boolean;
  itemsPerLoad: number;
}

export interface LocalState {
  loading: boolean;
  error: Error | null;
  openProduct: string | null;
  quantities: Record<string, number>;
  localProducts: PurchasedProduct[];
} 