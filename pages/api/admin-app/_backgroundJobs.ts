// Shared background job manager for admin app
// This provides a centralized way to manage background jobs across API routes

export interface BackgroundJob {
  id: string;
  type: 'inventory_update' | 'sale_order_update';
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  progress?: {
    total: number;
    completed: number;
    currentStep?: string;
  };
  result?: any;
  error?: string;
}

// In-memory job store (in production, use Redis or database)
const backgroundJobs = new Map<string, BackgroundJob>();

export function createBackgroundJob(type: BackgroundJob['type']): string {
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const job: BackgroundJob = {
    id: jobId,
    type,
    status: 'pending',
    createdAt: new Date()
  };
  backgroundJobs.set(jobId, job);
  return jobId;
}

export function updateJobStatus(jobId: string, status: BackgroundJob['status'], data?: Partial<BackgroundJob>) {
  const job = backgroundJobs.get(jobId);
  if (job) {
    job.status = status;
    if (data) {
      Object.assign(job, data);
    }
    if (status === 'running' && !job.startedAt) {
      job.startedAt = new Date();
    }
    if (status === 'completed' || status === 'failed') {
      job.completedAt = new Date();
    }
  }
}

export function getJobStatus(jobId: string): BackgroundJob | null {
  return backgroundJobs.get(jobId) || null;
}

export function getAllJobs(): BackgroundJob[] {
  return Array.from(backgroundJobs.values());
}

// Clean up old jobs (older than 1 hour)
export function cleanupOldJobs() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  for (const [jobId, job] of backgroundJobs) {
    if (job.createdAt < oneHourAgo) {
      backgroundJobs.delete(jobId);
    }
  }
}

// Auto cleanup every 10 minutes
setInterval(cleanupOldJobs, 10 * 60 * 1000);
