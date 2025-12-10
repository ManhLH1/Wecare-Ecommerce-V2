import { NextApiRequest, NextApiResponse } from 'next';
import { getAccessToken } from './getAccessToken';
import axios from 'axios';

const baseUrl = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2";

interface LatestProduct {
  crdfd_productsid: string;
  crdfd_name: string;
  cr1bb_imageurl?: string;
  cr1bb_imageurlproduct?: string;
  _crdfd_productgroup_value?: string;
  cr1bb_giaban?: string | number;
  don_vi_DH?: string;
  crdfd_masanpham?: string;
  cr1bb_json_gia?: any;
}

const getLatestProducts = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const token = await getAccessToken();

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
    };

    // Define columns to fetch - thêm mã SP và json giá bán để render giá theo đơn vị
    const PRODUCT_COLUMNS = "crdfd_productsid,crdfd_name,cr1bb_imageurl,cr1bb_imageurlproduct,createdon,_crdfd_productgroup_value,crdfd_masanpham,cr1bb_json_gia";

    // Build query for latest products - tăng số lượng để có đủ dữ liệu cho việc group
    const table = "crdfd_productses";
    const filter = "statecode eq 0 and ((cr1bb_imageurl ne null and cr1bb_imageurl ne '') or (cr1bb_imageurlproduct ne null and cr1bb_imageurlproduct ne ''))";
    const query = `$select=${PRODUCT_COLUMNS}&$filter=${encodeURIComponent(filter)}&$orderby=createdon desc&$top=100`;

    // Fetch latest products
    const response = await axios.get(`${baseUrl}/${table}?${query}`, { 
      headers,
      timeout: 30000 // 30 seconds timeout
    });

    // Group products by _crdfd_productgroup_value and take the latest one from each group
    const productGroups = new Map<string, any>();
    
    // Safety filter to ensure image fields are present (in case backend returns empty values)
    const productsWithImages = (response.data.value || []).filter((product: any) => {
      const imageA = (product.cr1bb_imageurl || "").trim();
      const imageB = (product.cr1bb_imageurlproduct || "").trim();
      return imageA !== "" || imageB !== "";
    });

    productsWithImages.forEach((product: any) => {
      const groupId = product._crdfd_productgroup_value || 'no-group';
      
      // Nếu nhóm này chưa có sản phẩm hoặc sản phẩm hiện tại mới hơn, thì cập nhật
      if (!productGroups.has(groupId) || 
          new Date(product.createdon) > new Date(productGroups.get(groupId).createdon)) {
        productGroups.set(groupId, product);
      }
    });

    // Convert grouped products to LatestProduct format and limit to 24 (to support larger grids)
    const selected = Array.from(productGroups.values()).slice(0, 24);

    // Fetch price details for each selected product similar to top-selling API
    const priceTable = "crdfd_baogiachitiets";
    const priceSelect = [
      "_crdfd_nhomoituong_value",
      "crdfd_gia",
      "cr1bb_nhomsanpham",
      "crdfd_nhomoituongtext",
      "crdfd_sanphamtext",
      "_crdfd_sanpham_value",
      "crdfd_masanpham",
      "crdfd_maonvi",
      "crdfd_onvi",
      "crdfd_onvichuantext",
      "crdfd_onvichuan",
      "_crdfd_onvi_value",
      "crdfd_giatheovc",
      "cr1bb_tylechuyenoi"
    ].join(",");

    const latestProducts: LatestProduct[] = await Promise.all(selected.map(async (product: any) => {
      try {
        const filter = [
          `crdfd_pricingdeactive eq 191920001`,
          `crdfd_trangthaihieuluc ne 191920001`,
          `statecode eq 0`,
          `crdfd_gia ne null`,
          `_crdfd_sanpham_value eq '${product.crdfd_productsid}'`,
          `crdfd_nhomoituongtext eq 'Shop'`
        ].join(' and ');
        const priceQuery = `$select=${priceSelect}&$filter=${encodeURIComponent(filter)}&$orderby=crdfd_giatheovc asc&$top=1`;
        const priceResp = await axios.get(`${baseUrl}/${priceTable}?${priceQuery}`, { headers, timeout: 20000 });
        const price = (priceResp.data?.value?.[0]) || {};

        // Parse json_gia safely if available
        let parsedJsonGia: any = null;
        if (product.cr1bb_json_gia) {
          try { parsedJsonGia = JSON.parse(product.cr1bb_json_gia); } catch { parsedJsonGia = product.cr1bb_json_gia; }
        }

        return {
          crdfd_productsid: product.crdfd_productsid,
          crdfd_name: product.crdfd_name || "",
          cr1bb_imageurl: product.cr1bb_imageurl || "",
          cr1bb_imageurlproduct: product.cr1bb_imageurlproduct || "",
          _crdfd_productgroup_value: product._crdfd_productgroup_value || "",
          cr1bb_giaban: price.crdfd_gia || "",
          don_vi_DH: price.crdfd_onvichuan || "",
          crdfd_masanpham: product.crdfd_masanpham || price.crdfd_masanpham || "",
          cr1bb_json_gia: parsedJsonGia
        } as LatestProduct;
      } catch (e) {
        // If price fetch fails, still return product basic info
        let parsedJsonGia: any = null;
        if (product.cr1bb_json_gia) {
          try { parsedJsonGia = JSON.parse(product.cr1bb_json_gia); } catch { parsedJsonGia = product.cr1bb_json_gia; }
        }
        return {
          crdfd_productsid: product.crdfd_productsid,
          crdfd_name: product.crdfd_name || "",
          cr1bb_imageurl: product.cr1bb_imageurl || "",
          cr1bb_imageurlproduct: product.cr1bb_imageurlproduct || "",
          _crdfd_productgroup_value: product._crdfd_productgroup_value || "",
          crdfd_masanpham: product.crdfd_masanpham || "",
          cr1bb_json_gia: parsedJsonGia
        } as LatestProduct;
      }
    }));

    return res.status(200).json(latestProducts);

  } catch (error) {
    console.error("Error fetching latest products:", error);
    return res.status(500).json({ 
      error: "Failed to fetch latest products",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

export default getLatestProducts;
