import { NextApiRequest, NextApiResponse } from "next";
import axios, { AxiosError } from "axios";
import { LRUCache } from "lru-cache";
import { getAccessToken } from "./getAccessToken";
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
  productGroupCache: {
    max: 500,
    ttl: 1800000, // 30 minutes
    updateAgeOnGet: true,
    ttlAutopurge: true,
    allowStale: true,
  }
} as const;

// Initialize cache
const cache = new LRUCache(CACHE_CONFIG.productGroupCache);

// ======= Axios Configuration =======
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "OData-MaxVersion": "4.0",
    "OData-Version": "4.0",
    "Prefer": "odata.maxpagesize=500"
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

const fetchWithRetry = async (
  url: string,
  options: any,
  retries = 3,
  baseDelay = 1000
): Promise<any> => {
  const key = `request_${url}_${JSON.stringify(options)}`;
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
        const retryAfter = parseInt(
          error.response.headers["retry-after"] || "5"
        );
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

// Fetch all records from a paginated API
const fetchAllRecords = async (url: string, token: string): Promise<any[]> => {
  let allResults: any[] = [];
  let nextLink = url;

  while (nextLink) {
    try {
      const response = await fetchWithRetry(nextLink, {
        headers: getHeaders(token)
      });

      if (Array.isArray(response.data.value) && response.data.value.length > 0) {
        allResults = allResults.concat(response.data.value);
        nextLink = response.data["@odata.nextLink"];
      } else {
        break;
      }
    } catch (error) {
      console.error("Error fetching records:", error);
      throw error;
    }
  }

  return allResults;
};

// Interface for product group
interface ProductGroup {
  crdfd_productgroupid: string;
  crdfd_productname: string;
  _crdfd_nhomsanphamcha_value: string | null;
  crdfd_nhomsanphamchatext: string | null;
  _crdfd_nhomsanphamcap1_value?: string | null;
  crdfd_image_url?: string;
  cr1bb_so_san_pham_co_gia?: number;
  cr1bb_soh6thang?: number;
  level?: number;
  children?: ProductGroup[];
  productCount?: number;
}

// ======= Category Order Mapping from CSV =======
// Thứ tự danh mục cấp 1 theo CSV
const LEVEL1_CATEGORY_ORDER: string[] = [
  "Công tác, Ổ cắm",
  "Dây, cáp điện",
  "Điện gia dụng",
  "Năng lượng tái tạo",
  "Ống luồn và phụ kiện",
  "Thiết bị chiếu sáng",
  "Thiết bị đóng cắt",
  "Thiết bị điện khác"
];

// Thứ tự danh mục cấp 2 theo CSV, nhóm theo parent
const LEVEL2_CATEGORY_ORDER: { [parentName: string]: string[] } = {
  "Công tác, Ổ cắm": [
    "Bảng điện, phụ kiện",
    "Công tắc",
    "Công tắc, ổ cắm",
    "Ổ cắm",
    "Phích cắm"
  ],
  "Dây, cáp điện": [
    "Dây, cáp điện"
  ],
  "Điện gia dụng": [
    "Điện gia dụng",
    "Linh kiện thay thế quạt"
  ],
  "Năng lượng tái tạo": [],
  "Ống luồn và phụ kiện": [
    "Hộp nối dây",
    "Ống luồn và phụ kiện",
    "Phụ kiện ống luồn"
  ],
  "Thiết bị chiếu sáng": [
    "Đèn chiếu sáng",
    "Đèn LED",
    "Đuôi đèn",
    "Thiết bị chiếu sáng"
  ],
  "Thiết bị đóng cắt": [
    "Bộ chuyển nguồn",
    "Thiết bị đóng cắt"
  ],
  "Thiết bị điện khác": [
    "Thiết bị điện khác"
  ]
};

// Hàm normalize tên để so sánh (loại bỏ dấu, lowercase, trim)
const normalizeName = (name: string): string => {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .trim();
};

// Hàm tìm index trong order array (so sánh linh hoạt)
const getCategoryOrder = (categoryName: string, orderArray: string[]): number => {
  const normalizedName = normalizeName(categoryName);
  
  for (let i = 0; i < orderArray.length; i++) {
    const normalizedOrderName = normalizeName(orderArray[i]);
    // So sánh chính xác hoặc một phần
    if (normalizedName === normalizedOrderName || 
        normalizedName.includes(normalizedOrderName) ||
        normalizedOrderName.includes(normalizedName)) {
      return i;
    }
  }
  
  // Nếu không tìm thấy, trả về số lớn để đặt ở cuối
  return 9999;
};

// Hàm sắp xếp danh mục cấp 1
const sortLevel1Categories = (categories: ProductGroup[]): ProductGroup[] => {
  return categories.slice().sort((a, b) => {
    const orderA = getCategoryOrder(a.crdfd_productname, LEVEL1_CATEGORY_ORDER);
    const orderB = getCategoryOrder(b.crdfd_productname, LEVEL1_CATEGORY_ORDER);
    
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    
    // Nếu cùng thứ tự hoặc không tìm thấy, sắp xếp theo tên
    return a.crdfd_productname.localeCompare(b.crdfd_productname, 'vi');
  });
};

// Hàm sắp xếp danh mục cấp 2 theo parent
const sortLevel2Categories = (categories: ProductGroup[], parentName: string): ProductGroup[] => {
  const orderArray = LEVEL2_CATEGORY_ORDER[parentName] || [];
  
  return categories.slice().sort((a, b) => {
    const orderA = getCategoryOrder(a.crdfd_productname, orderArray);
    const orderB = getCategoryOrder(b.crdfd_productname, orderArray);
    
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    
    // Nếu cùng thứ tự hoặc không tìm thấy, sắp xếp theo tên
    return a.crdfd_productname.localeCompare(b.crdfd_productname, 'vi');
  });
};

// Hàm sắp xếp danh mục cấp 3 theo parent (level 2)
const sortLevel3Categories = (categories: ProductGroup[], parentName: string): ProductGroup[] => {
  // Level 3 có thể không có trong CSV order, sắp xếp theo tên
  return categories.slice().sort((a, b) => {
    return a.crdfd_productname.localeCompare(b.crdfd_productname, 'vi');
  });
};

// Build hierarchical structure
const buildHierarchy = (productGroups: ProductGroup[]): ProductGroup[] => {
  const groupMap = new Map<string, ProductGroup>();
  const rootGroups: ProductGroup[] = [];

  // Create map of all groups
  productGroups.forEach(group => {
    // Initialize the group with empty children array and level 1 by default
    const enhancedGroup = {
      ...group,
      children: [],
      level: 1, // Default level
      productCount: group.cr1bb_so_san_pham_co_gia || 0
    };
    groupMap.set(group.crdfd_productgroupid, enhancedGroup);
  });

  // Build hierarchical structure
  productGroups.forEach(group => {
    const groupNode = groupMap.get(group.crdfd_productgroupid)!;
    const parentId = group._crdfd_nhomsanphamcha_value;

    if (parentId && groupMap.has(parentId)) {
      const parentNode = groupMap.get(parentId)!;
      parentNode.children!.push(groupNode);
      
      // Update level based on parent's level
      groupNode.level = (parentNode.level || 1) + 1;
    } else {
      rootGroups.push(groupNode);
      // Ensure root nodes have level 1 - this is already set by default but making it explicit
      groupNode.level = 1;
    }
  });

  // Calculate total product count and 6-month total for each node
  const calculateTotals = (node: ProductGroup): { productCount: number, sixMonthTotal: number } => {
    let totalCount = node.productCount || 0;
    let totalSixMonth = node.cr1bb_soh6thang || 0;
    
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        const childTotals = calculateTotals(child);
        totalCount += childTotals.productCount;
        totalSixMonth += childTotals.sixMonthTotal;
      });
    }
    
    node.productCount = totalCount;
    node.cr1bb_soh6thang = totalSixMonth;
    return { productCount: totalCount, sixMonthTotal: totalSixMonth };
  };

  // Calculate totals for all root nodes
  rootGroups.forEach(calculateTotals);

  // Sắp xếp root groups (level 1) theo thứ tự CSV
  const sortedRootGroups = sortLevel1Categories(rootGroups);

  // Sắp xếp children (level 2 và level 3) của mỗi root group theo thứ tự CSV
  const sortChildren = (node: ProductGroup) => {
    if (node.children && node.children.length > 0) {
      // Xác định level của node để sắp xếp đúng
      const nodeLevel = node.level || 1;
      
      if (nodeLevel === 1) {
        // Sắp xếp level 2 theo CSV order
        node.children = sortLevel2Categories(node.children, node.crdfd_productname);
      } else if (nodeLevel === 2) {
        // Sắp xếp level 3 theo tên (hoặc có thể thêm CSV order sau)
        node.children = sortLevel3Categories(node.children, node.crdfd_productname);
      }
      
      // Đệ quy sắp xếp children của children (level 3+)
      node.children.forEach(sortChildren);
    }
  };

  sortedRootGroups.forEach(sortChildren);

  return sortedRootGroups;
};

// Get flat array of groups with their levels
const getFlatHierarchy = (rootGroups: ProductGroup[]): ProductGroup[] => {
  const flattenedGroups: ProductGroup[] = [];
  
  const flattenGroup = (group: ProductGroup) => {
    // Create a copy without children to avoid circular references
    const groupCopy = { ...group };
    delete groupCopy.children;
    
    flattenedGroups.push(groupCopy);
    
    if (group.children && group.children.length > 0) {
      group.children.forEach(flattenGroup);
    }
  };
  
  rootGroups.forEach(flattenGroup);
  
  // Sort by level for easier analysis
  return flattenedGroups.sort((a, b) => (a.level || 1) - (b.level || 1));
};

// ======= Main Handler =======
const getProductGroupHierarchyLeftpanel = async (req: NextApiRequest, res: NextApiResponse) => {
  const startTime = performance.now();
  const cacheKey = "productGroupHierarchy";

  try {
    // Check cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    const token = await getAccessToken();
    
    // Product group columns to fetch
    const PRODUCT_GROUP_COLUMNS =
      "crdfd_productgroupid,crdfd_productname,_crdfd_nhomsanphamcha_value," +
      "crdfd_nhomsanphamchatext,_crdfd_nhomsanphamcap1_value,crdfd_image_url,cr1bb_so_san_pham_co_gia,cr1bb_soh6thang";
  
    // Query for active product groups
    const table = "crdfd_productgroups";
    const filter = "statecode eq 0";
    const query = `$select=${PRODUCT_GROUP_COLUMNS}&$filter=${encodeURIComponent(filter)}`;
    const endpoint = `${table}?${query}`;

    // Fetch all product groups
    const productGroups = await fetchAllRecords(endpoint, token);
    
    // Filter out product groups with empty crdfd_nhomsanphamchatext
    const filteredProductGroups = productGroups.filter(group => 
      group.crdfd_nhomsanphamchatext !== ""
    );
    
    // Create a set of all available product group IDs for quick lookup
    const availableIds = new Set(filteredProductGroups.map(group => group.crdfd_productgroupid));
    
    // Check for orphaned nodes and log information
    const orphanedNodes = filteredProductGroups.filter(
      group => group._crdfd_nhomsanphamcha_value && !availableIds.has(group._crdfd_nhomsanphamcha_value)
    );
    
    if (orphanedNodes.length > 0) {
      console.log(`Found ${orphanedNodes.length} nodes with parent references that don't exist in filtered list`);
    }
    
    // Build hierarchy from product groups
    const hierarchy = buildHierarchy(filteredProductGroups);
    
    // Get flat list with levels
    const flatHierarchy = getFlatHierarchy(hierarchy);
    
    // Group by levels - giữ nguyên thứ tự từ flatHierarchy (đã được sắp xếp)
    const groupsByLevel: {[key: number]: ProductGroup[]} = {};
    
    // Tạo map từ ID sang parent name để sắp xếp level 2
    const idToParentNameMap = new Map<string, string>();
    hierarchy.forEach(rootGroup => {
      const mapChildren = (node: ProductGroup, parentName: string) => {
        if (node.children) {
          node.children.forEach(child => {
            idToParentNameMap.set(child.crdfd_productgroupid, parentName);
            mapChildren(child, parentName);
          });
        }
      };
      mapChildren(rootGroup, rootGroup.crdfd_productname);
    });
    
    flatHierarchy.forEach(group => {
      const level = group.level || 1;
      if (!groupsByLevel[level]) {
        groupsByLevel[level] = [];
      }
      groupsByLevel[level].push(group);
    });

    // Sắp xếp lại level 2 theo thứ tự parent và CSV order
    if (groupsByLevel[2]) {
      // Nhóm level 2 theo parent name
      const groupedByParent: { [parentName: string]: ProductGroup[] } = {};
      groupsByLevel[2].forEach(group => {
        const parentName = idToParentNameMap.get(group.crdfd_productgroupid) || 'Unknown';
        if (!groupedByParent[parentName]) {
          groupedByParent[parentName] = [];
        }
        groupedByParent[parentName].push(group);
      });

      // Sắp xếp lại level 2 theo thứ tự parent (theo level 1 order) và CSV order
      const sortedLevel2: ProductGroup[] = [];
      
      // Duyệt theo thứ tự level 1 (đã được sắp xếp)
      if (groupsByLevel[1]) {
        groupsByLevel[1].forEach(parentGroup => {
          const parentName = parentGroup.crdfd_productname;
          if (groupedByParent[parentName]) {
            const sortedChildren = sortLevel2Categories(groupedByParent[parentName], parentName);
            sortedLevel2.push(...sortedChildren);
          }
        });
      }
      
      // Thêm các items không có parent trong order (nếu có)
      groupsByLevel[2].forEach(group => {
        if (!sortedLevel2.find(g => g.crdfd_productgroupid === group.crdfd_productgroupid)) {
          sortedLevel2.push(group);
        }
      });
      
      groupsByLevel[2] = sortedLevel2;
    }
    
    // Create the response object
    const result = {
      hierarchy: hierarchy,
      byLevel: groupsByLevel,
      stats: {
        totalGroups: flatHierarchy.length,
        groupsByLevelCount: Object.keys(groupsByLevel).reduce((acc, level) => {
          acc[level] = groupsByLevel[parseInt(level)].length;
          return acc;
        }, {} as {[key: string]: number})
      }
    };
    
    // Cache the result
    cache.set(cacheKey, result);
    
    // Log performance metrics
    const duration = performance.now() - startTime;

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error in getProductGroupHierarchyLeftpanel:", error);
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

export default getProductGroupHierarchyLeftpanel; 