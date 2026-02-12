import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

function getSelfBaseUrl(req: NextApiRequest): string {
  // Tại sao: API route chạy server-side, nên nên gọi lại chính app qua host hiện tại thay vì hardcode port (tránh đụng 3000/Apache).
  const proto = (req.headers['x-forwarded-proto'] as string | undefined) || 'http';
  const host = (req.headers['x-forwarded-host'] as string | undefined) || req.headers.host;
  if (host) return `${proto}://${host}`;
  // Lưu ý: fallback cho dev local nếu thiếu host header (hiếm)
  return 'http://localhost:3000';
}

function removeVietnameseTones(str: string): string {
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/đ/g, "d");
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
  str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
  str = str.replace(/Đ/g, "D");
  // Also perform NFD normalization to be safe
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { industryCategory, productName, specifications } = req.query;

    if (!productName) {
      return res.status(400).json({ message: 'Product name is required' });
    }

    // Build search query
    // Use the product name as the primary search term
    let searchQuery = `${productName}`;
    // Replace dashes with spaces for better search results if it looks like a slug
    const searchParam = (productName as string).replace(/-/g, ' ');

    // Search for products - getProductsOnly returns { data: {...grouped...}, pagination: {...} }
    // We search using the slug-like name converted to spaces to find relevant products
    // Use 'fullname' param to trigger AND logic in getProductsOnly, which is better for specific product lookup
    const selfBaseUrl = getSelfBaseUrl(req);
    const response = await axios.get(`${selfBaseUrl}/api/getProductsOnly`, {
      params: {
        fullname: searchParam,
        limit: 50
      }
    });

    const productsData = response.data?.data;
    const allProducts = productsData ? Object.values(productsData).flatMap((group: any) => group.products || []) : [];

    if (!allProducts || allProducts.length === 0) {
      return res.status(404).json({ message: 'No products found' });
    }

    // Get product group hierarchy to help with matching
    let productGroupHierarchy = null;
    try {
      const hierarchyResponse = await axios.get(`${selfBaseUrl}/api/getProductGroupHierarchy`);
      productGroupHierarchy = hierarchyResponse.data?.hierarchy || [];
    } catch (hierarchyError) {
      console.warn('Could not fetch product group hierarchy:', hierarchyError);
    }

    // Prepare search term: remove tones, lowercase, remove special chars
    const targetSlug = (productName as string).toLowerCase().trim();
    const targetNameNormalized = removeVietnameseTones(searchParam).toLowerCase().trim();

    // Một số URL mới có dạng: {industry}-{product-slug}
    // → Tạo thêm biến thể slug bỏ phần industry để tăng khả năng match
    const slugVariants: string[] = [targetSlug];
    const slugParts = targetSlug.split('-');
    if (slugParts.length > 2) {
      const noIndustrySlug = slugParts.slice(1).join('-');
      slugVariants.push(noIndustrySlug);
    }

    // Strategy 1: Find best match
    const bestMatch = allProducts.find((product: any) => {
      const pName = product.crdfd_tensanphamtext || '';
      const pFullName = product.crdfd_fullname || '';
      const pId = product.crdfd_masanpham || '';

      const pNameParams = removeVietnameseTones(pName).toLowerCase().replace(/-/g, ' ');
      const pFullNameParams = removeVietnameseTones(pFullName).toLowerCase().replace(/-/g, ' ');

      // Check if the product name matches the search param closely
      // 1. Exact match on ID (SKU)
      const pIdSlug = pId.toLowerCase();
      if (slugVariants.includes(pIdSlug)) return true;

      // 2. Slug generation check: if we turned this product's name into a slug, would it match?
      // Simple slugify: remove tones, lower, spaces -> dashes
      const simpleSlug = removeVietnameseTones(pName).toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-');
      const fullSlug = removeVietnameseTones(pFullName).toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-');

      if (slugVariants.includes(simpleSlug)) return true;
      if (slugVariants.includes(fullSlug)) return true;

      return false;
    });

    if (bestMatch) {
      return res.status(200).json(bestMatch);
    }

    // Strategy 2: Fuzzy match - try to find product mà tên chứa hầu hết các từ trong slug
    // Nới lỏng điều kiện để chịu được phần prefix ngành nghề trong URL
    const fuzzyMatch = allProducts.find((product: any) => {
      const pName = removeVietnameseTones(product.crdfd_tensanphamtext || '').toLowerCase();
      const pFullName = removeVietnameseTones(product.crdfd_fullname || '').toLowerCase();

      // Bỏ bớt các part quá ngắn / noise, tính tỉ lệ match thay vì bắt buộc 100%
      const searchParts = targetSlug.split('-').filter(part => part.length > 1);
      if (searchParts.length === 0) return false;

      const matchedParts = searchParts.filter(part => pName.includes(part) || pFullName.includes(part));
      const matchRatio = matchedParts.length / searchParts.length;

      // Chỉ cần ~60% từ trong slug xuất hiện trong tên là đủ coi như khớp
      return matchRatio >= 0.6;
    });

    if (fuzzyMatch) {
      return res.status(200).json(fuzzyMatch);
    }

    // If no match found, RETURN 404. Do NOT return a random product.
    return res.status(404).json({ message: 'Product not found matching the URL' });

  } catch (error) {
    // Tại sao: backend/internal API có thể trả 404 hợp lệ; không nên biến thành 500.
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const detail =
        typeof error.response?.data === 'string'
          ? error.response.data
          : error.response?.data;

      console.error('Error searching product by URL (axios):', {
        status,
        url: error.config?.url,
        params: error.config?.params,
        detail,
      });

      if (status === 404) {
        return res.status(404).json({ message: 'Upstream API not found', detail });
      }

      return res.status(status ?? 502).json({ message: 'Upstream request failed', detail });
    }

    console.error('Error searching product by URL:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
