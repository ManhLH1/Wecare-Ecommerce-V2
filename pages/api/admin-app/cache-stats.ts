import { NextApiRequest, NextApiResponse } from "next";
import { getCacheStats, clearAllCache, clearCachePattern } from "./_utils/cache";
import { getMetadataCacheStats, clearMetadataCachePattern } from "./_utils/metadataCache";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    try {
      const regularStats = getCacheStats();
      const metadataStats = getMetadataCacheStats();

      return res.status(200).json({
        success: true,
        data: {
          regular: regularStats,
          metadata: metadataStats,
          combined: {
            totalHits: regularStats.cacheHits + metadataStats.metadataHits,
            totalMisses: regularStats.cacheMisses + metadataStats.metadataMisses,
            totalRequests: regularStats.totalRequests + metadataStats.metadataTotalRequests,
            combinedHitRate: ((regularStats.cacheHits + metadataStats.metadataHits) /
              (regularStats.totalRequests + metadataStats.metadataTotalRequests)) * 100,
          }
        },
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
      const { pattern, type } = req.query;

      if (pattern && typeof pattern === "string") {
        // Clear cache for specific pattern
        clearCachePattern(pattern);
        clearMetadataCachePattern(pattern);
        return res.status(200).json({
          success: true,
          message: `Cache cleared for pattern: ${pattern}`,
        });
      } else if (type === 'metadata') {
        // Clear only metadata cache
        clearMetadataCachePattern('');
        return res.status(200).json({
          success: true,
          message: "Metadata cache cleared",
        });
      } else {
        // Clear all cache
        clearAllCache();
        clearMetadataCachePattern('');
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




















