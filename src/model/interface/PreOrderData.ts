import { PreOrderItem } from './PreOrderItem';

export interface PreOrderData {
  cr1bb_maso: string;
  crdfd_id_khachhang: string;
  crdfd_tenkhachhang: string;
  crdfd_so_dien_thoai: string;
  crdfd_nguoitaoon: string;
  crdfd_idnhanviensaleonline: string;
  crdfd_idnhanviensaledirect: string;
  paymentMethod: string;
  crdfd_trangthaiduyetgia: number;
  items: PreOrderItem[];
} 