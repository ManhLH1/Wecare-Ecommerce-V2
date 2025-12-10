import { DebtInfo } from './DebtInfo';

export interface CustomerProfileData {
  crdfd_customerid: string;
  crdfd_name: string;
  sdt: string;
  crdfd_address: string;
  debtInfo: DebtInfo | null;
  crdfd_json_phan_hang_chu_ky_hien_tai?: {
    SoDonHang: number;
    TongTien: number;
    SoNSP: number;
    Hang_Chinh_Thuc: string;
  };
  crdfd_json_phan_hang_chu_ky_truoc?: {
    SoDonHang: number;
    TongTien: number;
    SoNSP: number;
    Hang_Truoc: string;
  };
  crdfd_wecare_rewards?: any;
} 