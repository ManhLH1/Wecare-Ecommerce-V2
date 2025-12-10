'use client';

import React, { useState } from "react";
import MobileCategoryMenuPage from "@/components/component_Header/MobileCategoryMenuPage";

// Mock data cho demo
const mockCategoryHierarchy = {
  byLevel: {
    "1": [
      {
        crdfd_productgroupid: "cat1",
        crdfd_productname: "Kim khí & phụ kiện",
        productCount: 150
      },
      {
        crdfd_productgroupid: "cat2", 
        crdfd_productname: "Bao bì",
        productCount: 89
      },
      {
        crdfd_productgroupid: "cat3",
        crdfd_productname: "Hóa chất", 
        productCount: 67
      },
      {
        crdfd_productgroupid: "cat4",
        crdfd_productname: "Vật tư tiêu hao",
        productCount: 234
      },
      {
        crdfd_productgroupid: "cat5",
        crdfd_productname: "Công cụ - dụng cụ",
        productCount: 112
      },
      {
        crdfd_productgroupid: "cat6",
        crdfd_productname: "Phụ tùng thay thế",
        productCount: 78
      }
    ],
    "2": [
      {
        crdfd_productgroupid: "sub1",
        crdfd_productname: "Ống thép",
        _crdfd_nhomsanphamcha_value: "cat1",
        productCount: 45,
        crdfd_image_url: "https://via.placeholder.com/64x64/4F46E5/FFFFFF?text=Ống"
      },
      {
        crdfd_productgroupid: "sub2", 
        crdfd_productname: "Bulong ốc vít",
        _crdfd_nhomsanphamcha_value: "cat1",
        productCount: 67,
        crdfd_image_url: "https://via.placeholder.com/64x64/059669/FFFFFF?text=BV"
      },
      {
        crdfd_productgroupid: "sub3",
        crdfd_productname: "Thép tấm",
        _crdfd_nhomsanphamcha_value: "cat1", 
        productCount: 38,
        crdfd_image_url: "https://via.placeholder.com/64x64/DC2626/FFFFFF?text=Thép"
      },
      {
        crdfd_productgroupid: "sub4",
        crdfd_productname: "Túi nilon",
        _crdfd_nhomsanphamcha_value: "cat2",
        productCount: 23,
        crdfd_image_url: "https://via.placeholder.com/64x64/7C3AED/FFFFFF?text=Túi"
      },
      {
        crdfd_productgroupid: "sub5",
        crdfd_productname: "Hộp carton",
        _crdfd_nhomsanphamcha_value: "cat2",
        productCount: 34,
        crdfd_image_url: "https://via.placeholder.com/64x64/EA580C/FFFFFF?text=Hộp"
      },
      {
        crdfd_productgroupid: "sub6",
        crdfd_productname: "Hóa chất tẩy rửa",
        _crdfd_nhomsanphamcha_value: "cat3",
        productCount: 28,
        crdfd_image_url: "https://via.placeholder.com/64x64/0891B2/FFFFFF?text=Hóa"
      },
      {
        crdfd_productgroupid: "sub7",
        crdfd_productname: "Giấy vệ sinh",
        _crdfd_nhomsanphamcha_value: "cat4",
        productCount: 89,
        crdfd_image_url: "https://via.placeholder.com/64x64/16A34A/FFFFFF?text=Giấy"
      },
      {
        crdfd_productgroupid: "sub8",
        crdfd_productname: "Búa",
        _crdfd_nhomsanphamcha_value: "cat5",
        productCount: 15,
        crdfd_image_url: "https://via.placeholder.com/64x64/CA8A04/FFFFFF?text=Búa"
      },
      {
        crdfd_productgroupid: "sub9",
        crdfd_productname: "Kìm",
        _crdfd_nhomsanphamcha_value: "cat5",
        productCount: 22,
        crdfd_image_url: "https://via.placeholder.com/64x64/9333EA/FFFFFF?text=Kìm"
      },
      {
        crdfd_productgroupid: "sub10",
        crdfd_productname: "Phụ tùng máy móc",
        _crdfd_nhomsanphamcha_value: "cat6",
        productCount: 45,
        crdfd_image_url: "https://via.placeholder.com/64x64/BE185D/FFFFFF?text=PT"
      }
    ]
  }
};

const mockCategoryGroups = mockCategoryHierarchy.byLevel["1"];

const DemoPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [loadingCategory, setLoadingCategory] = useState(false);

  const handleCategorySelect = (item: any) => {
    console.log('Selected category:', item);
    setSelectedCategory(item);
  };

  const handleClose = () => {
    console.log('Category menu closed');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Demo Mobile Category Menu</h1>
          <p className="text-gray-600 mt-2">
            Hiển thị MobileCategoryMenu như một UI page thay vì sidebar
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Controls */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Controls</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Loading State
                  </label>
                  <button
                    onClick={() => setLoadingCategory(!loadingCategory)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      loadingCategory
                        ? 'bg-red-100 text-red-800 hover:bg-red-200'
                        : 'bg-green-100 text-green-800 hover:bg-green-200'
                    }`}
                  >
                    {loadingCategory ? 'Stop Loading' : 'Start Loading'}
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selected Category
                  </label>
                  <div className="p-3 bg-gray-50 rounded-md">
                    {selectedCategory ? (
                      <div>
                        <p className="font-medium">{selectedCategory.crdfd_productname}</p>
                        <p className="text-sm text-gray-500">ID: {selectedCategory.crdfd_productgroupid}</p>
                        {selectedCategory.productCount && (
                          <p className="text-sm text-gray-500">Products: {selectedCategory.productCount}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500">No category selected</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mock Data Info
                  </label>
                  <div className="p-3 bg-blue-50 rounded-md">
                    <p className="text-sm text-blue-800">
                      Categories: {mockCategoryGroups.length} main categories
                    </p>
                    <p className="text-sm text-blue-800">
                      Subcategories: {mockCategoryHierarchy.byLevel["2"].length} subcategories
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Instructions</h2>
              <div className="space-y-3 text-sm text-gray-600">
                <p>• Click on any category to select it</p>
                <p>• The selected category will appear in the &quot;Selected Category&quot; section</p>
                <p>• Toggle loading state to see loading animation</p>
                <p>• This demo shows the MobileCategoryMenu as a page component</p>
              </div>
            </div>
          </div>

          {/* Right Column - Mobile Category Menu */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <h2 className="text-xl font-semibold text-gray-900">Mobile Category Menu</h2>
              <p className="text-sm text-gray-600 mt-1">Displayed as page component</p>
            </div>
            
            {/* Mobile Category Menu Container */}
            <div className="relative h-[600px] overflow-hidden">
              <MobileCategoryMenuPage
                categoryHierarchy={mockCategoryHierarchy}
                categoryGroups={mockCategoryGroups}
                loadingCategory={loadingCategory}
                onCategorySelect={handleCategorySelect}
                onClose={handleClose}
                showCloseButton={true}
              />
            </div>
          </div>
        </div>

        {/* Full Width Demo */}
        <div className="mt-8 bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="text-xl font-semibold text-gray-900">Full Width Demo</h2>
            <p className="text-sm text-gray-600 mt-1">Mobile Category Menu in full width container</p>
          </div>
          
          <div className="relative h-[700px] overflow-hidden">
            <MobileCategoryMenuPage
              categoryHierarchy={mockCategoryHierarchy}
              categoryGroups={mockCategoryGroups}
              loadingCategory={loadingCategory}
              onCategorySelect={handleCategorySelect}
              onClose={handleClose}
              showCloseButton={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoPage;
