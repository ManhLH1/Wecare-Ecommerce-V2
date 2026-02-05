"use client";
import React, { useEffect, useState, useCallback, lazy } from "react";
import Products from "../../../../model/Product";
import { ProductTableProps, ColumnWidths, QuantityState, PopupState } from "../../../../model/interface/ProductTableProps";
import { useCart } from "@/components/CartManager";

const ProductDetailPopup = lazy(
  () => import("../ProductDetailPopup/ProductDetailPopup")
);

const ProductTable: React.FC<ProductTableProps> = ({
  items,
  initialQuantity,
  startIndex,
  totalPages,
  onPageChange,
  onAddToCart,
  //onPriceRangeUpdate,
}) => {
  const { cartItems } = useCart();
  const [currentPage, setCurrentPage] = useState(1);
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
  const [popupProductId, setPopupProductId] = useState<string | null>(null);
  const [popupProductdv, setPopupProductdv] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    handleResize(); // Initialize on mount
    window.addEventListener("resize", handleResize); // Listen for resize events

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);
  useEffect(() => {
    setQuantities((prevQuantities) => {
      const newQuantities = { ...prevQuantities };
      items.forEach((item) => {
        if (!(item.crdfd_productsid in newQuantities)) {
          newQuantities[item.crdfd_productsid] = initialQuantity;
        }
      });
      return newQuantities;
    });
  }, [items, initialQuantity]);

  const handleQuantityChange = useCallback(
    (productId: string, delta: number) => {
      setQuantities((prev) => {
        const newQuantity = Math.max(0, (prev[productId] || 0) + delta);
        return { ...prev, [productId]: newQuantity };
      });
    },
    []
  );

  const handleRowClick = useCallback((productId: string, dv: string) => {
    setPopupProductId((prevId) => (prevId === productId ? null : productId));
    setPopupProductdv((prevdv) => (prevdv === dv ? null : dv));
  }, []);

  const handleClosePopup = useCallback(() => {
    setPopupProductId(null);
    setPopupProductdv(null);
  }, []);

  const formatPrice = useCallback(
    (price: number | string | null | undefined): string => {
      if (
        price === null ||
        price === undefined ||
        price === 0 ||
        price === ""
      ) {
        return "Liên hệ để được báo giá";
      }
      const numPrice = typeof price === "string" ? parseFloat(price) : price;
      return isNaN(numPrice)
        ? "Liên hệ để được báo giá"
        : `${numPrice.toLocaleString()} đ`;
    },
    []
  );

  const columnClasses =
    "px-3 py-2 whitespace-nowrap text-black overflow-hidden text-ellipsis";
  const columnWidths = {
    quyCach: "w-1/3 md:w-1/4",
    hoanThien: "w-1/3 md:w-1/4",
    gia: "w-1/3 md:w-1/4",
    //action: "w-1/7 hidden md:table-cell",
  };

  const renderDesktopView = () => (
    <table className="hidden md:table w-full divide-y divide-gray-200 table-fixed">
      <thead className="bg-gray-50">
        <tr>
          {["Quy cách", "Hoàn thiện bề mặt", "Giá"].map((header, index) => (
            <th
              key={header}
              className={`${columnClasses} ${
                Object.values(columnWidths)[index]
              } text-left text-xs font-bold text-black uppercase tracking-wider`}
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {items.map((item) => (
          <React.Fragment
            key={`${item.crdfd_productsid}_${item._crdfd_onvi_value}`}
          >
            <tr
              className="hover:bg-gray-50 cursor-pointer"
              onClick={() =>
                handleRowClick(item.crdfd_productsid, item._crdfd_onvi_value)
              }
            >
              <td className={`${columnClasses} ${columnWidths.quyCach}`}>
                {item.crdfd_quycach || ""}
              </td>
              <td className={`${columnClasses} ${columnWidths.hoanThien}`}>
                {item.crdfd_hoanthienbemat || ""}
              </td>
              <td className={`${columnClasses} ${columnWidths.gia}`}>
                {formatPrice(item.cr1bb_giaban)}
              </td>
              {/* <td className={`${columnClasses} ${columnWidths.action}`}></td> */}
            </tr>
            {popupProductId === item.crdfd_productsid &&
              popupProductdv === item._crdfd_onvi_value && (
                <tr>
                  <td colSpan={3} className="px-1 py-1">
                    <ProductDetailPopup
                      item={item}
                      quantity={quantities[item.crdfd_productsid] || 0}
                      onQuantityChange={(delta: number) =>
                        handleQuantityChange(item.crdfd_productsid, delta)
                      }
                      onAddToCart={onAddToCart}
                      onClose={handleClosePopup}
                      cartItems={cartItems as any}
                    />
                  </td>
                </tr>
              )}
          </React.Fragment>
        ))}
      </tbody>
    </table>
  );

  const renderMobileView = () => (
    <div className="md:hidden grid grid-cols-1 gap-4 max-w-full">
      <table className="border rounded-lg w-full max-w-full">
        <thead className="bg-gray-50">
          <tr>
            {["Tên sản phẩm", "Giá"].map((header, index) => (
              <th
                key={header}
                className={`${columnClasses} ${
                  Object.values(columnWidths)[index]
                } text-left text-xs font-bold border text-black uppercase tracking-wider`}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            return (
              <React.Fragment
                key={`${item.crdfd_productsid}_${item._crdfd_onvi_value}`}
              >
                <tr
                  onClick={() =>
                    handleRowClick(
                      item.crdfd_productsid,
                      item._crdfd_onvi_value
                    )
                  }
                  className="border rounded-lg hover:bg-gray-100"
                >
                  <td
                    className="px-2 py-2 border-b text-sm"
                    style={{ maxWidth: "240px" }}
                  >
                    <div className="truncate overflow-hidden whitespace-nowrap">
                      {item.crdfd_fullname}
                    </div>
                  </td>
                  <td
                    className="mr-0 px-2 py-2 border text-sm"
                    style={{ maxWidth: "110px" }}
                  >
                    <div className="truncate overflow-hidden whitespace-nowrap">
                      {formatPrice(item.cr1bb_giaban)}/{item.don_vi_DH}
                    </div>
                  </td>
                </tr>

                {popupProductId === item.crdfd_productsid &&
                  popupProductdv === item._crdfd_onvi_value && (
                    <tr>
                      <td colSpan={3} className="px-1 py-1">
                        <ProductDetailPopup
                          item={item}
                          quantity={quantities[item.crdfd_productsid] || 0}
                          onQuantityChange={(delta: number) =>
                            handleQuantityChange(item.crdfd_productsid, delta)
                          }
                          onAddToCart={onAddToCart}
                          onClose={handleClosePopup}
                          cartItems={cartItems as any}
                        />
                      </td>
                    </tr>
                  )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="overflow-x-auto">
      {items.length === 0 ? (
        <div className="p-8 text-center text-gray-500 bg-gray-100 rounded-lg shadow-inner">
          <p className="text-lg font-semibold">
            Không có sản phẩm nào trong nhóm
          </p>
          <p className="mt-2">
            Vui lòng thử lại sau hoặc chọn một nhóm sản phẩm khác.
          </p>
        </div>
      ) : (
        <>{isDesktop ? renderDesktopView() : renderMobileView()}</>
      )}
      ;
    </div>
  );
};

export default ProductTable;
