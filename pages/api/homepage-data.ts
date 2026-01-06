import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "./getAccessToken";
import { fetchWithCache } from "../../src/utils/cache";

// ISR configuration - regenerate every 15 minutes
export const config = {
  unstable_runtimeISR: true,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { customerId, includeProducts } = req.query;

    // Get fresh token
    const token = await getAccessToken();
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
    };

    const baseUrl = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2";

    // Parallel data fetching for homepage
    const dataPromises = [
      // Categories (top 20 by orders)
      fetchWithCache<any>(
        "cache:getTop20ProductGroupsByOrders",
        1000 * 60 * 30, // 30 minutes cache
        async () => {
          const response = await axios.get(`${baseUrl}/crdfd_productgroups?$select=crdfd_productgroupid,crdfd_productname,crdfd_image_url,crdfd_manhomsp&$filter=statecode eq 0 and crdfd_image_url ne null&$orderby=crdfd_productname asc&$top=20`, { headers });
          return response.data.value || [];
        }
      ),

      // Counts (products, product groups, customers)
      Promise.all([
        axios.get(`${baseUrl}/crdfd_productses?$select=crdfd_productsid&$filter=statecode eq 0&$count=true&$top=1`, { headers })
          .then(res => res.data["@odata.count"] || 0),
        axios.get(`${baseUrl}/crdfd_productgroups?$select=crdfd_productgroupid&$filter=statecode eq 0 and crdfd_sosanpham gt 0&$count=true&$top=1`, { headers })
          .then(res => res.data["@odata.count"] || 0),
        axios.get(`${baseUrl}/crdfd_customers?$select=crdfd_customerid&$filter=statecode eq 0&$count=true&$top=1`, { headers })
          .then(res => res.data["@odata.count"] || 0),
      ]),

      // Top products only if requested (optional for faster initial load)
      includeProducts === 'true' ? fetchWithCache(
        "cache:top30ProductsBasic",
        1000 * 60 * 15, // 15 minutes cache
        async () => {
          // Get top products by recent orders (simplified version)
          const response = await axios.get(`${baseUrl}/crdfd_saleorderdetails?$select=crdfd_tensanphamtext,_crdfd_sanpham_value&$filter=statecode eq 0 and createdon ge ${new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()} and crdfd_giagoc ne null and crdfd_gia gt 0&$orderby=createdon desc&$top=30`, { headers });
          return response.data.value || [];
        }
      ) : Promise.resolve([]),
    ];

    const [categories, [productsCount, productGroupsCount, customersCount], topProducts] = await Promise.all(dataPromises);

    const responseData = {
      categories: categories || [],
      counts: {
        products: Math.floor(productsCount / 1000) * 1000,
        productGroups: Math.floor(productGroupsCount / 100) * 100,
        customers: Math.floor(customersCount / 1000) * 1000,
      },
      topProducts: includeProducts === 'true' ? topProducts || [] : null,
      timestamp: new Date().toISOString(),
    };

    // Set ISR headers for caching
    res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=1800'); // 15 min cache

    return res.status(200).json(responseData);
  } catch (error: any) {
    console.error("Homepage data fetch error:", error);
    return res.status(500).json({
      error: error?.message || "Failed to fetch homepage data",
      categories: [],
      counts: { products: 0, productGroups: 0, customers: 0 },
      topProducts: null,
    });
  }
}
