import React from "react";

const Loading: React.FC = () => {
  return (
    <div className="flex justify-center items-center py-8">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="text-gray-600 text-sm">Đang tải dữ liệu...</p>
      </div>
    </div>
  );
};

export default Loading;
