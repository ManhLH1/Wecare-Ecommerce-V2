import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "./getAccessToken";

interface BestPromotion {
  promotion_id: string;
  name: string;
  conditions: string;
  type: string;
  value: number;
  vn?: number;
  startDate: string;
  endDate: string;
  image?: string;
  // Expanded to allow including more product fields while keeping logical names
  products?: Array<{
    productId: string;
    name: string;
    code?: string;
    image?: string;
    price?: number;
  } & Record<string, any>>;
}

const getBestPromotions = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  try {
    const token = await getAccessToken();
    const baseUrl = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";

    // Define columns to fetch
    const PROMOTION_COLUMNS = 
      "crdfd_promotionid,crdfd_name,crdfd_conditions,crdfd_type," +
      "crdfd_value,crdfd_vn,crdfd_start_date,crdfd_end_date," +
      "cr1bb_urlimage,createdon,_crdfd_promotion_value,crdfd_masanpham_multiple,crdfd_tensanpham_multiple,cr1bb_manhomsp_multiple";

    // Build query for active promotions
    const table = "crdfd_promotions";
    const filter = "statecode eq 0 and crdfd_promotion_deactive eq 'Active' and cr1bb_urlimage ne null";
    const orderBy = "$orderby=createdon desc";
    const query = `$select=${PROMOTION_COLUMNS}&$filter=${encodeURIComponent(filter)}&${orderBy}&$top=50`;
    
    const response = await axios.get(`${baseUrl}${table}?${query}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
      },
      timeout: 30000,
    });

    if (!response.data || !response.data.value) {
      return res.status(200).json([]);
    }

    // Map promotions data
    const promotions: (BestPromotion & { codes?: string; groupCodes?: string })[] = response.data.value.map((promo: any) => {
      return {
        promotion_id: promo.crdfd_promotionid,
        name: promo.crdfd_name || "",
        conditions: promo.crdfd_conditions || "",
        type: promo.crdfd_type || "",
        value: promo.crdfd_value || 0,
        vn: promo.crdfd_vn || 0,
        startDate: promo.crdfd_start_date || "",
        endDate: promo.crdfd_end_date || "",
        image: promo.cr1bb_urlimage || "",
        codes: promo.crdfd_masanpham_multiple || "",
        groupCodes: promo.cr1bb_manhomsp_multiple || "",
      } as BestPromotion & { codes?: string; groupCodes?: string };
    });

    // Filter out promotions with no value
    const validPromotions = promotions.filter(promo => promo.value > 0);

    // Return top 5 latest promotions (already sorted by createdon desc in query)
    const bestPromotions = validPromotions.slice(0, 5);

    // Enrich with top 5 products per promotion
    try {
      const enrichPromises = bestPromotions.map(async (promo: any) => {
        const rawCodes = (promo.codes || '').split(',').map((c: string) => c.trim()).filter(Boolean);
        const codes = Array.from(new Set(rawCodes)).slice(0, 20);
        const productTable = "crdfd_productses";
        // Align selected columns with getProductData.ts PRODUCT_COLUMNS while keeping originals
        const productSelect = [
          "crdfd_productsid",
          "crdfd_name",
          "crdfd_fullname",
          "crdfd_masanpham",
          "_crdfd_productgroup_value",
          "cr1bb_nhomsanphamcha",
          "crdfd_manhomsp",
          "crdfd_thuonghieu",
          "crdfd_quycach",
          "crdfd_chatlieu",
          "crdfd_hoanthienbemat",
          "crdfd_nhomsanphamtext",
          "crdfd_gtgt",
          "cr1bb_imageurlproduct",
          "cr1bb_imageurl",
          "crdfd_unitname",
          "crdfd_onvichuantext",
          "cr1bb_json_gia"
        ].join(',');
        promo.products = [];
        if (codes.length) {
          const productFilter = codes.map(c => `crdfd_masanpham eq '${c}'`).join(' or ');
          const productQuery = `$select=${productSelect}&$filter=${encodeURIComponent(productFilter)}&$top=50`;
          const prodResp = await axios.get(`${baseUrl}${productTable}?${productQuery}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
              "OData-MaxVersion": "4.0",
              "OData-Version": "4.0",
            }
          });
          const prodList = (prodResp.data?.value || []);
          promo.products = prodList.slice(0, 5).map((it: any) => ({
            productId: it.crdfd_productsid,
            name: it.crdfd_name,
            code: it.crdfd_masanpham,
            image: it.cr1bb_imageurl || it.cr1bb_imageurlproduct || '',
            // Keep logical field names from getProductData.ts
            crdfd_fullname: it.crdfd_fullname,
            _crdfd_productgroup_value: it._crdfd_productgroup_value,
            cr1bb_nhomsanphamcha: it.cr1bb_nhomsanphamcha,
            crdfd_manhomsp: it.crdfd_manhomsp,
            crdfd_thuonghieu: it.crdfd_thuonghieu,
            crdfd_quycach: it.crdfd_quycach,
            crdfd_chatlieu: it.crdfd_chatlieu,
            crdfd_hoanthienbemat: it.crdfd_hoanthienbemat,
            crdfd_nhomsanphamtext: it.crdfd_nhomsanphamtext,
            crdfd_gtgt: it.crdfd_gtgt,
            cr1bb_imageurlproduct: it.cr1bb_imageurlproduct,
            cr1bb_imageurl: it.cr1bb_imageurl,
            crdfd_unitname: it.crdfd_unitname,
            crdfd_onvichuantext: it.crdfd_onvichuantext,
            cr1bb_json_gia: (() => {
              if (!it.cr1bb_json_gia) return null;
              try { return JSON.parse(it.cr1bb_json_gia); } catch { return it.cr1bb_json_gia; }
            })()
          }));
        }
        // Fallback: fill remaining from product groups if available
        if ((promo.products?.length || 0) < 5) {
          const need = 5 - (promo.products?.length || 0);
          const groupCodes = (promo.groupCodes || '')
            .split(',')
            .map((c: string) => c.trim())
            .filter(Boolean);
          if (groupCodes.length) {
            const excludeCodes = new Set((promo.products || []).map((p: any) => p.code));
            const groupFilter = groupCodes.map((gc: string) => `crdfd_manhomsp eq '${gc}'`).join(' or ');
            const extraQuery = `$select=${productSelect}&$filter=${encodeURIComponent(groupFilter)}&$top=${need * 3}`; // fetch more to filter uniques
            const extraResp = await axios.get(`${baseUrl}${productTable}?${extraQuery}`, {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                "OData-MaxVersion": "4.0",
                "OData-Version": "4.0",
              }
            });
            const extras: any[] = [];
            for (const it of extraResp.data?.value || []) {
              const code = it.crdfd_masanpham;
              if (code && !excludeCodes.has(code)) {
                extras.push({
                  productId: it.crdfd_productsid,
                  name: it.crdfd_name,
                  code,
                  image: it.cr1bb_imageurl || it.cr1bb_imageurlproduct || '',
                  // Keep logical field names from getProductData.ts
                  crdfd_fullname: it.crdfd_fullname,
                  _crdfd_productgroup_value: it._crdfd_productgroup_value,
                  cr1bb_nhomsanphamcha: it.cr1bb_nhomsanphamcha,
                  crdfd_manhomsp: it.crdfd_manhomsp,
                  crdfd_thuonghieu: it.crdfd_thuonghieu,
                  crdfd_quycach: it.crdfd_quycach,
                  crdfd_chatlieu: it.crdfd_chatlieu,
                  crdfd_hoanthienbemat: it.crdfd_hoanthienbemat,
                  crdfd_nhomsanphamtext: it.crdfd_nhomsanphamtext,
                  crdfd_gtgt: it.crdfd_gtgt,
                  cr1bb_imageurlproduct: it.cr1bb_imageurlproduct,
                  cr1bb_imageurl: it.cr1bb_imageurl,
                  crdfd_unitname: it.crdfd_unitname,
                  crdfd_onvichuantext: it.crdfd_onvichuantext,
                  cr1bb_json_gia: (() => {
                    if (!it.cr1bb_json_gia) return null;
                    try { return JSON.parse(it.cr1bb_json_gia); } catch { return it.cr1bb_json_gia; }
                  })()
                });
                excludeCodes.add(code);
              }
              if ((promo.products.length + extras.length) >= 5) break;
            }
            promo.products = [...(promo.products || []), ...extras].slice(0, 5);
          }
        }
        return promo;
      });
      await Promise.all(enrichPromises);
    } catch (e) {
      // ignore enrichment errors
    }

    return res.status(200).json(bestPromotions);

  } catch (error: any) {
    console.error('Error fetching best promotions:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    
    if (axios.isAxiosError(error)) {
      return res.status(error.response?.status || 500).json({
        error: "Failed to fetch promotions",
        details: error.message,
      });
    }

    return res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};

export default getBestPromotions;
