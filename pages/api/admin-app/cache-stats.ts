import { NextApiRequest, NextApiResponse } from "next";
import { getCacheStats, clearAllCache, clearCachePattern } from "./_utils/cache";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    try {
      const stats = getCacheStats();
      return res.status(200).json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to get cache stats",
      });
    }
  }

  if (req.method === "DELETE") {
    try {
      const { pattern } = req.query;

      if (pattern && typeof pattern === "string") {
        // Clear cache for specific pattern
        clearCachePattern(pattern);
        return res.status(200).json({
          success: true,
          message: `Cache cleared for pattern: ${pattern}`,
        });
      } else {
        // Clear all cache
        clearAllCache();
        return res.status(200).json({
          success: true,
          message: "All cache cleared",
        });
      }
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to clear cache",
      });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}








