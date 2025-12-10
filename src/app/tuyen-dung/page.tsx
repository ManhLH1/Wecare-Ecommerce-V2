"use client";
import React, { useState, useEffect } from 'react';
import Footer from "@/components/footer";
import Toolbar from "@/components/toolbar";
import Image from "next/image";
import LogoSvg from "@/assets/img/Logo-Wecare.png";
import { toast } from 'react-toastify';

const RecruitmentPage = () => {
  // Update the type definition to match the API response
  const [positions, setPositions] = useState<Array<{
    crdfd_vitriid: string;
    crdfd_vitritext: string;
    cr1bb_vitri: number;
    crdfd_yeucautuyendungid?: string;
    cr1bb_hinhthuclamviec?: number;
    crdfd_iaiem?: {
      crdfd_name: string;
      crdfd_tinhthanhid: string;
    };
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [availableLocations, setAvailableLocations] = useState<Array<{
    crdfd_name: string;
    crdfd_tinhthanhid: string;
  }>>([]);

  // Add useEffect to fetch positions
  useEffect(() => {
    const fetchPositions = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/getPositionData');
        
        if (response.status === 404) {
          setPositions([]);
          return;
        }
        
        if (!response.ok) {
          throw new Error('Failed to fetch positions');
        }
        
        const data = await response.json();
        setPositions(data);
      } catch (error) {
        console.error('Error fetching positions:', error);
        toast.error('Không thể tải danh sách vị trí ứng tuyển');
        setPositions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPositions();
  }, []);

  // Form state
  const [formData, setFormData] = useState({
    crdfd_hovaten: '',
    position: '',
    applyDate: '',
    email: '',
    phone: '',
    birthDate: '',
    channel: '',
    cv: null as File | null,
    crdfd_cv: '',
    crdfd_tinhthanhid: '',
    crdfd_worktype: '',
    crdfd_yeucautuyendungid: '',
    crdfd_banbietthongtinquadau: '',
    // TẠM THỜI KHÔNG SỬ DỤNG - Comment out ID card fields
    // cr1bb_cancuoccongdan: '',
    // cr1bb_cancuocmattruoc: null as File | null,
    // cr1bb_cancuocmatsau: null as File | null,
    // cr1bb_cancuocmattruocurl: '',
    // cr1bb_cancuocmatsauurl: '',
    rawFileName: '',
    // rawFileNameFront: '',
    // rawFileNameBack: ''
  });

  // Error state
  const [errors, setErrors] = useState({
    crdfd_hovaten: '',
    phone: '',
    email: '',
    cv: '',
    crdfd_banbietthongtinquadau: '',
    // TẠM THỜI KHÔNG SỬ DỤNG - Comment out ID card error states
    // cr1bb_cancuoccongdan: '',
    // cr1bb_cancuocmattruoc: '',
    // cr1bb_cancuocmatsau: ''
  });

  // Validation functions
  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const validatePhone = (phone: string) => {
    const regex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
    return regex.test(phone);
  };

  // TẠM THỜI KHÔNG SỬ DỤNG - Comment out ID card validation
  /*
  const validateIDCard = (idCard: string) => {
    if (!idCard || idCard.length === 0) {
      return false;
    }
    const regex = /^[0-9]{9}$|^[0-9]{12}$/;
    return regex.test(idCard);
  };
  */

  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      crdfd_hovaten: '',
      phone: '',
      email: '',
      cv: '',
      crdfd_banbietthongtinquadau: '',
      // TẠM THỜI KHÔNG SỬ DỤNG
      // cr1bb_cancuoccongdan: '',
      // cr1bb_cancuocmattruoc: '',
      // cr1bb_cancuocmatsau: ''
    };

    // Validate crdfd_hovaten
    if (!formData.crdfd_hovaten || formData.crdfd_hovaten.length < 2) {
      newErrors.crdfd_hovaten = 'Họ tên phải có ít nhất 2 ký tự';
      isValid = false;
    }

    // Validate phone
    if (!formData.phone || !validatePhone(formData.phone)) {
      newErrors.phone = 'Số điện thoại không hợp lệ';
      isValid = false;
    }

    // Validate email
    if (!formData.email || !validateEmail(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
      isValid = false;
    }

    // Validate position
    if (!formData.position) {
      newErrors.crdfd_hovaten = 'Vui lòng chọn vị trí ứng tuyển';
      isValid = false;
    }

    // Validate work location
    if (!formData.crdfd_tinhthanhid) {
      newErrors.crdfd_hovaten = 'Vui lòng chọn địa điểm làm việc';
      isValid = false;
    }

    // Validate birth date
    if (!formData.birthDate) {
      newErrors.crdfd_hovaten = 'Vui lòng chọn ngày sinh';
      isValid = false;
    }

    // Validate channel
    if (!formData.channel) {
      newErrors.crdfd_hovaten = 'Vui lòng chọn kênh ứng tuyển';
      isValid = false;
    }

    // Validate crdfd_banbietthongtinquadau when channel is "Khác"
    if (formData.channel === '191920002' && !formData.crdfd_banbietthongtinquadau.trim()) {
      newErrors.crdfd_banbietthongtinquadau = 'Vui lòng nhập nguồn thông tin';
      isValid = false;
    }

    // TẠM THỜI KHÔNG SỬ DỤNG - Comment out ID card validation
    /*
    // Validate căn cước công dân
    if (!formData.cr1bb_cancuoccongdan) {
      newErrors.cr1bb_cancuoccongdan = 'Vui lòng nhập căn cước công dân';
      isValid = false;
    } else if (!validateIDCard(formData.cr1bb_cancuoccongdan)) {
      newErrors.cr1bb_cancuoccongdan = 'Căn cước công dân phải có đúng 9 hoặc 12 số';
      isValid = false;
    }

    // Validate ảnh căn cước mặt trước
    if (!formData.cr1bb_cancuocmattruoc) {
      newErrors.cr1bb_cancuocmattruoc = 'Vui lòng đính kèm ảnh căn cước mặt trước';
      isValid = false;
    }

    // Validate ảnh căn cước mặt sau
    if (!formData.cr1bb_cancuocmatsau) {
      newErrors.cr1bb_cancuocmatsau = 'Vui lòng đính kèm ảnh căn cước mặt sau';
      isValid = false;
    }
    */

    setErrors(newErrors);
    return isValid;
  };

  // Add delete CV function
  const handleDeleteCV = async () => {
    if (!formData.rawFileName) return;

    try {
      const response = await fetch(`/api/deleteFile?fileName=${encodeURIComponent(formData.rawFileName)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete file');
      }

      setFormData(prev => ({
        ...prev,
        cv: null,
        crdfd_cv: '',
        rawFileName: ''
      }));

      toast.success('CV đã được xóa thành công!');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Không thể xóa CV. Vui lòng thử lại!');
    }
  };

  // TẠM THỜI KHÔNG SỬ DỤNG - Comment out ID card delete functions
  /*
  const handleDeleteIDFront = async () => {
    if (!formData.rawFileNameFront) return;

    try {
      const response = await fetch(`/api/deleteFile?fileName=${encodeURIComponent(formData.rawFileNameFront)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete file');
      }

      setFormData(prev => ({
        ...prev,
        cr1bb_cancuocmattruoc: null,
        cr1bb_cancuocmattruocurl: '',
        rawFileNameFront: ''
      }));

      toast.success('Ảnh căn cước mặt trước đã được xóa thành công!');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Không thể xóa ảnh. Vui lòng thử lại!');
    }
  };

  const handleDeleteIDBack = async () => {
    if (!formData.rawFileNameBack) return;

    try {
      const response = await fetch(`/api/deleteFile?fileName=${encodeURIComponent(formData.rawFileNameBack)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete file');
      }

      setFormData(prev => ({
        ...prev,
        cr1bb_cancuocmatsau: null,
        cr1bb_cancuocmatsauurl: '',
        rawFileNameBack: ''
      }));

      toast.success('Ảnh căn cước mặt sau đã được xóa thành công!');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Không thể xóa ảnh. Vui lòng thử lại!');
    }
  };

  const handleIDImageChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'front' | 'back') => {
    try {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        
        if (!allowedTypes.includes(file.type)) {
          toast.error('Chỉ chấp nhận file ảnh JPG, JPEG hoặc PNG');
          e.target.value = '';
          return;
        }

        if (file.size > 10 * 1024 * 1024) {
          toast.error('File quá lớn. Vui lòng chọn file nhỏ hơn 10MB');
          return;
        }

        const existingFileName = type === 'front' ? formData.rawFileNameFront : formData.rawFileNameBack;
        if (existingFileName) {
          const deleteLoadingToast = toast.loading('Đang xóa ảnh cũ...');
          const deleteResponse = await fetch(`/api/deleteFile?fileName=${encodeURIComponent(existingFileName)}`, {
            method: 'DELETE',
          });
          
          if (!deleteResponse.ok) {
            console.error('Failed to delete old file');
            toast.error('Không thể xóa ảnh cũ, vui lòng thử lại');
          } else {
            toast.success('Đã xóa ảnh cũ');
          }
          toast.dismiss(deleteLoadingToast);
        }

        try {
          setIsUploading(true);
          const loadingToast = toast.loading('Đang tải ảnh lên...');

          const base64Content = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              if (typeof reader.result === 'string') {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
              } else {
                reject(new Error('Failed to read file'));
              }
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
          });

          const response = await fetch('/api/uploadFile', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fileName: file.name,
              fileContent: base64Content,
              mimeType: file.type || 'image/jpeg'
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('Upload failed:', {
              status: response.status,
              statusText: response.statusText,
              headers: Object.fromEntries(response.headers.entries()),
              error: errorText
            });
            throw new Error(`Upload failed: ${response.status} ${response.statusText}\n${errorText}`);
          }

          const data = await response.json();

          if (type === 'front') {
            console.log('Setting front image file:', file);
            setFormData(prev => ({
              ...prev,
              cr1bb_cancuocmattruoc: file,
              cr1bb_cancuocmattruocurl: data.cvPath,
              rawFileNameFront: data.rawFileName
            }));
          } else {
            console.log('Setting back image file:', file);
            setFormData(prev => ({
              ...prev,
              cr1bb_cancuocmatsau: file,
              cr1bb_cancuocmatsauurl: data.cvPath,
              rawFileNameBack: data.rawFileName
            }));
          }

          toast.dismiss(loadingToast);
          toast.success('Ảnh đã được tải lên thành công!');
          
        } catch (error) {
          console.error('Upload error:', error);
          toast.error(error instanceof Error ? error.message : 'Không thể tải ảnh lên. Vui lòng thử lại!');
        } finally {
          setIsUploading(false);
        }
      }
    } catch (error) {
      console.error('File handling error:', error);
      toast.error('Có lỗi xảy ra khi xử lý ảnh');
    }
  };
  */

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        
        if (!allowedTypes.includes(file.type)) {
          toast.error('Chỉ chấp nhận file PDF hoặc Word (doc/docx)');
          e.target.value = '';
          return;
        }

        if (formData.rawFileName) {
          const deleteLoadingToast = toast.loading('Đang xóa file cũ...');
          const deleteResponse = await fetch(`/api/deleteFile?fileName=${encodeURIComponent(formData.rawFileName)}`, {
            method: 'DELETE',
          });
          
          if (!deleteResponse.ok) {
            console.error('Failed to delete old file');
            toast.error('Không thể xóa file cũ, vui lòng thử lại');
          } else {
            setFormData(prev => ({
              ...prev,
              cv: null,
              crdfd_cv: '',
              rawFileName: ''
            }));
            toast.success('Đã xóa file cũ');
          }
          toast.dismiss(deleteLoadingToast);
        }

        if (file) {
          if (file.size > 10 * 1024 * 1024) {
            toast.error('File quá lớn. Vui lòng chọn file nhỏ hơn 10MB');
            return;
          }

          try {
            setIsUploading(true);
            const loadingToast = toast.loading('Đang tải file lên...');

            const base64Content = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                if (typeof reader.result === 'string') {
                  const base64 = reader.result.split(',')[1];
                  resolve(base64);
                } else {
                  reject(new Error('Failed to read file'));
                }
              };
              reader.onerror = () => reject(reader.error);
              reader.readAsDataURL(file);
            });

            const response = await fetch('/api/uploadFile', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                fileName: file.name,
                fileContent: base64Content,
                mimeType: file.type || 'application/octet-stream'
              }),
            });

            if (!response.ok) {
              const errorText = await response.text();
              console.error('Upload failed:', {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries()),
                error: errorText
              });
              throw new Error(`Upload failed: ${response.status} ${response.statusText}\n${errorText}`);
            }

            const data = await response.json();

            setFormData(prev => ({
              ...prev,
              cv: file,
              crdfd_cv: data.cvPath,
              rawFileName: data.rawFileName
            }));

            toast.dismiss(loadingToast);
            toast.success('File đã được tải lên thành công!');
            
          } catch (error) {
            console.error('Upload error:', error);
            toast.error(error instanceof Error ? error.message : 'Không thể tải file lên. Vui lòng thử lại!');
          } finally {
            setIsUploading(false);
          }
        }
      }
    } catch (error) {
      console.error('File handling error:', error);
      toast.error('Có lỗi xảy ra khi xử lý file');
    }
  };

  const checkDuplicateApplication = async (hovaten: string, sdt: string, yeucautuyendungid: string) => {
    try {
      const response = await fetch('/api/checkDuplicate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hovaten,
          sdt,
          yeucautuyendungid
        }),
      });
      const data = await response.json();
      return data.isDuplicate;
    } catch (error) {
      console.error('Error checking duplicate:', error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted!', formData);
    
    const isValid = validateForm();
    console.log('Form validation result:', isValid);
    console.log('Current errors:', errors);
    
    if (!isValid) {
      toast.error('Vui lòng kiểm tra lại thông tin!');
      return;
    }

    try {
      setIsSubmitting(true);
      const yeucautuyendungid = positions.find(p => p.cr1bb_vitri.toString() === formData.position)?.crdfd_yeucautuyendungid || "";

      const isDuplicate = await checkDuplicateApplication(
        formData.crdfd_hovaten,
        formData.phone,
        yeucautuyendungid
      );

      if (isDuplicate) {
        toast.error('Bạn đã ứng tuyển vị trí này trước đó!');
        return;
      }

      const birthDate = new Date(formData.birthDate).toISOString();
      const applyDate = new Date().toISOString();

      const applicationData = {
        "crdfd_hovaten": formData.crdfd_hovaten,
        "crdfd_email": formData.email,
        "crdfd_sdt": formData.phone,
        "crdfd_ngaysinh": birthDate,
        "crdfd_ngayungtuyen": applyDate,
        "crdfd_kenhungtuyen": formData.channel || null,
        "crdfd_banbietthongtinquadau": formData.channel === '191920002' ? formData.crdfd_banbietthongtinquadau : null,
        "crdfd_vitriungvien": Number(formData.position),
        "crdfd_Yeucautuyendung@odata.bind": `/crdfd_yeucautuyendungs(${formData.crdfd_yeucautuyendungid})`,
        "crdfd_cv": formData.crdfd_cv,
        "crdfd_TinhThanh@odata.bind": `/crdfd_tinhthanhs(${formData.crdfd_tinhthanhid})`,
        "crdfd_hinhthuclamviec": Number(formData.crdfd_worktype.replace(/,/g, ''))
        // TẠM THỜI KHÔNG GỬI DỮ LIỆU CĂN CƯỚC CÔNG DÂN
        // "cr1bb_cancuoccongdan": formData.cr1bb_cancuoccongdan,
        // "cr1bb_cancuocmattruocurl": formData.cr1bb_cancuocmattruocurl,
        // "cr1bb_cancuocmatsauurl": formData.cr1bb_cancuocmatsauurl
      };

      console.log('Sending application data:', applicationData);
      
      const response = await fetch('/api/submitApplication', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(applicationData),
      });
      
      console.log('API response status:', response.status);

      const responseData = await response.json();

      if (!response.ok) {
        console.error('Submission error:', responseData);
        throw new Error(responseData.error || responseData.message || 'Submission failed');
      }

      toast.success('Gửi thành công!');

      // Reset form
      setFormData({
        crdfd_hovaten: '',
        position: '',
        applyDate: '',
        email: '',
        phone: '',
        birthDate: '',
        channel: '',
        cv: null,
        crdfd_cv: '',
        crdfd_tinhthanhid: '',
        crdfd_worktype: '',
        crdfd_yeucautuyendungid: '',
        crdfd_banbietthongtinquadau: '',
        // cr1bb_cancuoccongdan: '',
        // cr1bb_cancuocmattruoc: null,
        // cr1bb_cancuocmatsau: null,
        // cr1bb_cancuocmattruocurl: '',
        // cr1bb_cancuocmatsauurl: '',
        rawFileName: '',
        // rawFileNameFront: '',
        // rawFileNameBack: ''
      });
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra, vui lòng thử lại!');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-50">
      <main>
        <section className="bg-gradient-to-r from-sky-600 to-sky-800 text-white py-8">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center space-x-4">
              <div className="flex items-center">
                <Image
                  src={LogoSvg}
                  alt="Wecare Logo"
                  width={32}
                  height={32}
                  className="object-contain transition-transform duration-300 hover:scale-105"
                />
                <h6 className="text-white pl-2 text-xl tracking-wider font-extrabold mb-0">
                  WECARE
                </h6>
              </div>
              
              <div className="h-6 w-px bg-white/30"></div>
              
              <h1 className="text-2xl font-bold m-0">
                Tuyển dụng
              </h1>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="border-b pb-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Ứng tuyển ngay
                </h2>
                <p className="text-gray-600">Hãy điền đầy đủ thông tin bên dưới để ứng tuyển</p>
              </div>

              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
                </div>
              ) : positions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mb-4">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Hiện tại chưa có vị trí tuyển dụng nào</h3>
                  <p className="text-gray-500">Vui lòng quay lại sau để xem các vị trí tuyển dụng mới.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Họ và tên */}
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-gray-700 font-semibold mb-2">
                        Họ và tên <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="crdfd_hovaten"
                        value={formData.crdfd_hovaten}
                        onChange={(e) => setFormData({...formData, crdfd_hovaten: e.target.value})}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all
                          ${errors.crdfd_hovaten ? 'border-red-500' : 'border-gray-300'}`}
                        required
                      />
                      {errors.crdfd_hovaten && (
                        <p className="mt-1 text-sm text-red-500">{errors.crdfd_hovaten}</p>
                      )}
                    </div>

                    {/* Vị trí ứng tuyển */}
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-gray-700 font-semibold mb-2">
                        Vị trí ứng tuyển <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="position"
                        value={formData.position}
                        onChange={(e) => {
                          const selectedPositionId = e.target.value;
                          
                          const positionsWithSameTitle = positions.filter(
                            p => p.cr1bb_vitri.toString() === selectedPositionId
                          );
                          
                          const locationOptions = positionsWithSameTitle
                            .filter(p => p.crdfd_iaiem)
                            .map(p => ({
                              crdfd_name: p.crdfd_iaiem?.crdfd_name || '',
                              crdfd_tinhthanhid: p.crdfd_iaiem?.crdfd_tinhthanhid || ''
                            }));
                            
                          setAvailableLocations(locationOptions);
                          
                          setFormData({
                            ...formData, 
                            position: selectedPositionId,
                            crdfd_worktype: positionsWithSameTitle[0]?.cr1bb_hinhthuclamviec?.toString() || '',
                            crdfd_tinhthanhid: '',
                            crdfd_yeucautuyendungid: ''
                          });
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                        required
                      >
                        <option value="">Chọn vị trí</option>
                        {positions && positions.length > 0 ? (
                          // Filter out duplicate position titles (cr1bb_vitri)
                          [...new Map(positions.map(p => [p.cr1bb_vitri, p])).values()].map((position) => (
                            <option 
                              key={position.cr1bb_vitri} 
                              value={position.cr1bb_vitri.toString()}
                            >
                              {position.crdfd_vitritext}
                            </option>
                          ))
                        ) : null}
                      </select>
                    </div>

                    {/* Email */}
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-gray-700 font-semibold mb-2">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all
                          ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                        required
                      />
                      {errors.email && (
                        <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                      )}
                    </div>

                    {/* Số điện thoại */}
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-gray-700 font-semibold mb-2">
                        Số điện thoại <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all
                          ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
                        required
                      />
                      {errors.phone && (
                        <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
                      )}
                    </div>

                    {/* TẠM THỜI ẨN - Căn cước công dân */}
                    {/* 
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-gray-700 font-semibold mb-2">
                        Căn cước công dân <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="cr1bb_cancuoccongdan"
                        value={formData.cr1bb_cancuoccongdan}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 12);
                          setFormData({...formData, cr1bb_cancuoccongdan: value});
                        }}
                        placeholder="Nhập 9 hoặc 12 số"
                        maxLength={12}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all
                          ${errors.cr1bb_cancuoccongdan ? 'border-red-500' : 'border-gray-300'}`}
                        required
                      />
                      {errors.cr1bb_cancuoccongdan && (
                        <p className="mt-1 text-sm text-red-500">{errors.cr1bb_cancuoccongdan}</p>
                      )}
                    </div>
                    */}

                    {/* Kênh ứng tuyển */}
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-gray-700 font-semibold mb-2">
                        Kênh ứng tuyển
                      </label>
                      <select
                        name="channel"
                        value={formData.channel}
                        onChange={(e) => setFormData({...formData, channel: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                        required
                      >
                        <option key="default" value="">Chọn</option>
                        <option key="191920000" value="191920000">TopCV</option>
                        <option key="191920001" value="191920001">Facebook</option>
                        <option key="191920002" value="191920002">Khác</option>
                      </select>
                    </div>

                    {formData.channel === '191920002' && (
                      <div className="col-span-2 md:col-span-1">
                        <label className="block text-gray-700 font-semibold mb-2">
                          Bạn biết thông tin qua đâu <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="crdfd_banbietthongtinquadau"
                          value={formData.crdfd_banbietthongtinquadau}
                          onChange={(e) => setFormData({...formData, crdfd_banbietthongtinquadau: e.target.value})}
                          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all
                            ${errors.crdfd_banbietthongtinquadau ? 'border-red-500' : 'border-gray-300'}`}
                          required
                        />
                        {errors.crdfd_banbietthongtinquadau && (
                          <p className="mt-1 text-sm text-red-500">{errors.crdfd_banbietthongtinquadau}</p>
                        )}
                      </div>
                    )}

                    {/* Ngày tháng năm sinh */}
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-gray-700 font-semibold mb-2">
                        Ngày tháng năm sinh <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        name="birthDate"
                        value={formData.birthDate}
                        onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                        required
                      />
                    </div>

                    {/* Work Location */}
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-gray-700 font-semibold mb-2">
                        Địa điểm làm việc <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="crdfd_tinhthanhid"
                        value={formData.crdfd_tinhthanhid}
                        onChange={(e) => {
                          const selectedLocation = e.target.value;
                          const selectedPosition = positions.find(
                            p => p.cr1bb_vitri.toString() === formData.position && 
                                p.crdfd_iaiem?.crdfd_tinhthanhid === selectedLocation
                          );
                          
                          setFormData({
                            ...formData, 
                            crdfd_tinhthanhid: selectedLocation,
                            crdfd_yeucautuyendungid: selectedPosition?.crdfd_yeucautuyendungid || ''
                          });
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                        required
                      >
                        <option value="">Chọn địa điểm</option>
                        {availableLocations.map((location) => (
                          <option 
                            key={location.crdfd_tinhthanhid} 
                            value={location.crdfd_tinhthanhid}
                          >
                            {location.crdfd_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Work Type */}
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-gray-700 font-semibold mb-2">
                        Hình thức làm việc <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="crdfd_worktype"
                        value={formData.crdfd_worktype === '283640000' ? 'Fulltime' : formData.crdfd_worktype === '283640001' ? 'Partime' : ''}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                        disabled
                        required
                      />
                    </div>

                    {/* TẠM THỜI ẨN - Upload ảnh căn cước mặt trước và mặt sau */}
                    {/*
                    <div className="col-span-2">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <svg className="w-5 h-5 text-sky-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Ảnh căn cước công dân
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        ... entire ID card upload section ...
                      </div>
                    </div>
                    */}

                    {/* File Upload */}
                    <div className="col-span-2">
                      <label className="block text-gray-700 font-semibold mb-2">
                        Đính kèm CV/hồ sơ
                      </label>
                      <div className={`border-2 border-dashed rounded-lg p-6 text-center hover:border-sky-500 transition-colors cursor-pointer
                        ${errors.cv ? 'border-red-500' : 'border-gray-300'}`}>
                        <input
                          type="file"
                          onChange={handleFileChange}
                          className="hidden"
                          id="cv-upload"
                        />
                        <label htmlFor="cv-upload" className="cursor-pointer">
                          <div className="space-y-2">
                            <div className="mx-auto w-12 h-12 rounded-full bg-sky-50 flex items-center justify-center">
                              <svg className="w-6 h-6 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                              </svg>
                            </div>
                            <div className="text-sky-600 font-medium">
                              {formData.cv ? 'Thay đổi File' : 'Tải File lên'}
                            </div>
                            <p className="text-sm text-gray-500">Chỉ chấp nhận file PDF hoặc Word (doc/docx)</p>
                            <p className="text-sm text-gray-500">Tối đa 10MB</p>
                          </div>
                        </label>
                      </div>
                      {errors.cv && (
                        <p className="mt-1 text-sm text-red-500">{errors.cv}</p>
                      )}
                      {formData.cv && (
                        <div className="mt-2 flex items-center justify-between">
                          <p className="text-sm text-green-600">
                            Đã chọn file: {formData.cv.name}
                          </p>
                          <button
                            type="button"
                            onClick={handleDeleteCV}
                            className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors"
                            title="Xóa File"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Submit button */}
                  <div className="pt-6">
                    <button
                      type="submit"
                      disabled={isLoading || isSubmitting || isUploading}
                      className={`w-full px-8 py-3 rounded-lg transition-all duration-300 font-semibold flex items-center justify-center space-x-2
                        ${(isLoading || isSubmitting || isUploading) 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-sky-600 hover:bg-sky-700 text-white'}`}
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Đang gửi...</span>
                        </>
                      ) : (
                        <>
                          <span>Gửi đơn ứng tuyển</span>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>
      
      <Toolbar />
      <Footer />
    </div>
  );
};

export default RecruitmentPage;