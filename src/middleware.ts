import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if URL is in the old format with query params
  if (pathname.startsWith('/san-pham') && request.nextUrl.searchParams.has('product_group_Id')) {
    // This will be handled by the product page redirect logic, no need to do anything here
    return NextResponse.next();
  }
  
  // Check if this is a san-pham URL that should be redirected to product
  if (pathname.startsWith('/san-pham/')) {
    // Get the slug part from the URL
    const slug = pathname.replace('/san-pham/', '');
    
    // Redirect to the product URL format
    return NextResponse.redirect(new URL(`/san-pham/${slug}`, request.url));
  }
  
  // Handle old product URLs (SP-XXXXX format) - redirect to new format
  if (pathname.match(/^\/SP-\d+$/)) {
    // Extract product code
    const productCode = pathname.replace('/', '');
    
    // For now, redirect to the old route structure
    // The actual product page will handle the redirect to new URL format
    return NextResponse.redirect(new URL(`/san-pham/chi-tiet/${productCode}`, request.url));
  }
  
  // Handle new SEO-friendly product URLs
  // These URLs follow the pattern: /ngành-nghề-tên-sản-phẩm-quy-cách
  if (pathname.match(/^\/[a-z0-9-]+-[a-z0-9-]+(-[a-z0-9-]+)?$/)) {
    // This is a new format URL, let it pass through to the dynamic route
    return NextResponse.next();
  }
  
  // Default - continue with the request
  return NextResponse.next();
}

// Configure the middleware to run only on specific paths
export const config = {
  matcher: [
    '/san-pham/:path*',
    '/SP-:path*',
    '/:path*', // Match all paths to handle new SEO URLs
  ],
}; 