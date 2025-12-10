import React from "react";
import SalseOrderDetail from "../../../model/saleOderDetail";
import { vndFormatter } from "@/utils/vndFormatter";

interface OrderDetailPopupProps {
  details: SalseOrderDetail[];
}

const OrderDetailPopup: React.FC<OrderDetailPopupProps> = ({ details }) => {
  return (
    <>
      {/* Table view for larger screens */}
      <div className="hidden lg:block">
        {details && details.length > 0 ? (
          <table className="table-auto w-full text-left">
            <thead>
              <tr>
                <th className="px-4 py-2">Tên sản phẩm</th>
                <th className="px-4 py-2">Giá</th>
                <th className="px-4 py-2">Số lượng</th>
                <th className="px-4 py-2">Đơn vị</th>
                <th className="px-4 py-2">Tổng tiền chưa VAT</th>
                <th className="px-4 py-2">GTGT</th>
              </tr>
            </thead>
            <tbody>
              {details.map((detail, detailIndex) => (
                <tr key={detailIndex}>
                  <td className="border px-4 py-2">{detail.crdfd_tensanphamtext}</td>
                  <td className="border px-4 py-2">{vndFormatter.format(detail.crdfd_gia)}</td>
                  <td className="border px-4 py-2">{detail.crdfd_productnum}</td>
                  <td className="border px-4 py-2">{detail.crdfd_onvionhang}</td>
                  <td className="border px-4 py-2">{vndFormatter.format(detail.crdfd_tongtienchuavat)}</td>
                  <td className="border px-4 py-2">{vndFormatter.format(detail.crdfd_thue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>Không có chi tiết đơn hàng</p>
        )}
      </div>

      {/* Item view for smaller screens */}
      <div className="block lg:hidden">
        {details && details.length > 0 ? (
          <div className="space-y-4">
            {details.map((detail, detailIndex) => (
              <div
                key={detailIndex}
                className="p-4 bg-gray-100 rounded-lg shadow-md"
              >
                <p><strong>Tên sản phẩm:</strong> {detail.crdfd_tensanphamtext}</p>
                <p><strong>Giá:</strong> {vndFormatter.format(detail.crdfd_gia)}</p>
                <p><strong>Số lượng:</strong> {detail.crdfd_productnum}</p>
                <p><strong>Đơn vị:</strong> {detail.crdfd_onvionhang}</p>
                <p><strong>Tổng tiền chưa VAT:</strong> {vndFormatter.format(detail.crdfd_tongtienchuavat)}</p>
                <p><strong>GTGT:</strong> {vndFormatter.format(detail.crdfd_thue)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p>Không có chi tiết đơn hàng</p>
        )}
      </div>
    </>
  );
};

export default OrderDetailPopup;
