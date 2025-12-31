export default interface SaleOrder {
  crdfd_name: string;
  _crdfd_khachhang_value: string;
  crdfd_makhachhang: string;
  crdfd_ngaytaoonhang: string;
  crdfd_trangthaigiaonhan1: number;
  crdfd_tongtien: number;
  crdfd_tongtienkhongvatnew: string;
  crdfd_dieu_khoan_thanh_toan: string;
  crdfd_ieukhoanthanhtoan?: string;
  crdfd_gtgtnew: number;
  crdfd_trangthaithanhtoan: string;
  crdfd_trangthaixuatkho: string;
  crdfd_so_auto: string;
  crdfd_so_code: string;
  crdfd_sale_orderid: string;
  _transactioncurrencyid_value: string;
  crdfd_SaleOrderDetail_SOcode_crdfd_Sale_O:[]
}
