import { NextApiRequest, NextApiResponse } from "next";
import { getAllJobs } from "../_backgroundJobs";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const jobs = getAllJobs();

    // Group jobs by status for summary
    const summary = jobs.reduce((acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    res.status(200).json({
      totalJobs: jobs.length,
      summary,
      jobs: jobs.slice(-10), // Return last 10 jobs
      info: "Use /api/admin-app/job-status/[jobId] to check specific job details"
    });

  } catch (error: any) {
    console.error("Error listing jobs:", error);
    res.status(500).json({
      error: "Failed to list jobs",
      details: error.message
    });
  }
}
