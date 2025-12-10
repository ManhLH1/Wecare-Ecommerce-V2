import React, { useState } from 'react';
import axios from 'axios';

interface EvaluationFormProps {
  isOpen: boolean;
  onClose: () => void;
  chuongTrinhId: string;
  score: number;
  trainingData?: {
    _crdfd_danhsachkhoadaotao_value: string;
    crdfd_tenkhoahoc: string;
    crdfd_nguoihuongdan: string;
  };
}

const EvaluationForm: React.FC<EvaluationFormProps> = ({ isOpen, onClose, chuongTrinhId, score, trainingData }) => {
  const [formData, setFormData] = useState({
    _crdfd_danhsachkhoadaotao_value: trainingData?._crdfd_danhsachkhoadaotao_value || '',
    crdfd_tenkhoahoc: trainingData?.crdfd_tenkhoahoc || '',
    crdfd_nguoihuongdan: trainingData?.crdfd_nguoihuongdan || '',
    crdfd_giangvienchuanbivatochuctotkhong: '191920001',
    crdfd_giangvienconhiettinhkhong: '191920001',
    crdfd_giangvienkhuyenkhichthamgiakhong: '191920001',
    crdfd_giangvienthongthaonoidungkhong: '191920001',
    crdfd_giangvientrinhbaychuyennghiepkhong: '191920001',
    crdfd_giangvientraloithoaangcauhoikhong: '191920001',
    crdfd_nhanxetvegiangvien: '',
    crdfd_hoatongnhomphuhopkhong: '191920001',
    crdfd_noidungchuongtrinhcohoplykhong: '191920001',
    crdfd_thietbinghenhinonkhong: '191920001',
    crdfd_thanhphanlop: '191920001',
    crdfd_thoigianphanboukhong: '191920001',
    crdfd_tailieuayunoidungkhong: '191920001',
    crdfd_uthoigianthuctapkynangkhong: '191920001',
    crdfd_gopycaitienkhoahoc: '',
    crdfd_gopynoidungcanbosung: '',
    crdfd_noidungkhongthichlydo: '',
    crdfd_anhgiachungvechuongtrinh: '191920001',
    crdfd_anhgiachungvegiangvien: '191920001',
    score: score
  });

  const [currentSection, setCurrentSection] = useState<'giangvien' | 'chuongtrinh' | 'danhgia'>('giangvien');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateSection = (section: 'giangvien' | 'chuongtrinh' | 'danhgia'): boolean => {
    let isValid = true;
    const fieldsToValidate: { [key: string]: string[] } = {
      giangvien: [
        'crdfd_giangvienchuanbivatochuctotkhong',
        'crdfd_giangvienconhiettinhkhong',
        'crdfd_giangvienkhuyenkhichthamgiakhong',
        'crdfd_giangvienthongthaonoidungkhong',
        'crdfd_giangvientrinhbaychuyennghiepkhong',
        'crdfd_giangvientraloithoaangcauhoikhong',
        'crdfd_nhanxetvegiangvien'
      ],
      chuongtrinh: [
        'crdfd_hoatongnhomphuhopkhong',
        'crdfd_noidungchuongtrinhcohoplykhong',
        'crdfd_thietbinghenhinonkhong',
        'crdfd_thanhphanlop',
        'crdfd_thoigianphanboukhong',
        'crdfd_tailieuayunoidungkhong',
        'crdfd_uthoigianthuctapkynangkhong',
        'crdfd_gopycaitienkhoahoc',
        'crdfd_gopynoidungcanbosung',
        'crdfd_noidungkhongthichlydo'
      ],
      danhgia: [
        'crdfd_anhgiachungvechuongtrinh',
        'crdfd_anhgiachungvegiangvien'
      ]
    };

    fieldsToValidate[section].forEach(field => {
      if (!formData[field as keyof typeof formData]) {
        isValid = false;
      }
    });

    if (!isValid) {
      setError("Vui lòng điền đầy đủ thông tin đánh giá");
    } else {
      setError("");
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateSection('danhgia')) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await axios.post('/api/submitEvaluation', {
        ...formData,
        crdfd_danhsachkhoadaotao: chuongTrinhId,
        score: score
      });

      if (response.status === 200) {
        setSubmitSuccess(true);
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } catch (err) {
      setError("Có lỗi xảy ra khi gửi đánh giá. Vui lòng thử lại sau.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSectionChange = (nextSection: 'giangvien' | 'chuongtrinh' | 'danhgia') => {
    if (validateSection(currentSection)) {
      setCurrentSection(nextSection);
    }
  };

  const renderChoiceField = (
    label: string,
    name: string,
    value: string,
    options: { value: string; label: string }[]
  ) => (
    <div className="mb-4">
      <div className="text-sm text-gray-700 mb-2">
        {label}
        <span className="text-red-500 ml-1">*</span>
      </div>
      <div className="flex gap-6">
        {options.map(option => (
          <label key={option.value} className="inline-flex items-center">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={handleInputChange}
              className="form-radio h-4 w-4 text-blue-500 border-gray-300 focus:ring-blue-500"
              required
            />
            <span className="ml-2 text-sm text-gray-600">{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );

  const renderTextArea = (label: string, name: string, value: string) => (
    <div className="mb-4">
      <div className="text-sm text-gray-700 mb-2">
        {label}
        <span className="text-red-500 ml-1">*</span>
      </div>
      <textarea
        name={name}
        value={value}
        onChange={handleInputChange}
        className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
        rows={4}
        placeholder="Nhập đánh giá của bạn..."
        required
      />
    </div>
  );

  const renderSection = () => {
    switch (currentSection) {
      case 'giangvien':
        return (
          <div>
            <h3 className="text-base font-medium text-gray-800 mb-4">Đánh giá về giảng viên</h3>
            {renderChoiceField(
              "Giảng viên chuẩn bị và tổ chức tốt không?",
              "crdfd_giangvienchuanbivatochuctotkhong",
              formData.crdfd_giangvienchuanbivatochuctotkhong,
              [
                { value: "191920000", label: "Có" },
                { value: "191920001", label: "Phần nào" },
                { value: "191920002", label: "Không" }
              ]
            )}
            {renderChoiceField(
              "Giảng viên có nhiệt tình không?",
              "crdfd_giangvienconhiettinhkhong",
              formData.crdfd_giangvienconhiettinhkhong,
              [
                { value: "191920000", label: "Có" },
                { value: "191920001", label: "Phần nào" },
                { value: "191920002", label: "Không" }
              ]
            )}
            {renderChoiceField(
              "Giảng viên khuyến khích tham gia không?",
              "crdfd_giangvienkhuyenkhichthamgiakhong",
              formData.crdfd_giangvienkhuyenkhichthamgiakhong,
              [
                { value: "191920000", label: "Có" },
                { value: "191920001", label: "Phần nào" },
                { value: "191920002", label: "Không" }
              ]
            )}
            {renderChoiceField(
              "Giảng viên thông thạo nội dung không?",
              "crdfd_giangvienthongthaonoidungkhong",
              formData.crdfd_giangvienthongthaonoidungkhong,
              [
                { value: "191920000", label: "Có" },
                { value: "191920001", label: "Phần nào" },
                { value: "191920002", label: "Không" }
              ]
            )}
            {renderChoiceField(
              "Giảng viên trình bày chuyên nghiệp không?",
              "crdfd_giangvientrinhbaychuyennghiepkhong",
              formData.crdfd_giangvientrinhbaychuyennghiepkhong,
              [
                { value: "191920000", label: "Có" },
                { value: "191920001", label: "Phần nào" },
                { value: "191920002", label: "Không" }
              ]
            )}
            {renderChoiceField(
              "Giảng viên trả lời thỏa đáng câu hỏi không?",
              "crdfd_giangvientraloithoaangcauhoikhong",
              formData.crdfd_giangvientraloithoaangcauhoikhong,
              [
                { value: "191920000", label: "Có" },
                { value: "191920001", label: "Phần nào" },
                { value: "191920002", label: "Không" }
              ]
            )}
            {renderTextArea("Nhận xét về giảng viên", "crdfd_nhanxetvegiangvien", formData.crdfd_nhanxetvegiangvien)}
          </div>
        );
      case 'chuongtrinh':
        return (
          <div>
            <h3 className="text-base font-medium text-gray-800 mb-4">Đánh giá về chương trình</h3>
            {renderChoiceField(
              "Hoạt động nhóm phù hợp không?",
              "crdfd_hoatongnhomphuhopkhong",
              formData.crdfd_hoatongnhomphuhopkhong,
              [
                { value: "191920000", label: "Có" },
                { value: "191920001", label: "Phần nào" },
                { value: "191920002", label: "Không" },
                { value: "191920003", label: "Không liên quan" }
              ]
            )}
            {renderChoiceField(
              "Nội dung chương trình có hợp lý không?",
              "crdfd_noidungchuongtrinhcohoplykhong",
              formData.crdfd_noidungchuongtrinhcohoplykhong,
              [
                { value: "191920000", label: "Có" },
                { value: "191920001", label: "Không" }
              ]
            )}
            {renderChoiceField(
              "Thiết bị nghe nhìn ổn không?",
              "crdfd_thietbinghenhinonkhong",
              formData.crdfd_thietbinghenhinonkhong,
              [
                { value: "191920000", label: "Có" },
                { value: "191920001", label: "Phần nào" },
                { value: "191920002", label: "Không" },
                { value: "191920003", label: "Không liên quan" }
              ]
            )}
            {renderChoiceField(
              "Thành phần lớp",
              "crdfd_thanhphanlop",
              formData.crdfd_thanhphanlop,
              [
                { value: "191920000", label: "Đồng đều" },
                { value: "191920001", label: "Không đồng đều" }
              ]
            )}
            {renderChoiceField(
              "Thời gian phân bổ đủ không?",
              "crdfd_thoigianphanboukhong",
              formData.crdfd_thoigianphanboukhong,
              [
                { value: "191920000", label: "Có" },
                { value: "191920001", label: "Không" }
              ]
            )}
            {renderChoiceField(
              "Tài liệu đầy đủ nội dung không?",
              "crdfd_tailieuayunoidungkhong",
              formData.crdfd_tailieuayunoidungkhong,
              [
                { value: "191920000", label: "Có" },
                { value: "191920001", label: "Phần nào" },
                { value: "191920002", label: "Không" },
                { value: "191920003", label: "Không liên quan" }
              ]
            )}
            {renderChoiceField(
              "Đủ thời gian thực tập kỹ năng không?",
              "crdfd_uthoigianthuctapkynangkhong",
              formData.crdfd_uthoigianthuctapkynangkhong,
              [
                { value: "191920000", label: "Có" },
                { value: "191920001", label: "Không" },
                { value: "191920002", label: "Không liên quan" }
              ]
            )}
            {renderTextArea("Góp ý cải tiến khóa học", "crdfd_gopycaitienkhoahoc", formData.crdfd_gopycaitienkhoahoc)}
            {renderTextArea("Góp ý nội dung cần bổ sung", "crdfd_gopynoidungcanbosung", formData.crdfd_gopynoidungcanbosung)}
            {renderTextArea("Nội dung không thích (lý do)", "crdfd_noidungkhongthichlydo", formData.crdfd_noidungkhongthichlydo)}
          </div>
        );
      case 'danhgia':
        return (
          <div>
            <h3 className="text-base font-medium text-gray-800 mb-4">Đánh giá chung</h3>
            {renderChoiceField(
              "Đánh giá chung về chương trình",
              "crdfd_anhgiachungvechuongtrinh",
              formData.crdfd_anhgiachungvechuongtrinh,
              [
                { value: "191920000", label: "Rất hài lòng" },
                { value: "191920001", label: "Hài lòng" },
                { value: "191920002", label: "Bình thường" },
                { value: "191920003", label: "Không hài lòng" },
                { value: "191920004", label: "Rất không hài lòng" }
              ]
            )}
            {renderChoiceField(
              "Đánh giá chung về giảng viên",
              "crdfd_anhgiachungvegiangvien",
              formData.crdfd_anhgiachungvegiangvien,
              [
                { value: "191920000", label: "Xuất sắc" },
                { value: "191920001", label: "Tốt" },
                { value: "191920002", label: "Khá" },
                { value: "191920003", label: "Trung bình" }
              ]
            )}
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-4 pb-20 overflow-y-auto">
      <div className="bg-white rounded-lg w-full max-w-3xl mx-4 my-auto">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-medium">Đánh giá khóa học</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {submitSuccess ? (
          <div className="p-8 text-center">
            <div className="relative">
              {/* Outer circle animation */}
              <div className="absolute inset-0 animate-ping rounded-full bg-green-100 opacity-25"></div>
              {/* Success checkmark container */}
              <div className="relative w-24 h-24 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
                <svg className="w-12 h-12 text-green-500 animate-scale" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M5 13l4 4L19 7"
                    className="animate-draw"
                  />
                </svg>
              </div>
              {/* Confetti effect */}
              <div className="absolute -top-4 left-1/2 w-2 h-2 bg-yellow-400 rounded-full animate-confetti-1"></div>
              <div className="absolute -top-4 left-1/2 w-2 h-2 bg-blue-400 rounded-full animate-confetti-2"></div>
              <div className="absolute -top-4 left-1/2 w-2 h-2 bg-red-400 rounded-full animate-confetti-3"></div>
              <div className="absolute -top-4 left-1/2 w-2 h-2 bg-green-400 rounded-full animate-confetti-4"></div>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2 animate-fade-in">
              Chúc mừng bạn đã hoàn thành!
            </h3>
            <p className="text-gray-600 animate-fade-in-delay">
              Cảm ơn bạn đã dành thời gian đánh giá. 
              <br />Phản hồi của bạn sẽ giúp chúng tôi cải thiện chất lượng khóa học.
            </p>
          </div>
        ) : (
          <>
            <div className="border-b">
              <div className="flex">
                <button
                  onClick={() => handleSectionChange('giangvien')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 ${
                    currentSection === 'giangvien'
                      ? 'text-blue-500 border-blue-500'
                      : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Giảng viên
                </button>
                <button
                  onClick={() => handleSectionChange('chuongtrinh')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 ${
                    currentSection === 'chuongtrinh'
                      ? 'text-blue-500 border-blue-500'
                      : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Chương trình
                </button>
                <button
                  onClick={() => handleSectionChange('danhgia')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 ${
                    currentSection === 'danhgia'
                      ? 'text-blue-500 border-blue-500'
                      : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Đánh giá chung
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-4">
                {renderSection()}
              </div>

              {error && (
                <div className="mx-4 mb-4 p-2 bg-red-50 text-red-500 text-sm rounded">
                  {error}
                </div>
              )}

              <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Hủy
                </button>
                {currentSection !== 'danhgia' ? (
                  <button
                    type="button"
                    onClick={() => handleSectionChange(currentSection === 'giangvien' ? 'chuongtrinh' : 'danhgia')}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600"
                  >
                    Tiếp tục
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 ${
                      isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isSubmitting ? 'Đang gửi...' : 'Gửi đánh giá'}
                  </button>
                )}
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

const styles = `
  @keyframes draw {
    from {
      stroke-dashoffset: 100;
    }
    to {
      stroke-dashoffset: 0;
    }
  }

  @keyframes scale {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.1);
    }
  }

  @keyframes confetti {
    0% {
      transform: translateY(0) translateX(0) rotate(0);
      opacity: 1;
    }
    100% {
      transform: translateY(-100px) translateX(100px) rotate(720deg);
      opacity: 0;
    }
  }

  .animate-draw {
    stroke-dasharray: 100;
    animation: draw 1s ease forwards;
  }

  .animate-scale {
    animation: scale 2s ease-in-out infinite;
  }

  .animate-fade-in {
    opacity: 0;
    animation: fadeIn 0.5s ease-out forwards;
  }

  .animate-fade-in-delay {
    opacity: 0;
    animation: fadeIn 0.5s ease-out 0.3s forwards;
  }

  .animate-confetti-1 {
    animation: confetti 1s ease-out forwards;
  }

  .animate-confetti-2 {
    animation: confetti 1.2s ease-out 0.2s forwards;
  }

  .animate-confetti-3 {
    animation: confetti 1.1s ease-out 0.4s forwards;
  }

  .animate-confetti-4 {
    animation: confetti 1.3s ease-out 0.6s forwards;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

export default EvaluationForm; 