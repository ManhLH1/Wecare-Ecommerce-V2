import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getAccessToken } from "../getAccessToken";

const BASE_URL = "https://wecare-ii.crm5.dynamics.com/api/data/v9.2/";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    try {
        const token = await getAccessToken();
        const headers = { Authorization: `Bearer ${token}` };

        // Fetch ALL Attributes
        const attrEndpoint = `${BASE_URL}EntityDefinitions(LogicalName='crdfd_sodbaogia')/Attributes?$select=LogicalName,DisplayName,AttributeType`;

        try {
            const attrRes = await axios.get(attrEndpoint, { headers });
            const attributes = attrRes.data.value
                .map((a: any) => ({
                    LogicalName: a.LogicalName,
                    DisplayName: a.DisplayName?.LocalizedLabels?.[0]?.Label,
                    Type: a.AttributeType
                }))
                .filter((a: any) => {
                    // Sort out irrelevant system fields
                    const name = a.LogicalName.toLowerCase();
                    const label = a.DisplayName?.LocalizedLabels?.[0]?.Label || "";

                    // Keep custom fields starting with crdfd_ OR cr1bb_ OR label contains "Ca"
                    return name.startsWith('crdfd_') || name.startsWith('cr1bb_') || label.includes("Ca");
                })
                .sort((a: any, b: any) => a.LogicalName.localeCompare(b.LogicalName));

            return res.status(200).json({
                message: "Filtered Attributes found",
                count: attributes.length,
                attributes
            });

        } catch (e: any) {
            return res.status(500).json({ error: "Fetch attributes failed", details: e.response?.data });
        }

    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
}
