import React from 'react';
import './footer.css';

const Footer: React.FC = () => {
  return (
    <footer className="footer-widgets footer footer-2">
      <div className="container">
        <div className="row large-columns-4 mb-0">
          <div className="col pb-0 widget block_widget">
            <span className="widget-title">VỀ CHÚNG TÔI</span>
            <div className="is-divider small" />
            <div className="ux-menu stack stack-col justify-start ux-menu--divider-solid">
              <div className="ux-menu-link flex menu-item">
                <a className="ux-menu-link__link flex" href="/ve-chung-toi">
                  <span className="ux-menu-link__text">Về chúng tôi</span>
                </a>
              </div>
              <div className="ux-menu-link flex menu-item">
                <a className="ux-menu-link__link flex" href="/tieu-chi-ban-hang">
                  <span className="ux-menu-link__text">Tiêu chí bán hàng</span>
                </a>
              </div>
              <div className="ux-menu-link flex menu-item">
                <a className="ux-menu-link__link flex" href="/hop-tac">
                  <span className="ux-menu-link__text">Hợp tác với chúng tôi</span>
                </a>
              </div>
              <div className="ux-menu-link flex menu-item">
                <a className="ux-menu-link__link flex" href="/lien-he">
                  <span className="ux-menu-link__text">Liên hệ / Góp ý</span>
                </a>
              </div>
              <div className="ux-menu-link flex menu-item">
                <a className="ux-menu-link__link flex" href="/post?tag=khuyen-mai">
                  <span className="ux-menu-link__text">Khuyến mãi</span>
                </a>
              </div>
              <div className="ux-menu-link flex menu-item">
                <a className="ux-menu-link__link flex" href="/tuyen-dung">
                  <span className="ux-menu-link__text">Tuyển dụng</span>
                </a>
              </div>
            </div>
          </div>

          <div className="col pb-0 widget widget_nav_menu">
            <span className="widget-title">Chính sách &amp; Điều khoản</span>
            <div className="is-divider small" />
            <div className="menu-chinh-sach-container">
              <ul className="menu">
                <li className="menu-item"><a href="/post/dieu-khoan-mua-hang">Điều khoản mua hàng</a></li>
                <li className="menu-item"><a href="/post/hinh-thuc-thanh-toan">Hình thức thanh toán</a></li>
                <li className="menu-item"><a href="/post/chinh-sach-tra-gop">Chính sách trả góp</a></li>
                <li className="menu-item"><a href="/post/chinh-sach-giao-hang">Chính sách giao hàng</a></li>
                <li className="menu-item"><a href="/post/chinh-sach-doi-tra">Chính sách đổi trả, hoàn tiền</a></li>
                <li className="menu-item"><a href="/post/chinh-sach-bao-hanh">Chính sách bảo hành</a></li>
                <li className="menu-item"><a href="/chinh-sach-bao-mat">Chính sách bảo mật</a></li>
              </ul>
            </div>
          </div>

          <div className="col pb-0 widget block_widget contact-widget">
            <span className="widget-title">THÔNG TIN LIÊN HỆ</span>
            <div className="is-divider small" />
            <p className="footer-description">Cung cấp vật tư kim khí, thiết bị điện - nước, hóa chất công nghiệp,... phục vụ hiệu quả cho cửa hàng kinh doanh và các nhà máy sản xuất.</p>
            <ul className="contact-info">
              <li><strong>Trụ sở 1:</strong> Lô B39, Khu Công nghiệp Phú Tài, Phường Quy Nhơn Bắc, Tỉnh Gia Lai.</li>
              <li><strong>Trụ sở 2:</strong> 14-16-18-20, Đường 36, P. Bình Phú, TP.Hồ Chí Minh</li>
              <li><strong>Hotline:</strong> <span className="phone">037 833 9009 - 0934 794 477 - 0823 871 339</span></li>
              <li><strong>Email:</strong> <a href="mailto:support@wecare.com.vn">support@wecare.com.vn</a></li>
            </ul>
            <div className="soc-ico" />
          </div>

          <div className="col pb-0 widget block_widget">
            <span className="widget-title">KẾT NỐI VỚI CHÚNG TÔI</span>
            <div className="is-divider small" />
            <div className="social-row">
              <div className="flex items-center gap-3 mb-3">
                <a aria-label="Facebook" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors no-underline" href="https://www.facebook.com/wecareyourproduct">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M22 12.07C22 6.48 17.52 2 11.93 2 6.34 2 1.86 6.48 1.86 12.07c0 4.99 3.65 9.13 8.43 9.93v-7.03H7.9v-2.9h2.39V9.41c0-2.36 1.4-3.66 3.55-3.66 1.03 0 2.1.18 2.1.18v2.31h-1.18c-1.16 0-1.52.72-1.52 1.46v1.75h2.59l-.41 2.9h-2.18V22c4.78-.8 8.43-4.94 8.43-9.93z"></path></svg>
                </a>
                <a aria-label="Zalo" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors no-underline" href="https://zalo.me/3642371097976835684">
                  <img alt="Zalo" loading="lazy" width={20} height={20} decoding="async" className="rounded-full" src="/_next/static/media/Icon_of_Zalo.svg.4b3567f7.webp" style={{ color: 'transparent' }} />
                </a>
                <a aria-label="TikTok" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors no-underline" href="https://www.tiktok.com/@wecaresieuthicongnghiep?_t=ZS-8zYG0SMLRxQ&_r=1">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M16.5 3.5c.7 1.6 2.1 2.8 3.8 3.2v3.1c-1.7 0-3.3-.6-4.6-1.6v6.8c0 3.6-2.9 6.5-6.5 6.5S2.7 18.6 2.7 15s2.9-6.5 6.5-6.5c.4 0 .7 0 1.1.1v3.2c-.3-.1-.7-.2-1.1-.2-1.8 0-3.3 1.5-3.3 3.3S7.4 18.2 9.2 18.2s3.3-1.5 3.3-3.3V2.5h4z"></path></svg>
                </a>
              </div>

              <div className="payment-icons">
                <p><strong>PHƯƠNG THỨC THANH TOÁN</strong></p>
                <div className="payments">
                  <img src="https://vinasound.vn/wp-content/uploads/2023/01/TT-COD.jpg" alt="COD" />
                  <img src="https://vinasound.vn/wp-content/uploads/2023/01/VIETQR.jpg" alt="VietQR" />
                  <img src="https://vinasound.vn/wp-content/uploads/2023/01/VISA.jpg" alt="VISA" />
                  <img src="https://vinasound.vn/wp-content/uploads/2023/01/MASTERCARD.jpg" alt="Mastercard" />
                  <img src="https://vinasound.vn/wp-content/uploads/2023/01/TRAGOP.jpg" alt="Tragop" />
                </div>
              </div>

              <div className="cert-image">
                <a href="http://online.gov.vn/Home/WebDetails/64449" target="_blank" rel="noopener noreferrer nofollow">
                  <img src="https://vinasound.vn/wp-content/uploads/2020/03/logoSaleNoti.png" alt="cert" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container">
          <div className="footer-bottom-inner">
            <strong>CÔNG TY CỔ PHẦN WECARE</strong>
            <div className="company-note">GPKD số 0314709929 do sở Kế hoạch Đầu tư TPHCM cấp ngày 01/11/2017</div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
