'use client';

import React, { useState, useEffect } from 'react';

interface JobStatus {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: {
    total: number;
    completed: number;
    currentStep?: string;
  };
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

interface BackgroundJobStatusProps {
  jobId: string | null;
  onJobComplete?: (result: any) => void;
  onJobError?: (error: string) => void;
  autoHide?: boolean;
}

export default function BackgroundJobStatus({
  jobId,
  onJobComplete,
  onJobError,
  autoHide = true
}: BackgroundJobStatusProps) {
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!jobId) {
      setJobStatus(null);
      setIsVisible(false);
      return;
    }

    setIsVisible(true);

    const pollJobStatus = async () => {
      try {
        const response = await fetch(`/api/admin-app/job-status/${jobId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch job status');
        }

        const status = await response.json();
        setJobStatus(status);

        if (status.status === 'completed') {
          onJobComplete?.(status.result);
          if (autoHide) {
            setTimeout(() => setIsVisible(false), 8080); // Hide after 3 seconds
          }
        } else if (status.status === 'failed') {
          onJobError?.(status.error || 'Job failed');
          if (autoHide) {
            setTimeout(() => setIsVisible(false), 5000); // Hide after 5 seconds for errors
          }
        } else {
          // Continue polling for running/pending jobs
          setTimeout(pollJobStatus, 2000);
        }
      } catch (error) {
        console.error('Error polling job status:', error);
        setTimeout(pollJobStatus, 5000); // Retry after 5 seconds on error
      }
    };

    pollJobStatus();
  }, [jobId, onJobComplete, onJobError, autoHide]);

  if (!isVisible || !jobStatus) {
    return null;
  }

  const getStatusColor = () => {
    switch (jobStatus.status) {
      case 'pending': return 'admin-app-job-pending';
      case 'running': return 'admin-app-job-running';
      case 'completed': return 'admin-app-job-completed';
      case 'failed': return 'admin-app-job-failed';
      default: return 'admin-app-job-unknown';
    }
  };

  const getStatusText = () => {
    switch (jobStatus.status) {
      case 'pending': return 'Đang chờ xử lý...';
      case 'running': return 'Đang xử lý...';
      case 'completed': return 'Hoàn thành';
      case 'failed': return 'Thất bại';
      default: return 'Không xác định';
    }
  };

  const getProgressPercentage = () => {
    if (!jobStatus.progress || jobStatus.progress.total === 0) return 0;
    return Math.round((jobStatus.progress.completed / jobStatus.progress.total) * 100);
  };

  return (
    <div className={`admin-app-background-job-status ${getStatusColor()}`}>
      <div className="admin-app-job-header">
        <div className="admin-app-job-title">
          <span className="admin-app-job-type">
            {jobStatus.type === 'inventory_update' ? 'Cập nhật tồn kho' : 'Cập nhật đơn hàng'}
          </span>
          <span className="admin-app-job-id">#{jobStatus.id.slice(-8)}</span>
        </div>
        <div className="admin-app-job-status-text">
          {getStatusText()}
        </div>
      </div>

      {jobStatus.status === 'running' && jobStatus.progress && (
        <div className="admin-app-job-progress">
          <div className="admin-app-progress-bar">
            <div
              className="admin-app-progress-fill"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
          <div className="admin-app-progress-text">
            {jobStatus.progress.completed}/{jobStatus.progress.total}
            {jobStatus.progress.currentStep && (
              <span className="admin-app-progress-step">
                - {jobStatus.progress.currentStep}
              </span>
            )}
          </div>
        </div>
      )}

      {jobStatus.status === 'failed' && jobStatus.error && (
        <div className="admin-app-job-error">
          <div className="admin-app-error-message">
            {jobStatus.error}
          </div>
        </div>
      )}

      {jobStatus.status === 'completed' && (
        <div className="admin-app-job-success">
          <div className="admin-app-success-icon">✓</div>
          <div className="admin-app-success-message">
            Đã xử lý thành công
          </div>
        </div>
      )}
    </div>
  );
}
