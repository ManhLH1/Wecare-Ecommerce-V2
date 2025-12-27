import { NextApiRequest, NextApiResponse } from "next";
import { getJobStatus } from "../_backgroundJobs";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { jobIds } = req.body;

  if (!jobIds || !Array.isArray(jobIds)) {
    return res.status(400).json({
      error: "jobIds array is required in request body"
    });
  }

  try {
    const results: any[] = [];
    const now = new Date();

    for (const jobId of jobIds) {
      const job = getJobStatus(jobId);

      if (job) {
        const duration = job.startedAt ? now.getTime() - job.startedAt.getTime() : 0;
        results.push({
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
          statusText: {
            pending: "Đang chờ xử lý",
            running: "Đang thực hiện",
            completed: "Hoàn thành",
            failed: "Thất bại"
          }[job.status] || job.status
        });
      } else {
        results.push({
          jobId,
          status: "not_found",
          error: "Job not found or expired",
          statusText: "Không tìm thấy"
        });
      }
    }

    res.status(200).json({
      requested: jobIds.length,
      found: results.filter(r => r.status !== "not_found").length,
      results
    });

  } catch (error: any) {
    console.error("Error checking batch job status:", error);
    res.status(500).json({
      error: "Failed to check batch job status",
      details: error.message
    });
  }
}
