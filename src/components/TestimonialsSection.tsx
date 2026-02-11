import React from "react";
import Link from "next/link";

const TestimonialCard: React.FC<{
  title: string;
  text: string;
  author: string;
  rating?: number;
}> = ({ title, text, author, rating = 5 }) => {
  return (
    <div className="bg-white p-6 shadow-sm border border-gray-100">
      <div className="flex justify-center mb-3">
        <div className="text-amber-400 text-xl">
          {"★".repeat(Math.max(0, Math.min(5, rating)))}{" "}
          {rating < 5 ? "☆".repeat(5 - rating) : ""}
        </div>
      </div>
      <h4 className="text-lg font-extrabold text-gray-800 text-center italic mb-3">{title}</h4>
      <p className="text-sm text-gray-600 leading-relaxed text-center mb-4">{text}</p>
      <div className="text-sm text-gray-800 font-semibold text-center">{author}</div>
    </div>
  );
};

const BenefitsItem: React.FC<{ iconSrc: string; title: string; desc?: string }> = ({
  iconSrc,
  title,
  desc,
}) => {
  return (
    <div className="flex items-center gap-5 group cursor-default transition-all duration-300 hover:translate-x-1">
      <div className="w-20 h-20 flex-shrink-0 bg-white/40 rounded-full flex items-center justify-center p-0 transition-all duration-500 group-hover:bg-white/60 group-hover:scale-105">
        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg p-3 transition-transform duration-500 group-hover:rotate-3">
          <img
            src={iconSrc}
            alt={title}
            className="w-full h-full object-contain"
          />
        </div>
      </div>
      <div>
        <div className="font-extrabold text-gray-900 text-lg leading-tight uppercase tracking-tight group-hover:text-amber-900 transition-colors">{title}</div>
        {desc && <div className="text-sm text-gray-800 font-bold opacity-90 mt-0.5">{desc}</div>}
      </div>
    </div>
  );
};

const TestimonialsSection: React.FC = () => {
  return (
    <section className="w-full bg-gray-100 pt-0 pb-0" style={{ minHeight: '570px', height: 'auto' }}>
      <div className="w-full max-w-[2560px] mx-auto px-4">
        <div className="relative md:px-12">
          <h3 className="text-center text-2xl font-semibold text-gray-700 mb-8">
            Khách hàng nói gì về WECARE
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <TestimonialCard
              title="Giao hàng rất nhanh"
              text="Đặt hàng buổi sáng, hẹn chiều giao dễ đi công trình. Vừa ăn trưa xong, hàng giao luôn tới công trình. Rất nhanh chóng, tiện lợi cho công việc."
              author="Anh Duy Tân / Chủ xưởng mộc"
            />
            <TestimonialCard
              title="Tư vấn nhiệt tình"
              text="Mua con máy nhưng hết hàng. Chat Zalo hỏi tư vấn hỏi cả chục con máy nhưng nhân viên luôn nhiệt tình trả lời, gợi ý các mặt hàng tương tự."
              author="Anh Lợi / Bến Tre"
            />
            <TestimonialCard
              title="Dịch vụ rất yên tâm!"
              text="Vừa đặt máy khoan bê tông, chạy được nửa buổi tự nhiên ngưng, alo lên cty vài tiếng sau có nhân viên xuống kiểm tra, đổi luôn máy mới."
              author="Chị Thoa / Quận 9"
              rating={5}
            />
            <TestimonialCard
              title="Giá quá tốt"
              text="Mình hay đặt mua về bán lại cho bà con nông dân. Giá cả phải chăng, chiết khấu tốt, lâu lâu còn có quà tặng. Ủng hộ 5 sao."
              author="Anh Thắng / Sóc Trăng"
            />
          </div>

          {/*
          Mobile: compact horizontal 2-row scroller for benefits
        */}
          <div className="block md:hidden mb-4">
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 max-w-2xl mx-auto">
              {[
                { icon: '/images/icon-delivery.png', title: 'Hàng chính hãng – CO/CQ đầy đủ', desc: 'Xuất hóa đơn, chứng từ rõ ràng cho dự án & nhà máy.' },
                { icon: '/images/icon-price.png', title: 'Giá tốt cho doanh nghiệp', desc: 'Chiết khấu theo số lượng / báo giá nhanh theo nhu cầu.' },
                { icon: '/images/icon-delivery.png', title: 'Giao nhanh – đúng hẹn', desc: 'Hỗ trợ giao gấp, theo lịch công trình, theo ca.' },
                { icon: '/images/icon-products.png', title: 'Kho đa dạng – sẵn hàng', desc: 'Vật tư kim khí, điện-nước, hóa chất công nghiệp... nhiều lựa chọn.' },
              ].map((row, i, arr) => (
                <div key={i} className={`flex items-start gap-4 py-4 px-4 ${i < arr.length - 1 ? 'border-b border-dashed border-gray-200' : ''}`}>
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center shadow-inner">
                      <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
                        <img src={row.icon} alt={row.title} className="w-6 h-6 object-contain" />
                      </div>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-lg font-extrabold text-slate-800 leading-tight">
                      {(() => {
                        const sep = row.title.includes(' – ') ? ' – ' : (row.title.includes(' - ') ? ' - ' : null);
                        if (sep) {
                          const parts = row.title.split(sep);
                          // highlight entire RHS when separator present
                          return (<><span className="text-slate-800">{parts[0]} </span><span className="text-orange-600">{sep.trim()} {parts.slice(1).join(sep)}</span></>);
                        }
                        const words = row.title.split(' ');
                        if (words.length === 1) return <span className="text-orange-600">{row.title}</span>;
                        // If title is long (4+ words), highlight the last two words (e.g. "doanh nghiệp")
                        if (words.length >= 4) {
                          const tail = words.slice(-2).join(' ');
                          const head = words.slice(0, -2).join(' ');
                          return (<><span className="text-slate-800">{head} </span><span className="text-orange-600">{tail}</span></>);
                        }
                        // Otherwise highlight only the last word
                        const last = words.pop();
                        return (<><span className="text-slate-800">{words.join(' ')} </span><span className="text-orange-600">{last}</span></>);
                      })()}
                    </div>
                    <div className="text-sm text-gray-600 mt-2 leading-relaxed">{row.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/*
          Desktop/tablet: original benefits grid with richer styles
        */}
          <div className="hidden md:block">
            <div className="bg-amber-400 rounded-xl p-8 shadow-md">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-center px-2">
                <BenefitsItem
                  iconSrc="/images/icon-delivery.png"
                  title="Giao siêu tốc"
                  desc="Freeship đơn trên 2 triệu"
                />
                <BenefitsItem
                  iconSrc="/images/icon-price.png"
                  title="Giá siêu tốt"
                  desc="Cam kết tốt nhất thị trường"
                />
                <BenefitsItem
                  iconSrc="/images/icon-warranty.png"
                  title="Bảo hành chính hãng"
                  desc="Bảo hành theo chính sách hãng"
                />
                <BenefitsItem
                  iconSrc="/images/icon-products.png"
                  title="Đa dạng hàng hóa"
                  desc="Hơn 10.000 sản phẩm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;


