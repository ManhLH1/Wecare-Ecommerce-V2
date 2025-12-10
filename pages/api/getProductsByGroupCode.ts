import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "./getAccessToken";

const getProductsByGroupCode = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  try {
    const { groupCode } = req.query;

    if (!groupCode || typeof groupCode !== 'string') {
      return res.status(400).json({ error: "Group code is required" });
    }

    const token = await getAccessToken();

    // Fetch products from the product group
    const productTable = "crdfd_productses";
    const productColumns = [
      "crdfd_name",
      "crdfd_productsid",
      "crdfd_fullname",
      "crdfd_masanpham",
      "_crdfd_productgroup_value",
      "crdfd_nhomsanphamtext",
      "cr1bb_giaban",
      "crdfd_gtgt",
      "cr1bb_imageurlproduct",
      "cr1bb_imageurl",
      "crdfd_thuonghieu",
      "crdfd_quycach",
      "crdfd_chatlieu",
      "crdfd_hoanthienbemat"
    ].join(",");

    const filter = `statecode eq 0 and _crdfd_productgroup_value eq '${groupCode}'`;
    const query = `$select=${productColumns}&$filter=${encodeURIComponent(filter)}`;
    const apiEndpoint = `https://wecare-ii.crm5.dynamics.com/api/data/v9.2/${productTable}?${query}`;

    const response = await axios.get(apiEndpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        Prefer: 'odata.maxpagesize=5000'
      },
    });

    const products = response.data.value.map((product: any) => ({
      id: product.crdfd_productsid,
      name: product.crdfd_name,
      fullName: product.crdfd_fullname,
      code: product.crdfd_masanpham,
      groupId: product._crdfd_productgroup_value,
      groupName: product.crdfd_nhomsanphamtext,
      price: product.cr1bb_giaban,
      vat: product.crdfd_gtgt,
      imageUrl: product.cr1bb_imageurlproduct || product.cr1bb_imageurl,
      brand: product.crdfd_thuonghieu,
      specification: product.crdfd_quycach,
      material: product.crdfd_chatlieu,
      finish: product.crdfd_hoanthienbemat
    }));

    return res.status(200).json({
      products,
      total: products.length
    });

  } catch (error: any) {
    console.error('Error fetching products by group code:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    return res.status(500).json({
      error: "Internal server error",
      details: error.message
    });
  }
};

export default getProductsByGroupCode; 