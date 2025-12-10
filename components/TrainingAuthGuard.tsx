import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

interface TrainingAuthGuardProps {
  children: React.ReactNode;
}

const TrainingAuthGuard = ({ children }: TrainingAuthGuardProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      const trainingUser = localStorage.getItem('trainingUser');
      if (!trainingUser) {
        // Nếu chưa đăng nhập, chuyển hướng về trang login
        window.location.href = '/training/login';
        return;
      }
      setIsAuthenticated(true);
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang kiểm tra đăng nhập...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : null;
};

export default TrainingAuthGuard; 