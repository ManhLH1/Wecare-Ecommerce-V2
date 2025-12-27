import { NextApiRequest, NextApiResponse } from "next";
import { createBackgroundJob } from "./_backgroundJobs";
import { createJobNotification } from "./_notifications";

// Simple test endpoint to verify background job system
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { testType } = req.body;

    if (testType === 'background_job') {
      // Create a test background job
      const jobId = createBackgroundJob('inventory_update');

      // Simulate background processing (in real scenario, this would be async)
      setTimeout(() => {
        // Simulate job completion after 2 seconds
        const success = Math.random() > 0.3; // 70% success rate for testing

        // Update job status (in real code, this would be in background function)
        const { updateJobStatus } = require('./_backgroundJobs');
        updateJobStatus(jobId, success ? 'completed' : 'failed', {
          result: success ? { message: 'Test job completed successfully' } : undefined,
          error: success ? undefined : 'Simulated test error'
        });

        // Create notification
        createJobNotification(
          'Test Job',
          jobId,
          success,
          success ? undefined : 'Simulated test error',
          'test_user'
        );

        console.log(`[Test] Background job ${jobId} ${success ? 'completed' : 'failed'}`);
      }, 2000);

      res.status(200).json({
        success: true,
        message: 'Test background job created',
        jobId,
        info: 'Job will complete in ~2 seconds. Check status at /api/admin-app/job-status/[jobId]'
      });
    } else {
      res.status(400).json({
        error: "Invalid testType. Use 'background_job'"
      });
    }

  } catch (error: any) {
    console.error("Error in test endpoint:", error);
    res.status(500).json({
      error: "Test failed",
      details: error.message
    });
  }
}
