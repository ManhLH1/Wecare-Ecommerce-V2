import { NextApiRequest, NextApiResponse } from "next";

// Test endpoint to debug search functionality
const testSearch = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { searchTerm, keywords } = req.query;
    
    if (!searchTerm && !keywords) {
      return res.status(400).json({
        error: "searchTerm or keywords is required",
        message: "Please provide a search term or AI keywords"
      });
    }

    // Test the search API
    const searchParams = new URLSearchParams({
      page: '1',
      pageSize: '10',
    });

    if (searchTerm) {
      searchParams.append('searchTerm', searchTerm as string);
    }

    if (keywords) {
      searchParams.append('keywords', keywords as string);
    }

    const response = await fetch(`${req.headers.origin}/api/searchProductsByKeywords?${searchParams}`);
    const result = await response.json();

    return res.status(200).json({
      message: "Test search completed",
      searchTerm,
      keywords: keywords ? JSON.parse(keywords as string) : null,
      result: {
        hasData: !!result.data,
        dataKeys: result.data ? Object.keys(result.data) : [],
        totalGroups: result.data ? Object.keys(result.data).length : 0,
        totalProducts: result.data ? Object.values(result.data).reduce((total: number, group: any) => total + (group.count || 0), 0) : 0,
        pagination: result.pagination,
        debug: result.debug,
        searchStrategy: result.debug?.searchStrategy,
        synonymsUsed: result.debug?.synonyms,
        productName: result.debug?.productName
      }
    });
  } catch (error) {
    console.error("Error in testSearch:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Test search failed"
    });
  }
};

export default testSearch;
