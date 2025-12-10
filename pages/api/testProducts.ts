import { NextApiRequest, NextApiResponse } from 'next';
import { getAccessToken } from './getAccessToken';
import axios from 'axios';

const baseUrl = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2";

const testProducts = async (req: NextApiRequest, res: NextApiResponse) => {
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

    // Test 1: Get all products for this group (no image filter)
    const table = "crdfd_productses";
    const filter1 = `statecode eq 0 and _crdfd_productgroup_value eq '${groupId}'`;
    const query1 = `$select=crdfd_productsid,crdfd_name,_crdfd_productgroup_value&$filter=${encodeURIComponent(filter1)}&$top=5`;
    
    console.log(`Test 1 - All products query: ${query1}`);
    
    const response1 = await axios.get(`${baseUrl}/${table}?${query1}`, { 
      headers,
      timeout: 30000
    });

    // Test 2: Get products with images
    const filter2 = `statecode eq 0 and _crdfd_productgroup_value eq '${groupId}' and ((cr1bb_imageurl ne null and cr1bb_imageurl ne '') or (cr1bb_imageurlproduct ne null and cr1bb_imageurlproduct ne ''))`;
    const query2 = `$select=crdfd_productsid,crdfd_name,_crdfd_productgroup_value,cr1bb_imageurl,cr1bb_imageurlproduct&$filter=${encodeURIComponent(filter2)}&$top=5`;
    
    console.log(`Test 2 - Products with images query: ${query2}`);
    
    const response2 = await axios.get(`${baseUrl}/${table}?${query2}`, { 
      headers,
      timeout: 30000
    });

    return res.status(200).json({
      groupId,
      test1: {
        description: "All products (no image filter)",
        count: response1.data.value?.length || 0,
        products: response1.data.value || []
      },
      test2: {
        description: "Products with images",
        count: response2.data.value?.length || 0,
        products: response2.data.value || []
      }
    });

  } catch (error) {
    console.error("Error testing products:", error);
    return res.status(500).json({ 
      error: "Failed to test products",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

export default testProducts;
