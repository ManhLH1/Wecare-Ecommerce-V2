import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "./getAccessToken";

interface Product {
  crdfd_productsid: string;
  crdfd_name: string;
  crdfd_fullname: string;
  crdfd_masanpham: string;
  _crdfd_productgroup_value: string;
  crdfd_thuonghieu?: string;
  crdfd_quycach?: string;
  crdfd_chatlieu?: string;
  crdfd_hoanthienbemat?: string;
  cr1bb_giaban?: number;
  crdfd_gtgt?: number;
  cr1bb_imageurlproduct?: string;
  cr1bb_imageurl?: string;
  crdfd_nhomsanphamtext?: string;
  crdfd_manhomsp?: string;
  crdfd_unitname?: string;
  crdfd_onvichuantext?: string;
  cr1bb_json_gia?: string;
}

interface PriceInfo {
  crdfd_gia: number;
  crdfd_giatheovc: number;
  crdfd_nhomoituongname: string;
  crdfd_onvichuantext: string;
}

const hasValidShopPrice = (priceJson?: string): boolean => {
  if (!priceJson || typeof priceJson !== 'string' || priceJson.trim() === '') {
    return false;
  }

  try {
    const prices: PriceInfo[] = JSON.parse(priceJson);
    if (!Array.isArray(prices)) return false;

    const shopPrice = prices.find(p => p.crdfd_nhomoituongname === "Shop");
    return !!shopPrice && typeof shopPrice.crdfd_gia === 'number' && shopPrice.crdfd_gia > 0;
  } catch (err) {
    console.error('Error parsing price JSON:', err);
    return false;
  }
};

const getPromotionProductsByGroup = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { groupCode } = req.query;

    if (!groupCode || typeof groupCode !== 'string') {
      return res.status(400).json({ error: "Group code (manhomsp) is required" });
    }

    const token = await getAccessToken();

    // Get products for the group
    const productTable = "crdfd_productses";
    const productColumns = "crdfd_name,crdfd_productsid,crdfd_fullname,crdfd_masanpham,_crdfd_productgroup_value,cr1bb_nhomsanphamcha,crdfd_manhomsp,crdfd_thuonghieu,crdfd_quycach,crdfd_chatlieu,crdfd_hoanthienbemat,crdfd_nhomsanphamtext,crdfd_gtgt,cr1bb_imageurlproduct,cr1bb_imageurl,crdfd_unitname,crdfd_onvichuantext,cr1bb_json_gia";
    const productFilter = `statecode eq 0 and crdfd_manhomsp eq '${groupCode}' and cr1bb_json_gia ne null`;
    const productQuery = `$select=${productColumns}&$filter=${encodeURIComponent(productFilter)}`;
    const productApiEndpoint = `https://wecare-ii.crm5.dynamics.com/api/data/v9.2/${productTable}?${productQuery}`;

    const productResponse = await axios.get(productApiEndpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Prefer": "odata.maxpagesize=5000"
      },
    });

    // Transform products data
    const products = productResponse.data.value
      .filter((product: Product) => hasValidShopPrice(product.cr1bb_json_gia))
      .map((product: Product) => ({
        productId: product.crdfd_productsid,
        productName: product.crdfd_name,
        fullName: product.crdfd_fullname,
        productCode: product.crdfd_masanpham,
        brand: product.crdfd_thuonghieu,
        specification: product.crdfd_quycach,
        material: product.crdfd_chatlieu,
        surfaceFinish: product.crdfd_hoanthienbemat,
        price: product.cr1bb_giaban,
        vat: product.crdfd_gtgt,
        imageUrl: product.cr1bb_imageurlproduct || product.cr1bb_imageurl,
        groupName: product.crdfd_nhomsanphamtext,
        groupCode: product.crdfd_manhomsp,
        unitName: product.crdfd_unitname,
        standardUnit: product.crdfd_onvichuantext,
        priceJson: product.cr1bb_json_gia
      }));

    return res.status(200).json({ 
      products,
      total: products.length
    });

  } catch (error) {
    console.error("Error fetching promotion products by group:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export default getPromotionProductsByGroup; 