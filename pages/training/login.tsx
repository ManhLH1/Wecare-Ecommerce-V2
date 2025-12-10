import TrainingLoginForm from '../../components/TrainingLoginForm';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

const TrainingLoginPage = () => {
  const router = useRouter();

  useEffect(() => {
    // Kiểm tra nếu đã đăng nhập thì chuyển hướng đến trang đào tạo
    const trainingUser = localStorage.getItem('trainingUser');
    if (trainingUser) {
      router.push('/training');
    }
  }, [router]);

  return <TrainingLoginForm />;
};

export default TrainingLoginPage; 