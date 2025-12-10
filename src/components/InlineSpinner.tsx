"use client";
import React from "react";

const InlineSpinner: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={`w-full flex items-center justify-center py-6 ${className || ''}`}>
      <div className="w-6 h-6 rounded-full border-4 border-gray-200 border-t-blue-500 animate-spin" />
    </div>
  );
};

export default InlineSpinner;


