import { NextApiRequest, NextApiResponse } from "next";

// Test endpoint for nilon packaging search example
const testNilonSearch = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    // Example from user: nilon packaging synonyms
    const testKeywords = {
      productName: "Bao bì nilon (not used in search)",
      synonyms: [
        "bao nilon",
        "túi nilon", 
        "màng nilon",
        "vật liệu đóng gói",
        "bao bì nhựa"
      ]
    };

    console.log('Testing nilon packaging search with synonyms only:', testKeywords.synonyms);
    console.log('ProductName will be ignored in search');

    // Test the search API
    const searchParams = new URLSearchParams({
      keywords: JSON.stringify(testKeywords),
      page: '1',
      pageSize: '10',
    });

    const response = await fetch(`${req.headers.origin}/api/searchProductsByKeywords?${searchParams}`);
    const result = await response.json();

    return res.status(200).json({
      message: "Nilon packaging search test completed",
      testKeywords,
      searchStrategy: "synonyms-only",
      note: "Only synonyms are used for search, productName is ignored",
      result: {
        hasData: !!result.data,
        dataKeys: result.data ? Object.keys(result.data) : [],
        totalGroups: result.data ? Object.keys(result.data).length : 0,
        totalProducts: result.data ? Object.values(result.data).reduce((total: number, group: any) => total + (group.count || 0), 0) : 0,
        pagination: result.pagination,
        debug: result.debug,
        searchStrategy: result.debug?.searchStrategy,
        synonymsUsed: result.debug?.synonyms,
        productNameUsed: result.debug?.productNameUsed,
        searchTime: result.debug?.searchTime
      }
    });
  } catch (error) {
    console.error("Error in testNilonSearch:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Nilon packaging search test failed"
    });
  }
};

export default testNilonSearch;
