import { CartItem } from "./ProductCartData";

export interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (id: string, newQuantity: number) => void;
  onRemoveItem: (id: string) => void;
  customerId: string;
  onClearCart: () => void;
  customerSelectId?: string;
} 