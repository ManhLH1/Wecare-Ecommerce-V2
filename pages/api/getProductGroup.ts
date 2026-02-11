import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import NodeCache from "node-cache";
import { getAccessToken } from "./getAccessToken"; // Đảm bảo bạn có file này trong cùng thư mục
import { ProductGroup } from "../../src/model/interface/ProductGroup";
import { Product } from "../../src/model/interface/Product";
import { TreeNode } from "../../src/model/interface/TreeNode";

// Initialize cache
const cache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour

const CACHE_KEY = "productTreeView";

const getProductTreeView = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  try {
    ("Starting getProductTreeView");
    // Check cache first
    const cachedData = cache.get(CACHE_KEY);
    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    const table = "crdfd_productgroups";
    const columns =
      "crdfd_productgroupid,_crdfd_nhomsanphamcha_value,crdfd_nhomsanphamchatext,crdfd_productname,_crdfd_nhomsanphamcap1_value,crdfd_image_url,cr1bb_so_san_pham_co_gia";

    const [token, allProducts] = await Promise.all([
      getAccessToken(),
      fetchAllProducts(),
    ]);

    const allNodes = await fetchAllNodes(table, columns, token);
    const treeData = buildTreeOptimized(allNodes, allProducts);
    const level2AndBeyond = getLevel2AndBeyond(treeData);

    // Cache the result
    cache.set(CACHE_KEY, level2AndBeyond);

    res.status(200).json(level2AndBeyond);
  } catch (error) {
    console.error("Error in getProductTreeView - line 70:", error);
    res.status(500).json({ error: "Error fetching data" });
  }
};

async function fetchData(endpoint: string, token: string): Promise<any[]> {
  let allResults: any[] = [];
  let apiEndpoint = endpoint;

  while (apiEndpoint) {
    try {
      const response = await axios.get(apiEndpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "OData-MaxVersion": "4.0",
          "OData-Version": "4.0",
        },
      });

      if (
        Array.isArray(response.data.value) &&
        response.data.value.length > 0
      ) {
        allResults = allResults.concat(response.data.value);
        apiEndpoint = response.data["@odata.nextLink"];
      } else {
        break;
      }
    } catch (error) {
      throw error;
    }
  }

  return allResults;
}

async function fetchAllNodes(
  table: string,
  columns: string,
  token: string
): Promise<ProductGroup[]> {
  const cacheKey = `allNodes_${table}`;
  const cachedNodes = cache.get(cacheKey);
  if (cachedNodes) {
    return cachedNodes as ProductGroup[];
  }

  const filter = "statecode eq 0";
  const query = `$select=${columns}&$filter=${encodeURIComponent(filter)}`;
  const endpoint = `https://wecare-ii.crm5.dynamics.com/api/data/v9.2/${table}?${query}`;

  const nodes = await fetchData(endpoint, token);
  cache.set(cacheKey, nodes);
  return nodes;
}

async function fetchAllProducts(): Promise<Product[]> {
  const cacheKey = "allProducts";
  const cachedProducts = cache.get(cacheKey);
  const baseURL =
    // process.env.API_BASE_URL ;
    // ||
    "http://localhost:8080";
  // "http://48.217.233.52/";
  const url = `${baseURL}/api/getProductData`;

  if (cachedProducts) {
    return cachedProducts as Product[];
  }

  try {
    const token = await getAccessToken();

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
      },
    });

    cache.set(cacheKey, response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching product data - fetchAllProducts - line 156:", error);
    throw error;
  }
}

function buildTreeOptimized(
  allNodes: ProductGroup[],
  allProducts: Product[]
): TreeNode[] {

  const nodeMap = new Map<string, TreeNode>();
  const rootNodes: TreeNode[] = [];

  // Tạo TreeNodes với số sản phẩm từ cr1bb_so_san_pham_co_gia
  allNodes.forEach((node) => {
    const treeNode: TreeNode = {
      ...node,
      children: [],
      productCount: node.cr1bb_so_san_pham_co_gia || 0,
    };
    nodeMap.set(node.crdfd_productgroupid, treeNode);
  });

  // Build tree structure
  nodeMap.forEach((node) => {
    const parentId = node._crdfd_nhomsanphamcha_value;
    if (parentId && nodeMap.has(parentId)) {
      const parent = nodeMap.get(parentId)!;
      parent.children.push(node);
    } else {
      rootNodes.push(node);
    }
  });

  // Tính tổng số sản phẩm cho các node cha
  function processNode(node: TreeNode): number {
    let totalCount = node.productCount;
    node.children.forEach((child) => {
      totalCount += processNode(child);
    });
    node.productCount = totalCount;
    return totalCount;
  }

  rootNodes.forEach(processNode);

  return rootNodes;
}

function getLevel2AndBeyond(nodes: TreeNode[]): TreeNode[] {
  return nodes  
    .flatMap((node) => node.children)
    .filter(node => 
      node.children && 
      node.children.length > 0 && 
      node.productCount > 0 &&
      node.children.some(child => child.productCount > 0)
    )
    .sort((a, b) => b.productCount - a.productCount);
} 

export default getProductTreeView;
