/**
 * Utility functions for generating SEO-friendly URLs for products
 */

/**
 * Convert Vietnamese text to URL-friendly slug
 */
export function textToSlug(text: string): string {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Get industry category from product group hierarchy
 */
export function getIndustryCategory(productGroup: string, productGroupHierarchy?: any[]): string {
  if (!productGroup || !productGroupHierarchy) return '';
  
  // Find the top-level category from hierarchy
  const findTopLevel = (groups: any[], targetGroup: string): string | null => {
    for (const group of groups) {
      // Check if this group matches the target
      if (group.crdfd_productname === targetGroup) {
        // If this group has no parent (it's a root group), return it
        if (!group._crdfd_nhomsanphamcha_value) {
          return group.crdfd_productname;
        }
        // Otherwise, continue searching up the hierarchy
        return findTopLevel(groups, group.crdfd_nhomsanphamchatext || '');
      }
      
      // Search in children
      if (group.children && group.children.length > 0) {
        const found = findTopLevel(group.children, targetGroup);
        if (found) {
          return found;
        }
      }
    }
    return null;
  };
  
  const topLevel = findTopLevel(productGroupHierarchy, productGroup);
  return topLevel ? textToSlug(topLevel) : '';
}

/**
 * Get industry category from product data directly
 */
export function getIndustryCategoryFromProduct(product: any): string {
  // Try to get from product group hierarchy fields
  if (product.cr1bb_nhomsanphamcha) {
    return textToSlug(product.cr1bb_nhomsanphamcha);
  }
  
  if (product.crdfd_nhomsanphamchatext) {
    return textToSlug(product.crdfd_nhomsanphamchatext);
  }
  
  if (product.crdfd_nhomsanphamtext) {
    return textToSlug(product.crdfd_nhomsanphamtext);
  }
  
  // Fallback to empty string - we'll handle this in generateProductUrl
  return '';
}

/**
 * Generate SEO-friendly product URL
 * Format: /ngành-nghề-tên-sản-phẩm-quy-cách
 */
export function generateProductUrl(
  product: {
    crdfd_masanpham?: string;
    crdfd_tensanphamtext?: string;
    crdfd_fullname?: string;
    crdfd_name?: string;
    crdfd_quycach?: string;
    crdfd_nhomsanphamtext?: string;
    crdfd_productgroup?: string;
    cr1bb_nhomsanphamcha?: string;
    crdfd_nhomsanphamchatext?: string;
    productCode?: string;
    productId?: string;
  },
  productGroupHierarchy?: any[]
): string {
  // Get product name
  const productName = product.crdfd_tensanphamtext || 
                     product.crdfd_fullname || 
                     product.crdfd_name || 
                     'san-pham';
  
  // Get product code for fallback
  const productCode = product.crdfd_masanpham || product.productCode || product.productId || 'unknown';
  
  // Get product specifications
  const specifications = product.crdfd_quycach || '';
  
  // Get industry category - try direct product fields first, then hierarchy
  let industryCategory = getIndustryCategoryFromProduct(product);
  
  // If we got empty string from direct fields, try hierarchy
  if (!industryCategory && productGroupHierarchy) {
    industryCategory = getIndustryCategory(
      product.crdfd_nhomsanphamtext || product.crdfd_productgroup || '',
      productGroupHierarchy
    );
  }
  
  // If still no industry category found, try to extract from product name or use a generic category
  if (!industryCategory) {
    // Try to extract category from product name (e.g., "Vít bắn tôn" -> "vit-ban-ton")
    const nameWords = productName.toLowerCase().split(' ');
    if (nameWords.length > 1) {
      // Use first word as category
      industryCategory = textToSlug(nameWords[0]);
    } else {
      // Use a generic category based on product type
      industryCategory = 'dung-cu'; // Default to "dụng cụ"
    }
  }
  
  // Convert to slugs - industryCategory is already a slug from the functions above
  const industrySlug = industryCategory;
  const productNameSlug = textToSlug(productName);
  const specSlug = textToSlug(specifications);
  
  // Build URL parts - only industry and product name, no specifications
  const urlParts = [industrySlug, productNameSlug];
  
  // Join with hyphens and ensure no empty parts
  const url = '/' + urlParts.filter(part => part && part !== '').join('-');
  
  return url;
}

/**
 * Parse product URL to extract components
 */
export function parseProductUrl(url: string): {
  industryCategory: string;
  productName: string;
  specifications: string;
} {
  const parts = url.replace(/^\//, '').split('-');
  
  if (parts.length < 2) {
    return {
      industryCategory: '',
      productName: '',
      specifications: ''
    };
  }
  
  // First part is industry category
  const industryCategory = parts[0] || '';
  
  // Remaining parts are product name (no specifications in URL anymore)
  const productName = parts.slice(1).join('-');
  
  return {
    industryCategory,
    productName,
    specifications: '' // No specifications in URL anymore
  };
}

/**
 * Generate URL for product groups
 */
export function generateProductGroupUrl(groupName: string): string {
  const slug = textToSlug(groupName);
  return `/san-pham/${slug}`;
}

/**
 * Check if URL is in new format
 */
export function isNewProductUrlFormat(url: string): boolean {
  // New format should not start with /SP- or contain product codes
  return !url.match(/^\/SP-\d+/) && !url.match(/^\/[A-Z0-9-]+$/);
}
