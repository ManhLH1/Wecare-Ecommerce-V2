import React, { useEffect, useState, useCallback } from "react";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { PaginationProps } from "@/model/interface/PaginationProps";

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  onLoadMore,
  isLoading,
}) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640); // Adjust this breakpoint as needed
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      window.scrollTo(0, 0);
    }
  }, [currentPage, isMobile]);

  const getPageNumbers = () => {
    const pageNumbers = [];
    if (totalPages <= 3) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      if (currentPage <= 2) {
        pageNumbers.push(1, 2, 3);
      } else if (currentPage >= totalPages - 1) {
        pageNumbers.push(totalPages - 2, totalPages - 1, totalPages);
      } else {
        pageNumbers.push(currentPage - 1, currentPage, currentPage + 1);
      }
    }
    return pageNumbers;
  };

  const handlePageChange = (page: number) => {
    onPageChange(page);
    if (!isMobile) {
      window.scrollTo(0, 0);
    }
  };

  const handleScroll = useCallback(() => {
    if (
      isMobile &&
      window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 100 &&
      !isLoading &&
      currentPage < totalPages
    ) {
      onLoadMore();
    }
  }, [isMobile, isLoading, currentPage, totalPages, onLoadMore]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  if (isMobile) {
    return null; // Don't render pagination on mobile
  }

  return (
    <nav className="flex items-center justify-center mt-2">
      <ul className="flex items-center space-x-0.5">
        <li>
          <button
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            className="p-1 text-gray-500 bg-white border border-gray-300 rounded-full hover:bg-gray-100 hover:text-gray-700 transition-colors duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="sr-only">First Page</span>
            <ChevronsLeft className="w-3 h-3" />
          </button>
        </li>
        {getPageNumbers().map((number, index) => (
          <li key={index}>
            <button
              onClick={() => handlePageChange(number)}
              className={`w-6 h-6 flex items-center justify-center text-xs rounded-full border ${
                currentPage === number
                  ? "text-blue-600 border-blue-300 bg-blue-50 hover:bg-blue-100 hover:text-blue-700"
                  : "text-gray-500 bg-white border-gray-300 hover:bg-gray-100 hover:text-gray-700"
              } transition-colors duration-150 ease-in-out`}
            >
              {number}
            </button>
          </li>
        ))}
        <li>
          <button
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="p-1 text-gray-500 bg-white border border-gray-300 rounded-full hover:bg-gray-100 hover:text-gray-700 transition-colors duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="sr-only">Last Page</span>
            <ChevronsRight className="w-3 h-3" />
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Pagination;
