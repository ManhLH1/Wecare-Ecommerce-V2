import { NextApiRequest, NextApiResponse } from "next";

// Test endpoint specifically for synonyms search
const testSynonymsSearch = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { synonyms, productName } = req.query;
    
    if (!synonyms && !productName) {
      return res.status(400).json({
        error: "synonyms or productName is required",
        message: "Please provide synonyms or product name to test"
      });
    }

    // Create test keywords object (productName is for reference only)
    const testKeywords = {
      productName: productName || "Test Product (not used in search)",
      synonyms: synonyms ? (Array.isArray(synonyms) ? synonyms : [synonyms]) : []
    };

    console.log('Testing synonyms-only search with:', testKeywords);
    console.log('Note: Only synonyms will be used for search, productName is ignored');

    // Test the search API
    const searchParams = new URLSearchParams({
      keywords: JSON.stringify(testKeywords),
      page: '1',
      pageSize: '10',
    });

    const response = await fetch(`${req.headers.origin}/api/searchProductsByKeywords?${searchParams}`);
    const result = await response.json();

    return res.status(200).json({
      message: "Synonyms search test completed",
      testKeywords,
      result: {
        hasData: !!result.data,
        dataKeys: result.data ? Object.keys(result.data) : [],
        totalGroups: result.data ? Object.keys(result.data).length : 0,
        totalProducts: result.data ? Object.values(result.data).reduce((total: number, group: any) => total + (group.count || 0), 0) : 0,
        pagination: result.pagination,
        debug: result.debug,
        searchStrategy: result.debug?.searchStrategy,
        synonymsUsed: result.debug?.synonyms,
        productName: result.debug?.productName,
        searchTime: result.debug?.searchTime
      }
    });
  } catch (error) {
    console.error("Error in testSynonymsSearch:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Synonyms search test failed"
    });
  }
};

export default testSynonymsSearch;
