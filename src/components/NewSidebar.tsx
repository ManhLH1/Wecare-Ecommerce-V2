"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { FaChevronRight } from "react-icons/fa";
import { BsTools, BsBox, BsRecycle, BsWrench, BsGear } from "react-icons/bs";
import { FaFlask } from "react-icons/fa";
import Loading from "@/components/loading";
import { ProductGroupBase, ProductGroupWithChildren, GroupedProductGroup, SidebarState } from "../model/interface/ProductGroupTypes";
import { debounce } from "lodash";

const NewSidebar: React.FC = (): React.ReactElement => {
  const [state, setState] = useState<SidebarState>({
    level2Groups: [],
    activeGroups: {},
    selectedGroup: null,
    isLoading: true,
    error: null
  });

  const [showSidebar, setShowSidebar] = useState(true);

  // Fetch level 2 groups on component mount
  useEffect(() => {
    const fetchLevel2Groups = async () => {
      try {
        const response = await axios.get("/api/productGroups/getLevel2Groups");
        setState(prev => ({
          ...prev,
          level2Groups: response.data,
          isLoading: false
        }));
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: "Failed to fetch product groups",
          isLoading: false
        }));
      }
    };
    fetchLevel2Groups();
  }, []);

  // Handle scroll with debounce
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

  // Fetch child groups when hovering over a parent group
  const fetchChildGroups = useCallback(async (parentId: string, level: number) => {
    try {
      // Set loading state for this group
      setState(prev => ({
        ...prev,
        activeGroups: {
          ...prev.activeGroups,
          [parentId]: prev.activeGroups[parentId]?.map(group => ({
            ...group,
            isLoading: true
          })) || []
        }
      }));

      const response = await axios.get(`/api/productGroups/getLevel${level + 1}Groups`);
      const allGroups = response.data;
      
      // Filter groups by parent ID
      const childGroups = allGroups.filter(
        (group: ProductGroupBase) => group._crdfd_nhomsanphamcha_value === parentId
      );
      
      // Recursively fetch children for each group if not at level 5
      if (level < 4) {
        for (const group of childGroups) {
          await fetchChildGroups(group.crdfd_productgroupid, level + 1);
        }
      }
      
      setState(prev => ({
        ...prev,
        activeGroups: {
          ...prev.activeGroups,
          [parentId]: childGroups
        }
      }));
    } catch (error) {
      console.error("Error fetching child groups:", error);
    }
  }, []);

  // Load all child groups when level 2 groups are loaded
  useEffect(() => {
    if (state.level2Groups.length > 0) {
      state.level2Groups.forEach(group => {
        fetchChildGroups(group.crdfd_productgroupid, 2);
      });
    }
  }, [state.level2Groups, fetchChildGroups]);

  // Handle mouse enter on group - only for level 2
  const handleMouseEnter = useCallback((group: ProductGroupBase, level: number, event: React.MouseEvent) => {
    if (level > 2) return; // Only handle hover for level 2
    
    const element = event.currentTarget as HTMLElement;
    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const top = Math.max(0, Math.min(rect.top - 20, windowHeight - 500));
    
    setState(prev => ({
      ...prev,
      activeGroups: {
        ...prev.activeGroups,
        [group.crdfd_productgroupid]: prev.activeGroups[group.crdfd_productgroupid]?.map(g => ({
          ...g,
          isLoading: true
        })) || []
      }
    }));

    fetchChildGroups(group.crdfd_productgroupid, level);
  }, [fetchChildGroups]);

  // Get icon for group
  const getIcon = useCallback((groupName: string) => {
    switch (groupName) {
      case "Kim khí & phụ kiện": return <BsTools />;
      case "Bao bì": return <BsBox />;
      case "Hóa chất": return <FaFlask />;
      case "Vật tư tiêu hao": return <BsRecycle />;
      case "Công cụ - dụng cụ": return <BsWrench />;
      case "Phụ tùng thay thế": return <BsGear />;
      default: return <BsBox />;
    }
  }, []);

  // Handle item selection
  const handleItemSelect = useCallback((item: ProductGroupBase) => {
    setState(prev => ({ ...prev, selectedGroup: item.crdfd_productgroupid }));
    
    // Create a slug from the product group name
    const productNameSlug = item.crdfd_productname
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '-'); // Replace spaces with hyphens
    
    // Navigate to the new product URL format
    window.location.href = `/product/${productNameSlug}`;
  }, []);

  // Render submenu content recursively
  const renderSubmenu = useCallback((groups: ProductGroupBase[], level: number) => {
    if (!groups || groups.length === 0) return null;

    return (
      <div className={`p-4 ${level === 2 ? 'grid grid-cols-2' : 'flex flex-col'} gap-4`}>
        {groups.map((group) => (
          <div key={group.crdfd_productgroupid} className="space-y-2">
            <div className="relative group/child">
              <button
                onClick={() => handleItemSelect(group)}
                className={`w-full text-left py-2 px-3 text-sm font-medium rounded transition-all duration-200 ${
                  state.selectedGroup === group.crdfd_productgroupid
                    ? "bg-[#04A1B3] text-white shadow-sm"
                    : "hover:bg-gray-50 text-gray-700 hover:shadow-sm"
                } flex items-center justify-between`}
              >
                <span className="flex-1 flex items-center">
                  {level > 2 && (
                    <span className="mr-2 text-gray-400">
                      {Array(level - 2).fill('→').join(' ')}
                    </span>
                  )}
                  {group.crdfd_productname}
                </span>
                {level < 5 && state.activeGroups[group.crdfd_productgroupid]?.length > 0 && (
                  <FaChevronRight className="w-3 h-3 ml-2 text-gray-400" />
                )}
              </button>
              
              {/* Show nested submenu for levels 3 and above */}
              {level < 5 && state.activeGroups[group.crdfd_productgroupid] && (
                <div className="pl-4 border-l-2 border-gray-200">
                  {renderSubmenu(state.activeGroups[group.crdfd_productgroupid], level + 1)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }, [state.selectedGroup, state.activeGroups, handleItemSelect]);

  if (state.error) {
    return <div className="text-red-500 p-4">{state.error}</div>;
  }

  return (
    <div 
      className={`hidden md:block w-64 bg-white border border-gray-200 rounded-lg shadow-lg sticky transition-opacity duration-300 ${
        !showSidebar ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{position: "sticky", top: "4rem", zIndex: 999}}
    >
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-2 border-b border-gray-200 rounded-t-lg">
        <h2 className="text-base font-semibold text-gray-800 flex items-center">
          <span className="mr-1.5">
            <BsTools className="w-4 h-4 text-[#04A1B3]" />
          </span>
          <span className="text-gray-700">Danh mục sản phẩm</span>
        </h2>
      </div>
      
      <div className="p-1.5 relative">
        {state.isLoading ? (
          <Loading />
        ) : state.level2Groups.length > 0 ? (
          <nav className="relative">
            <ul className="space-y-0.5">
              {state.level2Groups.map((group: ProductGroupBase) => (
                <li
                  key={group.crdfd_productgroupid}
                  className="relative group"
                >
                  <div 
                    className="flex items-center justify-between w-full px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-200 cursor-pointer rounded group-hover:shadow-sm"
                    onClick={() => handleItemSelect(group)}
                    onMouseEnter={(e) => handleMouseEnter(group, 2, e)}
                  >
                    <span className="flex items-center space-x-1">
                      <span className="text-gray-500 transition-colors duration-200 group-hover:text-[#04A1B3]">
                        {getIcon(group.crdfd_productname)}
                      </span>
                      <span className="group-hover:text-gray-900">
                        {group.crdfd_productname}
                      </span>
                    </span>
                    <FaChevronRight className="text-gray-400 w-3 h-3 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[#04A1B3]" />
                  </div>

                  {state.activeGroups[group.crdfd_productgroupid] && (
                    <div 
                      className="absolute bg-white shadow-lg rounded z-[9999] border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200"
                      style={{ 
                        top: '0',
                        left: '100%',
                        width: '800px',
                        maxHeight: '85vh',
                        overflowY: 'auto',
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#CBD5E0 #EDF2F7'
                      }}
                    >
                      {renderSubmenu(state.activeGroups[group.crdfd_productgroupid], 3)}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ) : (
          <p className="text-gray-500 italic text-sm">Không có dữ liệu</p>
        )}
      </div>
    </div>
  );
};

export default NewSidebar;