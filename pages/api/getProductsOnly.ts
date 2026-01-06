import { NextApiRequest, NextApiResponse } from "next";
import axios, { AxiosError } from "axios";
import { getAccessToken } from "./getAccessToken";
import { LRUCache } from "lru-cache";
import http from "http";
import https from "https";
// Removed unused import

// ======= Constants & Configurations =======
const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";
const DEFAULT_TIMEOUT = 60000;  // 60 seconds
const MAX_SOCKETS = 50;
const MAX_FREE_SOCKETS = 10;
const KEEP_ALIVE_MS = 50000;  // 50 seconds

// ======= Cache Configuration =======
const CACHE_CONFIG = {
  productsCache: {
    max: 1000,
    ttl: 1800000, // 30 minutes
    updateAgeOnGet: true,
    ttlAutopurge: true,
    allowStale: true,
  },
  sidebarSearchCache: {
    max: 1000,  // Increased from 500 to 1000
    ttl: 3600000, // 1 hour (increased from 30 minutes)
    updateAgeOnGet: true,
    ttlAutopurge: true, 
    allowStale: true,
    staleWhileRevalidate: true  // Add stale-while-revalidate capability
  }
} as const;

// Initialize caches with proper typing
const cache = new LRUCache<string, any>(CACHE_CONFIG.productsCache);
const sidebarSearchCache = new LRUCache<string, any>(CACHE_CONFIG.sidebarSearchCache);

// ======= Axios Configuration =======
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "OData-MaxVersion": "4.0",
    "OData-Version": "4.0",
    "Prefer": "odata.maxpagesize"
  },
  timeout: DEFAULT_TIMEOUT,
  maxRedirects: 5,
  decompress: true,
  httpAgent: new http.Agent({
    keepAlive: true,
    keepAliveMsecs: KEEP_ALIVE_MS,
    maxSockets: MAX_SOCKETS,
    maxFreeSockets: MAX_FREE_SOCKETS,
    timeout: DEFAULT_TIMEOUT,
    scheduling: 'lifo'
  }),
  httpsAgent: new https.Agent({
    keepAlive: true,
    keepAliveMsecs: KEEP_ALIVE_MS,
    maxSockets: MAX_SOCKETS,
    maxFreeSockets: MAX_FREE_SOCKETS,
    timeout: DEFAULT_TIMEOUT,
    scheduling: 'lifo'
  })
});

// ======= Helper Functions =======
// Escape single quotes for safe OData literal interpolation
const escapeODataLiteral = (value: string) => (value ?? '').replace(/'/g, "''");
const getHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
  "OData-MaxVersion": "4.0",
  "OData-Version": "4.0",
});

// URL Slug utility functions
const textToSlug = (text: string): string => {
  if (!text) return '';
  return text
    .normalize('NFD')                     // Normalize diacritics
    .replace(/[\u0300-\u036f]/g, '')      // Remove diacritics
    .toLowerCase()
    .replace(/[đĐ]/g, 'd')                // Handle Vietnamese characters
    .replace(/[^\w\s-]/g, '')             // Remove special characters
    .replace(/\s+/g, '-')                 // Replace spaces with hyphens
    .replace(/-+/g, '-')                  // Remove consecutive hyphens
    .trim();
};

const slugToText = (slug: string): string => {
  if (!slug) return '';
  
  // First, replace hyphens with spaces
  let result = slug.replace(/-/g, ' ').trim();
  
  // Check for dimension patterns and add parentheses
  // Match patterns like 1m5, 2m4, etc.
  const dimensionPattern = /(\d+m\d+)/g;
  if (dimensionPattern.test(result)) {
    result = result.replace(dimensionPattern, '($1)');
  }
  
  return result;
};

// Calculate relevance score for search results
const calculateRelevanceScore = (productName: string, searchText: string): number => {
  let score = 0;
  const normalizedProduct = productName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase();
  
  const normalizedSearch = searchText
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase();
  
  // Exact match gets highest score
  if (normalizedProduct === normalizedSearch) {
    score += 100;
  }
  
  // Starts with search term gets high score
  if (normalizedProduct.startsWith(normalizedSearch)) {
    score += 50;
  }
  
  // Contains search term as whole phrase gets medium-high score
  if (normalizedProduct.includes(normalizedSearch)) {
    score += 30;
  }
  
  // Word-by-word matching
  const searchWords = normalizedSearch.split(/\s+/);
  const productWords = normalizedProduct.split(/\s+/);
  
  let exactWordMatches = 0;
  let partialWordMatches = 0;
  
  searchWords.forEach(searchWord => {
    if (productWords.some(productWord => productWord === searchWord)) {
      exactWordMatches++;
    } else if (productWords.some(productWord => productWord.includes(searchWord))) {
      partialWordMatches++;
    }
  });
  
  // Exact word matches get higher score
  score += (exactWordMatches / searchWords.length) * 40;
  // Partial word matches get lower score
  score += (partialWordMatches / searchWords.length) * 10;
  
  return score;
};

// Enhanced search function for products with AI keywords support
const findProductsByFullname = (products: any[], searchInput: string | string[], isSidebarSearch = false): any[] => {
  if (!searchInput) return products;
  
  // Handle both string and array inputs
  const searchKeywords = Array.isArray(searchInput) ? searchInput : [searchInput];
  
  // Enhanced Vietnamese diacritics normalization
  const normalizeVietnamese = (text: string): string => {
    return text.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[đĐ]/g, 'd')           // Handle đ/Đ specifically
      .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
      .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
      .replace(/[ìíịỉĩ]/g, 'i')
      .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
      .replace(/[ùúụủũưừứựửữ]/g, 'u')
      .replace(/[ỳýỵỷỹ]/g, 'y')
      .trim();
  };
  
  // Normalize all search keywords
  const normalizedKeywords = searchKeywords.map(keyword => normalizeVietnamese(keyword));
  
  // Create variations for each keyword
  const getAllVariations = (text: string) => [
    text,
    text.replace(/\(/g, '').replace(/\)/g, ''), // Without parentheses
    text.replace(/\s+/g, ''),                   // Without spaces
    text.replace(/[-_]/g, ' ')                  // Replace hyphens/underscores with spaces
  ];
  
  // Get all search words from all keywords
  const allSearchWords = normalizedKeywords.flatMap(keyword => 
    keyword.split(/\s+/).filter(word => word.length > 1)
  );
  
  let matchedProducts = 0;
  let totalMatches = 0;
  
  const result = products.filter(product => {
    // For sidebar search, only use crdfd_fullname
    if (isSidebarSearch) {
      if (!product.crdfd_fullname) return false;
      
      // Normalize the product name using the same function
      const productFullName = normalizeVietnamese(product.crdfd_fullname);
      
      // Try all keywords and their variations for exact matching
      for (const keyword of normalizedKeywords) {
        const variations = getAllVariations(keyword);
        for (const variation of variations) {
          if (productFullName.includes(variation)) {
            totalMatches++;
            if (totalMatches <= 5) { // Log first 5 matches
              console.log(`Match found: "${variation}" in "${product.crdfd_fullname}"`);
            }
            return true;
          }
        }
      }
      
      // Try word boundary matching for better precision
      const productWords = productFullName.split(/\s+/);
      
      let exactWordMatches = 0;
      allSearchWords.forEach(searchWord => {
        if (productWords.some(productWord => productWord === searchWord)) {
          exactWordMatches++;
        }
      });
      
      // If we have exact word matches, prioritize them
      if (exactWordMatches > 0) {
        return true;
      }
      
      // Try word-by-word matching with a threshold
      const matchingWords = allSearchWords.filter(word => productFullName.includes(word));
      const matchScore = matchingWords.length / allSearchWords.length;
      
      // If we have 1+ matching word(s) and the score meets the threshold, consider it a match
      // Lower threshold for longer search terms with more words
      const threshold = allSearchWords.length >= 3 ? 0.3 : 0.5; // Lowered threshold for better matching
      
      if ((matchingWords.length >= 1 && matchScore >= threshold) || 
          (matchingWords.length >= 2) || 
          (matchingWords.length === 1 && allSearchWords.length === 1)) {
        return true;
      }
      
      return false;
    } 
    // For regular search, use both crdfd_fullname and crdfd_name
    else {
      if (!product.crdfd_fullname && !product.crdfd_name) return false;
      
      // Normalize the product names using the same function
      const productFullName = product.crdfd_fullname ? normalizeVietnamese(product.crdfd_fullname) : '';
      const productName = product.crdfd_name ? normalizeVietnamese(product.crdfd_name) : '';
      
      // Try all keywords and their variations for exact matching in either field
      for (const keyword of normalizedKeywords) {
        const variations = getAllVariations(keyword);
        for (const variation of variations) {
          if (productFullName.includes(variation) || productName.includes(variation)) {
            totalMatches++;
            if (totalMatches <= 5) { // Log first 5 matches
              console.log(`Match found: "${variation}" in "${product.crdfd_fullname || product.crdfd_name}"`);
            }
            return true;
          }
        }
      }
      
      // Try word boundary matching for better precision
      const productWordsFullName = productFullName.split(/\s+/);
      const productWordsName = productName.split(/\s+/);
      
      let exactWordMatches = 0;
      allSearchWords.forEach(searchWord => {
        if (productWordsFullName.some(productWord => productWord === searchWord) ||
            productWordsName.some(productWord => productWord === searchWord)) {
          exactWordMatches++;
        }
      });
      
      // If we have exact word matches, prioritize them
      if (exactWordMatches > 0) {
        return true;
      }
      
      // Try word-by-word matching with a threshold
      const matchingWordsFullName = allSearchWords.filter(word => productFullName.includes(word));
      const matchingWordsName = allSearchWords.filter(word => productName.includes(word));
      
      // Use the better match from either field
      const matchingWords = matchingWordsFullName.length > matchingWordsName.length ? 
                          matchingWordsFullName : matchingWordsName;
      
      const matchScore = matchingWords.length / allSearchWords.length;
      
      // If we have 1+ matching word(s) and the score meets the threshold, consider it a match
      // Lower threshold for longer search terms with more words
      const threshold = allSearchWords.length >= 3 ? 0.3 : 0.5; // Lowered threshold for better matching
      
      if ((matchingWords.length >= 1 && matchScore >= threshold) || 
          (matchingWords.length >= 2) || 
          (matchingWords.length === 1 && allSearchWords.length === 1)) {
        return true;
      }
      
      return false;
    }
  });
  
  return result;
};

// Add grouping function
const getActualPrice = (product: any) => {
  if (product.cr1bb_json_gia && Array.isArray(product.cr1bb_json_gia) && product.cr1bb_json_gia.length > 0) {
    const activePrice = product.cr1bb_json_gia.find(
      (item: any) => item.crdfd_trangthaihieulucname === "Còn hiệu lực" || item.crdfd_trangthaihieuluc === 191920000
    );
    if (activePrice && activePrice.crdfd_gia) return parseFloat(activePrice.crdfd_gia);
    
    // If no active price found, take the first price
    if (product.cr1bb_json_gia[0] && product.cr1bb_json_gia[0].crdfd_gia) {
      return parseFloat(product.cr1bb_json_gia[0].crdfd_gia);
    }
    return 0; // Return 0 if no active price found
  }
  if (product.crdfd_gia && product.crdfd_gia > 0) return product.crdfd_gia;
  if (product.crdfd_giatheovc && product.crdfd_giatheovc > 0) return product.crdfd_giatheovc;
  // if (typeof product.cr1bb_giaban === 'number' && product.cr1bb_giaban > 0) return product.cr1bb_giaban;
  // if (typeof product.cr1bb_giaban === 'string') {
  //   const priceMatch = product.cr1bb_giaban.match(/\d+(\.\d+)?/);
  //   if (priceMatch && priceMatch[0]) return parseFloat(priceMatch[0]);
  // }
  return 0;
};

// Helper function to apply price range filter
const applyPriceRangeFilter = (products: any[], priceMin: number, priceMax: number): any[] => {
  if (priceMin <= 0 && priceMax <= 0) {
    return products; // No price filter applied
  }

  return products.filter(product => {
    const price = getActualPrice(product);
    
    // Giữ lại sản phẩm không có giá (price <= 0)
    if (price <= 0) return true;
    
    if (priceMin > 0 && priceMax > 0) {
      return price >= priceMin && price <= priceMax;
    } else if (priceMin > 0) {
      return price >= priceMin;
    } else if (priceMax > 0) {
      return price <= priceMax;
    }
    
    return true;
  });
};

const groupProductsByParentCategory = (products: any[]) => {
  const groupedProducts: Record<string, any> = {};
  
  products.forEach(product => {
    const parentCategory = product.crdfd_nhomsanphamtext || 'Uncategorized';
    
    if (!groupedProducts[parentCategory]) {
      groupedProducts[parentCategory] = {
        products: [],
        count: 0,
        priceRange: {
          min: 0,
          max: 0
        }
      };
    }
    
    groupedProducts[parentCategory].products.push(product);
    groupedProducts[parentCategory].count++;
  });
  
  // Tính lại priceRange và sắp xếp sản phẩm trong từng nhóm
  Object.keys(groupedProducts).forEach(key => {
    const group = groupedProducts[key];
    
    // Sắp xếp sản phẩm: sản phẩm có cr1bb_json_gia hợp lệ lên trên
    group.products.sort((a: any, b: any) => {
      // Kiểm tra kỹ lưỡng cr1bb_json_gia
      const aHasValidJsonGia = a.cr1bb_json_gia !== null && 
                              a.cr1bb_json_gia !== undefined && 
                              a.cr1bb_json_gia !== '' && 
                              (typeof a.cr1bb_json_gia === 'string' ? a.cr1bb_json_gia.trim() !== '' : true);
      
      const bHasValidJsonGia = b.cr1bb_json_gia !== null && 
                              b.cr1bb_json_gia !== undefined && 
                              b.cr1bb_json_gia !== '' && 
                              (typeof b.cr1bb_json_gia === 'string' ? b.cr1bb_json_gia.trim() !== '' : true);
      
      // Nếu a có giá trị hợp lệ và b không có -> a lên trên
      if (aHasValidJsonGia && !bHasValidJsonGia) return -1;
      // Nếu a không có giá trị hợp lệ và b có -> b lên trên
      if (!aHasValidJsonGia && bHasValidJsonGia) return 1;
      // Nếu cả hai cùng có hoặc cùng không có -> giữ nguyên thứ tự
      return 0;
    });

    // Tính lại priceRange cho từng nhóm dựa trên giá thực tế
    const validPrices = group.products
      .map(getActualPrice)
      .filter((price: number) => !isNaN(price) && price > 0);
    if (validPrices.length > 0) {
      group.priceRange.min = Math.min(...validPrices);
      group.priceRange.max = Math.max(...validPrices);
    } else {
      group.priceRange.min = 0;
      group.priceRange.max = 0;
    }
  });
  
  // Filter out groups with no products
  const nonEmptyGroups: Record<string, any> = {};
  Object.keys(groupedProducts).forEach(key => {
    if (groupedProducts[key].count > 0) {
      nonEmptyGroups[key] = groupedProducts[key];
    }
  });
  
  return nonEmptyGroups;
};

// Add pagination function
const paginateGroupedProducts = (
  groupedProducts: Record<string, any>,
  page: number,
  pageSize: number,
  isProductGroupSearch: boolean = false
): {
  data: Record<string, any>;
  pagination: {
    currentPage: number;
    pageSize: number;
    totalGroups: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    isProductGroupSearch: boolean;
  };
  cached?: boolean;
} => {
  const groupKeys = Object.keys(groupedProducts);
  const totalGroups = groupKeys.length;
  const totalPages = Math.ceil(totalGroups / pageSize);
  
  // Ensure valid page number
  const currentPage = page < 1 ? 1 : page > totalPages ? totalPages : page;
  
  // Get keys for current page
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalGroups);
  const currentPageKeys = groupKeys.slice(startIndex, endIndex);
  
  // Create result object with only groups for current page
  const paginatedGroups: Record<string, any> = {};
  currentPageKeys.forEach(key => {
    paginatedGroups[key] = groupedProducts[key];
  });
  
  return {
    data: paginatedGroups,
    pagination: {
      currentPage,
      pageSize,
      totalGroups,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
      isProductGroupSearch
    }
  };
};

// Add cache key generator function
const generateCacheKey = (url: string, options: any, params: any): string => {
  const key = {
    url,
    productGroupId: params.productGroupId,
    searchTerm: params.searchTerm,
    fullnameSearch: params.fullnameSearch,
    doiTuong: params.doiTuong,
    isSidebarSearch: params.isSidebarSearch
  };
  return JSON.stringify(key);
};

// Optimized fetchWithRetry for sidebar searches
const fetchWithRetry = async (
  url: string,
  options: any,
  isSidebarSearch = false,
  params: any = {},
  retries = 3,
  baseDelay = 1000
): Promise<any> => {
  const key = generateCacheKey(url, options, params);
  
  // Check the appropriate cache based on request type
  const relevantCache = isSidebarSearch ? sidebarSearchCache : cache;
  const cachedResponse = relevantCache.get(key);

  if (cachedResponse) {
    // If it's a sidebar search and we have stale data, use it while fetching fresh data
    if (isSidebarSearch && relevantCache.has(key)) {
      // Return cached data immediately
      const staleData = relevantCache.get(key);
      
      // Fetch fresh data in the background
      fetchFreshData(url, options, key, relevantCache, retries, baseDelay)
        .catch(console.error); // Handle background fetch errors silently
      
      return staleData;
    }
    return cachedResponse;
  }

  return fetchFreshData(url, options, key, relevantCache, retries, baseDelay);
};

// Helper function to fetch fresh data
const fetchFreshData = async (
  url: string,
  options: any,
  key: string,
  cache: LRUCache<string, any>,
  retries: number,
  baseDelay: number
): Promise<any> => {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      const response = await api.get(url, options);
      cache.set(key, response);
      return response;
    } catch (error: any) {
      lastError = error;
      if (error.response?.status === 429) {
        const retryAfter = parseInt(error.response.headers["retry-after"] || "5");
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      } else {
        await new Promise((resolve) =>
          setTimeout(resolve, baseDelay * Math.pow(2, i))
        );
      }
    }
  }
  throw lastError;
};

// ======= Helper Functions =======
const BAN_CHAT_GIA_PHAT_RA_MAP: Record<number, string> = {
  283640000: 'Giá đã bao gồm VAT',
  283640001: 'Giá chưa bao gồm VAT',
  283640002: 'Giá đã bao gồm VAT (VAT hỗ trợ)'
};

function getBanChatGiaPhatRaText(value: number | string | undefined): string {
  if (value === undefined || value === null) return '';
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  return BAN_CHAT_GIA_PHAT_RA_MAP[num] || '';
}

// Add JSON parsing helper function
const parseNestedJson = (data: any[], doiTuong: string) => {
  const processedProducts: any[] = [];
  
  data.forEach(product => {
    // Parse cr1bb_levelproductgroup if it exists
    if (product.cr1bb_levelproductgroup && typeof product.cr1bb_levelproductgroup === 'string') {
      try {
        product.cr1bb_levelproductgroup = JSON.parse(product.cr1bb_levelproductgroup);
      } catch (error) {
        console.error(`Error parsing cr1bb_levelproductgroup for product ${product.crdfd_productsid}:`, error);
        product.cr1bb_levelproductgroup = null;
      }
    }

    if (product.cr1bb_json_gia && typeof product.cr1bb_json_gia === 'string') {
      try {
        const parsedJson = JSON.parse(product.cr1bb_json_gia);
        
        if (parsedJson.length > 0) {
          // Lọc các item theo doiTuong
          const filteredItems = parsedJson.filter((item: any) => {
            if (!doiTuong) {
              // Nếu không có doiTuong, lấy giá Shop
              return item.crdfd_nhomoituongname === "Shop";
            }
            try {
              // Parse doiTuong từ string thành mảng
              const doiTuongList = JSON.parse(doiTuong);
              // Chuyển đổi cả hai về chữ thường để so sánh
              const itemId = item.crdfd_nhomoituong.toLowerCase();
              const isIncluded = doiTuongList.some((id: any) => id.toLowerCase() === itemId);
              return isIncluded;
            } catch (e) {
              // Nếu có lỗi khi parse, mặc định lấy giá Shop
              return item.crdfd_nhomoituongname === "Shop";
            }
          });

          // Nếu không có item nào thỏa mãn điều kiện, lấy item có crdfd_nhomoituongname là "Shop"
          const itemsToProcess = filteredItems.length > 0 ? filteredItems : 
            parsedJson.filter((item: any) => item.crdfd_nhomoituongname === "Shop");

          // Nếu có nhiều giá, lấy giá thấp nhất
          if (itemsToProcess.length > 1) {
            // Sắp xếp theo giá thấp nhất
            itemsToProcess.sort((a: any, b: any) => {
              const priceA = a.crdfd_giatheovc || a.crdfd_gia || 0;
              const priceB = b.crdfd_giatheovc || b.crdfd_gia || 0;
              return priceA - priceB;
            });
            // Chỉ lấy item có giá thấp nhất
            const lowestPriceItem = itemsToProcess[0];
            itemsToProcess.length = 0;
            itemsToProcess.push(lowestPriceItem);
          }

          itemsToProcess.forEach((item: any) => {
            const productCopy = { ...product };
            productCopy.cr1bb_json_gia = [{
              ...item,
              crdfd_nhomoituongname: item.crdfd_nhomoituongname || "Shop",
              crdfd_productsid: product.crdfd_productsid || null,
              crdfd_sanpham: item.crdfd_sanpham || product.crdfd_productsid || null,
              crdfd_sanphamname: item.crdfd_sanphamname || product.crdfd_fullname || null,
              crdfd_sanphamtext: item.crdfd_sanphamtext || product.crdfd_fullname || null,
              cr1bb_nhomsanpham: item.cr1bb_nhomsanpham || product.crdfd_nhomsanphamtext || null,
              cr1bb_giakhongvat: item.cr1bb_giakhongvat ?? null
            }];
            // Thêm text mapping cho cr1bb_banchatgiaphatra
            productCopy.cr1bb_banchatgiaphatra_text = getBanChatGiaPhatRaText(productCopy.cr1bb_banchatgiaphatra);
            processedProducts.push(productCopy);
          });
        } else {
          // Thêm text mapping cho cr1bb_banchatgiaphatra
          product.cr1bb_banchatgiaphatra_text = getBanChatGiaPhatRaText(product.cr1bb_banchatgiaphatra);
          processedProducts.push(product);
        }
      } catch (error) {
        console.error(`Error parsing cr1bb_json_gia for product ${product.crdfd_productsid}:`, error);
        // Thêm text mapping cho cr1bb_banchatgiaphatra
        product.cr1bb_banchatgiaphatra_text = getBanChatGiaPhatRaText(product.cr1bb_banchatgiaphatra);
        processedProducts.push(product);
      }
    } else {
      // Thêm text mapping cho cr1bb_banchatgiaphatra
      product.cr1bb_banchatgiaphatra_text = getBanChatGiaPhatRaText(product.cr1bb_banchatgiaphatra);
      processedProducts.push(product);
    }
  });
  
  return processedProducts;
};

// ======= Main Handler =======
const getProductsOnly = async (req: NextApiRequest, res: NextApiResponse) => {
  const startTime = performance.now();
  try {
    // Parse and normalize query parameters
    let fullnameParam = Array.isArray(req.query.fullname)
      ? req.query.fullname[0]
      : req.query.fullname || "";
    
    // Convert slug to search text if it's in slug format
    if (fullnameParam && !fullnameParam.includes(' ') && fullnameParam.includes('-')) {
      const originalSlug = fullnameParam;
      fullnameParam = slugToText(fullnameParam);
    }
    
    const params = {
      searchTerm: Array.isArray(req.query.searchTerm)
        ? req.query.searchTerm[0]
        : req.query.searchTerm || "",
      keywords: Array.isArray(req.query.keywords)
        ? req.query.keywords[0]
        : req.query.keywords || "",
      fullnameSearch: fullnameParam,
      productGroupId: Array.isArray(req.query.product_group_Id)
        ? req.query.product_group_Id[0]
        : req.query.product_group_Id || "",
      page: Array.isArray(req.query.page) 
        ? parseInt(req.query.page[0]) || 1 
        : parseInt(req.query.page as string) || 1,
      pageSize: Array.isArray(req.query.pageSize) 
        ? parseInt(req.query.pageSize[0]) || 10 
        : parseInt(req.query.pageSize as string) || 10,
      all: req.query.all !== undefined,
      isSidebarSearch: req.query.sidebar === "true",
      doiTuong: Array.isArray(req.query.doiTuong)
        ? req.query.doiTuong[0]
        : req.query.doiTuong || "",
      // Advanced filter parameters (parse safely)
      filterThuongHieu: (() => { try { return req.query.filterThuongHieu ? JSON.parse(req.query.filterThuongHieu as string) : []; } catch { return []; } })(),
      filterQuyCach: (() => { try { return req.query.filterQuyCach ? JSON.parse(req.query.filterQuyCach as string) : []; } catch { return []; } })(),
      filterHoanThien: (() => { try { return req.query.filterHoanThien ? JSON.parse(req.query.filterHoanThien as string) : []; } catch { return []; } })(),
      filterChatLieu: (() => { try { return req.query.filterChatLieu ? JSON.parse(req.query.filterChatLieu as string) : []; } catch { return []; } })(),
      filterDonVi: (() => { try { return req.query.filterDonVi ? JSON.parse(req.query.filterDonVi as string) : []; } catch { return []; } })(),
      priceMin: req.query.priceMin ? parseFloat(req.query.priceMin as string) : 0,
      priceMax: req.query.priceMax ? parseFloat(req.query.priceMax as string) : 0,
    };


    // When using product_group_Id, we want to get all data without pagination
    const getAllData = params.all;

    const token = await getAccessToken();
    
    // Adjust columns based on search type
    let PRODUCT_COLUMNS = "crdfd_name,crdfd_productsid,crdfd_fullname,crdfd_masanpham," +
      "_crdfd_productgroup_value,cr1bb_nhomsanphamcha,crdfd_manhomsp,crdfd_thuonghieu," +
      "crdfd_quycach,crdfd_chatlieu,crdfd_hoanthienbemat,crdfd_nhomsanphamtext,crdfd_gtgt,cr1bb_imageurlproduct,cr1bb_imageurl," +
      "_crdfd_productgroup_value,crdfd_nhomsanphamtext,crdfd_unitname,crdfd_onvichuantext,cr1bb_json_gia,cr1bb_levelproductgroup," +
      "cr1bb_banchatgiaphatra,crdfd_gtgt_value,cr1bb_banchatgiaphatra";
    
    // For sidebar searches, limit the columns to improve performance
    if (params.isSidebarSearch && params.productGroupId) {
      PRODUCT_COLUMNS = "crdfd_productsid,crdfd_fullname,crdfd_nhomsanphamtext,crdfd_masanpham," + 
        "_crdfd_productgroup_value,cr1bb_imageurl,cr1bb_json_gia,crdfd_unitname,cr1bb_levelproductgroup," +
        "cr1bb_banchatgiaphatra,crdfd_gtgt_value";
    }
  
    // Build product query
    const table = "crdfd_productses";
    
    // Base filter that returns all active products when no parameters are provided
    let filter = "statecode eq 0";

    // Apply searchTerm to search in crdfd_fullname and crdfd_name fields with keyword splitting
    if (params.searchTerm) {
      const searchTermProcessed = params.searchTerm.trim().toLowerCase();
      if (searchTermProcessed) {
        // Also create a version without diacritics for better matching
        const searchTermNoDiacritics = searchTermProcessed
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[đĐ]/g, 'd');
        // Split search term into meaningful keywords
        // First, try to identify compound terms and common product terms
        const words = searchTermProcessed.split(/\s+/);
        const searchKeywords = [];
        
        // Process words to create meaningful search terms
        for (let i = 0; i < words.length; i++) {
          const word = words[i];
          
          // Skip very short words (less than 2 characters)
          if (word.length < 2) continue;
          
          // Add individual word (both original and no-diacritics version)
          searchKeywords.push(word);
          const wordNoDiacritics = word
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[đĐ]/g, 'd');
          if (wordNoDiacritics !== word) {
            searchKeywords.push(wordNoDiacritics);
          }
          
          // Create compound terms for adjacent words
          if (i < words.length - 1) {
            const nextWord = words[i + 1];
            if (nextWord.length >= 2) {
              // Add 2-word combinations (both versions)
              searchKeywords.push(`${word} ${nextWord}`);
              const nextWordNoDiacritics = nextWord
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[đĐ]/g, 'd');
              searchKeywords.push(`${wordNoDiacritics} ${nextWordNoDiacritics}`);
            }
          }
          
          // Create 3-word combinations for better matching
          if (i < words.length - 2) {
            const nextWord = words[i + 1];
            const thirdWord = words[i + 2];
            if (nextWord.length >= 2 && thirdWord.length >= 2) {
              searchKeywords.push(`${word} ${nextWord} ${thirdWord}`);
              const nextWordNoDiacritics = nextWord
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[đĐ]/g, 'd');
              const thirdWordNoDiacritics = thirdWord
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[đĐ]/g, 'd');
              searchKeywords.push(`${wordNoDiacritics} ${nextWordNoDiacritics} ${thirdWordNoDiacritics}`);
            }
          }
        }
        
        // Remove duplicates and limit to reasonable number
        const uniqueKeywords = [...new Set(searchKeywords)].slice(0, 10);
        const escapedKeywords = uniqueKeywords.map(escapeODataLiteral);
        
        
        if (uniqueKeywords.length > 0) {
          // For single keyword searches, do a simple contains
          if (escapedKeywords.length === 1) {
            if (!params.isSidebarSearch) {
              filter += ` and (contains(crdfd_fullname, '${escapedKeywords[0]}') or contains(crdfd_name, '${escapedKeywords[0]}'))`;
            } else {
              filter += ` and contains(crdfd_fullname, '${escapedKeywords[0]}')`;
            }
          } 
          // For multi-keyword searches, try to match ANY of the keywords (OR logic)
          else {
            // Create OR conditions for each keyword
            const keywordFilters = escapedKeywords.map(keyword => {
              if (!params.isSidebarSearch) {
                return `(contains(crdfd_fullname, '${keyword}') or contains(crdfd_name, '${keyword}'))`;
              } else {
                return `contains(crdfd_fullname, '${keyword}')`;
              }
            });
            
            filter += ` and (${keywordFilters.join(' or ')})`;
          }
          
        }
      }
    }
    
    // For fullname search from the 'fullname' parameter (mainly used in non-sidebar search)
    if (params.fullnameSearch) {
      const searchTerms = params.fullnameSearch
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 1);  // Only use words with 2+ characters
      
      // Also create no-diacritics versions of search terms
      const searchTermsNoDiacritics = searchTerms.map(term => 
        term.normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[đĐ]/g, 'd')
      );
      
      if (searchTerms.length > 0) {
        // For single word searches, do a simple contains
        if (searchTerms.length === 1) {
          // Only use both fields for non-sidebar searches
          if (!params.isSidebarSearch) {
            const term = escapeODataLiteral(searchTerms[0]);
            const termNoDiacritics = escapeODataLiteral(searchTermsNoDiacritics[0]);
            filter += ` and (contains(crdfd_fullname, '${term}') or contains(crdfd_name, '${term}') or contains(crdfd_fullname, '${termNoDiacritics}') or contains(crdfd_name, '${termNoDiacritics}'))`;
          } else {
            // For sidebar searches, maintain original behavior
            const term = escapeODataLiteral(searchTerms[0]);
            const termNoDiacritics = escapeODataLiteral(searchTermsNoDiacritics[0]);
            filter += ` and (contains(crdfd_fullname, '${term}') or contains(crdfd_fullname, '${termNoDiacritics}'))`;
          }
        } 
        // For multi-word searches, try to match all significant terms
        else {
          // Get significant words (3+ characters) for more precise matching
          const significantTerms = searchTerms.filter(term => term.length >= 3);
          const significantTermsNoDiacritics = searchTermsNoDiacritics.filter(term => term.length >= 3);
          // Get shorter terms for fallback matching
          const shortTerms = searchTerms.filter(term => term.length < 3);
          const shortTermsNoDiacritics = searchTermsNoDiacritics.filter(term => term.length < 3);
          
          let fullnameFilters = [];
          
          // Add conditions for significant terms (try to match ALL of them)
          if (significantTerms.length > 0) {
            if (!params.isSidebarSearch) {
              // For non-sidebar searches, include both fields and both diacritics versions
              const significantFilterFullname = significantTerms
                .map(term => `contains(crdfd_fullname, '${escapeODataLiteral(term)}')`)
                .join(' and ');
              const significantFilterFullnameNoDiacritics = significantTermsNoDiacritics
                .map(term => `contains(crdfd_fullname, '${escapeODataLiteral(term)}')`)
                .join(' and ');
              const significantFilterName = significantTerms
                .map(term => `contains(crdfd_name, '${escapeODataLiteral(term)}')`)
                .join(' and ');
              const significantFilterNameNoDiacritics = significantTermsNoDiacritics
                .map(term => `contains(crdfd_name, '${escapeODataLiteral(term)}')`)
                .join(' and ');
              fullnameFilters.push(`((${significantFilterFullname}) or (${significantFilterFullnameNoDiacritics}) or (${significantFilterName}) or (${significantFilterNameNoDiacritics}))`);
            } else {  
              // For sidebar searches, maintain original behavior
              const significantFilter = significantTerms
                .map(term => `contains(crdfd_fullname, '${escapeODataLiteral(term)}')`)
                .join(' and ');
              const significantFilterNoDiacritics = significantTermsNoDiacritics
                .map(term => `contains(crdfd_fullname, '${escapeODataLiteral(term)}')`)
                .join(' and ');
              fullnameFilters.push(`((${significantFilter}) or (${significantFilterNoDiacritics}))`);
            }
          }
          
          // Add conditions for short terms as a fallback (ANY of them)
          if (shortTerms.length > 0) {
            if (!params.isSidebarSearch) {
              // For non-sidebar searches, include both fields and both diacritics versions
              const shortFilterFullname = shortTerms
                .map(term => `contains(crdfd_fullname, '${escapeODataLiteral(term)}')`)
                .join(' or ');
              const shortFilterFullnameNoDiacritics = shortTermsNoDiacritics
                .map(term => `contains(crdfd_fullname, '${escapeODataLiteral(term)}')`)
                .join(' or ');
              const shortFilterName = shortTerms
                .map(term => `contains(crdfd_name, '${escapeODataLiteral(term)}')`)
                .join(' or ');
              const shortFilterNameNoDiacritics = shortTermsNoDiacritics
                .map(term => `contains(crdfd_name, '${escapeODataLiteral(term)}')`)
                .join(' or ');
              fullnameFilters.push(`((${shortFilterFullname}) or (${shortFilterFullnameNoDiacritics}) or (${shortFilterName}) or (${shortFilterNameNoDiacritics}))`);
            } else {
              // For sidebar searches, maintain original behavior
              const shortFilter = shortTerms
                .map(term => `contains(crdfd_fullname, '${escapeODataLiteral(term)}')`)
                .join(' or ');
              const shortFilterNoDiacritics = shortTermsNoDiacritics
                .map(term => `contains(crdfd_fullname, '${escapeODataLiteral(term)}')`)
                .join(' or ');
              fullnameFilters.push(`((${shortFilter}) or (${shortFilterNoDiacritics}))`);
            }
          }
          
          // Add a condition for the original fullname as a whole
          if (!params.isSidebarSearch) {
            // For non-sidebar searches, include both fields and both diacritics versions
            const escapedFull = escapeODataLiteral(params.fullnameSearch);
            const escapedFullNoDiacritics = escapeODataLiteral(
              params.fullnameSearch
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[đĐ]/g, 'd')
            );
            fullnameFilters.push(`(contains(crdfd_fullname, '${escapedFull}') or contains(crdfd_name, '${escapedFull}') or contains(crdfd_fullname, '${escapedFullNoDiacritics}') or contains(crdfd_name, '${escapedFullNoDiacritics}'))`);
          } else {
            // For sidebar searches, maintain original behavior
            const escapedFull = escapeODataLiteral(params.fullnameSearch);
            const escapedFullNoDiacritics = escapeODataLiteral(
              params.fullnameSearch
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[đĐ]/g, 'd')
            );
            fullnameFilters.push(`(contains(crdfd_fullname, '${escapedFull}') or contains(crdfd_fullname, '${escapedFullNoDiacritics}'))`);
          }
          
          // Combine all filters with OR to get broader results
          filter += ` and (${fullnameFilters.join(' or ')})`;
        }
      }
    } else if (params.productGroupId) {
      // Search for product_group_Id across multiple hierarchy columns using cr1bb_levelproductgroup
      const productGroupId = params.productGroupId.trim();
      if (productGroupId) {
        // Parse cr1bb_levelproductgroup to check all levels
        const pg = escapeODataLiteral(productGroupId);
        const productGroupFilter = `_crdfd_productgroup_value eq '${pg}' or contains(cr1bb_levelproductgroup, '"crdfd_cap1":"${pg}"') or contains(cr1bb_levelproductgroup, '"crdfd_cap2":"${pg}"') or contains(cr1bb_levelproductgroup, '"crdfd_cap3":"${pg}"') or contains(cr1bb_levelproductgroup, '"crdfd_cap4":"${pg}"') or contains(cr1bb_levelproductgroup, '"crdfd_cap5":"${pg}"') or contains(cr1bb_levelproductgroup, '"crdfd_cap6":"${pg}"') or contains(cr1bb_levelproductgroup, '"crdfd_cap7":"${pg}"')`;
        
        filter += ` and (${productGroupFilter})`;
      }
    }

    // Apply advanced filters
    if (params.filterThuongHieu && params.filterThuongHieu.length > 0) {
      const thuongHieuFilter = params.filterThuongHieu.map((brand: string) => `crdfd_thuonghieu eq '${escapeODataLiteral(brand)}'`).join(' or ');
      filter += ` and (${thuongHieuFilter})`;
    }

    if (params.filterQuyCach && params.filterQuyCach.length > 0) {
      const quyCachFilter = params.filterQuyCach.map((spec: string) => `crdfd_quycach eq '${escapeODataLiteral(spec)}'`).join(' or ');
      filter += ` and (${quyCachFilter})`;
    }

    if (params.filterHoanThien && params.filterHoanThien.length > 0) {
      const hoanThienFilter = params.filterHoanThien.map((finish: string) => `crdfd_hoanthienbemat eq '${escapeODataLiteral(finish)}'`).join(' or ');
      filter += ` and (${hoanThienFilter})`;
    }

    if (params.filterChatLieu && params.filterChatLieu.length > 0) {
      const chatLieuFilter = params.filterChatLieu.map((material: string) => `crdfd_chatlieu eq '${escapeODataLiteral(material)}'`).join(' or ');
      filter += ` and (${chatLieuFilter})`;
    }

    if (params.filterDonVi && params.filterDonVi.length > 0) {
      const donViFilter = params.filterDonVi.map((unit: string) => `crdfd_onvichuantext eq '${escapeODataLiteral(unit)}'`).join(' or ');
      filter += ` and (${donViFilter})`;
    }

    // Price range filter - will be applied post-processing due to JSON field complexity
    if (params.priceMin > 0 || params.priceMax > 0) {
    }

    // For sidebar searches, limit the number of results
    let query = `$select=${PRODUCT_COLUMNS}&$filter=${encodeURIComponent(filter)}`;
    
    // Only add orderby for non-sidebar searches to improve performance
    if (!params.isSidebarSearch) {
      query += `&$orderby=crdfd_nhomsanphamtext asc`;
    }
    
    // For sidebar searches, limit the number of results
    if (params.isSidebarSearch && !params.productGroupId) {
      query += `&$top=100`;
    }
    
    // For search queries, limit results to improve performance
    if (params.searchTerm && params.searchTerm.trim()) {
      query += `&$top=200`; // Limit search results to 200 items
    }

    // Fetch products with timing
    const productsResponse = await fetchWithRetry(
      `${table}?${query}`,
      {
        headers: { ...api.defaults.headers, Authorization: `Bearer ${token}` },
      },
      params.isSidebarSearch,
      {
        productGroupId: params.productGroupId,
        searchTerm: params.searchTerm,
        fullnameSearch: params.fullnameSearch,
        doiTuong: params.doiTuong,
        isSidebarSearch: params.isSidebarSearch
      }
    );

    // Get the products and apply any client-side filtering if needed
    let products = productsResponse.data.value;
      
    // Only parse nested JSON if we need full product details
    let parsedProducts;
    if (!params.isSidebarSearch || params.productGroupId) {
      parsedProducts = parseNestedJson(products, params.doiTuong);
    } else {
      parsedProducts = products;
    }
    
    // Parse keywords from AI if provided
    let aiKeywords: string[] = [];
    let synonyms: string[] = [];
    let productName: string = '';
    
    if (params.keywords) {
      try {
        const parsedKeywords = JSON.parse(params.keywords);
        
        // Extract product name (for reference only, not used in search)
        if (parsedKeywords.productName) {
          productName = parsedKeywords.productName;
        }
        
        // Extract synonyms (ONLY use these for search)
        if (parsedKeywords.synonyms && Array.isArray(parsedKeywords.synonyms)) {
          synonyms = parsedKeywords.synonyms.filter((kw: any) => kw && typeof kw === 'string');
          aiKeywords = [...synonyms]; // Only use synonyms for search
        }
        
      } catch (error) {
        console.error('Error parsing keywords:', error);
      }
    }

    // Use ONLY synonyms for search, fallback to searchTerm if no synonyms
    const searchKeywords = synonyms.length > 0 ? synonyms : [params.searchTerm].filter(Boolean);
    

    // Apply additional client-side filtering only for fullname parameter searches
    // since searchTerm filtering is already done at the server level
    if (params.fullnameSearch || params.searchTerm || searchKeywords.length > 0) {
      const searchText = params.fullnameSearch || params.searchTerm || (searchKeywords.length > 0 ? searchKeywords.join(' ') : '');
      try {
        // Use AI keywords if available, otherwise use regular search
        if (searchKeywords.length > 0) {
          products = findProductsByFullname(parsedProducts, searchKeywords, params.isSidebarSearch);
        } else {
          products = findProductsByFullname(parsedProducts, searchText, params.isSidebarSearch);
        }
        
        // Sort products by relevance score for better results
        if (products && products.length > 0) {
          products = products.sort((a: any, b: any) => {
            const aName = (a.crdfd_fullname || a.crdfd_name || '').toLowerCase();
            const bName = (b.crdfd_fullname || b.crdfd_name || '').toLowerCase();
            const searchLower = searchText.toLowerCase();
            
            // Calculate relevance score
            const aScore = calculateRelevanceScore(aName, searchLower);
            const bScore = calculateRelevanceScore(bName, searchLower);
            
            return bScore - aScore; // Higher score first
          });
        }
      } catch (error) {
        console.error('Error in product search:', error);
        products = parsedProducts;
      }
    } else {
      products = parsedProducts;
    }

    // Apply price range filter after parsing JSON data
    if (params.priceMin > 0 || params.priceMax > 0) {
      products = applyPriceRangeFilter(products, params.priceMin, params.priceMax);
    }

    // Group products by parent category - this will now only include non-empty groups
    const groupedProducts = groupProductsByParentCategory(products);
    
    // If "all" parameter is present, return all data without pagination
    if (getAllData) {
      return res.status(200).json({
        data: groupedProducts,
        pagination: {
          total: Object.keys(groupedProducts).length,
          all: true,
          currentPage: 1,
          totalPages: 1,
          pageSize: Object.keys(groupedProducts).length,
          isProductGroupSearch: !!params.productGroupId
        },
        cached: !!productsResponse.cached
      });
    }
    
    // Paginate the grouped products
    const paginatedResult = paginateGroupedProducts(
      groupedProducts, 
      params.page, 
      params.pageSize,
      !!params.productGroupId
    );
    
    // Add cache status to response
    paginatedResult.cached = !!productsResponse.cached;

    return res.status(200).json(paginatedResult);
  } catch (error) {
    console.error("Error in getProductsOnly:", error);
    handleError(res, error as AxiosError);
  }
};

// ======= Error Handling =======
const handleError = (res: NextApiResponse, error: AxiosError) => {
  if (error.response) {
    return res.status(error.response.status).json({
      error: error.response.data,
      message: "API request failed",
    });
  }

  if (error.request) {
    return res.status(500).json({
      error: "No response received from server",
      message: "Network error",
    });
  }

  return res.status(500).json({
    error: error.message,
    message: "Internal server error",
  });
};

// ======= Memory Management =======
const cleanupCache = () => {
  cache.clear();
  sidebarSearchCache.clear();
};

// Add cleanup on process exit
process.on("beforeExit", cleanupCache);

export default getProductsOnly;