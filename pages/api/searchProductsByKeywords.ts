import { NextApiRequest, NextApiResponse } from "next";
import axios, { AxiosError } from "axios";
import { getAccessToken } from "./getAccessToken";
import { LRUCache } from "lru-cache";
import http from "http";
import https from "https";

// ======= Constants & Configurations =======
const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";
const DEFAULT_TIMEOUT = 60000;  // 60 seconds
const MAX_SOCKETS = 50;
const MAX_FREE_SOCKETS = 10;
const KEEP_ALIVE_MS = 50000;  // 50 seconds

// ======= Cache Configuration =======
const CACHE_CONFIG = {
  max: 1000,
  ttl: 1800000, // 30 minutes
  updateAgeOnGet: true,
  ttlAutopurge: true,
  allowStale: true,
} as const;

// Initialize cache
const cache = new LRUCache<string, any>(CACHE_CONFIG);

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
const getHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
  "OData-MaxVersion": "4.0",
  "OData-Version": "4.0",
});

// Improved search function for products with accurate filtering
const findProductsByFullname = (products: any[], searchKeywords: string[]): any[] => {
  if (!searchKeywords || searchKeywords.length === 0) return products;
  
  console.log(`Searching with keywords: [${searchKeywords.join(', ')}]`);
  
  // Keep original keywords for exact matching, create normalized versions for fallback
  const originalKeywords = searchKeywords.map(keyword => keyword.trim()).filter(keyword => keyword.length > 0);
  const normalizedKeywords = searchKeywords.map(keyword => 
    keyword.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
  ).filter(keyword => keyword.length > 0);
  
  console.log(`Normalized keywords: [${normalizedKeywords.join(', ')}]`);
  
  const matchingProducts = products.filter(product => {
    if (!product.crdfd_fullname && !product.crdfd_name) return false;
    
    // Keep original product names for exact matching
    const originalProductFullName = product.crdfd_fullname ? product.crdfd_fullname.toLowerCase().trim() : '';
    const originalProductName = product.crdfd_name ? product.crdfd_name.toLowerCase().trim() : '';
    
    // Normalize product names for fallback matching
    const productFullName = product.crdfd_fullname ? product.crdfd_fullname.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim() : '';
    
    const productName = product.crdfd_name ? product.crdfd_name.toLowerCase()
        .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim() : '';
    
    // Priority 1: Exact original keyword match in original crdfd_fullname (most accurate)
    for (const originalKeyword of originalKeywords) {
      const originalLower = originalKeyword.toLowerCase();
      const wordBoundaryRegex = new RegExp(`\\b${originalLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (wordBoundaryRegex.test(originalProductFullName)) {
        console.log(`Exact original keyword match in fullname: "${originalProductFullName}" contains word "${originalKeyword}"`);
        return true;
      }
    }
    
    // Priority 2: Exact original keyword match in original crdfd_name
    for (const originalKeyword of originalKeywords) {
      const originalLower = originalKeyword.toLowerCase();
      const wordBoundaryRegex = new RegExp(`\\b${originalLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (wordBoundaryRegex.test(originalProductName)) {
        console.log(`Exact original keyword match in name: "${originalProductName}" contains word "${originalKeyword}"`);
        return true;
      }
    }
    
    // Priority 3: Normalized keyword match in crdfd_fullname (fallback for similar characters)
    // Only use normalized matching if no exact match was found
    let hasExactMatch = false;
    for (const originalKeyword of originalKeywords) {
      const originalLower = originalKeyword.toLowerCase();
      const wordBoundaryRegex = new RegExp(`\\b${originalLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (wordBoundaryRegex.test(originalProductFullName) || wordBoundaryRegex.test(originalProductName)) {
        hasExactMatch = true;
        break;
      }
    }
    
    // For short keywords (1-3 chars), only use exact matching to avoid false positives
    const hasShortKeyword = originalKeywords.some(kw => kw.length <= 3);
    if (hasShortKeyword && !hasExactMatch) {
      return false; // Don't use normalized matching for short keywords if no exact match
    }
    
    // Only use normalized matching if no exact match was found
    if (!hasExactMatch) {
      for (const keyword of normalizedKeywords) {
        // For short keywords (1-3 chars), use strict word boundary matching to avoid false positives
    if (keyword.length <= 3) {
          const wordBoundaryRegex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          if (wordBoundaryRegex.test(productFullName)) {
            console.log(`Normalized word boundary match in fullname: "${productFullName}" contains word "${keyword}"`);
            return true;
          }
        } else {
          // For longer keywords, allow partial matching but with word boundaries
          const wordBoundaryRegex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          if (wordBoundaryRegex.test(productFullName)) {
            console.log(`Normalized word boundary match in fullname: "${productFullName}" contains word "${keyword}"`);
            return true;
          }
          
          // Fallback: exact substring match for longer keywords
          if (productFullName.includes(keyword)) {
            console.log(`Normalized substring match in fullname: "${productFullName}" contains "${keyword}"`);
            return true;
          }
        }
      }
      
      // Priority 4: Normalized keyword match in crdfd_name (fallback)
      for (const keyword of normalizedKeywords) {
        // For short keywords (1-3 chars), use strict word boundary matching to avoid false positives
      if (keyword.length <= 3) {
          const wordBoundaryRegex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          if (wordBoundaryRegex.test(productName)) {
            console.log(`Normalized word boundary match in name: "${productName}" contains word "${keyword}"`);
            return true;
          }
        } else {
          // For longer keywords, allow partial matching but with word boundaries
          const wordBoundaryRegex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          if (wordBoundaryRegex.test(productName)) {
            console.log(`Normalized word boundary match in name: "${productName}" contains word "${keyword}"`);
            return true;
          }
          
          // Fallback: exact substring match for longer keywords
          if (productName.includes(keyword)) {
            console.log(`Normalized substring match in name: "${productName}" contains "${keyword}"`);
            return true;
          }
        }
      }
    }
    
    // Priority 5: Multi-word matching (only if keyword has multiple words)
    const originalMultiWordKeywords = originalKeywords.filter(kw => kw.includes(' '));
    if (originalMultiWordKeywords.length > 0) {
      for (const keyword of originalMultiWordKeywords) {
        const words = keyword.split(/\s+/).filter(word => word.length > 1);
        if (words.length >= 2) {
          let matchingWords = [];
          
          // Use word boundary matching for each word with original case
          for (const word of words) {
            const wordLower = word.toLowerCase();
            const wordBoundaryRegex = new RegExp(`\\b${wordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
            
            // Check both original and normalized versions
            const matchesOriginal = wordBoundaryRegex.test(originalProductFullName) || wordBoundaryRegex.test(originalProductName);
            
            // Also check normalized version for Vietnamese characters
            const normalizedWord = wordLower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const normalizedProductFullName = originalProductFullName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const normalizedProductName = originalProductName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const normalizedWordBoundaryRegex = new RegExp(`\\b${normalizedWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
            const matchesNormalized = normalizedWordBoundaryRegex.test(normalizedProductFullName) || normalizedWordBoundaryRegex.test(normalizedProductName);
            
            if (matchesOriginal || matchesNormalized) {
              matchingWords.push(word);
            }
          }
          
          // For long keywords (>= 5 words), require at least 50% match
          // For medium keywords (3-4 words), require at least 60% match  
          // For short keywords (2 words), require at least 70% match
          const matchRatio = matchingWords.length / words.length;
          const requiredRatio = words.length >= 5 ? 0.5 : words.length >= 3 ? 0.6 : 0.7;
          
          if (matchRatio >= requiredRatio) {
            console.log(`Multi-word match: "${originalProductFullName}" - matched ${matchingWords.length}/${words.length} words: [${matchingWords.join(', ')}] (ratio: ${matchRatio.toFixed(2)})`);
            return true;
          }
        }
      }
    }
    
    // Priority 6: Partial matching for long keywords (fallback for very long search terms)
    const longKeywords = originalKeywords.filter(kw => kw.length > 10);
    if (longKeywords.length > 0) {
      for (const keyword of longKeywords) {
        const keywordLower = keyword.toLowerCase();
        
        // Try partial matching in fullname
        if (originalProductFullName.includes(keywordLower)) {
          console.log(`Partial match in fullname: "${originalProductFullName}" contains "${keyword}"`);
          return true;
        }
        
        // Try partial matching in name
        if (originalProductName.includes(keywordLower)) {
          console.log(`Partial match in name: "${originalProductName}" contains "${keyword}"`);
          return true;
        }
      }
    }
    
    return false;
  });
  
  console.log(`Total matching products: ${matchingProducts.length}`);
  return matchingProducts;
};

// ======= Advanced Tokenizer, Synonyms and Scoring Fallback =======
const VI_EN_STOPWORDS = new Set<string>([
  // Vietnamese
  'la','là','va','và','cua','của','cho','trong','ngoai','ngoài','theo','thi','thì','là','và',
  'san','sản','pham','phẩm','hang','hàng','loai','loại','mau','màu','co','có','khong','không',
  'lo','lô','bo','bộ','set','bộ','dung','dùng','dung','dụng','phu','phụ','kien','kiện','phụ kiện',
  // English
  'the','and','or','with','for','of','a','an','to'
]);

const SIZE_PATTERNS: RegExp[] = [
  /\b(dn\s?\d{1,4})\b/i,      // DN114
  /\b(d\s?\d{1,4})\b/i,       // D114
  /\b\d{1,4}mm\b/i,            // 114mm
  /\b\d{1,4}x\d{1,4}([,\.]\d+)?\b/i, // 114x2,0 or 114x2.0
];

const normalizeText = (text: string): string =>
  (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const tokenize = (query: string): string[] => {
  const original = (query || '').trim();
  const normalized = normalizeText(original);
  const parts = normalized
    .replace(/[^a-z0-9\sx.,-]/g, ' ')
    .replace(/[\s]+/g, ' ')
    .split(' ')
    .filter(Boolean);

  const tokens: string[] = [];
  for (const p of parts) {
    if (!p) continue;
    if (VI_EN_STOPWORDS.has(p)) continue;
    tokens.push(p);
  }

  // Extract size tokens explicitly
  for (const rx of SIZE_PATTERNS) {
    const m = normalized.match(rx);
    if (m && m[1]) tokens.push(m[1].replace(/\s+/g, ''));
  }

  return Array.from(new Set(tokens));
};

const expandSynonyms = (tokens: string[]): string[] => {
  const map: Record<string, string[]> = {
    'cut': ['khop','co','noi','khopnoi','khop-noi','phu-kien','phukien'],
    'noi': ['khop','ket-noi','khopnoi'],
    'ong': ['pipe','tube'],
    'pvc': ['polyvinyl','polyvinylchloride','u-pvc','upvc'],
    'nhua': ['plastic'],
  };
  const out = new Set<string>(tokens);
  for (const t of tokens) {
    if (map[t]) map[t].forEach(s => out.add(s));
  }
  return Array.from(out);
};

const scoreProductByQuery = (product: any, originalQuery: string, baseTokens: string[]): number => {
  if (!product) return 0;
  const fullOrig = (product.crdfd_fullname || '').toString();
  const nameOrig = (product.crdfd_name || '').toString();
  const full = normalizeText(fullOrig);
  const name = normalizeText(nameOrig);

  const tokens = expandSynonyms(baseTokens);
  let score = 0;

  // Exact phrase boost (original text, case-insensitive)
  const phrase = originalQuery.toLowerCase();
  if (fullOrig.toLowerCase().includes(phrase)) score += 50;
  if (nameOrig.toLowerCase().includes(phrase)) score += 25;

  // Token matches with field weights
  for (const tk of tokens) {
    const isSize = SIZE_PATTERNS.some(rx => tk.match(rx));
    const w = isSize ? 8 : 3; // size/number heavier
    if (full.includes(tk)) score += w * 2; // fullname weight
    if (name.includes(tk)) score += w;
  }

  // Count of numeric sequences as additional signal
  const queryHasNumber = /\d/.test(phrase);
  if (queryHasNumber) {
    const numHits = (full.match(/\d+/g) || []).length;
    score += Math.min(numHits, 3); // small cap
  }

  return score;
};

const searchWithScoring = (products: any[], query: string, limit = 100): any[] => {
  const baseTokens = tokenize(query);
  if (baseTokens.length === 0) return [];
  const scored = products
    .map(p => ({ p, s: scoreProductByQuery(p, query, baseTokens) }))
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map(x => x.p);
  return scored;
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
    return 0;
  }
  if (product.crdfd_gia && product.crdfd_gia > 0) return product.crdfd_gia;
  if (product.crdfd_giatheovc && product.crdfd_giatheovc > 0) return product.crdfd_giatheovc;
  return 0;
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
  
  // Calculate priceRange and sort products in each group
  Object.keys(groupedProducts).forEach(key => {
    const group = groupedProducts[key];
    
    // Sort products: products with valid cr1bb_json_gia first
    group.products.sort((a: any, b: any) => {
      const aHasValidJsonGia = a.cr1bb_json_gia !== null && 
                              a.cr1bb_json_gia !== undefined && 
                              a.cr1bb_json_gia !== '' && 
                              (typeof a.cr1bb_json_gia === 'string' ? a.cr1bb_json_gia.trim() !== '' : true);
      
      const bHasValidJsonGia = b.cr1bb_json_gia !== null && 
                              b.cr1bb_json_gia !== undefined && 
                              b.cr1bb_json_gia !== '' && 
                              (typeof b.cr1bb_json_gia === 'string' ? b.cr1bb_json_gia.trim() !== '' : true);
      
      if (aHasValidJsonGia && !bHasValidJsonGia) return -1;
      if (!aHasValidJsonGia && bHasValidJsonGia) return 1;
      return 0;
    });

    // Calculate priceRange for each group based on actual prices
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
  pageSize: number
): {
  data: Record<string, any>;
  pagination: {
    currentPage: number;
    pageSize: number;
    totalGroups: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
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
    }
  };
};

// Add cache key generator function
const generateCacheKey = (url: string, options: any, params: any): string => {
  const key = {
    url,
    searchTerm: params.searchTerm,
    customerId: params.customerId,
    page: params.page,
    pageSize: params.pageSize
  };
  return JSON.stringify(key);
};

// Optimized fetchWithRetry
const fetchWithRetry = async (
  url: string,
  options: any,
  params: any = {},
  retries = 3,
  baseDelay = 1000
): Promise<any> => {
  const key = generateCacheKey(url, options, params);
  const cachedResponse = cache.get(key);

  if (cachedResponse) {
    return cachedResponse;
  }

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
          // Filter items by doiTuong
          const filteredItems = parsedJson.filter((item: any) => {
            if (!doiTuong) {
              // If no doiTuong, get Shop price
              return item.crdfd_nhomoituongname === "Shop";
            }
            try {
              // Parse doiTuong from string to array
              const doiTuongList = JSON.parse(doiTuong);
              // Convert both to lowercase for comparison
              const itemId = item.crdfd_nhomoituong.toLowerCase();
              const isIncluded = doiTuongList.some((id: any) => id.toLowerCase() === itemId);
              return isIncluded;
            } catch (e) {
              // If error parsing, default to Shop price
              return item.crdfd_nhomoituongname === "Shop";
            }
          });

          // If no items match condition, get item with crdfd_nhomoituongname as "Shop"
          const itemsToProcess = filteredItems.length > 0 ? filteredItems : 
            parsedJson.filter((item: any) => item.crdfd_nhomoituongname === "Shop");

          // If multiple prices, get lowest price
          if (itemsToProcess.length > 1) {
            // Sort by lowest price
            itemsToProcess.sort((a: any, b: any) => {
              const priceA = a.crdfd_giatheovc || a.crdfd_gia || 0;
              const priceB = b.crdfd_giatheovc || b.crdfd_gia || 0;
              return priceA - priceB;
            });
            // Only take item with lowest price
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
            // Add text mapping for cr1bb_banchatgiaphatra
            productCopy.cr1bb_banchatgiaphatra_text = getBanChatGiaPhatRaText(productCopy.cr1bb_banchatgiaphatra);
            processedProducts.push(productCopy);
          });
        } else {
          // Add text mapping for cr1bb_banchatgiaphatra
          product.cr1bb_banchatgiaphatra_text = getBanChatGiaPhatRaText(product.cr1bb_banchatgiaphatra);
          processedProducts.push(product);
        }
      } catch (error) {
        console.error(`Error parsing cr1bb_json_gia for product ${product.crdfd_productsid}:`, error);
        // Add text mapping for cr1bb_banchatgiaphatra
        product.cr1bb_banchatgiaphatra_text = getBanChatGiaPhatRaText(product.cr1bb_banchatgiaphatra);
        processedProducts.push(product);
      }
    } else {
      // Add text mapping for cr1bb_banchatgiaphatra
      product.cr1bb_banchatgiaphatra_text = getBanChatGiaPhatRaText(product.cr1bb_banchatgiaphatra);
      processedProducts.push(product);
    }
  });
  
  return processedProducts;
};

// ======= Main Handler =======
const searchProductsByKeywords = async (req: NextApiRequest, res: NextApiResponse) => {
  const startTime = performance.now();
  try {
    // Parse and normalize query parameters
    const params = {
      searchTerm: Array.isArray(req.query.searchTerm)
        ? req.query.searchTerm[0]
        : req.query.searchTerm || "",
      keywords: Array.isArray(req.query.keywords)
        ? req.query.keywords[0]
        : req.query.keywords || "",
      customerId: Array.isArray(req.query.customerId)
        ? req.query.customerId[0]
        : req.query.customerId || "",
      page: Array.isArray(req.query.page) 
        ? parseInt(req.query.page[0]) || 1 
        : parseInt(req.query.page as string) || 1,
      pageSize: Array.isArray(req.query.pageSize) 
        ? parseInt(req.query.pageSize[0]) || 10 
        : parseInt(req.query.pageSize as string) || 10,
    };

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
        
        console.log(`Parsed AI keywords - Product: "${productName}" (not used), Synonyms: [${synonyms.join(', ')}] (used for search)`);
      } catch (error) {
        console.error('Error parsing keywords:', error);
      }
    }

    // Use ONLY synonyms for search, fallback to searchTerm if no synonyms
    const searchKeywords = synonyms.length > 0 ? synonyms : [params.searchTerm].filter(Boolean);

    if (searchKeywords.length === 0) {
      return res.status(400).json({
        error: "searchTerm or keywords is required",
        message: "Please provide a search term or AI keywords"
      });
    }

    console.log(`=== SEARCH DEBUG ===`);
    console.log(`Search term: "${params.searchTerm}"`);
    console.log(`Synonyms: [${synonyms.join(', ')}]`);
    console.log(`Final search keywords: [${searchKeywords.join(', ')}]`);

    const token = await getAccessToken();
    
    // Product columns
    const PRODUCT_COLUMNS = "crdfd_name,crdfd_productsid,crdfd_fullname,crdfd_masanpham," +
      "_crdfd_productgroup_value,cr1bb_nhomsanphamcha,crdfd_manhomsp,crdfd_thuonghieu," +
      "crdfd_quycach,crdfd_chatlieu,crdfd_hoanthienbemat,crdfd_nhomsanphamtext,crdfd_gtgt,cr1bb_imageurlproduct,cr1bb_imageurl," +
      "_crdfd_productgroup_value,crdfd_nhomsanphamtext,crdfd_unitname,crdfd_onvichuantext,cr1bb_json_gia,cr1bb_levelproductgroup," +
      "cr1bb_banchatgiaphatra,crdfd_gtgt_value,cr1bb_banchatgiaphatra";
  
    // Build product query
    const table = "crdfd_productses";
    
    // Base filter that returns all active products (no search filter at server level)
    let filter = "statecode eq 0";

    // Build query - get all active products first, then filter client-side
    let query = `$select=${PRODUCT_COLUMNS}&$filter=${encodeURIComponent(filter)}&$orderby=crdfd_nhomsanphamtext asc`;
    
    // Limit results to improve performance
    query += `&$top=500`;

    // Fetch products with timing
    const productsResponse = await fetchWithRetry(
      `${table}?${query}`,
      {
        headers: { ...api.defaults.headers, Authorization: `Bearer ${token}` },
      },
      params
    );

    // Get the products and parse nested JSON
    let products = productsResponse.data.value;
    const parsedProducts = parseNestedJson(products, params.customerId);
    
    // Apply client-side filtering with synonyms + scoring fallback
    if (searchKeywords.length > 0) {
      try {
        console.log(`Searching with ${searchKeywords.length} keywords in ${parsedProducts.length} products`);
        console.log(`Search keywords: [${searchKeywords.join(', ')}]`);
        
        // 1) Strict filter first (fast path)
        products = findProductsByFullname(parsedProducts, searchKeywords);
        console.log(`Found ${products.length} products after strict filtering`);

        // 2) Scoring fallback if low/zero results
        if (!products || products.length === 0) {
          const q = searchKeywords.join(' ');
          const scored = searchWithScoring(parsedProducts, q, 200);
          console.log(`Scoring fallback returned ${scored.length} products`);
          products = scored;
        }
        
        // Log first few product names for debugging
        if (products.length > 0) {
          console.log(`First 3 matching products:`);
          products.slice(0, 3).forEach((p: any, i: number) => {
            console.log(`  ${i + 1}. ${p.crdfd_fullname}`);
          });
        } else {
          console.log(`No products found. Sample product names:`);
          parsedProducts.slice(0, 3).forEach((p: any, i: number) => {
            console.log(`  ${i + 1}. ${p.crdfd_fullname}`);
          });
        }
        
      } catch (error) {
        console.error('Error in product search:', error);
        products = parsedProducts;
      }
    } else {
      products = parsedProducts;
    }

    // Group products by parent category
    const groupedProducts = groupProductsByParentCategory(products);
    console.log(`Grouped products into ${Object.keys(groupedProducts).length} categories:`, Object.keys(groupedProducts));
    
    // Paginate the grouped products
    const paginatedResult = paginateGroupedProducts(
      groupedProducts, 
      params.page, 
      params.pageSize
    );
    
    console.log(`Paginated result:`, {
      dataKeys: Object.keys(paginatedResult.data),
      pagination: paginatedResult.pagination,
      totalGroups: paginatedResult.pagination.totalGroups
    });
    
    // Add cache status to response
    paginatedResult.cached = !!productsResponse.cached;

    const endTime = performance.now();
    console.log(`Search products by keywords took ${endTime - startTime} milliseconds`);

    // Add debug info to response
    const response = {
      ...paginatedResult,
      debug: {
        searchTerm: params.searchTerm,
        productName: productName,
        synonyms: synonyms,
        aiKeywords: searchKeywords,
        totalKeywords: searchKeywords.length,
        totalSynonyms: synonyms.length,
        searchStrategy: synonyms.length > 0 ? 'synonyms-only' : 'searchTerm-fallback',
        productNameUsed: false, // ProductName is not used in search
        synonymsUsed: synonyms.length > 0,
        totalProductsFetched: productsResponse.data.value.length,
        totalProductsAfterFilter: products.length,
        totalGroups: Object.keys(groupedProducts).length,
        searchTime: `${endTime - startTime}ms`
      }
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error in searchProductsByKeywords:", error);
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
};

// Add cleanup on process exit
process.on("beforeExit", cleanupCache);

export default searchProductsByKeywords;
