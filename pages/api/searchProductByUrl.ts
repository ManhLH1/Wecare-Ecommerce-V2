import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { industryCategory, productName, specifications } = req.query;

    if (!industryCategory || !productName) {
      return res.status(400).json({ message: 'Industry category and product name are required' });
    }

    // Build search query
    let searchQuery = `${productName}`;
    if (specifications) {
      searchQuery += ` ${specifications}`;
    }

    // Search for products - getProductsOnly returns { data: {...grouped...}, pagination: {...} }
    const response = await axios.get('/api/getProductsOnly', {
      params: {
        search: searchQuery,
        limit: 20
      }
    });

    // Fix: getProductsOnly returns object with 'data' property containing grouped products
    // response.data = { data: {...}, pagination: {...}, cached: boolean }
    const productsData = response.data?.data;
    const allProducts = productsData ? Object.values(productsData).flatMap((group: any) => group.products || []) : [];

    if (!allProducts || allProducts.length === 0) {
      return res.status(404).json({ message: 'No products found' });
    }

    // Get product group hierarchy to help with matching
    let productGroupHierarchy = null;
    try {
      const hierarchyResponse = await axios.get('/api/getProductGroupHierarchy');
      productGroupHierarchy = hierarchyResponse.data?.hierarchy || [];
    } catch (hierarchyError) {
      console.warn('Could not fetch product group hierarchy:', hierarchyError);
    }

    // Try to find the best match based on industry category and product name
    const searchNameLower = (productName as string).toLowerCase();

    // Check if search query exists in product name (slug may not fully match fullname)
    const productNameLower = product.crdfd_tensanphamtext?.toLowerCase() || '';
    const productFullNameLower = product.crdfd_fullname?.toLowerCase() || '';

    // Check if product name contains search query (slugs are derived from names)
    // e.g., "Sơn xịt TV A007" contains "son-xit-tv-a007" when normalized
    const searchQueryNormalized = searchNameLower
      .replace(/-/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const nameMatches = productFullNameLower.includes(searchNameLower) ||
      productFullNameLower.includes(searchQueryNormalized) ||
      productNameLower.includes(searchNameLower) ||
      productNameLower.includes(searchQueryNormalized);

    if (!nameMatches) return false;

    // If we have hierarchy data, try to match industry category
    if (productGroupHierarchy) {
      // Check if product's group matches the industry category
      const productGroupName = product.crdfd_nhomsanphamtext || product.crdfd_productgroup || '';
      const productGroupSlug = productGroupName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-');

      return productGroupSlug === industryCategory;
    }

    return true;
  });

  if (bestMatch) {
    return res.status(200).json(bestMatch);
  }

  // If no exact match, try to find by product name only
  const nameMatch = allProducts.find((product: any) => {
    const productNameLower = product.crdfd_tensanphamtext?.toLowerCase() || '';
    const productFullNameLower = product.crdfd_fullname?.toLowerCase() || '';
    const searchNameLower = (productName as string).toLowerCase();

    return productNameLower.includes(searchNameLower) ||
      productFullNameLower.includes(searchNameLower);
  });

  if (nameMatch) {
    return res.status(200).json(nameMatch);
  }

  // If still no match, return the first result
  return res.status(200).json(allProducts[0]);

} catch (error) {
  console.error('Error searching product by URL:', error);
  return res.status(500).json({ message: 'Internal server error' });
}
}
