import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "./getAccessToken";

const getPromotionDataNewVersion = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  try {
    const { id, productCodes, productGroupCodes, MaKhachHang, includeImage } = req.query;
    // Validate input
    if (id && typeof id === 'string') {
      if (!id.match(/^[a-zA-Z0-9-_]{1,50}$/)) {
        return res.status(400).json({ error: "Invalid id format" });
      }
    }

    const token = await getAccessToken();

    // Fetch customer data
    const customerTable = "crdfd_customers";
    const customerColumns = "crdfd_promotionjson";
    const customerFilter = `crdfd_customerid eq '${id}'`;
    const customerQuery = `$select=${customerColumns}&$filter=${encodeURIComponent(customerFilter)}`;
    const customerApiEndpoint = `https://wecare-ii.crm5.dynamics.com/api/data/v9.2/${customerTable}?${customerQuery}`;

    let customerPromotionJson = null;
    try {
      const customerResponse = await axios.get(customerApiEndpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "OData-MaxVersion": "4.0",
          "OData-Version": "4.0",
        },
      });

      if (customerResponse.data.value && customerResponse.data.value.length > 0) {
        customerPromotionJson = customerResponse.data.value[0].crdfd_promotionjson;
      }
    } catch (error) {
      console.error('Error fetching customer data:', error);
    }

    // Fetch customer group data
    const groupTable = "cr1bb_groupkhs";
    const groupColumns = "_cr1bb_khachhang_value,_cr1bb_nhomkhachhang_value,cr1bb_tenkh,cr1bb_tennhomkh,cr1bb_makh";
    const groupFilter = `_cr1bb_khachhang_value eq '${id}' and statecode eq 0`;
    const groupQuery = `$select=${groupColumns}&$filter=${encodeURIComponent(groupFilter)}`;
    const groupApiEndpoint = `https://wecare-ii.crm5.dynamics.com/api/data/v9.2/${groupTable}?${groupQuery}`;

    const groupResponse = await axios.get(groupApiEndpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json", 
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
      },
    });

    if (groupResponse.data.value && groupResponse.data.value.length > 0) {
      const groups = groupResponse.data.value.map((item: any) => ({
        customerId: item._cr1bb_khachhang_value,
        customerGroupId: item._cr1bb_nhomkhachhang_value,
        customerCode: item.cr1bb_makh,
        customerName: item.cr1bb_tenkh,
        customerGroupName: item.cr1bb_tennhomkh
      }));

      // Lấy danh sách customerGroupId
      const customerGroupIds = groups.map((group: any) => group.customerGroupId);
      
      // Tạo filter cho promotions sử dụng _crdfd_customergroup_value
      const promotionFilter = customerGroupIds.map((id: any) => `statecode eq 0 and _crdfd_customergroup_value eq '${id}' or _crdfd_customergroup_value eq null`).join(' or ');
      
      // Add product and group code filters if provided
      let additionalFilters = [];
      if (productCodes) {
        const productCodesArray = Array.isArray(productCodes) ? productCodes : [productCodes];
        // Split each product code string by comma and trim whitespace
        const allProductCodes = productCodesArray
          .flatMap((codes: string) => codes.split(','))
          .map((code: string) => code.trim())
          .filter(Boolean);
        
        const productFilter = allProductCodes.map((code: string) => 
          `contains(crdfd_masanpham_multiple,'${code}')`
        ).join(' or ');
        if (productFilter) additionalFilters.push(`(${productFilter})`);
      }
      
      if (productGroupCodes) {
        const groupCodesArray = Array.isArray(productGroupCodes) ? productGroupCodes : [productGroupCodes];
        // Split each group code string by comma and trim whitespace
        const allGroupCodes = groupCodesArray
          .flatMap((codes: string) => codes.split(','))
          .map((code: string) => code.trim())
          .filter(Boolean);
        
        const groupFilter = allGroupCodes.map((code: string) => 
          `contains(crdfd_multiple_manhomsp,'${code}')`
        ).join(' or ');
        if (groupFilter) additionalFilters.push(`(${groupFilter})`);
      }

      // Add MaKhachHang filter if provided
      if (MaKhachHang) {
        const maKhachHangFilter = `(startswith(cr3b9_ma_khachhang_apdung,'${MaKhachHang},') or endswith(cr3b9_ma_khachhang_apdung,',${MaKhachHang}') or contains(cr3b9_ma_khachhang_apdung,',${MaKhachHang},') or cr3b9_ma_khachhang_apdung eq '${MaKhachHang}')`;
        additionalFilters.push(`(${maKhachHangFilter})`);
      }

      // Combine all filters
      const finalFilter = [
        `(${promotionFilter})`,
        'statecode eq 0',
        'crdfd_promotion_deactive eq \'Active\'',
        // 'crdfd_type ne \'Order\'',
        ...additionalFilters
      ].join(' and ');

      // Fetch promotions
      const promotionTable = "crdfd_promotions";
      const promotionColumns = [
        includeImage === 'true' ? 'cr1bb_urlimage' : null,
        "crdfd_name",
        "crdfd_conditions",
        "crdfd_multiple_manhomsp",
        "crdfd_multiple_tennhomsp",
        "crdfd_masanpham_multiple",
        "crdfd_tensanpham_multiple",
        "crdfd_type",
        "crdfd_customergrouptext",
        "_crdfd_customergroup_value",
        "crdfd_value",
        "crdfd_vn",
        "cr1bb_value2",
        "crdfd_value3", 
        "crdfd_start_date",
        "crdfd_end_date",
        "cr1bb_congdonsoluong",
        "cr1bb_soluongapdung",
        "cr1bb_ieukhoanthanhtoanapdung",
        "_crdfd_promotion_value",
        "crdfd_promotiontypetext",
        "crdfd_soluongapdungmuc3",
        "statecode",
        "cr3b9_tensanphammuakem",
        "cr1bb_masanphammuakem",
        "cr1bb_manhomsp_multiple",
        "cr1bb_manhomspmuakem",
        "cr3b9_tennhomspmuakem",
        "cr3b9_ma_khachhang_apdung",
        "cr1bb_tongtienapdung",
        "crdfd_promotionid"
      ].filter(Boolean).join(",");

      const promotionQuery = `$select=${promotionColumns}&$filter=${encodeURIComponent(finalFilter)}`;
      const promotionApiEndpoint = `https://wecare-ii.crm5.dynamics.com/api/data/v9.2/${promotionTable}?${promotionQuery}`;

      try {
        const promotionResponse = await axios.get(promotionApiEndpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0",
            Prefer: 'odata.maxpagesize=5000'
          },
        });

        // Map promotions into groups
        const promotions = promotionResponse.data.value || [];
        const result = groups.map((group: any) => {
          
          return {
            ...group,
            customerPromotionJson,
            promotions: promotions
              .filter((promo: any) => {
                // Chỉ lấy promotion áp dụng cho group này
                return (
                  promo._crdfd_customergroup_value === group.customerGroupId ||
                  promo._crdfd_customergroup_value === null
                );
              })
              .map((promo: any) => {
                // Special handling for "Giảm giá nhóm sản phẩm mới_V1"
                let filteredProductGroupCodes = promo.cr1bb_manhomsp_multiple;
                if (promo.crdfd_name === "Giảm giá nhóm sản phẩm mới_V1" && customerPromotionJson) {
                  const excludedGroups = customerPromotionJson.split(',').map((code: string) => code.trim());
                  if (filteredProductGroupCodes) {
                    const currentGroups = filteredProductGroupCodes.split(',').map((code: string) => code.trim());
                    filteredProductGroupCodes = currentGroups
                      .filter((code: string) => !excludedGroups.includes(code))
                      .join(',');
                  }
                }

                return {
                  name: promo.crdfd_name,
                  conditions: promo.crdfd_conditions,
                  productGroupCodes: filteredProductGroupCodes,
                  productGroupNames: promo.crdfd_multiple_tennhomsp,
                  productCodes: promo.crdfd_masanpham_multiple,
                  productNames: promo.crdfd_tensanpham_multiple,
                  type: promo.crdfd_type,
                  customerGroupText: promo.crdfd_customergrouptext,
                  value: promo.crdfd_value,
                  vn: promo.crdfd_vn,
                  value2: promo.cr1bb_value2,
                  value3: promo.crdfd_value3,
                  congdonsoluong: promo.cr1bb_congdonsoluong,
                  soluongapdung: promo.cr1bb_soluongapdung,
                  startDate: promo.crdfd_start_date,
                  endDate: promo.crdfd_end_date,
                  status: promo.statuscode,
                  promotionType: promo.crdfd_promotiontypetext, 
                  promotionId: promo._crdfd_promotion_value,
                  ieuKhoanThanhToanApDung: promo.cr1bb_ieukhoanthanhtoanapdung,
                  soluongcondon: promo.cr1bb_soluongcondon,
                  soluongapdungmuc3: promo.crdfd_soluongapdungmuc3,
                  tenSanPhamMuaKem: promo.cr3b9_tensanphammuakem,
                  maSanPhamMuaKem: promo.cr1bb_masanphammuakem,
                  maNhomSPMultiple: promo.cr1bb_manhomsp_multiple,
                  maNhomSPMuaKem: promo.cr1bb_manhomspmuakem,
                  maKhachHangApDung: promo.cr3b9_ma_khachhang_apdung ? 
                    (promo.cr3b9_ma_khachhang_apdung.split(',')
                      .map((code: string) => code.trim())
                      .includes(group.customerCode) ? group.customerCode : null) 
                    : null,
                  tongTienApDung: promo.cr1bb_tongtienapdung,
                  promotion_id: promo.crdfd_promotionid,
                  image: promo.cr1bb_urlimage
                }
              })
          };
        });

        return res.status(200).json(result);
      } catch (error: any) {
        console.error('Error fetching promotions:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
        return res.status(200).json(groups.map((group: any) => ({ ...group, promotions: [] })));
      }
    }

    return res.status(404).json({ error: "No group data found" });

  } catch (error: any) {
    console.error('Error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    const errorId = Date.now().toString();
    return res.status(500).json({
      error: "Internal server error",
      errorId,
      details: error.message,
    });
  }
};

export default getPromotionDataNewVersion;
