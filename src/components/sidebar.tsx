import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import axios from "axios";
import { FaChevronRight } from "react-icons/fa";
import { BsTools, BsBox, BsRecycle, BsWrench, BsGear } from "react-icons/bs";
import { FaFlask } from "react-icons/fa";
import Loading from "@/components/loading";
import { getItem, setItem } from "@/utils/SecureStorage";
import {
  ProductGroup,
  SidebarProps,
  SearchKeys,
} from "../model/interface/SidebarProps";
import { debounce } from "lodash";

export const searchKeys: SearchKeys = {
  "TÊN NHÓM SẢN PHẨM": "crdfd_nhomsanphamtext",
};

// Mở rộng interface ProductGroup để thêm crdfd_productgroupid
declare module "../model/interface/SidebarProps" {
  interface ProductGroup {
    crdfd_productgroupid?: string;
    _crdfd_nhomsanphamcha_value?: string;
    level?: number;
    cr1bb_soh6thang?: number;
  }
}

const STORAGE_KEY = "productGroupsHierarchy";
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

const Sidebar: React.FC<SidebarProps> = () => {
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const activeGroupRef = useRef<string | null>(null);
  const [hierarchyData, setHierarchyData] = useState<ProductGroupHierarchyResponse | null>(null);

  useEffect(() => {
    activeGroupRef.current = activeGroup;
  }, [activeGroup]);

  // 🖱️ Sự kiện mouse enter
  const handleMouseEnter = useCallback((group: any, event: React.MouseEvent) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    // No need to calculate position since we're using fixed positioning
    setActiveGroup(group.crdfd_productname);
  }, []);

  // 🖱️ Sự kiện mouse leave
  const handleMouseLeave = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      setActiveGroup(null);
    }, 300);
  }, []);

  // 🖱️ Xử lý sự kiện cuộn với debounce
  useEffect(() => {
    const handleScroll = debounce(() => {
      const footer = document.querySelector('footer');
      if (footer) {
        const footerTop = footer.getBoundingClientRect().top;
        const windowHeight = window.innerHeight;
        setShowSidebar(footerTop > windowHeight);
      }
    }, 100);

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const footer = document.querySelector("footer");
      if (footer) {
        const footerTop = footer.getBoundingClientRect().top;
        const windowHeight = window.innerHeight;
        if (footerTop <= windowHeight) {
          setShowSidebar(false);
        } else {
          setShowSidebar(true);
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

  const getBreadcrumb = useCallback(
    (name: string, nodes: ProductGroup[]): string[] => {
      for (const node of nodes) {
        if (node.crdfd_productname === name) {
          return [node.crdfd_productname];
        }
        if (node.children && node.children.length > 0) {
          const path = getBreadcrumb(name, node.children);
          if (path.length > 0) {
            return [node.crdfd_productname, ...path];
          }
        }
      }
      return [];
    },
    []
  );

  const handleItemSelect = useCallback(
    (item: ProductGroup) => {
      setSelectedItem(item.crdfd_productname);
      setActiveGroup(null);

      // Get the productGroupId to use for filtering
      const productGroupId = item.crdfd_productgroupid;
      
      if (!productGroupId) {
        console.error("No product group ID found for selected item");
        return;
      }
      
      // Create a slug from the product group name
      const productNameSlug = item.crdfd_productname
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[đĐ]/g, 'd')
        .replace(/[^a-z0-9\s]/g, '') // Remove special characters
        .replace(/\s+/g, '-'); // Replace spaces with hyphens
      
      // Create the new clean URL format
      const newUrl = `/san-pham/${productNameSlug}`;
      
      // Create breadcrumb path for internal use
      const breadcrumbPath = getBreadcrumb(item.crdfd_productname, productGroups);
      const breadcrumbString = breadcrumbPath.join("/");
      
      // Navigate to the new URL (this approach will do a full page load)
      window.location.href = newUrl;
      
      // Note: We're not using window.history.pushState here because we want a full page load
      // to ensure our product page handles the request with the new format
    },
    [productGroups, getBreadcrumb]
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

  // Tìm các nhóm con cho một nhóm cha ở bất kỳ level nào
  const findChildItems = useCallback(
    (parentId: string, level: number): ProductGroup[] => {
      if (!hierarchyData || !parentId) return [];
      
      // Lấy tất cả nhóm ở level tiếp theo
      const childGroups = hierarchyData.byLevel[level.toString()] || [];
      
      // Lọc các nhóm có cha là nhóm hiện tại và có số sản phẩm > 0
      return childGroups.filter(
        item => item._crdfd_nhomsanphamcha_value === parentId && 
        (item.productCount === undefined || item.productCount > 0)
      );
    },
    [hierarchyData]
  );

  // Render các nhóm con lồng nhau (từ level 3 trở lên)
  // Trong renderNestedChildren, chỉ render tối đa 2 menu con (level <= 3)
  const renderNestedChildren = useCallback((parentItem: ProductGroup, level: number) => {
    if (!parentItem.crdfd_productgroupid) return null;
    // Nếu đã là level 2 thì không render tiếp các con nữa
    if (level >= 2) return null;
    // Lấy tất cả các nhóm con ở level hiện tại
    const childItems = findChildItems(parentItem.crdfd_productgroupid, level + 1);
    if (childItems.length === 0) return null;
    return (
      <ul className="mt-0.5 space-y-0.5 pl-2">
        {childItems.map((item) => (
          <li key={item.crdfd_productname || item.crdfd_productgroupid}>
            <button
              onClick={() => handleItemSelect(item)}
              className={`w-full text-left py-0.5 px-2 text-xs rounded transition-all duration-200 ${
                selectedItem === item.crdfd_productname
                  ? "bg-[#04A1B3] text-white shadow-sm"
                  : "hover:bg-gray-50 text-gray-700 hover:shadow-sm"
              }`}
            >
              {item.crdfd_productname}
              <span className="ml-1 text-xs opacity-75">
                ({item.productCount})
              </span>
            </button>
            {/* Không render tiếp nếu đã là level 2 */}
          </li>
        ))}
      </ul>
    );
  }, [findChildItems, handleItemSelect, selectedItem]);

  // Render các mục cấp 2 và cao hơn
  const renderSubItems = useCallback(
    (items: ProductGroup[]) => {
      if (!items || items.length === 0) return null;
      
      // Lọc các mục có productCount > 0
      const filteredItems = items.filter(item => 
        item.productCount === undefined || item.productCount > 0
      );
      
      if (filteredItems.length === 0) return null;
      
      // Đếm tổng số mục bao gồm cả mục con
      let totalItems = 0;
      filteredItems.forEach(item => {
        totalItems += 1;
        if (item.children && item.children.length > 0) {
          totalItems += item.children.length;
        }
      });
      
      // Tính toán số cột dựa trên tổng số mục
      // Đảm bảo có đủ cột để hiển thị tất cả các mục
      let columnsCount = Math.ceil(totalItems / 6);
      columnsCount = Math.max(
        columnsCount,
        window.innerWidth < 768 ? 3 : 
        window.innerWidth < 1024 ? 4 : 
        window.innerWidth < 1280 ? 5 : 6
      );
        
      // Phân phối đều các mục vào các cột
      const columns: ProductGroup[][] = Array(columnsCount)
        .fill([])
        .map(() => []);
        
      let currentColumn = 0;
      let itemsInCurrentColumn = 0;
      const maxItemsPerColumn = Math.ceil(totalItems / columnsCount);

      // Phân phối các mục vào các cột một cách đều hơn
      filteredItems.forEach((item) => {
        const itemComplexity = 1 + (item.children?.length || 0);
        
        if (itemsInCurrentColumn + itemComplexity > maxItemsPerColumn && 
            currentColumn < columnsCount - 1) {
          currentColumn++;
          itemsInCurrentColumn = 0;
        }
        
        columns[currentColumn].push(item);
        itemsInCurrentColumn += itemComplexity;
      });

      // Lọc bỏ các cột trống
      const nonEmptyColumns = columns.filter(col => col.length > 0);

      return (
        <div className="flex flex-wrap gap-3">
          {nonEmptyColumns.map((columnItems, idx) => (
            <div key={idx} className="flex-1 min-w-[180px]">
              {columnItems.map((item) => (
                <div key={item.crdfd_productname || item.crdfd_productgroupid} className="mb-2">
                  <button
                    onClick={() => handleItemSelect(item)}
                    className={`w-full text-left py-1 px-2 text-sm font-medium rounded transition-all duration-200 ${
                      selectedItem === item.crdfd_productname
                        ? "bg-[#04A1B3] text-white shadow-sm"
                        : "hover:bg-gray-50 text-gray-700 hover:shadow-sm"
                    }`}
                  >
                    {item.crdfd_productname}
                    <span className="ml-1 text-xs opacity-75">
                      ({item.productCount})
                    </span>
                  </button>
                  {/* Không renderNestedChildren hoặc renderSubItems cho các item con nữa */}
                </div>
              ))}
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
      // Tìm các nhóm cấp 2 tương ứng với nhóm cấp 1 này và loại bỏ children
      const level2Items = findLevel2Items(group).map(item => ({ ...item, children: undefined }));
      return (
        <li
          key={group.crdfd_productgroupid || index}
          className="relative group"
          onMouseEnter={(e) => handleMouseEnter(group, e)}
          onMouseLeave={handleMouseLeave}
        >
          <div className="flex items-center w-full px-1.5 py-1 text-xs font-medium text-gray-700 hover:bg-[#e6f9f1] transition-all duration-200 cursor-pointer rounded-2xl group-hover:shadow-sm gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#f2fbfd]">
              <span className="text-[#04A1B3] text-base">
                {getIcon(group.crdfd_productname)}
              </span>
            </span>
            <span className="group-hover:text-[#04A1B3] text-[13px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis" title={group.crdfd_productname}>
              {group.crdfd_productname}
            </span>
            {group.productCount !== undefined && group.productCount > 0 && (
              <span className="ml-auto text-xs text-gray-400 font-medium">({group.productCount})</span>
            )}
            <FaChevronRight className="text-gray-300 w-3 h-3 ml-1 group-hover:text-[#04A1B3] transition-transform duration-200" />
          </div>
          {level2Items.length > 0 && activeGroup === group.crdfd_productname && (
            <div 
              className="fixed bg-white shadow-lg rounded z-[9999] animate-fadeIn"
              style={{ 
                top: '4rem',
                left: '280px',
                width: 'min(calc(100vw - 300px), 1200px)',
                minHeight: '300px',
                maxHeight: 'unset',
                overflow: 'visible',
                scrollbarWidth: 'none'
              }}
              onMouseEnter={() => {
                if (timeoutRef.current) {
                  clearTimeout(timeoutRef.current);
                }
              }}
              onMouseLeave={handleMouseLeave}
            >
              <div className="p-3 md:p-4 submenu-content">
                {/* Chỉ render menu con 1 cấp (level 2) */}
                {renderSubItems(level2Items)}
              </div>
            </div>
          )}
        </li>
      );
    });
  }, [productGroups, activeGroup, getIcon, renderSubItems, handleMouseEnter, handleMouseLeave, findLevel2Items]);

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  // Thay return bằng null để ẩn hoàn toàn sidebar
  return null;
};

export default Sidebar;
