import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "./getAccessToken";

const getDataContent = async (req: NextApiRequest, res: NextApiResponse) => {
  const columns =
    "cr1bb_header,cr1bb_title,cr1bb_excerpt,cr1bb_content,cr1bb_tags,cr1bb_img_url, cr1bb_img_content, cr1bb_tags, cr1bb_content2, cr1bb_linkfileembedded,createdon,_cr1bb_customergroup_value,cr1bb_startdate,cr1bb_enddate,crdfd_type";
  const table = "cr1bb_data_website_ecommerces";

  // Get the tag from the query parameters
  const tag = req.query.tag as string;
  const type = req.query.type as string;

  let filter = `statecode eq 0 and crdfd_type ne 191920001`;

  // If a tag is provided, add it to the filter
  if (tag) {
    filter += ` and contains(cr1bb_tags, '${tag}') ` ;
  }
  // If a type = 191920001 is popup ads
  if (type) {
    filter = `statecode eq 0 and crdfd_type eq ${type} and cr1bb_startdate le ${new Date().toISOString()} and cr1bb_enddate ge ${new Date().toISOString()}`;
  }
  let orderby = `createdon desc`;

  const query = `$select=${columns}&$filter=${encodeURIComponent(
    filter
  )}&$orderby=${orderby}`;
  
  const apiEndpoint = `https://wecare-ii.crm5.dynamics.com/api/data/v9.2/${table}?${query}`;
  try {
    const token = await getAccessToken();

    const response = await axios.get(apiEndpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
      },
    });

    // Send the response back to the client with the fetched data
    res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    console.error("Error fetching data - getDataContent - line 41:", error);
    res.status(500).json({ error: "Error fetching data" });
  }
};

export default getDataContent;
