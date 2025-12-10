"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "axios";
import Toolbar from "@/components/toolbar";
import Footer from "@/components/footer";
import EvaluationForm from "@/components/EvaluationForm";

interface CauHoi {
  _crdfd_chuongtrinhaotao_value: string;
  crdfd_cauhoi: string;
  crdfd_apana: string;
  crdfd_apanb: string;
  crdfd_apanc: string;
  crdfd_apand: string;
  crdfd_apanung: string;
  originalAnswer: string;
}

export default function TestPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [questions, setQuestions] = useState<CauHoi[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [isUpdatingScore, setIsUpdatingScore] = useState(false);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [trainingData, setTrainingData] = useState<{
    _crdfd_danhsachkhoadaotao_value: string;
    crdfd_tenkhoahoc: string;
    crdfd_nguoihuongdan: string;
  } | null>(null);

  const chuongTrinhId = searchParams?.get("chuongTrinhId") || "";
  const hocVienId = searchParams?.get("hocVienId") || "";

  useEffect(() => {
    const fetchQuestions = async () => {
      if (!chuongTrinhId) {
        setError("Không tìm thấy thông tin chương trình đào tạo");
        setLoading(false);
        return;
      }

      try {
        const [questionsRes, trainingRes] = await Promise.all([
          axios.get(`/api/getDanhSachCauHoi?chuongTrinhId=${chuongTrinhId}`),
          axios.get(`/api/getDanhSachHocVien?employeeId=${localStorage.getItem('trainingUser') ? JSON.parse(localStorage.getItem('trainingUser')!).employeeId : ''}`)
        ]);

        if (questionsRes.data && questionsRes.data.length > 0) {
          setQuestions(questionsRes.data);
        } else {
          setError("Không tìm thấy câu hỏi cho chương trình này");
        }

        // Find the matching training course
        const matchingCourse = trainingRes.data.find((course: any) => 
          course.ketQuaDaoTao.some((ketqua: any) => 
            ketqua.crdfd_maketqua === hocVienId
          )
        );

        if (matchingCourse) {
          setTrainingData({
            _crdfd_danhsachkhoadaotao_value: matchingCourse.crdfd_danhsachkhoaaotaoid,
            crdfd_tenkhoahoc: matchingCourse.tenKhoaHoc.crdfd_tenkhoahoc,
            crdfd_nguoihuongdan: matchingCourse.crdfd_nguoihuongdan
          });
        }
      } catch (err: any) {
        setError(err?.response?.data?.error || "Lỗi khi tải câu hỏi");
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [chuongTrinhId, hocVienId]);

  const handleAnswerSelect = (answer: string) => {
    const answerNumber = answer === 'A' ? '1' : 
                        answer === 'B' ? '2' : 
                        answer === 'C' ? '3' : '4';
    setSelectedAnswer(answer);
    setAnswers(prev => ({
      ...prev,
      [currentQuestion]: answerNumber
    }));
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setSelectedAnswer(answers[currentQuestion + 1] || null);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
      setSelectedAnswer(answers[currentQuestion - 1] || null);
    }
  };

  const handleSubmit = async () => {
    const correctAnswers = questions.reduce((count, question, index) => {
      const userAnswer = answers[index];
      const correctAnswer = question.crdfd_apanung;
      return count + (userAnswer === correctAnswer ? 1 : 0);
    }, 0);
    
    const finalScore = (correctAnswers / questions.length) * 100;
    
    setScore(finalScore);
    setIsSubmitted(true);

    if (!hocVienId) {
      console.error("Missing hocVienId - cannot update score");
      return;
    } else {
      setIsUpdatingScore(true);
      try {
        const response = await axios.patch('/api/updateDiemHocVien', {
          danhSachKhoaDaoTaoId: chuongTrinhId.trim(),
          score: finalScore
        });

        // Show evaluation form if score >= 80%
        if (finalScore >= 80) {
          setShowEvaluation(true);
        }
      } catch (error) {
        console.error("Error updating score:", error);
      } finally {
        setIsUpdatingScore(false);
      }
    }
  };

  // Thêm useEffect để log khi component mount
  useEffect(() => {
  }, [chuongTrinhId, hocVienId, searchParams]);

  if (loading) {
    return (
      <>
        <Toolbar />
        <main className="flex justify-center items-center min-h-[80vh] bg-gray-50">
          <div className="text-center p-8 bg-white rounded-xl shadow-lg">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-sky-600 border-t-transparent mx-auto"></div>
            <p className="mt-6 text-lg font-medium text-gray-700">Đang tải câu hỏi...</p>
            <p className="mt-2 text-sm text-gray-500">Vui lòng đợi trong giây lát</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Toolbar />
        <main className="flex justify-center items-center min-h-[80vh] bg-gray-50">
          <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-lg font-medium text-red-600 mb-4">{error}</p>
            <button
              onClick={() => router.back()}
              className="px-6 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-all duration-200 transform hover:scale-105 shadow-md"
            >
              Quay lại
            </button>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (isSubmitted) {
    return (
      <>
        <Toolbar />
        <main className="container mx-auto px-4 py-6 md:py-8 bg-gray-50 min-h-[calc(100vh-8rem)]">
          <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-4 md:p-6 lg:p-8">
            <div className="text-center mb-8 md:mb-10">
              <div className="relative inline-block">
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center mx-auto mb-4 shadow-md">
                  {(() => {
                    let percent = score;
                    if (percent === null || typeof percent !== 'number' || isNaN(percent)) {
                      const correctAnswers = questions.reduce((count, question, index) => {
                        const userAnswer = answers[index];
                        const correctAnswer = question.crdfd_apanung;
                        return count + (userAnswer === correctAnswer ? 1 : 0);
                      }, 0);
                      percent = questions.length > 0 ? (correctAnswers / questions.length) * 100 : 0;
                    }
                    const colorClass = percent >= 80 ? 'text-green-300' : 'text-orange-200';
                    return (
                      <p className={`text-3xl md:text-4xl font-bold tracking-widest text-center select-none ${colorClass}`} style={{letterSpacing: '0.05em'}}>
                        {percent.toFixed(1) + '%'}
                      </p>
                    );
                  })()}
                </div>
                {isUpdatingScore && (
                  <div className="absolute -top-1 -right-1 bg-white rounded-full p-1.5 shadow-sm">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-sky-600 border-t-transparent"></div>
                  </div>
                )}
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-3">Kết quả bài test</h2>
              <p className={`text-base md:text-lg font-medium mb-2 ${score && score >= 80 ? 'text-green-600' : 'text-orange-600'}`}>
                {score && score >= 80 ? "🎉 Chúc mừng bạn đã đạt yêu cầu!" : "💪 Bạn cần cố gắng thêm!"}
              </p>
              <p className="text-sm md:text-base text-gray-600">
                Số câu đúng: <span className="font-semibold">{Math.round((score || 0) * questions.length / 100)}/{questions.length}</span> câu
              </p>
              <p className="text-sm md:text-base text-gray-600 mt-1">
                Yêu cầu đạt: <span className="font-semibold">≥ 80%</span>
              </p>
              {score && score >= 80 ? (
                <p className="text-sm md:text-base text-green-600 mt-2">
                  Bạn đã đạt {score.toFixed(1)}% - Vượt qua yêu cầu tối thiểu 80%
                </p>
              ) : (
                <p className="text-sm md:text-base text-orange-600 mt-2">
                  Bạn đạt {score?.toFixed(1)}% - Chưa đạt yêu cầu tối thiểu 80%
                </p>
              )}
            </div>

            <div className="space-y-3 md:space-y-4">
              {questions.map((question, index) => {
                const userAnswer = answers[index];
                const isCorrect = userAnswer === question.crdfd_apanung;
                const answerMap = {
                  '1': 'A',
                  '2': 'B',
                  '3': 'C',
                  '4': 'D'
                };
                const userAnswerLetter = answerMap[userAnswer as keyof typeof answerMap] || '-';
                const correctAnswerLetter = answerMap[question.crdfd_apanung as keyof typeof answerMap] || '-';

                return (
                  <div 
                    key={index}
                    className={`p-3 md:p-4 rounded-lg border-2 transition-all duration-200 ${
                      isCorrect 
                        ? 'border-green-200 bg-green-50 hover:bg-green-100' 
                        : 'border-red-200 bg-red-50 hover:bg-red-100'
                    }`}
                  >
                    <div className="flex items-start gap-2 mb-3">
                      <span className="flex-shrink-0 w-6 h-6 md:w-7 md:h-7 rounded-full bg-white flex items-center justify-center text-sm font-semibold shadow-sm">
                        {index + 1}
                      </span>
                      <p className="flex-1 text-sm md:text-base">{question.crdfd_cauhoi}</p>
                    </div>
                    <div className="ml-8 md:ml-9 space-y-2">
                      <div className="grid md:grid-cols-2 gap-3">
                        <div className="bg-white rounded-lg p-2 md:p-3 shadow-sm">
                          <p className="text-xs md:text-sm font-medium text-gray-500 mb-1">Đáp án của bạn:</p>
                          <p className={`text-sm md:text-base font-medium ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                            {userAnswerLetter}. {question[`crdfd_apan${userAnswerLetter.toLowerCase()}` as keyof CauHoi]}
                          </p>
                        </div>
                        {!isCorrect && (
                          <div className="bg-white rounded-lg p-2 md:p-3 shadow-sm">
                            <p className="text-xs md:text-sm font-medium text-gray-500 mb-1">Đáp án đúng:</p>
                            <p className="text-sm md:text-base font-medium text-green-600">
                              {correctAnswerLetter}. {question[`crdfd_apan${correctAnswerLetter.toLowerCase()}` as keyof CauHoi]}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 md:mt-8 text-center">
              <button
                onClick={() => router.back()}
                className="px-5 py-2.5 md:px-6 md:py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-all duration-200 transform hover:scale-105 shadow-sm text-sm md:text-base font-medium"
              >
                Quay lại
              </button>
            </div>
          </div>
        </main>
        <Footer />
        {showEvaluation && (
          <EvaluationForm
            isOpen={showEvaluation}
            onClose={() => setShowEvaluation(false)}
            chuongTrinhId={chuongTrinhId}
            score={score || 0}
            trainingData={trainingData || undefined}
          />
        )}
      </>
    );
  }

  return (
    <>
      <Toolbar />
      <main className="container mx-auto px-4 py-6 md:py-8 bg-gray-50 min-h-[calc(100vh-8rem)]">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-4 md:p-6 lg:p-8">
          <div className="mb-4 md:mb-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-3">
              <div>
                <h2 className="text-lg md:text-xl font-bold text-gray-800">Câu hỏi {currentQuestion + 1}/{questions.length}</h2>
                <p className="text-xs md:text-sm text-gray-500 mt-0.5">Hoàn thành bài test để đánh giá kiến thức của bạn</p>
              </div>
              <div className="bg-sky-50 px-3 py-1.5 rounded-lg self-start sm:self-auto">
                <p className="text-xs md:text-sm font-medium text-sky-700">
                  Đã trả lời: <span className="text-sky-900">{Object.keys(answers).length}/{questions.length}</span>
                </p>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 md:h-2.5">
              <div
                className="bg-gradient-to-r from-sky-500 to-sky-600 h-2 md:h-2.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="mb-6 md:mb-8">
            <div className="bg-gray-50 rounded-lg p-3 md:p-4 mb-4">
              <p className="text-base md:text-lg font-medium text-gray-800 leading-relaxed">{questions[currentQuestion]?.crdfd_cauhoi}</p>
            </div>
            <div className="grid gap-2 md:gap-3">
              {['A', 'B', 'C', 'D'].map((option) => {
                const answerKey = `crdfd_apan${option.toLowerCase()}` as keyof CauHoi;
                const answer = questions[currentQuestion]?.[answerKey];
                if (!answer) return null;

                return (
                  <button
                    key={option}
                    onClick={() => handleAnswerSelect(option)}
                    className={`w-full text-left p-3 md:p-4 rounded-lg border-2 transition-all duration-200 ${
                      selectedAnswer === option
                        ? 'border-sky-600 bg-sky-50 shadow-sm transform scale-[1.01]'
                        : 'border-gray-200 hover:border-sky-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`flex-shrink-0 w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-sm md:text-base font-medium transition-colors ${
                        selectedAnswer === option
                          ? 'bg-sky-600 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {option}
                      </span>
                      <span className="text-sm md:text-base text-gray-700 leading-relaxed">{answer}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <button
              onClick={handlePrevious}
              disabled={currentQuestion === 0}
              className={`px-4 py-2 md:px-5 md:py-2.5 rounded-lg transition-all duration-200 flex items-center text-sm md:text-base ${
                currentQuestion === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'
              }`}
            >
              <svg className="w-4 h-4 md:w-5 md:h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              Câu trước
            </button>
            {currentQuestion < questions.length - 1 ? (
              <button
                onClick={handleNext}
                className="px-5 py-2.5 md:px-6 md:py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-all duration-200 transform hover:scale-105 shadow-sm flex items-center text-sm md:text-base"
              >
                Câu tiếp
                <svg className="w-4 h-4 md:w-5 md:h-5 ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={Object.keys(answers).length !== questions.length}
                className={`px-5 py-2.5 md:px-6 md:py-3 rounded-lg transition-all duration-200 flex items-center text-sm md:text-base ${
                  Object.keys(answers).length !== questions.length
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700 hover:shadow-sm transform hover:scale-105'
                }`}
              >
                Nộp bài
                <svg className="w-4 h-4 md:w-5 md:h-5 ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
} 