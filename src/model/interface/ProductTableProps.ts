import Products from "../../model/Product";

export interface ProductTableProps {
  items: Products[];
  initialQuantity: number;
  startIndex: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onAddToCart: (product: Products, quantity: number) => void;
}

export interface ColumnWidths {
  quyCach: string;
  hoanThien: string;
  gia: string;
}

export interface QuantityState {
  [key: string]: number;
}

export interface PopupState {
  productId: string | null;
  productDv: string | null;
} 