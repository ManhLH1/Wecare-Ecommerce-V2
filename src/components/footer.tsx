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
    <footer className="footer-custom mt-8 bg-white text-gray-800">
      {/* Top: Newsletter + Social */}
      <div className="container-responsive py-6">
        {/* Desktop: single column for newsletter */}
        
      </div>

      {/* Main */}
      <div className="container-responsive py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-gray-800 md:divide-x md:divide-gray-200">
          {/* Column 1: Về chúng tôi */}
          <div className="px-4 md:px-6">
            <h4 className="text-gray-900 font-semibold mb-3 uppercase text-xs tracking-wide">Về chúng tôi</h4>
            <ul className="space-y-1 text-xs">
              <li><Link href="/ve-chung-toi" className="block py-1 text-xs text-gray-600 hover:text-black no-underline">Về chúng tôi</Link></li>
              <li><Link href="/hop-tac" className="block py-1 text-xs text-gray-600 hover:text-black no-underline">Hợp tác với chúng tôi</Link></li>
              <li><Link href="/lien-he" className="block py-1 text-xs text-gray-600 hover:text-black no-underline">Liên hệ / Góp ý</Link></li>
              <li><Link href="/khuyen-mai" className="block py-1 text-xs text-gray-600 hover:text-black no-underline">Khuyến mãi</Link></li>
              <li><Link href="/tuyen-dung" className="block py-1 text-xs text-gray-600 hover:text-black no-underline">Tuyển dụng</Link></li>
            </ul>
          </div>

          {/* Column 2: Chính sách & điều khoản */}
          <div className="px-4 md:px-6">
            <h4 className="text-gray-900 font-semibold mb-3 uppercase text-xs tracking-wide">Chính sách &amp; điều khoản</h4>
            <ul className="space-y-1 text-xs">
              <li><Link href="/post/dieu-khoan-mua-hang" className="block py-1 text-xs text-gray-600 hover:text-black no-underline">Điều khoản mua hàng</Link></li>
              <li><Link href="/post/hinh-thuc-thanh-toan" className="block py-1 text-xs text-gray-600 hover:text-black no-underline">Hình thức thanh toán</Link></li>
              <li><Link href="/post/chinh-sach-tra-gop" className="block py-1 text-xs text-gray-600 hover:text-black no-underline">Chính sách trả góp</Link></li>
              <li><Link href="/post/chinh-sach-giao-hang" className="block py-1 text-xs text-gray-600 hover:text-black no-underline">Chính sách giao hàng</Link></li>
              <li><Link href="/post/chinh-sach-doi-tra" className="block py-1 text-xs text-gray-600 hover:text-black no-underline">Chính sách đổi trả</Link></li>
              <li><Link href="/post/chinh-sach-bao-hanh" className="block py-1 text-xs text-gray-600 hover:text-black no-underline">Chính sách bảo hành</Link></li>
              <li><Link href="/post/chinh-sach-bao-mat" className="block py-1 text-xs text-gray-600 hover:text-black no-underline">Chính sách bảo mật</Link></li>
            </ul>
          </div>

          {/* Column 3: Thông tin liên hệ */}
          <div className="px-4 md:px-6">
            <h4 className="text-gray-900 font-semibold mb-3 uppercase text-xs tracking-wide">Thông tin liên hệ</h4>
            <div className="text-xs text-gray-700 space-y-1">
              <div>
                <p className="font-medium text-white text-[11px] uppercase">Địa chỉ</p>
                <p>Trụ sở 1: Lô B39, KCN Phú Tài, P. Quy Nhơn Bắc, Gia Lai</p>
                <p>Trụ sở 2: 14-16-18-20, Đường 36, P. Bình Phú, TP.HCM</p>
              </div>
              <div>
                <p className="font-medium text-gray-900 text-[11px] uppercase">Hotline</p>
                <p className="text-amber-600 font-semibold">037 833 9009</p>
                <p>0934 794 477 • 0823 871 339</p>
              </div>
              <div>
                <p className="font-medium text-white text-[11px] uppercase">Email</p>
                <p>support@wecare.com.vn</p>
              </div>
              <div>
                <p className="font-medium text-white text-[11px] uppercase">Giờ làm việc</p>
                <p>- T2 - T7: 9h00 - 20h00</p>
                <p>- CN: 9h00 - 17h00</p>
              </div>
            </div>
          </div>

          {/* Column 4: Kết nối & thanh toán */}
          <div className="px-4 md:px-6">
            <h4 className="text-gray-900 font-semibold mb-3 uppercase text-xs tracking-wide">Kết nối với chúng tôi</h4>
            <div className="flex items-center gap-2 mb-3">
              <Link aria-label="Facebook" href="https://www.facebook.com/wecareyourproduct" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors no-underline">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12.07C22 6.48 17.52 2 11.93 2 6.34 2 1.86 6.48 1.86 12.07c0 4.99 3.65 9.13 8.43 9.93v-7.03H7.9v-2.9h2.39V9.41c0-2.36 1.4-3.66 3.55-3.66 1.03 0 2.1.18 2.1.18v2.31h-1.18c-1.16 0-1.52.72-1.52 1.46v1.75h2.59l-.41 2.9h-2.18V22c4.78-.8 8.43-4.94 8.43-9.93z"/></svg>
              </Link>
              <Link aria-label="Zalo" href="https://zalo.me/3642371097976835684" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors no-underline">
                <Image src={ZaloIcon} alt="Zalo" width={16} height={16} className="rounded-full" />
              </Link>
              <Link aria-label="TikTok" href="https://www.tiktok.com/@wecaresieuthicongnghiep?_t=ZS-8zYG0SMLRxQ&_r=1" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors no-underline">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 3.5c.7 1.6 2.1 2.8 3.8 3.2v3.1c-1.7 0-3.3-.6-4.6-1.6v6.8c0 3.6-2.9 6.5-6.5 6.5S2.7 18.6 2.7 15s2.9-6.5 6.5-6.5c.4 0 .7 0 1.1.1v3.2c-.3-.1-.7-.2-1.1-.2-1.8 0-3.3 1.5-3.3 3.3S7.4 18.2 9.2 18.2s3.3-1.5 3.3-3.3V2.5h4z"/></svg>
              </Link>
            </div>
            <div className="mb-2">
              <h5 className="text-white font-semibold text-xs mb-2">Đối tác &amp; thanh toán</h5>
              <div className="flex items-center gap-3 flex-wrap">
                {[
                  "Nhựa Bình Minh.png",
                  "Nhựa Hoa Sen.png",
                  "Song Long.png",
                  "Vĩnh Phát.png",
                ].map((name) => (
              <div key={name} className="h-12 w-24 flex items-center justify-center">
                    <img
                      src={`/thuong-hieu/${encodeURIComponent(name)}`}
                      alt={name}
                      className="h-10 object-contain"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom - orange bar */}
      <div className="mt-6">
        <div className="w-full bg-[#f15a24]">
          <div className="container-responsive py-2 text-center text-white">
            <div className="text-xs font-semibold">CÔNG TY TNHH WECARE</div>
            <div className="text-[11px] mt-1">GPKD số 0316172950 do Sở Kế hoạch Đầu tư TPHCM cấp ngày 28/02/2020</div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
