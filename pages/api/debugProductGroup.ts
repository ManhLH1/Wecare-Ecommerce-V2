import { NextApiRequest, NextApiResponse } from 'next';
import { getAccessToken } from './getAccessToken';
import axios from 'axios';

const baseUrl = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2";

const debugProductGroup = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { groupId } = req.query;

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

    // Test 1: Check if group exists in product groups table
    const groupTable = "crdfd_productgroups";
    const groupQuery = `$select=crdfd_productgroupid,crdfd_productname,cr1bb_so_san_pham_co_gia&$filter=crdfd_productgroupid eq '${groupId}'`;
    
    console.log(`Checking group existence: ${groupQuery}`);
    
    const groupResponse = await axios.get(`${baseUrl}/${groupTable}?${groupQuery}`, { 
      headers,
      timeout: 30000
    });

    // Test 2: Check products in this group
    const productTable = "crdfd_productses";
    const productQuery = `$select=crdfd_productsid,crdfd_name,_crdfd_productgroup_value&$filter=statecode eq 0 and _crdfd_productgroup_value eq '${groupId}'&$top=5`;
    
    console.log(`Checking products: ${productQuery}`);
    
    const productResponse = await axios.get(`${baseUrl}/${productTable}?${productQuery}`, { 
      headers,
      timeout: 30000
    });

    // Test 3: Check all products (no statecode filter)
    const allProductQuery = `$select=crdfd_productsid,crdfd_name,_crdfd_productgroup_value,statecode&$filter=_crdfd_productgroup_value eq '${groupId}'&$top=5`;
    
    console.log(`Checking all products: ${allProductQuery}`);
    
    const allProductResponse = await axios.get(`${baseUrl}/${productTable}?${allProductQuery}`, { 
      headers,
      timeout: 30000
    });

    return res.status(200).json({
      groupId,
      groupInfo: {
        exists: groupResponse.data.value?.length > 0,
        data: groupResponse.data.value || [],
        expectedCount: groupResponse.data.value?.[0]?.cr1bb_so_san_pham_co_gia || 0
      },
      activeProducts: {
        count: productResponse.data.value?.length || 0,
        data: productResponse.data.value || []
      },
      allProducts: {
        count: allProductResponse.data.value?.length || 0,
        data: allProductResponse.data.value || []
      }
    });

  } catch (error) {
    console.error("Error debugging product group:", error);
    return res.status(500).json({ 
      error: "Failed to debug product group",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

export default debugProductGroup;
