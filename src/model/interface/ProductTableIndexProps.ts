import { Products } from "./ProductCartData";

export interface ProductTableIndexProps {
  searchTerm: string;
  ID: string;
  initialQuantity: number;
  startIndex: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onAddToCart: (product: Products, quantity: number) => void;
  showPrices?: boolean;
  usePreloadedData?: boolean;
  preloadedData?: Products[];
  isPriceViewer?: boolean;
  customerSelectId?: string;
}

export interface SortConfig {
  key: keyof Products;
  direction: "ascending" | "descending";
}

export interface TableStyles {
  headerCell: string;
  row: string;
  cell: string;
}

export interface ColumnWidths {
  quyCach: string;
  hoanThien: string;
  gia: string;
} 