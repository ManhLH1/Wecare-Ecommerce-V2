import React from "react";
import { BreadcrumbProps } from "@/model/interface/BreadcrumbProps";

const Breadcrumb: React.FC<BreadcrumbProps> = ({
  customerId,
  breadcrumb,
  excludeValues = ["Nguyên vật liệu gián tiếp"],
  onCrumbClick,
}) => {
  // Filter out excluded values
  const filteredBreadcrumb = breadcrumb.filter(
    (crumb) => !excludeValues.includes(crumb)
  );

  const handleCrumbClick = (crumb: string) => {
    if (onCrumbClick) {
      onCrumbClick(crumb);
    }
  };
  return (
    <nav className="bg-gray-50 py-3 px-4 rounded-md shadow-sm mb-4" aria-label="Breadcrumb">
      {filteredBreadcrumb.length > 0 && (
        <ol className="flex flex-wrap items-center space-x-1">
          {filteredBreadcrumb.map((crumb, index) => (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <span className="mx-2 text-gray-400">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
                  </svg>
                </span>
              )}
              <button
                onClick={() => handleCrumbClick(crumb)}
                className={`text-sm md:text-base ${
                  index === filteredBreadcrumb.length - 1
                    ? "font-medium text-gray-700"
                    : "text-[#04A1B3] hover:text-[#038696] hover:underline transition-colors duration-200"
                } focus:outline-none focus:ring-2 focus:ring-[#04A1B3] focus:ring-opacity-50 rounded px-2 py-1`}
                aria-current={index === filteredBreadcrumb.length - 1 ? "page" : undefined}
              >
                {crumb}
              </button>
            </li>
          ))}
        </ol>
      )}
    </nav>
  );
};

export default Breadcrumb;
