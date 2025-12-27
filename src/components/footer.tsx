import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import LogoSvg from "@/assets/img/Logo-Wecare.png";
import axios from "axios";
import { fetchWithCache } from "@/utils/cache";
import ZaloIcon from "@/assets/img/Icon_of_Zalo.svg.webp";

const Footer = () => {
  const fallbackCategories = [
    "Kim Khí Phụ kiện",
    "Hoá Chất",
    "Thiết bị",
    "Bao Bì",
  ];

  const [categories, setCategories] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState<boolean>(true);
  const [brands, setBrands] = useState<string[]>([]);
  const [loadingBrands, setLoadingBrands] = useState<boolean>(true);
  const [totalBrands, setTotalBrands] = useState<number>(0);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const data = await fetchWithCache<any>(
          "cache:getProductGroupHierarchyLeftpanel",
          1000 * 60 * 60, // 1 hour
          async () => {
            const res = await axios.get("/api/getProductGroupHierarchyLeftpanel");
            return res.data;
          }
        );
        const list = data?.byLevel?.["1"] || [];
        setCategories(Array.isArray(list) ? list : []);
      } catch {
        setCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    };

    const fetchBrands = async () => {
      try {
        setLoadingBrands(true);
        const data = await fetchWithCache<{ brands: string[]; total: number }>(
          "cache:getBrands",
          1000 * 60 * 60, // 1 hour
          async () => {
            const res = await axios.get("/api/getBrands");
            return res.data;
          }
        );
        const brandList = data?.brands || [];
        setBrands(Array.isArray(brandList) ? brandList : []);
        setTotalBrands(data?.total || brandList.length || 0);
      } catch {
        setBrands([]);
        setTotalBrands(0);
      } finally {
        setLoadingBrands(false);
      }
    };

    fetchCategories();
    fetchBrands();
  }, []);

  const onSubmitSubscribe: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
  };

  return (
    <footer className="footer-custom mt-8">
      {/* Top: Newsletter + Social */}
      <div className="container-responsive py-6">
        {/* Desktop: 2 columns (auto-fill left, fixed right). Mobile: stacked */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr,320px] gap-5 items-stretch">
          <div className="w-full bg-white/5 rounded-xl p-4 md:p-5">
            <h3 className="font-semibold text-base text-white mb-3">Đăng ký nhận tin</h3>
            <form onSubmit={onSubmitSubscribe} className="w-full flex flex-col sm:flex-row items-stretch gap-2">
              <input
                type="email"
                required
                placeholder="Nhập email của bạn"
                className="w-full sm:flex-1 rounded-lg border border-white/20 bg-white px-3 h-10 text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#04A1B3] shadow-sm"
              />
              <button className="w-full sm:w-auto rounded-lg bg-[#04A1B3] px-5 h-10 text-sm font-semibold text-white hover:bg-teal-500 transition-colors shadow-sm">
                Đăng ký
              </button>
            </form>
          </div>

          <div className="w-full md:w-[320px] bg-white/5 rounded-xl p-4 md:p-5 h-full">
            <span className="text-white font-semibold block mb-3">Kết nối với chúng tôi</span>
            <div className="flex items-center gap-3 flex-wrap">
              <Link aria-label="Facebook" href="https://www.facebook.com/wecareyourproduct" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12.07C22 6.48 17.52 2 11.93 2 6.34 2 1.86 6.48 1.86 12.07c0 4.99 3.65 9.13 8.43 9.93v-7.03H7.9v-2.9h2.39V9.41c0-2.36 1.4-3.66 3.55-3.66 1.03 0 2.1.18 2.1.18v2.31h-1.18c-1.16 0-1.52.72-1.52 1.46v1.75h2.59l-.41 2.9h-2.18V22c4.78-.8 8.43-4.94 8.43-9.93z"/></svg>
              </Link>
              <Link aria-label="Zalo" href="https://zalo.me/3642371097976835684" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                <Image src={ZaloIcon} alt="Zalo" width={18} height={18} className="rounded-full" />
              </Link>
              <Link aria-label="TikTok" href="https://www.tiktok.com/@wecaresieuthicongnghiep?_t=ZS-8zYG0SMLRxQ&_r=1" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 3.5c.7 1.6 2.1 2.8 3.8 3.2v3.1c-1.7 0-3.3-.6-4.6-1.6v6.8c0 3.6-2.9 6.5-6.5 6.5S2.7 18.6 2.7 15s2.9-6.5 6.5-6.5c.4 0 .7 0 1.1.1v3.2c-.3-.1-.7-.2-1.1-.2-1.8 0-3.3 1.5-3.3 3.3S7.4 18.2 9.2 18.2s3.3-1.5 3.3-3.3V2.5h4z"/></svg>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="container-responsive py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 text-white">
          {/* Company */}
          <div>
            <Link href="/" className="flex items-center no-underline group">
              <Image src={LogoSvg} alt="Wecare Logo" width={40} height={40} className="object-contain" />
              <span className="pl-3 text-xl tracking-wider font-bold text-[#04A1B3]">WECARE</span>
            </Link>
            <p className="text-sm text-gray-200 leading-relaxed mt-4">
              Cung cấp giải pháp cung ứng vật tư, nguyên vật liệu, phụ kiện cho nhà máy, ngành công nghiệp.
            </p>
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <p className="font-medium text-white uppercase tracking-wide text-xs">Trụ sở 1</p>
                <p>14-16-18-20, Đường 36, P. Bình Phú, Q6, HCM</p>
                <p>📞 037 833 9009</p>
              </div>
              <div>
                <p className="font-medium text-white uppercase tracking-wide text-xs">Trụ sở 2</p>
                <p>Lô B39, Khu Công nghiệp Phú Tài, Phường Quy Nhơn Bắc, Tỉnh Gia Lai</p>
                <p>📞 +84 378 339 009</p>
              </div>
              <p><span className="font-medium text-white">Email:</span> support@wecare.com.vn</p>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-white font-semibold mb-4">Ngành hàng</h4>
            <ul className="space-y-2">
              {(loadingCategories || categories.length === 0 ? fallbackCategories : categories)
                .slice(0, 8)
                .map((item: any, index: number) => {
                  const label = typeof item === "string" ? item : item.crdfd_productname;
                  const key = typeof item === "string" ? `${index}` : item.crdfd_productgroupid;
                  return (
                    <li key={key}>
                      <Link href="/san-pham" className="text-sm text-gray-300 hover:text-white transition-colors">
                        {label}
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </div>

          {/* Brands */}
          <div>
            <h4 className="text-white font-semibold mb-4">Thương hiệu</h4>
            <ul className="space-y-2">
              {(loadingBrands ? [] : brands).slice(0, 8).map((brand) => (
                <li key={brand}>
                  <Link href="/san-pham" className="text-sm text-gray-300 hover:text-white transition-colors">
                    {brand}
                  </Link>
                </li>
              ))}
              {!loadingBrands && brands.length === 0 && (
                <li className="text-sm text-gray-300">Đang cập nhật</li>
              )}
              {!loadingBrands && totalBrands > 8 && (
                <li className="text-xs text-white/70 italic">và hơn {totalBrands - 8} thương hiệu khác</li>
              )}
            </ul>
          </div>

          {/* Certifications (tạm ẩn)
          <div>
            <h4 className="text-white font-semibold mb-4">Chứng chỉ</h4>
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-md border border-white/20 bg-white/10 flex items-center justify-center text-[10px] text-gray-100">
                  ISO
                </div>
              ))}
            </div>
          </div>
          */}
        </div>
      </div>

      {/* Bottom */}
      <div className="border-t border-white/10">
        <div className="container-responsive py-6 text-sm text-white/80">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="flex flex-col items-center lg:items-start gap-3">
              <p className="text-center lg:text-left">© {new Date().getFullYear()} Wecare Group. All rights reserved.</p>
              <span className="text-white/50 text-xs bg-white/10 px-2 py-1 rounded-full">Version 1.0</span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/post/chinh-sach-bao-mat" className="hover:text-white transition-colors duration-200 text-white/70 hover:text-white">
                Bảo mật
              </Link>
              <Link href="/post/dieu-khoan-su-dung" className="hover:text-white transition-colors duration-200 text-white/70 hover:text-white">
                Điều khoản
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
