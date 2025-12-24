"use client";
import "bootstrap/dist/css/bootstrap.min.css";
import JDStyleHeader from "@/components/JDStyleHeader";
import Footer from "@/components/footer";
import React, { useState, useEffect, useCallback, useContext } from "react";
import Toolbar from "@/components/toolbar";
import axios from "axios";
import Loading from "@/app/loading";
import Image from "next/image";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  HomeIcon,
} from "@heroicons/react/24/solid";
import { PostData } from "@/model/interface/PostData";
import { formatDateToDDMMYYYY } from "@/utils/utils";
import { useCart } from "@/components/CartManager";
import { CartContext } from "@/components/CartGlobalManager";

export default function Home() {
  const [posts, setPost] = useState<PostData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;
  const totalPages = Math.ceil(posts.length / ITEMS_PER_PAGE);
  const { cartItems } = useCart();
  const { openCart } = useContext(CartContext);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const fetchBlogData = async () => {
      try {
        setLoading(true);
        const response = await axios.get<{
          success: boolean;
          data: { value: PostData[] };
        }>("/api/getDataContent?tag=");
        if (response.data.success && Array.isArray(response.data.data.value)) {
          setPost(response.data.data.value);
        } else {
          throw new Error("Invalid data format");
        }
      } catch (error) {
        setError("Failed to load promotions. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchBlogData();
  }, []);

  const handleSearch = useCallback((term: string) => {
    if (term.trim()) {
      const toSlug = (str: string) =>
        str
          .toLowerCase()
          .normalize("NFD")
          .replace(/\p{Diacritic}/gu, "")
          .replace(/[đĐ]/g, "d")
          .replace(/[^a-z0-9\s]/g, "")
          .replace(/\s+/g, "-");
      const slug = toSlug(term);
      window.location.href = `/san-pham/${slug}`;
    }
  }, []);
  const handlePageChange = useCallback((page: number) => {
    setPageLoading(true);
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => setPageLoading(false), 300);
  }, []);

  const getPaginatedPosts = useCallback(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return posts.slice(startIndex, endIndex);
  }, [posts, currentPage]);

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col overflow-x-hidden">
      {/* JD Style Layout */}
      <div className="bg-white">
        {/* Header with Search */}
        <JDStyleHeader
          cartItemsCount={cartItems.length}
          onSearch={handleSearch}
          onCartClick={openCart}
        />

        {/* Main Layout - No Sidebar */}
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-10 py-6 pt-24">
          <div className="flex flex-col">
            {/* Main Content - Full Width */}
            <div className="w-full">
              <main className="w-full py-6">
        {/* Breadcrumb */}
        <nav
          className="max-w-screen-2xl mx-auto px-1 mb-1"
          aria-label="Breadcrumb"
        >
          <ol className="inline-flex items-center space-x-2 text-sm text-gray-500">
            <li className="inline-flex items-center">
              <a
                href="/"
                className="block no-underline inline-flex items-center hover:text-gray-700 transition-colors"
              >
                <HomeIcon className="w-5 h-5 mr-1 text-gray-400" />
                Trang chủ
              </a>
            </li>
            <li>
              <ChevronRightIcon className="w-4 h-4 text-gray-400" />
            </li>
            <li>
              <span className="text-gray-900">Tin tức</span>
            </li>
          </ol>
        </nav>
                <div className="w-full max-w-screen-2xl mx-auto grid grid-cols-1 gap-2">
          {/* Main content */}
          <section className="col-span-1 lg:col-span-9 xl:col-span-10">
            {pageLoading ? (
              <div className="flex justify-center my-12">
                <Loading />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {loading ? (
                  <div className="flex justify-center items-center col-span-full py-12">
                    <Loading />
                  </div>
                ) : getPaginatedPosts().length > 0 ? (
                  getPaginatedPosts().map((post) => (
                    <article
                      key={post.cr1bb_data_website_ecommerceid}
                      className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
                    >
                      <a
                        href={`/post/tag?tagname=${post.cr1bb_tags}&postid=${post.cr1bb_data_website_ecommerceid}`}
                        className="block no-underline flex flex-col h-full"
                      >
                        {/* Hình ảnh */}
                        <div className="relative w-full h-48 overflow-hidden bg-gray-100">
                          {post.cr1bb_img_url ? (
                            <Image
                              src={post.cr1bb_img_url}
                              alt={post.cr1bb_title || "Post image"}
                              fill
                              className="object-cover hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <svg
                                className="w-12 h-12 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <rect
                                  x="3"
                                  y="3"
                                  width="18"
                                  height="18"
                                  rx="2"
                                />
                                <path d="m8 17 4-4 4 4" />
                                <path d="M8 7h.01" />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Nội dung */}
                        <div className="p-6 flex flex-col flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="inline-block text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-md">
                              {post.cr1bb_tags}
                            </span>
                            {post.createdon && (
                              <span className="text-xs text-gray-500">
                                {formatDateToDDMMYYYY(post.createdon)}
                              </span>
                            )}
                          </div>

                          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 hover:text-blue-600 transition-colors">
                            {post.cr1bb_title}
                          </h3>

                          <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                            {post.cr1bb_header ||
                              "Khám phá nội dung thú vị trong bài viết này..."}
                          </p>

                          {/* Đọc thêm (luôn dính đáy) */}
                          <div className="flex items-center gap-1 text-sm text-blue-600 font-medium mt-auto pb-1 justify-end transition-transform duration-110 hover:scale-105">
                            <span>Đọc thêm</span>
                            <ChevronRightIcon className="w-4 h-4 text-blue-600 " />
                          </div>
                        </div>
                      </a>
                    </article>
                  ))
                ) : (
                  <div className="text-center py-16 col-span-full">
                    <svg
                      className="w-16 h-16 text-gray-400 mx-auto mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Chưa có bài viết
                    </h3>
                    <p className="text-gray-500">
                      Hãy quay lại sau để xem nội dung mới nhất
                    </p>
                  </div>
                )}
              </div>
            )}
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-8 mb-4">
                <nav className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-1">
                  <button
                    onClick={() =>
                      handlePageChange(Math.max(currentPage - 1, 1))
                    }
                    disabled={currentPage === 1}
                    className={`flex items-center justify-center w-8 h-8 rounded-md text-sm transition-colors ${
                      currentPage === 1
                        ? "text-gray-400 cursor-not-allowed"
                        : "text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                    }`}
                  >
                    <ChevronLeftIcon className="w-4 h-4" />
                  </button>

                  {[...Array(totalPages)].map((_, index) => {
                    const pageNumber = index + 1;
                    if (
                      pageNumber === 1 ||
                      pageNumber === totalPages ||
                      (pageNumber >= currentPage - 1 &&
                        pageNumber <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={index}
                          onClick={() => handlePageChange(pageNumber)}
                          className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium transition-colors ${
                            currentPage === pageNumber
                              ? "bg-blue-600 text-white"
                              : "text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                          }`}
                        >
                          {pageNumber}
                        </button>
                      );
                    }
                    return null;
                  })}

                  <button
                    onClick={() =>
                      handlePageChange(Math.min(currentPage + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    className={`flex items-center justify-center w-8 h-8 rounded-md text-sm transition-colors ${
                      currentPage === totalPages
                        ? "text-gray-400 cursor-not-allowed"
                        : "text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                    }`}
                  >
                    <ChevronRightIcon className="w-4 h-4" />
                  </button>
                </nav>
              </div>
            )}
          </section>
                </div>
              </main>
            </div>
          </div>
        </div>
      </div>

      <Toolbar />
      <Footer />
    </div>
  );
}
