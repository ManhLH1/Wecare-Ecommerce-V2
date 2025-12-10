import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { FaChevronRight } from "react-icons/fa";
import { BsTools, BsBox, BsRecycle, BsWrench, BsGear } from "react-icons/bs";
import { FaFlask } from "react-icons/fa";
import Loading from "../components/loading";
import { getItem, setItem } from "@/utils/SecureStorage";

interface ProductGroup {
  crdfd_productname: string;
  crdfd_hinhanh: string;
  cr1bb_giamin: string;
  cr1bb_giamax: string;
  children?: ProductGroup[];
  productCount: number;
  crdfd_productgroupid?: string;
  _crdfd_nhomsanphamcha_value?: string;
  level?: number;
  cr1bb_soh6thang?: number;
}

export const searchKeys: { [key: string]: string } = {
  "TÊN NHÓM SẢN PHẨM": "crdfd_nhomsanphamtext",
};

const STORAGE_KEY = "mobileProductGroups";
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

// Interface for the response from getProductGroupHierarchy API
interface ProductGroupHierarchyResponse {
  hierarchy: ProductGroup[];
  byLevel: {
    [key: string]: ProductGroup[];
  };
  stats: {
    totalGroups: number;
    groupsByLevelCount: {
      [key: string]: number;
    };
  };
}

const Sidebar: React.FC = () => {
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [typelogin, setTypelogin] = useState<string | null>(null);
  const [hierarchyData, setHierarchyData] = useState<ProductGroupHierarchyResponse | null>(null);

  useEffect(() => {
    const fetchProductGroups = async () => {
      try {
        const cachedData = getItem(STORAGE_KEY);
        if (cachedData) {
          const { data, timestamp } = JSON.parse(cachedData);
          if (Date.now() - timestamp < CACHE_DURATION) {
            // Kiểm tra xem byLevel["1"] có tồn tại không
            if (data.byLevel && data.byLevel["1"] && data.byLevel["1"].length > 0) {
              setHierarchyData(data);
              // Lấy các nhóm cấp 1 để hiển thị trong sidebar chính
              setProductGroups(data.byLevel["1"] || []);
              setIsLoading(false);
              return;
            } else {
              console.log("Dữ liệu cache không có level 1, tải lại từ API");
            }
          }
        }

        const response = await axios.get<ProductGroupHierarchyResponse>("/api/getProductGroupHierarchyLeftpanel");
        
        // Kiểm tra cấu trúc dữ liệu
        if (response.data && response.data.byLevel) {
          // Đảm bảo mỗi level có dữ liệu hợp lệ
          setHierarchyData(response.data);
          
          // Lấy các nhóm có level=1 từ API để hiển thị ở sidebar chính
          if (response.data.byLevel["1"] && response.data.byLevel["1"].length > 0) {
            setProductGroups(response.data.byLevel["1"]);
          } else {
            console.warn("Không tìm thấy sản phẩm level 1 từ API");
            setProductGroups([]);
          }
          
          // Lưu toàn bộ dữ liệu vào cache
          setItem(
            STORAGE_KEY,
            JSON.stringify({
              data: response.data,
              timestamp: Date.now(),
            })
          );
        } else {
          throw new Error("Invalid data structure received from API");
        }
      } catch (error) {
        console.error(
          "Error fetching product groups - fetchProductGroups:",
          error
        );
        setError("Failed to fetch product groups. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchProductGroups();
  }, []);

  useEffect(() => {
    const storedType = getItem("type");
    setTypelogin(storedType);
  }, []);

  const getIcon = useCallback((groupName: string) => {
    switch (groupName) {
      case "Kim khí & phụ kiện":
        return <BsTools />;
      case "Bao bì":
        return <BsBox />;
      case "Hóa chất":
        return <FaFlask />;
      case "Vật tư tiêu hao":
        return <BsRecycle />;
      case "Công cụ - dụng cụ":
        return <BsWrench />;
      case "Phụ tùng thay thế":
        return <BsGear />;
      default:
        return <BsBox />;
    }
  }, []);

  const handleItemSelect = useCallback(
    (item: ProductGroup) => {
      setSelectedItem(item.crdfd_productname);
      setActiveGroup(null);

      const getBreadcrumb = (name: string, nodes: ProductGroup[]): string[] => {
        for (const node of nodes) {
          if (node.crdfd_productname === name) {
            return [node.crdfd_productname];
          }
          if (node.children && node.children.length > 0) {
            const path = getBreadcrumb(name, node.children);
            if (path.length > 0) {
              return [...path, node.crdfd_productname];
            }
          }
        }
        return [];
      };

      const breadcrumbPath = getBreadcrumb(
        item.crdfd_productname,
        productGroups
      );
      const breadcrumbString = breadcrumbPath.reverse().join("/");

      const encodedBreadcrumb = encodeURIComponent(breadcrumbString);
      const encodedProduct = encodeURIComponent(item.crdfd_productname);

      const storedId = getItem("id");

      if (storedId !== null) {
        window.location.href = `?group=${encodedProduct}&breadcrumb=${encodedBreadcrumb}`;
      } else {
        window.location.href = `/product-list?group=${encodedProduct}&breadcrumb=${encodedBreadcrumb}`;
      }
    },
    [productGroups]
  );

  // Tìm nhóm cấp 2 tương ứng với nhóm cấp 1
  const findLevel2Items = useCallback(
    (group: ProductGroup): ProductGroup[] => {
      if (!hierarchyData || !group.crdfd_productgroupid) return [];
      
      // Lấy tất cả nhóm cấp 2
      const level2Groups = hierarchyData.byLevel["2"] || [];
      
      // Lọc các nhóm cấp 2 có nhóm cha là nhóm cấp 1 hiện tại và có số sản phẩm > 0
      return level2Groups.filter(
        item => item._crdfd_nhomsanphamcha_value === group.crdfd_productgroupid && 
        (item.productCount === undefined || item.productCount > 0)
      );
    },
    [hierarchyData]
  );

  const renderLevel2Items = useCallback(
    (items: ProductGroup[]) => {
      return (
        <div className="space-y-1">
          {items.map((item, index) => (
            <div key={index} className="w-full">
              <button
                onClick={() => handleItemSelect(item)}
                className={`flex hover:bg-gray-50 text-gray-700 text-left py-2 px-2 text-lg font-medium rounded transition-all duration-200 whitespace-nowrap text-ellipsis ${
                  selectedItem === item.crdfd_productname
                    ? "bg-blue-500 text-white shadow-sm"
                    : ""
                }`}
              >
                {item.crdfd_productname}
                <span className="ml-1.5 text-base opacity-75">
                  ({item.productCount})
                </span>
              </button>
              {item.children && item.children.length > 0 && (
                <div className="w-full max-h-full overflow-y-auto pl-1">
                  {item.children.map((subItem, subIndex) => (
                    <button
                      key={subIndex}
                      onClick={() => handleItemSelect(subItem)}
                      className={`flex w-full px-2 py-1.5 text-base rounded transition-all duration-200 whitespace-nowrap text-ellipsis 
                      ${
                        selectedItem === subItem.crdfd_productname
                          ? "bg-blue-400 text-white shadow-sm"
                          : "hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      {subItem.crdfd_productname}
                      <span className="ml-1.5 text-base opacity-75">
                        ({subItem.productCount})
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    },
    [selectedItem, handleItemSelect]
  );

  const renderProductGroups = useMemo(() => {
    // Lọc các nhóm sản phẩm có productCount > 0 và sắp xếp theo cr1bb_soh6thang giảm dần
    const filteredGroups = productGroups
      .filter(group => group.productCount === undefined || group.productCount > 0)
      .sort((a, b) => {
        const aValue = a.cr1bb_soh6thang || 0;
        const bValue = b.cr1bb_soh6thang || 0;
        return bValue - aValue;
      });

    return filteredGroups.map((group, index) => {
      // Tìm các nhóm cấp 2 tương ứng với nhóm cấp 1 này
      const level2Items = findLevel2Items(group);
      
      return (
        <li key={group.crdfd_productgroupid || index} className="mb-0.5">
          <div
            className="flex items-center justify-between w-full px-2 py-2 text-lg font-bold text-gray-700 hover:bg-gray-50 transition-all duration-200 cursor-pointer rounded"
            onClick={() =>
              setActiveGroup(
                activeGroup === group.crdfd_productname
                  ? null
                  : group.crdfd_productname
              )
            }
          >
            <span className="flex items-center space-x-1">
              <span className="text-gray-500 transition-colors duration-200">
                {getIcon(group.crdfd_productname)}
              </span>
              <span>{group.crdfd_productname}</span>
            </span>
            <span className="flex items-center space-x-0.5">
              <span className="text-lg text-gray-400">
                ({group.productCount})
              </span>
              <FaChevronRight
                className={`text-gray-400 w-4 h-4 transition-transform duration-200 ${
                  activeGroup === group.crdfd_productname ? "rotate-90" : ""
                }`}
              />
            </span>
          </div>
          {level2Items.length > 0 &&
            activeGroup === group.crdfd_productname && (
              <div className="bg-white shadow-sm rounded p-1.5 mt-0.5">
                <div className="grid grid-cols-1 gap-1">
                  {renderLevel2Items(level2Items)}
                </div>
              </div>
            )}
        </li>
      );
    });
  }, [productGroups, activeGroup, getIcon, renderLevel2Items, findLevel2Items]);

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  return (
    <div className="flex-grow overflow-y-auto overflow-x-hidden z-40 bg-white border border-gray-200 shadow-lg w-screen/2 md:hidden">
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-3 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center">
          <span className="mr-2">
            <BsTools className="w-6 h-6 text-[#04A1B3]" />
          </span>
          <span className="text-gray-700 font-bold">Danh mục sản phẩm</span>
        </h2>
      </div>

      <div className="p-2">
        {isLoading ? (
          <Loading />
        ) : (
          <>
            <nav>
              <ul className="p-1.5">
                {renderProductGroups}
              </ul>
            </nav>
            {productGroups.length === 0 && (
              <p className="text-gray-500 italic text-lg font-bold">
                Không có dữ liệu
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
