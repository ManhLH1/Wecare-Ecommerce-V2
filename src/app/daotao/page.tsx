"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import Toolbar from "@/components/toolbar";
import Footer from "@/components/footer";
import Image from "next/image";
import LogoSvg from "@/assets/img/Logo-Wecare.png";
import dayjs from "dayjs";
import { FaExternalLinkAlt, FaClipboardList } from "react-icons/fa";
import TrainingLoginForm from "../../../components/TrainingLoginForm";
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import Link from "next/link";

interface ChuongTrinhDaoTao {
  cr1bb_noidungaotao: string;
  cr1bb_ngaybatau: string;
  cr1bb_ngayketthuc: string;
  cr1bb_tongthoigiangio: string;
  cr1bb_hanchotnopbai: string;
  _cr1bb_nguoihuongdan_value: string;
  cr1bb_hinhthuc: string;
  cr1bb_linkonline: string;
  cr1bb_linknoidunghuongdan: string;
  cr1bb_trangthai: string;
  cr1bb_hrxacnhan: string;
  cr1bb_nguoihuongdan: string;
  _cr1bb_tenhrxacnhan_value: string;
  cr1bb_ngayhrxacnhan: string;
  crdfd_name: string;
}

interface HocVien {
  _crdfd_chuongtrinhaotao_value: string;
  crdfd_hanchotnopbai: string;
  crdfd_danhsachhocvienid: string;
  crdfd_name: string;
  crdfd_mannhanvien: string;
  crdfd_ngayhoanthanh: string;
  crdfd_nguoihuongdan: string;
  statecode: number;
  crdfd_danhgia: string;
  crdfd_ahethan: string;
  _crdfd_nhanvien_value: string;
  chuongTrinhDaoTao: ChuongTrinhDaoTao | null;
}

interface KetQuaDaoTao {
  crdfd_ketqua: number;
  crdfd_sodiem: number | null;
  crdfd_tenkhoahoc: string;
  crdfd_ngaydangky: string;
  crdfd_ngaynopbai: string | null;
  crdfd_maketqua: string;
  statecode: number;
  statuscode: number;
}

interface TenKhoaHoc {
  crdfd_makhoahoc: string;
  crdfd_muctieuaotao: string;
  crdfd_tenkhoahoc: string;
  crdfd_noidungaotao: string;
}

interface TrainingCourse {
  crdfd_madanhsachkhoahoc: string;
  crdfd_makhoahoc: string;
  crdfd_nguoihuongdan: string;
  crdfd_muctieuaotao: string;
  crdfd_tongthoigiangio: number;
  crdfd_chiphiuoctinh: number;
  crdfd_trangthaikhoahoc: number;
  crdfd_oituong: string;
  crdfd_linkbaigiang: string | null;
  crdfd_danhsachkhoaaotaoid: string;
  ketQuaDaoTao: KetQuaDaoTao[];
  tenKhoaHoc: TenKhoaHoc;
}

export default function DaoTaoPage() {
  const router = useRouter();
  const [trainingCourses, setTrainingCourses] = useState<TrainingCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState<{email?: string, phone?: string, employeeId?: string} | null>(null);

  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      try {
        // Kiểm tra đăng nhập
        const trainingUser = localStorage.getItem('trainingUser');
        if (!trainingUser) {
          setIsLoggedIn(false);
          setLoading(false);
          setUserInfo(null);
          return;
        }

        setIsLoggedIn(true);
        // Nếu đã đăng nhập thì fetch data với token
        const userData = JSON.parse(trainingUser);
        setUserInfo({ 
          email: userData.email, 
          phone: userData.phone,
          employeeId: userData.employeeId 
        });

        if (!userData.employeeId) {
          setError("Không tìm thấy thông tin nhân viên");
          setLoading(false);
          return;
        }

        const res = await axios.get(`/api/getDanhSachHocVien?employeeId=${userData.employeeId}`);
        setTrainingCourses(res.data);
      } catch (err: any) { 
        console.error("Error fetching data:", err);
        if (err?.response?.status === 401) {
          localStorage.removeItem('trainingUser');
          setIsLoggedIn(false);
          setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        } else {
          setError(err?.response?.data?.error || "Lỗi khi lấy dữ liệu");
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndFetchData();

    // Lắng nghe sự kiện storage để cập nhật khi đăng nhập/đăng xuất ở tab khác
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'trainingUser') {
        if (e.newValue) {
          setIsLoggedIn(true);
          checkAuthAndFetchData();
        } else {
          setIsLoggedIn(false);
          setTrainingCourses([]);
          setError("");
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Mapping trạng thái, hình thức, HR xác nhận
  const trangThaiMap: Record<string, string> = {
    "Đã duyệt": "Đã duyệt",
    // Thêm các trạng thái khác nếu có
  };
  const hinhThucMap: Record<string, string> = {
    "283640001": "Online",
    // Thêm các hình thức khác nếu có
  };

  const danhGiaMap: Record<string, string> = {
    "283640001": "Hoàn thành",
    "283640002": "Chưa hoàn thành",
    // Thêm các đánh giá khác nếu có
  };

  const getKetQuaLabel = (ketqua: number) => {
    switch (ketqua) {
      case 191920000:
        return "Đạt";
      case 191920001:
        return "Không đạt";
      default:
        return "Chưa có kết quả";
    }
  };

  const getTrangThaiKhoaHocLabel = (trangthai: number) => {
    switch (trangthai) {
      case 191920001:
        return "Đang diễn ra";
      case 191920002:
        return "Đã kết thúc";
      default:
        return "Chưa bắt đầu";
    }
  };

  return (
    <>
      <Toolbar />
      <section className="bg-gradient-to-r from-sky-600 to-sky-800 text-white py-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent"></div>
        <div className="container mx-auto px-4 relative">
          <div className="flex items-center justify-center space-x-6 mb-6">
            {/* Logo */}
            <Link href="/" className="flex items-center bg-white/10 backdrop-blur-sm px-6 py-3 rounded-2xl border border-white/20 no-underline">
              <Image
                src={LogoSvg}
                alt="Wecare Logo"
                width={40}
                height={40}
                className="object-contain transition-transform duration-300 hover:scale-105"
              />
              <h6 className="text-white pl-3 text-2xl tracking-wider font-extrabold mb-0">
                WECARE
              </h6>
            </Link>
            <div className="h-8 w-px bg-white/30"></div>
            <h1 className="text-3xl font-bold m-0 bg-gradient-to-r from-white to-white/90 bg-clip-text text-transparent">
              Đào tạo
            </h1>
          </div>
          {/* Thông tin đăng nhập và nút logout */}
          {isLoggedIn && userInfo && (
            <div className="flex flex-row items-center justify-center gap-3">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2.5 text-white text-sm flex flex-row gap-4 items-center border border-white/20">
                <div className="flex items-center gap-2">
                  <span className="opacity-80">Email:</span>
                  <span className="font-medium">{userInfo.email || '-'}</span>
                </div>
                <div className="h-4 w-px bg-white/30"></div>
                <div className="flex items-center gap-2">
                  <span className="opacity-80">SĐT:</span>
                  <span className="font-medium">{userInfo.phone || '-'}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem('trainingUser');
                  setIsLoggedIn(false);
                  setUserInfo(null);
                  setTrainingCourses([]);
                  setError("");
                }}
                className="px-4 py-2.5 bg-red-500/90 hover:bg-red-600 text-white rounded-xl transition-all text-sm font-semibold border border-red-600/50 shadow-sm hover:shadow-md hover:scale-105 active:scale-95"
              >
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </section>
      <main style={{ padding: "24px 16px", maxWidth: "1400px", margin: "0 auto" }}>
        {!isLoggedIn ? (
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="w-full max-w-md">
              <TrainingLoginForm />
            </div>
          </div>
        ) : (
          <>
            {loading ? (
              <div className="flex justify-center items-center min-h-[60vh]">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
                </div>
              </div>
            ) : error ? (
              <div className="text-center p-8 bg-white rounded-2xl shadow-lg border border-red-100 max-w-2xl mx-auto">
                <p className="text-red-500 text-lg mb-4">{error}</p>
                {error.includes("hết hạn") && (
                  <button
                    onClick={() => {
                      localStorage.removeItem('trainingUser');
                      setIsLoggedIn(false);
                      setError("");
                    }}
                    className="px-6 py-2.5 bg-gradient-to-r from-sky-600 to-sky-700 text-white rounded-lg hover:from-sky-700 hover:to-sky-800 transition-all text-sm font-medium shadow-sm hover:shadow-md"
                  >
                    Đăng nhập lại
                  </button>
                )}
              </div>
            ) : (
              <div className="container mx-auto py-8 px-4">
                <div className="flex items-center justify-between mb-6">
                  <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                    <div className="h-8 w-1 bg-sky-600 rounded-full"></div>
                    Danh sách khóa đào tạo đang diễn ra
                  </h1>
                  <div className="text-sm text-gray-500">
                    Tổng số: {trainingCourses.filter(course => course.crdfd_trangthaikhoahoc === 191920001).length} khóa học
                  </div>
                </div>

                {trainingCourses.length === 0 ? (
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-sky-50 to-indigo-50 opacity-50"></div>
                    <div className="relative text-center p-12 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-sky-100 max-w-2xl mx-auto">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-500 to-indigo-500"></div>
                      <div className="w-20 h-20 bg-gradient-to-br from-sky-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <svg className="w-10 h-10 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" 
                            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" 
                          />
                        </svg>
                      </div>
                      <div className="space-y-3">
                        <h3 className="text-2xl font-bold text-gray-800">Không có chương trình đào tạo</h3>
                        <p className="text-gray-600 max-w-md mx-auto">
                          Bạn chưa có chương trình đào tạo nào phù hợp. Các chương trình sẽ được cập nhật trong thời gian tới.
                        </p>
                      </div>
                      <div className="mt-8 flex justify-center">
                        <button 
                          onClick={() => window.location.reload()}
                          className="px-8 py-3 bg-white text-sky-700 rounded-lg hover:bg-sky-50 transition-all duration-200 flex items-center gap-2.5 border border-sky-200 shadow-sm hover:shadow group"
                        >
                          <svg className="w-5 h-5 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Tải lại trang
                        </button>
                      </div>
                      <div className="mt-8 pt-6 border-t border-gray-100">
                        <p className="text-sm text-gray-500">
                          Nếu bạn cho rằng đây là lỗi, vui lòng liên hệ với quản trị viên để được hỗ trợ.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 transition-all hover:shadow-xl">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gradient-to-r from-sky-600 to-sky-700">
                          <TableHead className="w-[250px] font-semibold text-white py-4">Tên khóa học</TableHead>
                          <TableHead className="font-semibold text-white py-4">Mã khóa học</TableHead>
                          <TableHead className="font-semibold text-white py-4">Người hướng dẫn</TableHead>
                          <TableHead className="font-semibold text-white py-4">Thời gian (giờ)</TableHead>
                          <TableHead className="text-right font-semibold text-white py-4">Chi phí (VNĐ)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trainingCourses
                          .filter(course => course.crdfd_trangthaikhoahoc === 191920001)
                          .map((course, index) => (
                          <React.Fragment key={course.crdfd_madanhsachkhoahoc}>
                            <TableRow 
                              className={`cursor-pointer transition-all duration-200 hover:bg-sky-50 group ${
                                index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                              }`}
                              onClick={() => {
                                const element = document.getElementById(`details-${course.crdfd_madanhsachkhoahoc}`);
                                if (element) {
                                  element.classList.toggle('hidden');
                                }
                              }}
                            >
                              <TableCell className="font-medium text-sky-700 group-hover:text-sky-800">
                                <div className="flex items-center gap-2">
                                  <FaClipboardList className="w-4 h-4 text-sky-500" />
                                  {course.tenKhoaHoc.crdfd_tenkhoahoc}
                                </div>
                              </TableCell>
                              <TableCell className="text-gray-600">{course.crdfd_makhoahoc}</TableCell>
                              <TableCell className="text-gray-600">{course.crdfd_nguoihuongdan}</TableCell>
                              <TableCell>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm bg-sky-50 text-sky-700 border border-sky-100">
                                  {course.crdfd_tongthoigiangio} giờ
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-medium text-gray-700">
                                {course.crdfd_chiphiuoctinh.toLocaleString()}
                              </TableCell>
                            </TableRow>
                            
                            {/* Expandable Details Section */}
                            <TableRow id={`details-${course.crdfd_madanhsachkhoahoc}`} className="hidden">
                              <TableCell colSpan={6} className="bg-gradient-to-b from-sky-50 to-white p-6 border-t border-b border-sky-100">
                                <div className="space-y-6">
                                  <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                      <h4 className="font-semibold text-sky-800 flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-sky-100">
                                          <FaClipboardList className="w-4 h-4 text-sky-600" />
                                        </div>
                                        Mục tiêu đào tạo
                                      </h4>
                                      <div className="prose prose-sm max-w-none bg-white p-4 rounded-lg border shadow-sm hover:shadow-md transition-shadow"
                                           dangerouslySetInnerHTML={{ __html: course.crdfd_muctieuaotao }} />
                                    </div>
                                    <div className="space-y-4">
                                      <h4 className="font-semibold text-sky-800 flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-sky-100">
                                          <FaClipboardList className="w-4 h-4 text-sky-600" />
                                        </div>
                                        Nội dung đào tạo
                                      </h4>
                                      <div className="prose prose-sm max-w-none bg-white p-4 rounded-lg border shadow-sm hover:shadow-md transition-shadow"
                                           dangerouslySetInnerHTML={{ __html: course.tenKhoaHoc.crdfd_noidungaotao }} />
                                    </div>
                                  </div>

                                  {/* Kết quả học tập section */}
                                  <div className="space-y-4">
                                    <h4 className="font-semibold text-sky-800 flex items-center gap-2">
                                      <div className="p-1.5 rounded-lg bg-sky-100">
                                        <FaClipboardList className="w-4 h-4 text-sky-600" />
                                      </div>
                                      Kết quả học tập
                                    </h4>
                                    <div className="bg-white rounded-lg border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                                      <Table>
                                        <TableHeader>
                                          <TableRow className="bg-sky-50/80">
                                            <TableHead className="font-semibold text-sky-900">Mã kết quả</TableHead>
                                            <TableHead className="font-semibold text-sky-900">Ngày đăng ký</TableHead>
                                            <TableHead className="font-semibold text-sky-900">Ngày nộp bài</TableHead>
                                            <TableHead className="font-semibold text-sky-900">Kết quả</TableHead>
                                            <TableHead className="font-semibold text-sky-900">Điểm</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {course.ketQuaDaoTao.map((ketqua) => (
                                            <TableRow key={ketqua.crdfd_maketqua} className="hover:bg-gray-50/80">
                                              <TableCell className="text-gray-600 font-medium">{ketqua.crdfd_maketqua}</TableCell>
                                              <TableCell className="text-gray-600">
                                                {ketqua.crdfd_ngaydangky ? 
                                                  format(new Date(ketqua.crdfd_ngaydangky), "dd/MM/yyyy") : 
                                                  "N/A"}
                                              </TableCell>
                                              <TableCell className="text-gray-600">
                                                {ketqua.crdfd_ngaynopbai ? 
                                                  format(new Date(ketqua.crdfd_ngaynopbai), "dd/MM/yyyy") : 
                                                  <span className="text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full text-sm">
                                                    Chưa nộp
                                                  </span>
                                                }
                                              </TableCell>
                                              <TableCell>
                                                <Badge 
                                                  variant={ketqua.crdfd_ketqua === 191920000 ? "success" : "destructive"}
                                                  className={`${
                                                    ketqua.crdfd_ketqua === 191920000 
                                                    ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                                                  } shadow-sm`}
                                                >
                                                  {getKetQuaLabel(ketqua.crdfd_ketqua)}
                                                </Badge>
                                                  {!ketqua.crdfd_ngaynopbai && ketqua.crdfd_ketqua !== 191920000 && (
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation(); // Ngăn chặn sự kiện click lan ra ngoài
                                                      router.push(`/daotao/test?chuongTrinhId=${course.crdfd_danhsachkhoaaotaoid}&hocVienId=${ketqua.crdfd_maketqua}`);
                                                    }}
                                                    className="ml-2 inline-flex items-center gap-1.5 px-3 py-1 bg-sky-100 hover:bg-sky-200 text-sky-700 rounded-full text-sm font-medium transition-all duration-200 hover:shadow-sm"
                                                  >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                    Làm bài
                                                  </button>
                                                )}
                                              </TableCell>
                                              <TableCell>
                                                {ketqua.crdfd_sodiem ? (
                                                  <span className="font-medium text-gray-900">
                                                    {ketqua.crdfd_sodiem}
                                                  </span>
                                                ) : (
                                                  <span className="text-gray-400">N/A</span>
                                                )}
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </div>

                                  {/* Tài liệu học tập section */}
                                  {course.crdfd_linkbaigiang && (
                                    <div className="space-y-4">
                                      <h4 className="font-semibold text-sky-800 flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-sky-100">
                                          <FaClipboardList className="w-4 h-4 text-sky-600" />
                                        </div>
                                        Tài liệu học tập
                                      </h4>
                                      <a 
                                        href={course.crdfd_linkbaigiang}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-sky-600 hover:text-sky-700 bg-sky-50 px-4 py-2 rounded-lg hover:bg-sky-100 transition-all duration-200 shadow-sm hover:shadow group border border-sky-100"
                                      >
                                        <FaExternalLinkAlt className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                                        Xem bài giảng
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          </React.Fragment>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </>
  );
} 