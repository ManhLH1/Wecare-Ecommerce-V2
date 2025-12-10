import TrainingAuthGuard from '../../components/TrainingAuthGuard';

const TrainingPage = () => {
  return (
    <TrainingAuthGuard>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Trang Đào Tạo</h1>
        {/* Nội dung trang đào tạo ở đây */}
      </div>
    </TrainingAuthGuard>
  );
};

export default TrainingPage; 