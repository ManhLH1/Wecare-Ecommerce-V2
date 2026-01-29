import React from "react";
import Link from "next/link";

const brandImages = [
  "Nhựa Bình Minh.png",
  "Nhựa Hoa Sen.png",
  "Đá cắt Hải Dương.png",
  "Vĩnh Phát.png",
  "Cọ Sơn Đông Nam Á.png",
  "Kim Tín.png",
  "Keo apollo.png",
  "Sơn Geman.png",
  "Song Long.png",
  "Nhám TOA.png",
  "Sơn ATM, Lobster.png",
  "Đinh Thép Việt.png",
];

const BrandStrip: React.FC = () => {
  return (
    <section className="w-full pt-2.5 pb-4 bg-white mb-6">
      <div className="relative">
        <div className="px-2 md:px-6">
          <div className="flex items-center gap-3 justify-between mb-3">
            <div className="flex items-center gap-3">
              <h3 className="text-base md:text-lg font-bold text-cyan-600">THƯƠNG HIỆU NỔI BẬT</h3>
              <span className="inline-block w-14 h-1 bg-amber-300 rounded" />
            </div>
            <Link href="/san-pham" className="text-sm text-cyan-600 hover:text-cyan-700 no-underline font-normal normal-case" >
              Xem tất cả
            </Link>
          </div>

          {/* Mobile: horizontal scroll with snap; Desktop: grid */}
          <div className="block md:hidden">
            <div className="relative">
              <div className="overflow-x-auto scrollbar-hide py-3 px-2" style={{ WebkitOverflowScrolling: "touch" }}>
                <div
                  style={{
                    display: "grid",
                    gridAutoFlow: "column",
                    gridTemplateRows: "repeat(2, 1fr)",
                    gridAutoColumns: "minmax(140px, 46%)",
                    gap: "12px",
                  }}
                >
                  {brandImages.map((filename) => {
                    const src = `/thuong-hieu/${encodeURIComponent(filename)}`;
                    const alt = filename.replace(/\.[^.]+$/, "");
                    return (
                      <div key={filename} className="snap-start flex-shrink-0">
                        <div className="bg-white rounded-lg p-0 md:p-2 flex items-center justify-center h-24 shadow-sm overflow-hidden">
                          <img src={src} alt={alt} loading="lazy" className="h-20 w-auto object-contain" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* left/right gradient indicators */}
              <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent" />
              <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent" />
            </div>
          </div>

          <div className="hidden md:block overflow-hidden">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 lg:grid-rows-2 gap-0 py-0">
              {brandImages.map((filename) => {
                const src = `/thuong-hieu/${encodeURIComponent(filename)}`;
                const alt = filename.replace(/\.[^.]+$/, "");
                return (
                  <div
                    key={filename}
                    className="w-full aspect-[3/2] flex items-center justify-center bg-white rounded-none p-0 hover:shadow-none transition"
                  >
                    <div className="w-full h-full flex items-center justify-center">
                      <img
                        src={src}
                        alt={alt}
                        loading="lazy"
                        className="object-contain w-full h-full"
                        style={{ maxWidth: '100%', maxHeight: '100%' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BrandStrip;


