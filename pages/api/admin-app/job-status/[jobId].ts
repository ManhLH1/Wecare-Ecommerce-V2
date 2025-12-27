import { NextApiRequest, NextApiResponse } from "next";
import { getJobStatus } from "../_backgroundJobs";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { jobId } = req.query;

  if (!jobId || typeof jobId !== 'string') {
    return res.status(400).json({
      error: "Invalid jobId parameter"
    });
  }

  try {
    // Import the actual backgroundJobs map from the main file
    // For now, we'll use a simple approach - in production, use shared state management
    const job = getJobStatus(jobId);

    if (!job) {
      return res.status(404).json({
        error: "Job not found",
        jobId: jobId,
        message: "Job may have expired or completed"
      });
    }

    // Calculate job duration
    const now = new Date();
    const duration = job.startedAt ? now.getTime() - job.startedAt.getTime() : 0;

    res.status(200).json({
      jobId: job.id,
      type: job.type,
      status: job.status,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      durationMs: duration,
      progress: job.progress,
      result: job.result,
      error: job.error,
      // Human readable status
      statusText: {
        pending: "Đang chờ xử lý",
        running: "Đang thực hiện",
        completed: "Hoàn thành",
        failed: "Thất bại"
      }[job.status] || job.status
    });

  } catch (error: any) {
    console.error("Error checking job status:", error);
    res.status(500).json({
      error: "Failed to check job status",
      details: error.message
    });
  }
}
