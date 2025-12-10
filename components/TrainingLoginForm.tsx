import { useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { FiMail, FiAlertCircle, FiLock } from 'react-icons/fi';

const TrainingLoginForm = () => {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isValid, setIsValid] = useState(true);
  const [isPhoneValid, setIsPhoneValid] = useState(true);

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const validatePhone = (phone: string) => {
    const regex = /^0\d{9,10}$/;
    return regex.test(phone);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    setIsValid(value === '' || validateEmail(value));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setPhone(value);
    setIsPhoneValid(value === '' || validatePhone(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) {
      setIsValid(false);
      return;
    }
    if (!validatePhone(phone)) {
      setIsPhoneValid(false);
      return;
    }
    setError('');
    setLoading(true);

    try {
      const response = await axios.get(`/api/auth/trainingLogin?user=${encodeURIComponent(email)}&phone=${encodeURIComponent(phone)}`);
      
      if (response.data) {
        const token = btoa(`${email}:${Date.now()}`);
        localStorage.setItem('trainingUser', JSON.stringify({
          ...response.data,
          token,
          loginTime: Date.now()
        }));
        window.location.reload();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Đăng nhập thất bại');  
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="block justify-center relative overflow-hidden bg-gray-50 pt-0 pb-2 px-4 sm:px-6 lg:px-8">
        {/* Background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, type: 'spring', stiffness: 80 }}
          className="relative max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-gray-100 flex flex-col items-center"
        >
          {/* Logo/icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="flex items-center justify-center mb-4 mt-0"
          >
            <span className="bg-blue-600 rounded-2xl p-4 shadow-lg border border-blue-500/20">
              <FiLock className="h-8 w-8 text-white" />
            </span>
          </motion.div>
          {/* Title & Slogan */}
          <h2 className="text-3xl font-extrabold text-blue-600 text-center mb-2">
            Đăng nhập đào tạo
          </h2>
          <p className="text-sm text-gray-600 font-medium text-center mb-6">
            Truy cập hệ thống học tập nội bộ
          </p>
          {/* Form */}
          <form className="w-full space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1">
                Email công ty
              </label>
              <div className="relative flex items-center">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className={`pr-10 min-h-[48px] w-full rounded-xl border ${
                    isValid ? 'border-gray-200 focus:border-blue-500' : 'border-red-300 focus:border-red-500'
                  } placeholder-gray-400 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 transition-all duration-200 shadow-sm text-base font-medium px-4`}
                  placeholder="example@company.com"
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={() => setIsValid(validateEmail(email))}
                />
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: !isValid ? 1 : 0, x: !isValid ? 0 : 10 }}
                  className="absolute right-3 top-0 bottom-0 flex items-center h-full pointer-events-none"
                >
                  <FiAlertCircle className="h-5 w-5 text-red-500" />
                </motion.div>
              </div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: !isValid ? 1 : 0 }}
                className="mt-1 text-xs text-red-600 flex items-center font-medium min-h-[20px]"
              >
                <FiAlertCircle className="h-4 w-4 mr-1" />
                Vui lòng nhập email hợp lệ
              </motion.p>
            </div>
            <div className="space-y-2">
              <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-1">
                Số điện thoại nhân viên
              </label>
              <div className="relative flex items-center">
                <input
                  id="phone"
                  name="phone"
                  type="password"
                  required
                  maxLength={11}
                  className={`pr-10 min-h-[48px] w-full rounded-xl border ${
                    isPhoneValid ? 'border-gray-200 focus:border-blue-500' : 'border-red-300 focus:border-red-500'
                  } placeholder-gray-400 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 transition-all duration-200 shadow-sm text-base font-medium px-4`}
                  placeholder="Nhập số điện thoại"
                  value={phone}
                  onChange={handlePhoneChange}
                  onBlur={() => setIsPhoneValid(validatePhone(phone))}
                />
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: !isPhoneValid ? 1 : 0, x: !isPhoneValid ? 0 : 10 }}
                  className="absolute right-3 top-0 bottom-0 flex items-center h-full pointer-events-none"
                >
                  <FiAlertCircle className="h-5 w-5 text-red-500" />
                </motion.div>
              </div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: !isPhoneValid ? 1 : 0 }}
                className="mt-1 text-xs text-red-600 flex items-center font-medium min-h-[20px]"
              >
                <FiAlertCircle className="h-4 w-4 mr-1" />
                Vui lòng nhập số điện thoại hợp lệ
              </motion.p>
            </div>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-red-50 p-4 flex items-center space-x-3 border border-red-200 shadow mb-2"
              >
                <FiAlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </motion.div>
            )}
            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98, y: 1 }}
              type="submit"
              disabled={loading || !isValid || !isPhoneValid}
              className={`w-full flex justify-center items-center py-4 rounded-xl text-base font-bold text-white shadow-lg transition-all duration-200
                ${loading || !isValid || !isPhoneValid
                  ? 'bg-gray-300 cursor-not-allowed opacity-70'
                  : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-400'}
              `}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-white font-semibold">Đang xử lý...</span>
                </>
              ) : (
                <span className="text-white font-semibold tracking-wide">Đăng nhập</span>
              )}
            </motion.button>
          </form>
        </motion.div>
      </div>
      <style jsx global>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </>
  );
};

export default TrainingLoginForm; 