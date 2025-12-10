import { AlertProps } from "@mui/material";

export interface CustomerOption {
  value: string;
  label: string;
}

export interface PreOrder {
  crdfd_athangsoid: string;
  crdfd_name: string;
  crdfd_sanphamtext: string;
  crdfd_giaexuat: number;
  crdfd_onvitext: string;
  crdfd_soluong: number;
  crdfd_trangthaionhang: number | null;
  crdfd_duyetgia: string;
  crdfd_ngaytao2: string;
  crdfd_nguoitao: string;
  cr1bb_trangthaiduyetgia: string;
  "_cr1bb_khachhang_value@OData.Community.Display.V1.FormattedValue": string;
}

export interface GroupedPreOrders {
  [customerName: string]: {
    [orderDateTime: string]: PreOrder[];
  };
}

export interface StatusOption {
  value: number | null;
  label: string;
}

export interface SnackbarState {
  open: boolean;
  message: string;
  severity: "success" | "error";
}

export interface ConfirmDialogState {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

export interface OrderStatus {
  Value: string;
  Style: string;
}

export interface DateRange {
  fromDate: string;
  toDate: string;
} 