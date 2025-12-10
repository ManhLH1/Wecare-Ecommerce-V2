import { OrderItem } from './OrderItem';

export interface OrderData {
  cr1bb_maso: string;
  crdfd_id_khachhang: string;
  crdfd_nguoitaoon: string;
  items: OrderItem[];
  paymentMethod: string;
  cr1bb_kenhtiepnhanso?: string; // Channel code (kenh tiep nhan)
  crdfd_vat?: number;
  isOrderWithVAT?: boolean; // Thêm trường này để biết đơn hàng có VAT hay không
} 