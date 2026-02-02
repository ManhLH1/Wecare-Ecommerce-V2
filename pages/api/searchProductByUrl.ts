import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

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
    const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/getProductsOnly`, {
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
      const hierarchyResponse = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/getProductGroupHierarchy`);
      productGroupHierarchy = hierarchyResponse.data?.hierarchy || [];
    } catch (hierarchyError) {
      console.warn('Could not fetch product group hierarchy:', hierarchyError);
    }

    // Prepare search term: remove tones, lowercase, remove special chars
    const targetSlug = (productName as string).toLowerCase().trim();
    const targetNameNormalized = removeVietnameseTones(searchParam).toLowerCase().trim();

    // Strategy 1: Find best match
    const bestMatch = allProducts.find((product: any) => {
      const pName = product.crdfd_tensanphamtext || '';
      const pFullName = product.crdfd_fullname || '';
      const pId = product.crdfd_masanpham || '';

      const pNameParams = removeVietnameseTones(pName).toLowerCase().replace(/-/g, ' ');
      const pFullNameParams = removeVietnameseTones(pFullName).toLowerCase().replace(/-/g, ' ');

      // Check if the product name matches the search param closely
      // 1. Exact match on ID (SKU)
      if (pId.toLowerCase() === targetSlug) return true;

      // 2. Slug generation check: if we turned this product's name into a slug, would it match?
      // Simple slugify: remove tones, lower, spaces -> dashes
      const simpleSlug = removeVietnameseTones(pName).toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-');
      if (simpleSlug === targetSlug) return true;

      const fullSlug = removeVietnameseTones(pFullName).toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-');
      if (fullSlug === targetSlug) return true;

      return false;
    });

    if (bestMatch) {
      return res.status(200).json(bestMatch);
    }

    // Strategy 2: Fuzzy match - try to find product that contains the search terms
    // This is useful if the slug is slightly different
    const fuzzyMatch = allProducts.find((product: any) => {
      const pName = removeVietnameseTones(product.crdfd_tensanphamtext || '').toLowerCase();
      const pFullName = removeVietnameseTones(product.crdfd_fullname || '').toLowerCase();

      // Check if all parts of the search param (split by -) appear in the product name
      const searchParts = targetSlug.split('-');
      const allPartsMatch = searchParts.every(part => pName.includes(part) || pFullName.includes(part));

      return allPartsMatch;
    });

    if (fuzzyMatch) {
      return res.status(200).json(fuzzyMatch);
    }

    // If no match found, RETURN 404. Do NOT return a random product.
    return res.status(404).json({ message: 'Product not found matching the URL' });

  } catch (error) {
    console.error('Error searching product by URL:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
