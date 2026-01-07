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

const BenefitsItem: React.FC<{ icon: React.ReactNode; title: string; desc?: string }> = ({
  icon,
  title,
  desc,
}) => {
  return (
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 flex items-center justify-center text-2xl">{icon}</div>
      <div>
        <div className="font-bold text-gray-900">{title}</div>
        {desc && <div className="text-sm text-gray-800/80">{desc}</div>}
      </div>
    </div>
  );
};

const TestimonialsSection: React.FC = () => {
  return (
    <section className="w-full bg-gray-100 py-10">
      <div className="relative px-[5px] md:px-[50px]">
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
            rating={4}
          />
          <TestimonialCard
            title="Giá quá tốt"
            text="Mình hay đặt mua về bán lại cho bà con nông dân. Giá cả phải chăng, chiết khấu tốt, lâu lâu còn có quà tặng. Ủng hộ 5 sao."
            author="Anh Thắng / Sóc Trăng"
          />
        </div>

        <div className="bg-amber-400 rounded p-6">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
              <BenefitsItem
                icon={<span>🚚</span>}
                title="Giao siêu tốc"
                desc="Freeship đơn trên 2 triệu"
              />
              <BenefitsItem
                icon={<span>💰</span>}
                title="Giá siêu tốt"
                desc="Cam kết tốt nhất thị trường"
              />
              <BenefitsItem
                icon={<span>✅</span>}
                title="Bảo hành chính hãng"
                desc="Bảo hành theo chính sách hãng"
              />
              <BenefitsItem
                icon={<span>📦</span>}
                title="Đa dạng hàng hóa"
                desc="Hơn 10.000 sản phẩm"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;


