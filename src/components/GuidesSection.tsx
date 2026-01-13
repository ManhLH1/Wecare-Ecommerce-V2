 "use client";
 import React, { useEffect, useState } from "react";
 import axios from "axios";
import Link from "next/link";
import Image from "next/image";
 import { formatDateToDDMMYYYY } from "@/utils/utils";

 interface PostItem {
   cr1bb_title?: string;
   cr1bb_header?: string;
   cr1bb_img_url?: string;
   createdon?: string;
   cr1bb_tags?: string;
   cr1bb_linkfileembedded?: string;
   // allow unknown fields
   [key: string]: any;
 }

 const GuidesSection: React.FC = () => {
   const [posts, setPosts] = useState<PostItem[]>([]);
   const [loading, setLoading] = useState<boolean>(true);
   const [error, setError] = useState<string | null>(null);

   useEffect(() => {
     let mounted = true;
     const fetchPosts = async () => {
       try {
         setLoading(true);
         // fetch general content (no tag) so we get latest posts; adjust tag if needed
         const res = await axios.get<{
           success: boolean;
           data: { value: PostItem[] };
         }>("/api/getDataContent?tag=");
         if (res.data?.success && Array.isArray(res.data.data?.value)) {
           if (!mounted) return;
           setPosts(res.data.data.value || []);
         } else {
           throw new Error("Invalid data format");
         }
       } catch (err) {
         console.error("Error fetching guides posts:", err);
         if (!mounted) return;
         setError("Không thể tải cẩm nang ngay bây giờ.");
       } finally {
         if (!mounted) return;
         setLoading(false);
       }
     };

     fetchPosts();
     return () => {
       mounted = false;
     };
   }, []);

   const featured = posts.length > 0 ? posts[0] : null;
   const list = posts.slice(1, 6); // show up to 5 list items

  const resolveImageUrl = (val: any) => {
    try {
      if (!val) return "/placeholder-image.jpg";
      if (typeof val === "string") {
        const s = val.trim();
        // If contains src attribute, extract it
        const srcMatch = s.match(/src=(?:'|")([^'"]+)(?:'|")/i);
        if (srcMatch && srcMatch[1]) return srcMatch[1];
        // If contains a direct http(s) url inside string
        const httpMatch = s.match(/https?:\/\/[^\s'"]+/i);
        if (httpMatch) return httpMatch[0];
        // Protocol-relative
        if (s.startsWith("//")) return window.location.protocol + s;
        // Absolute path on same origin
        if (s.startsWith("/")) return window.location.origin + s;
        // Plain URL without protocol?
        if (s.startsWith("http") || s.includes("://")) return s;
        // otherwise, return as-is (may be data url)
        return s;
      }
      // If it's an object with url property
      if (typeof val === "object") {
        if (val.url) return val.url;
        if (val.src) return val.src;
        // try stringify and extract http
        const str = JSON.stringify(val);
        const httpMatch = str.match(/https?:\/\/[^\s'"]+/i);
        if (httpMatch) return httpMatch[0];
      }
    } catch (e) {
      // fallthrough
    }
    return "/placeholder-image.jpg";
  };

  // We'll use Next.js Image for automatic optimization/responsive srcset.

  return (
    <section className="w-full bg-white py-4 mt-6">
      <div className="relative px-4 md:px-12">
        <div className="py-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <h3 className="text-cyan-600 no-underline hover:text-cyan-700 text-2xl uppercase">CẨM NANG - KINH NGHIỆM</h3>
              <span className="inline-block w-12 h-1 bg-amber-300 rounded" />
            </div>
            <Link href="/post" className="text-sm text-amber-500 hover:underline">Xem tất cả</Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="aspect-[4/3] bg-gray-100 rounded animate-pulse md:col-span-3 flex items-center justify-center max-h-40 sm:max-h-56 md:max-h-64 lg:max-h-80">
                <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
              </div>
              <div className="space-y-2 md:col-span-1">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-16 h-12 bg-gray-100 rounded animate-pulse flex-shrink-0" />
                    <div className="flex-1">
                      <div className="h-3 bg-gray-100 rounded w-3/4 animate-pulse mb-1" />
                      <div className="h-2 bg-gray-100 rounded w-1/2 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="text-sm text-red-500">{error}</div>
          ) : posts.length === 0 ? (
            <div className="text-sm text-gray-600">Chưa có cẩm nang.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
              {/* Featured (3/4) */}
              <article className="md:col-span-3 rounded overflow-hidden border border-gray-100">
                <Link href={`/post`} className="block no-underline">
                  <div className="w-full aspect-[4/3] bg-gray-200 overflow-hidden max-h-40 sm:max-h-56 md:max-h-64 lg:max-h-80 relative">
                    {(() => {
                      const imgUrl = resolveImageUrl(featured?.cr1bb_img_url);
                      return (
                        <Image
                          src={imgUrl}
                          alt={featured?.cr1bb_title || "Featured post"}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 60vw, 800px"
                          className="object-cover"
                          onError={(e: any) => {
                            // fallback to placeholder: replace src by setting src directly isn't possible on Image;
                            // use CSS background fallback instead by leaving placeholder in resolveImageUrl.
                          }}
                        />
                      );
                    })()}
                  </div>
                  <div className="p-3">
                    <h4 className="text-base font-semibold text-gray-900 line-clamp-2">{featured?.cr1bb_title}</h4>
                    <div className="text-xs text-gray-500 mt-1">{featured?.createdon ? formatDateToDDMMYYYY(featured.createdon) : ""}</div>
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{featured?.cr1bb_header || ""}</p>
                  </div>
                </Link>
              </article>

              {/* Compact list (1/4) */}
              <div className="space-y-3 md:col-span-1">
                {list.map((post, idx) => (
                  <article key={idx} className="flex items-start gap-3">
                    <Link href={`/post`} className="w-16 h-12 flex-shrink-0 overflow-hidden rounded relative">
                      {(() => {
                        const thumbUrl = resolveImageUrl(post.cr1bb_img_url);
                        return (
                          <Image
                            src={thumbUrl}
                            alt={post.cr1bb_title || "thumb"}
                            width={160}
                            height={120}
                            sizes="48px"
                            className="object-cover"
                          />
                        );
                      })()}
                    </Link>
                    <div className="flex-1">
                      <Link href={`/post`} className="no-underline text-gray-900 hover:text-amber-600">
                        <h5 className="text-sm font-medium line-clamp-2">{post.cr1bb_title}</h5>
                      </Link>
                      <div className="text-xs text-gray-500 mt-0.5">{post.createdon ? formatDateToDDMMYYYY(post.createdon) : ""}</div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
 };

 export default GuidesSection;


