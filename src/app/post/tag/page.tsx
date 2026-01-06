"use client";

import "bootstrap/dist/css/bootstrap.min.css";
import Header from "@/components/header";
import Footer from "@/components/footer";
import React, { useState, useEffect, useCallback, Suspense } from "react";
import Toolbar from "@/components/toolbar";
import axios from "axios";
import Loading from "@/components/loading";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Image as ImageIcon } from "lucide-react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import {
  PostTagData,
  ClientComponentProps,
} from "@/model/interface/PostTagData";
import { HomeIcon } from "@heroicons/react/24/solid";
import dynamic from "next/dynamic";

const Document = dynamic(() => import("react-pdf").then(m => m.Document), { ssr: false });
const Page = dynamic(() => import("react-pdf").then(m => m.Page), { ssr: false });

function ClientComponent({ children }: ClientComponentProps) {
  const searchParams = useSearchParams();
  const tagName = searchParams?.get("tagname");
  const postId = searchParams?.get("postid");
  const [posts, setPosts] = useState<PostTagData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPostData = async () => {
      if (tagName === undefined) return;
      try {
        setLoading(true);
        const response = await axios.get<{
          success: boolean;
          data: { value: PostTagData[] };
        }>(`/api/getDataContent?tag=${tagName}`);
        if (response.data.success && Array.isArray(response.data.data.value)) {
          setPosts(response.data.data.value);
        } else {
          throw new Error("Invalid data format");
        }
      } catch (error) {
        console.error("Error fetching posts - fetchPostData: ", error);
        setError("Failed to load posts. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchPostData();
  }, [tagName]);

  return children({ tagName, postId, posts, loading, error });
}

export default function Home() {
  const [imageError, setImageError] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [cartItemsCount, setCartItemsCount] = useState(0);
  
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { pdfjs } = await import("react-pdf");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      } catch (error) {
        console.error("Failed to load PDF.js:", error);
      }
    })();
  }, []);

  const handleImageError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      console.error("Image failed to load - handleImageError: ", e);
      setImageError(true);
    },
    []
  );

  const handleCartToggle = useCallback(() => {}, []);
  const handleSearch = useCallback((query: string) => {}, []);
  const [count, setCount] = useState(0);
  const handleClick = () => {
    setCount((prev) => prev + 1);
  };

  // PDF States
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pdfError, setPdfError] = useState<boolean>(false);
  const [isPageTransitioning, setIsPageTransitioning] = useState<boolean>(false);
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [currentPageCanvas, setCurrentPageCanvas] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [useGoogleViewer, setUseGoogleViewer] = useState<boolean>(false);
  const [scale, setScale] = useState<number>(1.5);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [isPdfLoaded, setIsPdfLoaded] = useState<boolean>(false);
  const [isZooming, setIsZooming] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(150);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const getGoogleDriveViewerUrl = (url: string | undefined) => {
    if (!url) return url;
    let fileId = null;
    const fileMatch = url.match(/drive\.google\.com\/file\/d\/([^\/\?]+)/);
    if (fileMatch) {
      fileId = fileMatch[1];
    }
    const openMatch = url.match(/drive\.google\.com\/open\?id=([^&]+)/);
    if (openMatch) {
      fileId = openMatch[1];
    }
    if (fileId) {
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }
    return url;
  };

  const getGoogleDriveDownloadUrl = (url: string | undefined) => {
    if (!url) return url;
    let fileId = null;
    const fileMatch = url.match(/drive\.google\.com\/file\/d\/([^\/\?]+)/);
    if (fileMatch) {
      fileId = fileMatch[1];
    }
    const openMatch = url.match(/drive\.google\.com\/open\?id=([^&]+)/);
    if (openMatch) {
      fileId = openMatch[1];
    }
    if (fileId) {
      return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
    return url;
  };

  // Normalize image values to usable src strings
  const resolveImageUrl = (val: any) => {
    try {
      if (!val) return "/placeholder-image.jpg";
      if (typeof val === "string") {
        const s = val.trim();
        const srcMatch = s.match(/src=(?:'|")([^'"]+)(?:'|")/i);
        if (srcMatch && srcMatch[1]) return srcMatch[1];
        const httpMatch = s.match(/https?:\/\/[^\s'"]+/i);
        if (httpMatch) return httpMatch[0];
        if (s.startsWith("//")) return window.location.protocol + s;
        if (s.startsWith("/")) return window.location.origin + s;
        return s;
      }
      if (typeof val === "object") {
        if (val.url) return val.url;
        if (val.src) return val.src;
        const str = JSON.stringify(val);
        const httpMatch = str.match(/https?:\/\/[^\s'"]+/i);
        if (httpMatch) return httpMatch[0];
      }
    } catch (e) {
      // ignore
    }
    return "/placeholder-image.jpg";
  };

  const loadPDFDocument = async (url: string) => {
    try {
      setIsLoading(true);
      setIsPdfLoaded(false);
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      
      const proxyUrl = `/api/proxy-pdf?url=${encodeURIComponent(url)}`;
      const loadingTask = pdfjsLib.getDocument(proxyUrl);
      const pdf = await loadingTask.promise;
      
      setPdfDocument(pdf);
      setNumPages(pdf.numPages);
      await renderPage(pdf, 1, scale);
      setIsLoading(false);
      setIsPdfLoaded(true);
      setUseGoogleViewer(false);
    } catch (error) {
      console.error("Error loading PDF with PDF.js:", error);
      setUseGoogleViewer(true);
      setIsLoading(false);
      setIsPdfLoaded(false);
      setPdfError(false);
    }
  };

  const renderPage = async (pdf: any, pageNum: number, currentScale?: number) => {
    try {
      const page = await pdf.getPage(pageNum);
      const scaleToUse = currentScale !== undefined ? currentScale : scale;
      const viewport = page.getViewport({ scale: scaleToUse });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      
      await page.render(renderContext).promise;
      const dataUrl = canvas.toDataURL('image/png');
      setCurrentPageCanvas(dataUrl);
    } catch (error) {
      console.error("Error rendering page:", error);
    }
  };

  const handlePageChange = async (newPage: number) => {
    if (newPage < 1 || newPage > (numPages || 1) || !pdfDocument) return;
    
    setIsPageTransitioning(true);
    setPageNumber(newPage);
    
    await renderPage(pdfDocument, newPage, scale);
    
    setTimeout(() => {
      setIsPageTransitioning(false);
    }, 300);
  };

  const handleZoomIn = async () => {
    const newScale = Math.min(scale + 0.2, 3);
    const newZoomLevel = Math.round(newScale * 100);
    
    // Update state first
    setScale(newScale);
    setZoomLevel(newZoomLevel);
    setIsZooming(true);
    
    // Zoom to center
    zoomToCenter(newScale);
    
    // Only re-render if we have a PDF document
    if (pdfDocument && isPdfLoaded && pageNumber) {
      try {
        await renderPage(pdfDocument, pageNumber, newScale);
      } catch (error) {
        console.error('Error during re-render:', error);
      }
    }
    
    setTimeout(() => setIsZooming(false), 500);
  };

  const handleZoomOut = async () => {
    const newScale = Math.max(scale - 0.2, 0.5);
    const newZoomLevel = Math.round(newScale * 100);
    
    // Update state first
    setScale(newScale);
    setZoomLevel(newZoomLevel);
    setIsZooming(true);
    
    // Zoom to center
    zoomToCenter(newScale);
    
    // Force re-render with new scale
    if (pdfDocument && isPdfLoaded && pageNumber) {
      await renderPage(pdfDocument, pageNumber, newScale);
    }
    
    setTimeout(() => setIsZooming(false), 500);
  };

  const handleZoomReset = async () => {
    const newScale = 1.5;
    const newZoomLevel = 150;
    
    // Update state first
    setScale(newScale);
    setZoomLevel(newZoomLevel);
    setIsZooming(true);
    
    // Reset pan offset when zoom reset
    setPanOffset({ x: 0, y: 0 });
    
    // Force re-render with new scale
    if (pdfDocument && isPdfLoaded && pageNumber) {
      await renderPage(pdfDocument, pageNumber, newScale);
    }
    
    setTimeout(() => setIsZooming(false), 500);
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      handlePageChange(pageNumber - 1);
    } else if (e.key === 'ArrowRight') {
      handlePageChange(pageNumber + 1);
    } else if (e.key === 'f' || e.key === 'F') {
      toggleFullscreen();
    } else if (e.key === 'Escape' && isFullscreen) {
      toggleFullscreen();
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      handleZoomIn();
    } else if (e.key === '-') {
      e.preventDefault();
      handleZoomOut();
    } else if (e.key === '0') {
      e.preventDefault();
      handleZoomReset();
    }
  };

  const handleWheelZoom = (e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      
      // Get the container element
      const container = document.querySelector('.pdf-viewer-container');
      if (container) {
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        if (e.deltaY < 0) {
          // Zoom in
          const newScale = Math.min(scale + 0.1, 3);
          zoomToPoint(newScale, mouseX, mouseY);
        } else {
          // Zoom out
          const newScale = Math.max(scale - 0.1, 0.5);
          zoomToPoint(newScale, mouseX, mouseY);
        }
      }
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const toggleControls = () => {
    setShowControls(!showControls);
  };

  // Mouse drag handlers for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1.0) { // Only allow dragging when zoomed in
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && dragStart) {
      const newPanOffset = {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      };
      
      // Add some boundaries to prevent excessive panning
      const maxPan = 500; // Maximum pan distance
      newPanOffset.x = Math.max(-maxPan, Math.min(maxPan, newPanOffset.x));
      newPanOffset.y = Math.max(-maxPan, Math.min(maxPan, newPanOffset.y));
      
      setPanOffset(newPanOffset);
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  // Touch handlers for mobile panning
  const handleTouchStart = (e: React.TouchEvent) => {
    if (scale > 1.0 && e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - panOffset.x, y: touch.clientY - panOffset.y });
      e.preventDefault();
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && dragStart && e.touches.length === 1) {
      const touch = e.touches[0];
      const newPanOffset = {
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y
      };
      
      // Add some boundaries to prevent excessive panning
      const maxPan = 500; // Maximum pan distance
      newPanOffset.x = Math.max(-maxPan, Math.min(maxPan, newPanOffset.x));
      newPanOffset.y = Math.max(-maxPan, Math.min(maxPan, newPanOffset.y));
      
      setPanOffset(newPanOffset);
      e.preventDefault();
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  const handleDoubleClick = () => {
    // Reset pan position on double click
    setPanOffset({ x: 0, y: 0 });
  };

  const PdfLoader: React.FC<{ link?: string }> = ({ link }) => {
    useEffect(() => {
      if (link) {
        const downloadUrl = getGoogleDriveDownloadUrl(link);
        if (downloadUrl) {
          loadPDFDocument(downloadUrl);
        } else {
          console.error('Could not generate download URL');
        }
      }
    }, [link]);
    return null;
  };

  // Zoom to center of the viewport
  const zoomToCenter = (newScale: number) => {
    // Get the container element
    const container = document.querySelector('.pdf-viewer-container');
    if (container) {
      const rect = container.getBoundingClientRect();
      
      // Calculate the center of the current view
      const currentCenterX = rect.width / 2;
      const currentCenterY = rect.height / 2;
      
      // Calculate how much the image will grow/shrink
      const scaleRatio = newScale / scale;
      
      // Calculate the new pan offset to keep the center point in the same position
      const newPanOffset = {
        x: panOffset.x * scaleRatio + (currentCenterX * (1 - scaleRatio)),
        y: panOffset.y * scaleRatio + (currentCenterY * (1 - scaleRatio))
      };
      
      // Apply boundaries
      const maxPan = 500;
      newPanOffset.x = Math.max(-maxPan, Math.min(maxPan, newPanOffset.x));
      newPanOffset.y = Math.max(-maxPan, Math.min(maxPan, newPanOffset.y));
      
      setPanOffset(newPanOffset);
    }
  };

  // Zoom to a specific point (mouse position)
  const zoomToPoint = async (newScale: number, pointX: number, pointY: number) => {
    const newZoomLevel = Math.round(newScale * 100);
    
    // Calculate how much the image will grow/shrink
    const scaleRatio = newScale / scale;
    
    // Calculate the new pan offset to keep the point under mouse in the same position
    const newPanOffset = {
      x: panOffset.x * scaleRatio + (pointX * (1 - scaleRatio)),
      y: panOffset.y * scaleRatio + (pointY * (1 - scaleRatio))
    };
    
    // Apply boundaries
    const maxPan = 500;
    newPanOffset.x = Math.max(-maxPan, Math.min(maxPan, newPanOffset.x));
    newPanOffset.y = Math.max(-maxPan, Math.min(maxPan, newPanOffset.y));
    
    // Update state
    setScale(newScale);
    setZoomLevel(newZoomLevel);
    setPanOffset(newPanOffset);
    setIsZooming(true);
    
    // Re-render if we have a PDF document
    if (pdfDocument && isPdfLoaded && pageNumber) {
      try {
        await renderPage(pdfDocument, pageNumber, newScale);
      } catch (error) {
        console.error('Error during re-render:', error);
      }
    }
    
    setTimeout(() => setIsZooming(false), 300);
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('wheel', handleWheelZoom, { passive: false });
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('wheel', handleWheelZoom);
    };
  }, [pageNumber, numPages, pdfDocument, scale]);



  useEffect(() => {
    const reRenderPage = async () => {
      if (pdfDocument && isPdfLoaded && pageNumber) {
        await renderPage(pdfDocument, pageNumber, scale);
      }
    };
    reRenderPage();
  }, [pageNumber, pdfDocument, isPdfLoaded, scale]);

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-white to-cyan-50 min-h-screen">
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        
        .pdf-viewer-container {
          animation: fadeInUp 0.6s ease-out;
        }
        
        .pdf-controls {
          animation: fadeInUp 0.8s ease-out;
        }
        
        .pdf-loading {
          animation: pulse 2s infinite;
        }
        
        .pdf-fullscreen {
          backdrop-filter: blur(10px);
          background: rgba(255, 255, 255, 0.95);
        }
        
        @media (max-width: 768px) {
          .pdf-controls {
            flex-direction: column;
            gap: 1rem;
          }
          
          .pdf-zoom-controls {
            order: -1;
          }
        }
      `}</style>
      
      <Header cartItemsCount={cartItemsCount} onSearch={handleSearch} />
      <Suspense fallback={<Loading />}>
        <ClientComponent>
          {({ tagName, postId, posts, loading, error }) => {
            const currentPost = posts.find(
              (post) => post.cr1bb_data_website_ecommerceid === postId
            );
            <PdfLoader link={currentPost?.cr1bb_linkfileembedded} />

            return (
              <>
                <div>
                  <main className="flex-1 w-full px-0 md:px-6 pt-8">
                    <nav className="max-w-screen-2xl mx-auto px-1 mb-1" aria-label="Breadcrumb">
                      <ol className="inline-flex items-center space-x-2 text-sm text-gray-500">
                        <li className="inline-flex items-center">
                          <a href="/" className="block no-underline inline-flex items-center hover:text-gray-700 transition-colors">
                            <HomeIcon className="w-5 h-5 mr-1 text-gray-400" />
                            Trang chủ
                          </a>
                        </li>
                        <li className="text-gray-900">
                          <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                        </li>
                        <li>
                          <a href={`/post`} className="inline-flex items-center block no-underline h-full">
                            Tin tức
                          </a>
                        </li>
                        <li>
                          <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                        </li>{currentPost ? (
                          <li>
                            <span className="text-gray-900">{currentPost.cr1bb_title}</span>
                          </li>
                        ) : (
                          <li>
                            <span className="text-gray-900">{tagName}</span>
                          </li>
                        )}
                      </ol>
                    </nav>
                    
                    <section className="col-span-1 lg:col-span-9 xl:col-span-10">
                      <div className="space-y-8">
                        {posts.map((post) =>
                          post.cr1bb_data_website_ecommerceid === postId ? (
                            <React.Fragment key={post.cr1bb_data_website_ecommerceid}>
                              <article className="w-full rounded-2xl border overflow-hidden">
                                <div className="p-8 text-black relative overflow-hidden">
                                  <div className="absolute inset-0 opacity-20">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-16 translate-x-16"></div>
                                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-yellow-300 rounded-full translate-y-12 -translate-x-12"></div>
                                  </div>

                                  <div className="relative z-10">
                                    <h1 className="text-4xl md:text-3xl font-black mb-6 leading-tight">
                                      {post.cr1bb_title}
                                    </h1>
                                    {post.cr1bb_header && (
                                      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-1">
                                        <div className="flex items-start gap-3">
                                          <div className="w-5 h-7 bg-yellow-400 rounded-full flex items-center justify-center flex-shrink-0 mt-0">
                                            <span className="text-lg">💡</span>
                                          </div>
                                          <p className="text-lg leading-relaxed font-medium">
                                            {post.cr1bb_header}
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {post.cr1bb_img_url && (
                                  <div className="relative w-full h-52 md:h-[35rem] lg:h-[50rem] xl:h-[40rem] bg-gradient-to-br from-purple-100 to-pink-100">
                                    {loading ? (
                                      <div className="absolute inset-0 flex justify-center items-center">
                                        <div className="w-16 h-16 bg-gradient-to-r rounded-full animate-spin"></div>
                                      </div>
                                    ) : imageError ? (
                                      <div className="absolute inset-0 flex flex-col justify-center items-center">
                                        <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-400 rounded-2xl flex items-center justify-center mb-4">
                                          <ImageIcon className="h-10 w-10 text-white" />
                                        </div>
                                        <p className="text-lg font-semibold text-purple-600">
                                          Không thể tải hình ảnh 😔
                                        </p>
                                      </div>
                                    ) : (
                                      <img
                                        src={resolveImageUrl(post.cr1bb_img_url)}
                                        alt={post.cr1bb_title || "Post image"}
                                        className="w-full h-full object-contain hover:scale-105 transition-transform duration-500"
                                        onError={(e: any) => {
                                          e.currentTarget.onerror = null;
                                          e.currentTarget.src = "/placeholder-image.jpg";
                                          setImageError(true);
                                        }}
                                      />
                                    )}
                                  </div>
                                )}

                                <div className="p-8 md:p-12">
                                  <div className="prose prose-lg max-w-none">
                                    {post.cr1bb_content && (
                                      <div className="mb-12 text-gray-700 whitespace-pre-wrap leading-relaxed text-lg">
                                        <div className="p-6 mb-8">
                                          <div className="flex items-center gap-3 mb-4">
                                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                                              <span className="text-white text-sm font-bold">📝</span>
                                            </div>
                                            <span className="font-bold text-gray-800">Nội dung chính</span>
                                          </div>
                                          {post.cr1bb_content}
                                        </div>
                                      </div>
                                    )}

                                    {post.cr1bb_content2 && (
                                      <div className="mb-12 text-gray-700 whitespace-pre-wrap leading-relaxed text-lg">
                                        <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-2xl p-6 border border-green-100">
                                          <div className="flex items-center gap-3 mb-4">
                                            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center">
                                              <span className="text-white text-sm font-bold">✨</span>
                                            </div>
                                            <span className="font-bold text-gray-800">Thông tin bổ sung</span>
                                          </div>
                                          {post.cr1bb_content2}
                                        </div>
                                      </div>
                                    )}

                                    {post.cr1bb_linkfileembedded && (
                                      <div className="mb-8">
                                        <div className={`bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-3xl p-8 border border-blue-200 shadow-xl transition-all duration-500 pdf-viewer-container ${
                                          isFullscreen ? 'fixed inset-4 z-50 bg-white pdf-fullscreen' : ''
                                        }`}>
                                          <div className="flex items-center gap-4 mb-6 pdf-controls">
                                            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                                              <span className="text-white text-xl font-bold">📄</span>
                                            </div>
                                            <div className="flex-1">
                                              <h3 className="font-bold text-gray-800 text-xl">Tài liệu PDF</h3>
                                              <p className="text-gray-600 text-sm">Xem và tải xuống tài liệu chi tiết</p>
                                              
                                            </div>
                                            
                                            <div className="flex items-center gap-3 pdf-controls">
                                              {!useGoogleViewer && isPdfLoaded && (
                                                <div className="flex items-center gap-2 bg-white rounded-xl p-1 shadow-inner pdf-zoom-controls">
                                                  <button
                                                    onClick={handleZoomOut}
                                                    disabled={isZooming}
                                                    className={`w-8 h-8 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center justify-center transition-colors ${
                                                      isZooming ? 'opacity-50 cursor-not-allowed' : ''
                                                    }`}
                                                    title="Thu nhỏ (Ctrl + -)"
                                                  >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                                    </svg>
                                                  </button>
                                                  <span className={`text-sm font-medium text-gray-700 min-w-[3rem] text-center ${
                                                    isZooming ? 'animate-pulse' : ''
                                                  }`}>
                                                    {zoomLevel}%
                                                  </span>
                                                  <button
                                                    onClick={handleZoomIn}
                                                    disabled={isZooming}
                                                    className={`w-8 h-8 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center justify-center transition-colors ${
                                                      isZooming ? 'opacity-50 cursor-not-allowed' : ''
                                                    }`}
                                                    title="Phóng to (Ctrl + +)"
                                                  >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                    </svg>
                                                  </button>
                                                  <button
                                                    onClick={handleZoomReset}
                                                    disabled={isZooming}
                                                    className={`w-8 h-8 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg flex items-center justify-center transition-colors ${
                                                      isZooming ? 'opacity-50 cursor-not-allowed' : ''
                                                    }`}
                                                    title="Reset zoom (Ctrl + 0)"
                                                  >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                                    </svg>
                                                  </button>
                                                  
                                                </div>
                                              )}
                                              
                                              <button
                                                onClick={toggleFullscreen}
                                                className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl flex items-center justify-center transition-all duration-300 shadow-lg hover:shadow-xl"
                                                title={`${isFullscreen ? 'Thoát' : 'Toàn màn hình'} (F)`}
                                              >
                                                {isFullscreen ? (
                                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                  </svg>
                                                ) : (
                                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                                  </svg>
                                                )}
                                              </button>
                                              
                                              {currentPost?.cr1bb_linkfileembedded && (
                                                <div className="flex items-center gap-3">
                                                  <span className="text-sm text-gray-600 font-medium">Chế độ:</span>
                                                  <div className="bg-white rounded-xl p-1 shadow-inner">
                                                    <button
                                                      onClick={() => {
                                                        if (!useGoogleViewer) {
                                                          setUseGoogleViewer(true);
                                                        } else {
                                                          const downloadUrl = getGoogleDriveDownloadUrl(currentPost.cr1bb_linkfileembedded);
                                                          if (downloadUrl) {
                                                            loadPDFDocument(downloadUrl);
                                                          }
                                                        }
                                                      }}
                                                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                                                        useGoogleViewer 
                                                          ? 'bg-gradient-to-r from-gray-200 to-gray-300 text-gray-700 shadow-sm' 
                                                          : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg'
                                                      }`}
                                                    >
                                                      {useGoogleViewer ? 'Google Viewer' : 'PDF.js'}
                                                    </button>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                          
                                          <div className="relative">
                                            <div className={`relative w-full rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 ${
                                              isPageTransitioning ? 'scale-95 opacity-75' : 'scale-100 opacity-100'
                                            } ${isFullscreen ? 'h-[calc(100vh-200px)]' : ''}`}>
                                              {isLoading ? (
                                                <div className="flex flex-col justify-center items-center p-20 bg-gradient-to-br from-gray-50 to-blue-50 pdf-loading">
                                                  <div className="relative">
                                                    <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
                                                    <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-indigo-500 rounded-full animate-spin" style={{animationDelay: '0.2s'}}></div>
                                                  </div>
                                                  <div className="mt-6 text-center">
                                                    <p className="text-gray-600 font-medium">Đang tải PDF...</p>
                                                    <p className="text-gray-500 text-sm mt-1">Vui lòng chờ trong giây lát</p>
                                                  </div>
                                                </div>
                                              ) : useGoogleViewer ? (
                                                <div className="relative aspect-video w-full bg-gradient-to-br from-gray-100 to-blue-100 rounded-2xl overflow-hidden">
                                                  <iframe
                                                    src={getGoogleDriveViewerUrl(currentPost?.cr1bb_linkfileembedded)}
                                                    title={currentPost?.cr1bb_title}
                                                    className="absolute top-0 left-0 w-full h-full"
                                                    allow="autoplay; fullscreen"
                                                    loading="lazy"
                                                  />
                                                </div>
                                                                                             ) : currentPageCanvas ? (
                                                 <div 
                                                   className="relative bg-white rounded-2xl overflow-hidden"
                                                   style={{ cursor: scale > 1.0 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
                                                   onMouseDown={handleMouseDown}
                                                   onMouseMove={handleMouseMove}
                                                   onMouseUp={handleMouseUp}
                                                   onMouseLeave={handleMouseLeave}
                                                   onTouchStart={handleTouchStart}
                                                   onTouchMove={handleTouchMove}
                                                   onTouchEnd={handleTouchEnd}
                                                   onDoubleClick={handleDoubleClick}
                                                 >
                                                   <Image
                                                     src={currentPageCanvas}
                                                     alt={`Trang ${pageNumber} - Zoom: ${zoomLevel}%`}
                                                     className="w-full h-auto max-h-[700px] object-contain"
                                                     style={{ 
                                                       transform: `scale(${scale}) translate(${panOffset.x / scale}px, ${panOffset.y / scale}px)`,
                                                       transformOrigin: 'top left',
                                                       transition: isDragging ? 'none' : 'transform 0.3s ease',
                                                       userSelect: 'none',
                                                       pointerEvents: 'none'
                                                     }}
                                                   />
                                                   <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                                                     {zoomLevel}%
                                                   </div>
                                                   {scale > 1.0 && (
                                                     <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                                                       Kéo để di chuyển • Double-click để reset
                                                     </div>
                                                   )}
                                                 </div>
                                              ) : (
                                                <div className="flex flex-col justify-center items-center p-20 bg-gradient-to-br from-gray-50 to-blue-50">
                                                  <div className="w-20 h-20 bg-gradient-to-br from-gray-300 to-gray-400 rounded-2xl flex items-center justify-center mb-4">
                                                    <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                  </div>
                                                  <p className="text-gray-600 font-medium">Không có dữ liệu PDF</p>
                                                  <p className="text-gray-500 text-sm mt-1">Vui lòng thử lại sau</p>
                                                </div>
                                              )}
                                            </div>
                                            
                                            {!useGoogleViewer && isPdfLoaded && (
                                              <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                                                <div className="flex items-center gap-2 mb-2">
                                                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                  </svg>
                                                  <span className="text-sm font-semibold text-blue-800">Phím tắt:</span>
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-blue-700">
                                                  <div className="flex items-center gap-1">
                                                    <kbd className="px-2 py-1 bg-white rounded border text-blue-600">←</kbd>
                                                    <span>Trang trước</span>
                                                  </div>
                                                  <div className="flex items-center gap-1">
                                                    <kbd className="px-2 py-1 bg-white rounded border text-blue-600">→</kbd>
                                                    <span>Trang sau</span>
                                                  </div>
                                                  <div className="flex items-center gap-1">
                                                    <kbd className="px-2 py-1 bg-white rounded border text-blue-600">F</kbd>
                                                    <span>Toàn màn hình</span>
                                                  </div>
                                                  <div className="flex items-center gap-1">
                                                    <kbd className="px-2 py-1 bg-white rounded border text-blue-600">Ctrl + Wheel</kbd>
                                                    <span>Phóng to/thu nhỏ</span>
                                                  </div>
                                                </div>
                                              </div>
                                            )}
                                            
                                            {numPages && numPages > 1 && (
                                              <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-8">
                                                <div className="flex items-center gap-2">
                                                  <button
                                                    onClick={() => handlePageChange(1)}
                                                    disabled={pageNumber <= 1}
                                                    className="px-4 py-3 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:from-gray-200 hover:to-gray-300 transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl"
                                                  >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                                                    </svg>
                                                    <span className="hidden sm:inline">Đầu</span>
                                                  </button>
                                                  
                                                  <button
                                                    onClick={() => handlePageChange(pageNumber - 1)}
                                                    disabled={pageNumber <= 1}
                                                    className="px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl"
                                                  >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                                    </svg>
                                                    <span className="hidden sm:inline">Trước</span>
                                                  </button>
                                                </div>
                                                
                                                <div className="px-6 py-3 bg-gradient-to-r from-gray-100 to-blue-100 text-gray-700 rounded-xl font-semibold shadow-lg border border-gray-200">
                                                  {pageNumber} / {numPages}
                                                </div>
                                                
                                                <div className="flex items-center gap-2">
                                                  <button
                                                    onClick={() => handlePageChange(pageNumber + 1)}
                                                    disabled={pageNumber >= numPages}
                                                    className="px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl"
                                                  >
                                                    <span className="hidden sm:inline">Sau</span>
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                  </button>
                                                  
                                                  <button
                                                    onClick={() => handlePageChange(numPages)}
                                                    disabled={pageNumber >= numPages}
                                                    className="px-4 py-3 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:from-gray-200 hover:to-gray-300 transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl"
                                                  >
                                                    <span className="hidden sm:inline">Cuối</span>
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7m-8 0l7-7-7-7" />
                                                    </svg>
                                                  </button>
                                                </div>
                                              </div>
                                            )}
                                            
                                            <div className="flex justify-center mt-8">
                                              <a
                                                href={getGoogleDriveDownloadUrl(currentPost?.cr1bb_linkfileembedded)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="group inline-flex items-center gap-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-8 py-4 rounded-2xl hover:from-green-600 hover:to-emerald-600 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105"
                                              >
                                                <svg className="w-6 h-6 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                <span className="font-semibold text-lg">Tải xuống PDF</span>
                                              </a>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-8 md:px-12 py-8">
                                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                    <div className="flex items-center gap-4">
                                      <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm border border-gray-200">
                                        <svg className="w-5 h-5 text-black-500" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                        </svg>
                                        <span className="font-semibold text-gray-700">
                                          Danh mục: <span className="text-black-500">{post.cr1bb_tags}</span>
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                      <button
                                        onClick={handleClick}
                                        className="inline-flex items-center gap-2 bg-gradient-to-r from-gray-50 to-blue-50 text-black px-6 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                                      >
                                        <svg className="w-5 h-5" fill={count > 0 ? "red" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                        </svg>
                                        Yêu thích ({count})
                                      </button>

                                      <button
                                        onClick={() => {
                                          const url = encodeURIComponent(window.location.href);
                                          const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
                                          const popup = window.open(shareUrl, "facebook-share-dialog", "width=600,height=400,scrollbars=no,resizable=no");
                                          if (popup) popup.opener = null;
                                        }}
                                        className="inline-flex items-center gap-2 bg-gradient-to-r from-black-500 to-cyan-500 text-black px-6 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                                      >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                                        </svg>
                                        Chia sẻ
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </article>
                            </React.Fragment>
                          ) : null
                        )}
                      </div>
                    </section>
                  </main>
                </div>
              </>
            );
          }}
        </ClientComponent>
      </Suspense>
      <Toolbar />
      <Footer />
    </div>
  );
}
