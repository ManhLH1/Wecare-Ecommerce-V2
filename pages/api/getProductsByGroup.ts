import { NextApiRequest, NextApiResponse } from 'next';
import { getAccessToken } from './getAccessToken';
import axios from 'axios';

const baseUrl = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2";

interface Product {
  crdfd_productsid: string;
  crdfd_name: string;
  cr1bb_imageurl?: string;
  cr1bb_imageurlproduct?: string;
  _crdfd_productgroup_value?: string;
  crdfd_masanpham?: string;
  cr1bb_json_gia?: any;
  createdon?: string;
}

const getProductsByGroup = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { groupId, limit = 20 } = req.query;

    if (!groupId) {
      return res.status(400).json({ 
        error: "Missing groupId parameter" 
      });
    }

    const token = await getAccessToken();

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
    };

    // Define columns to fetch
    const PRODUCT_COLUMNS = "crdfd_productsid,crdfd_name,cr1bb_imageurl,cr1bb_imageurlproduct,_crdfd_productgroup_value,crdfd_masanpham,cr1bb_json_gia,createdon";

    // Build query for products by group
    const table = "crdfd_productses";
    const filter = `statecode eq 0 and _crdfd_productgroup_value eq '${groupId}'`;
    const query = `$select=${PRODUCT_COLUMNS}&$filter=${encodeURIComponent(filter)}&$orderby=createdon desc&$top=${limit}`;

    // Fetch products
    console.log(`Fetching products for groupId: ${groupId}`);
    console.log(`Query: ${query}`);
    
    const response = await axios.get(`${baseUrl}/${table}?${query}`, { 
      headers,
      timeout: 30000
    });

    console.log(`Found ${response.data.value?.length || 0} products for groupId: ${groupId}`);
    
    // Debug: Log first few products to see structure
    if (response.data.value && response.data.value.length > 0) {
      console.log('Sample product data:', JSON.stringify(response.data.value[0], null, 2));
    }

    const products: Product[] = (response.data.value || []).map((product: any) => ({
      crdfd_productsid: product.crdfd_productsid,
      crdfd_name: product.crdfd_name || "",
      cr1bb_imageurl: product.cr1bb_imageurl || "",
      cr1bb_imageurlproduct: product.cr1bb_imageurlproduct || "",
      _crdfd_productgroup_value: product._crdfd_productgroup_value || "",
      crdfd_masanpham: product.crdfd_masanpham || "",
      cr1bb_json_gia: product.cr1bb_json_gia,
      createdon: product.createdon
    }));

    return res.status(200).json({
      products,
      total: products.length,
      groupId,
      debug: {
        query,
        rawCount: response.data.value?.length || 0,
        processedCount: products.length
      }
    });

  } catch (error) {
    console.error("Error fetching products by group:", error);
    return res.status(500).json({ 
      error: "Failed to fetch products by group",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

export default getProductsByGroup;
