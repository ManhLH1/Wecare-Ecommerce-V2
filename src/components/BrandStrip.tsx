import React from "react";

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
    <section className="w-full py-6 bg-white">
      <div className="relative px-[5px] md:px-[50px]">
        <div className="p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-gray-800">THƯƠNG HIỆU NỔI BẬT</h3>
              <span className="inline-block w-14 h-1 bg-amber-300 rounded" />
            </div>
            <a href="/thuong-hieu" className="text-sm text-amber-500 hover:underline">Xem tất cả</a>
          </div>

          {/* Grid: mobile 2, sm 3, md 4, lg 6 per row */}
          <div className="overflow-hidden">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 py-2">
              {brandImages.map((filename) => {
                const src = `/thuong-hieu/${encodeURIComponent(filename)}`;
                const alt = filename.replace(/\.[^.]+$/, "");
                return (
                  <div
                    key={filename}
                    className="w-full aspect-square flex items-center justify-center bg-white rounded-md p-0 hover:shadow-md transition"
                  >
                    <div className="w-full h-full flex items-center justify-center">
                      <img
                        src={src}
                        alt={alt}
                        loading="lazy"
                        className="object-contain"
                        style={{ maxWidth: '92%', maxHeight: '92%' }}
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


