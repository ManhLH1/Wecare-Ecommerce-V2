import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "./getAccessToken";

interface PromotionProduct {
  crdfd_customerid: string;
  Ma_NSP: string;
  NSP: string;
}

interface ProductGroup {
  crdfd_productgroupid: string;
  crdfd_productname: string;
  crdfd_manhomsp: string;
  crdfd_image_url?: string;
  cr1bb_so_san_pham_co_gia?: number;
}

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
  crdfd_productsid: string;
  crdfd_nhomsanphamtext: string;
  crdfd_manhomsp: string;
  crdfd_productgroupid: string;
  crdfd_cap1: string | null;
  crdfd_cap1name: string | null;
  crdfd_cap2: string | null;
  crdfd_cap2name: string | null;
  crdfd_cap3: string | null;
  crdfd_cap3name: string | null;
  crdfd_cap4: string | null;
  crdfd_cap4name: string | null;
  crdfd_cap5: string | null;
  crdfd_cap5name: string | null;
  crdfd_cap6: string | null;
  crdfd_cap6name: string | null;
  crdfd_cap7: string | null;
  crdfd_cap7name: string | null;
  crdfd_baogiachitietid: string;
  crdfd_gia: number;
  crdfd_trangthaihieuluc: number;
  crdfd_trangthaihieulucname: string;
  crdfd_sanpham: string;
  crdfd_sanphamname: string;
  crdfd_onvi: string;
  crdfd_onviname: string;
  crdfd_onvichuan: string;
  crdfd_pricingdeactive: number;
  crdfd_pricingdeactivename: string;
  crdfd_onvichuantext: string;
  crdfd_sanphamtext: string;
  cr1bb_nhomsanpham: string;
  crdfd_nhomoituong: string;
  crdfd_nhomoituongname: string;
  crdfd_manhomkh: string;
  cr1bb_tennhomkh: string;
  cr1bb_tylechuyenoi: number;
  crdfd_maonvi: string;
  crdfd_nhomoituongtext: string;
  crdfd_giatheovc: number;
  crdfd_manhomsanpham: string;
  cr3b9_loaibopromotionname: string | null;
  cr3b9_nhombaogiachitietname: string | null;
}

interface FormattedPrice {
  priceId: string;
  basePrice: number;
  priceWithVAT: number;
  customerGroup: {
    id: string;
    name: string;
    code: string;
  };
  unit: {
    id: string;
    name: string;
    standardUnit: string;
    code: string;
    conversionRate: number;
  };
  productGroup: {
    id: string;
    name: string;
    code: string;
    hierarchy: {
      level1?: { id: string; name: string | null };
      level2?: { id: string; name: string | null };
      level3?: { id: string; name: string | null };
      level4?: { id: string; name: string | null };
      level5?: { id: string; name: string | null };
      level6?: { id: string; name: string | null };
      level7?: { id: string; name: string | null };
    };
  };
  status: {
    isActive: boolean;
    statusCode: number;
    statusName: string;
  };
  excludeFromPromotion: boolean;
}

const parsePrice = (priceJson?: string): FormattedPrice | null => {
  if (!priceJson || typeof priceJson !== 'string' || priceJson.trim() === '') {
    return null;
  }

  try {
    const prices: PriceInfo[] = JSON.parse(priceJson);
    if (!Array.isArray(prices)) return null;

    // Lọc giá chỉ lấy giá của Shop
    const shopPrice = prices.find(price => price.crdfd_nhomoituongtext === "Shop");
    if (!shopPrice) return null;

    return {
      priceId: shopPrice.crdfd_baogiachitietid,
      basePrice: shopPrice.crdfd_gia,
      priceWithVAT: shopPrice.crdfd_giatheovc,
      customerGroup: {
        id: shopPrice.crdfd_nhomoituong,
        name: shopPrice.crdfd_nhomoituongname,
        code: shopPrice.crdfd_manhomkh
      },
      unit: {
        id: shopPrice.crdfd_onvi,
        name: shopPrice.crdfd_onviname,
        standardUnit: shopPrice.crdfd_onvichuan,
        code: shopPrice.crdfd_maonvi,
        conversionRate: shopPrice.cr1bb_tylechuyenoi
      },
      productGroup: {
        id: shopPrice.crdfd_productgroupid,
        name: shopPrice.crdfd_nhomsanphamtext,
        code: shopPrice.crdfd_manhomsp,
        hierarchy: {
          ...(shopPrice.crdfd_cap1 && {
            level1: { id: shopPrice.crdfd_cap1, name: shopPrice.crdfd_cap1name }
          }),
          ...(shopPrice.crdfd_cap2 && {
            level2: { id: shopPrice.crdfd_cap2, name: shopPrice.crdfd_cap2name }
          }),
          ...(shopPrice.crdfd_cap3 && {
            level3: { id: shopPrice.crdfd_cap3, name: shopPrice.crdfd_cap3name }
          }),
          ...(shopPrice.crdfd_cap4 && {
            level4: { id: shopPrice.crdfd_cap4, name: shopPrice.crdfd_cap4name }
          }),
          ...(shopPrice.crdfd_cap5 && {
            level5: { id: shopPrice.crdfd_cap5, name: shopPrice.crdfd_cap5name }
          }),
          ...(shopPrice.crdfd_cap6 && {
            level6: { id: shopPrice.crdfd_cap6, name: shopPrice.crdfd_cap6name }
          }),
          ...(shopPrice.crdfd_cap7 && {
            level7: { id: shopPrice.crdfd_cap7, name: shopPrice.crdfd_cap7name }
          })
        }
      },
      status: {
        isActive: shopPrice.crdfd_pricingdeactive === 191920001,
        statusCode: shopPrice.crdfd_trangthaihieuluc,
        statusName: shopPrice.crdfd_trangthaihieulucname
      },
      excludeFromPromotion: shopPrice.cr3b9_loaibopromotionname === "Yes"
    };
  } catch (err) {
    console.error('Error parsing price JSON:', err);
    return null;
  }
};

const getPromotionProducts = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { customerId } = req.query;

    if (!customerId || typeof customerId !== 'string') {
      return res.status(400).json({ error: "Customer ID is required" });
    }

    const token = await getAccessToken();

    // 1. Fetch customer promotion data
    const customerTable = "crdfd_customers";
    const customerColumns = "crdfd_promotionnspmoi";
    const customerFilter = `crdfd_customerid eq '${customerId}'`;
    const customerQuery = `$select=${customerColumns}&$filter=${encodeURIComponent(customerFilter)}`;
    const customerApiEndpoint = `https://wecare-ii.crm5.dynamics.com/api/data/v9.2/${customerTable}?${customerQuery}`;

    const customerResponse = await axios.get(customerApiEndpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
      },
    });

    if (!customerResponse.data.value || customerResponse.data.value.length === 0) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const promotionJson = customerResponse.data.value[0].crdfd_promotionnspmoi;
    if (!promotionJson) {
      return res.status(200).json({ products: [] });
    }

    let promotionProducts: PromotionProduct[];
    try {
      promotionProducts = JSON.parse(promotionJson);
    } catch (error) {
      console.error("Error parsing promotion JSON:", error);
      return res.status(200).json({ products: [] });
    }

    // 2. Get product group details
    const productGroupTable = "crdfd_productgroups";
    const productGroupColumns = "crdfd_productgroupid,crdfd_productname,crdfd_manhomsp,crdfd_image_url,cr1bb_so_san_pham_co_gia";
    const productGroupFilter = `statecode eq 0 and (${promotionProducts.map(p => `crdfd_manhomsp eq '${p.Ma_NSP}'`).join(" or ")})`;
    const productGroupQuery = `$select=${productGroupColumns}&$filter=${encodeURIComponent(productGroupFilter)}`;
    const productGroupApiEndpoint = `https://wecare-ii.crm5.dynamics.com/api/data/v9.2/${productGroupTable}?${productGroupQuery}`;

    const productGroupResponse = await axios.get(productGroupApiEndpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
      },
    });

    // 3. Get products for each product group
    const productTable = "crdfd_productses";
    const productColumns = "crdfd_name,crdfd_productsid,crdfd_fullname,crdfd_masanpham,_crdfd_productgroup_value,cr1bb_nhomsanphamcha,crdfd_manhomsp,crdfd_thuonghieu,crdfd_quycach,crdfd_chatlieu,crdfd_hoanthienbemat,crdfd_nhomsanphamtext,crdfd_gtgt,cr1bb_imageurlproduct,cr1bb_imageurl,crdfd_unitname,crdfd_onvichuantext,cr1bb_json_gia";
    const productFilter = `statecode eq 0 and (${productGroupResponse.data.value.map((g: ProductGroup) => `_crdfd_productgroup_value eq '${g.crdfd_productgroupid}'`).join(" or ")})`;
    const productQuery = `$select=${productColumns}&$filter=${encodeURIComponent(productFilter)}`;
    const productApiEndpoint = `https://wecare-ii.crm5.dynamics.com/api/data/v9.2/${productTable}?${productQuery}`;

    const productResponse = await axios.get(productApiEndpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
      },
    });

    // 4. Combine all data
    const result = productGroupResponse.data.value.map((group: ProductGroup) => {
      const promotionInfo = promotionProducts.find(p => p.Ma_NSP === group.crdfd_manhomsp);
      const groupProducts = productResponse.data.value.filter((p: Product) => p._crdfd_productgroup_value === group.crdfd_productgroupid);

      // Handle image URL format
      let imageUrl = group.crdfd_image_url;
      if (imageUrl && !imageUrl.startsWith('http')) {
        imageUrl = `https://wecare-ii.crm5.dynamics.com/api/data/v9.2/${imageUrl}`;
      }

      // Tính giá thấp nhất (giá gốc của Shop) trong nhóm
      let minPrice: number | null = null;
      groupProducts.forEach((product: Product) => {
        const prices = parsePrice(product.cr1bb_json_gia);
        if (prices && typeof prices.basePrice === 'number') {
          if (minPrice === null || prices.basePrice < minPrice) {
            minPrice = prices.basePrice;
          }
        }
      });

      return {
        productGroupId: group.crdfd_productgroupid,
        productGroupName: group.crdfd_productname,
        productGroupCode: group.crdfd_manhomsp,
        imageUrl: imageUrl,
        productCount: group.cr1bb_so_san_pham_co_gia,
        minPrice: minPrice,
        products: groupProducts.map((product: Product) => ({
          productId: product.crdfd_productsid,
          productName: product.crdfd_name,
          fullName: product.crdfd_fullname,
          productCode: product.crdfd_masanpham,
          brand: product.crdfd_thuonghieu,
          specification: product.crdfd_quycach,
          material: product.crdfd_chatlieu,
          surfaceFinish: product.crdfd_hoanthienbemat,
          vat: product.crdfd_gtgt,
          imageUrl: product.cr1bb_imageurlproduct || product.cr1bb_imageurl,
          groupName: product.crdfd_nhomsanphamtext,
          groupCode: product.crdfd_manhomsp,
          prices: parsePrice(product.cr1bb_json_gia)
        }))
      };
    });

    return res.status(200).json({ 
      promotionGroups: result
    });

  } catch (error) {
    console.error("Error fetching promotion products:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export default getPromotionProducts; 