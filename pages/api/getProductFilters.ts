import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Gọi API để lấy danh sách sản phẩm
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/getProductData`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Trích xuất filters từ dữ liệu sản phẩm
    const filters = extractFiltersFromProducts(data.products || []);

    return res.status(200).json({
      success: true,
      filters,
    });

  } catch (error) {
    console.error('Error getting product filters:', error);
    
    // Fallback: trả về mock filters
    const mockFilters = {
      brands: [
        'Prime', 'Viglacera', 'INAX', 'TOTO', 'Dulux', 
        'Jotun', 'Nippon', 'Weber', 'Kohler', 'American Standard'
      ],
      specifications: [
        '60x60 cm', '30x60 cm', '80x80 cm', '50x50 cm', '15x90 cm',
        '1 khối', 'Thân cao', 'Cây sen', '5L', '17L', '15L', '3L'
      ],
      materials: [
        'Granite', 'Ceramic', 'Porcelain', 'Sứ cao cấp', 'Đồng mạ Chrome',
        'Nhựa Acrylic', 'Xi măng', 'Thủy tinh', 'Kính', 'Alkyd', 'Xi măng Polymer'
      ]
    };

    return res.status(200).json({
      success: true,
      filters: mockFilters,
    });
  }
}

// Hàm trích xuất filters từ danh sách sản phẩm
function extractFiltersFromProducts(products: any[]) {
  const brands = [...new Set(products.map(p => p.crdfd_thuonghieu).filter(Boolean))].sort();
  const specifications = [...new Set(products.map(p => p.crdfd_quycach).filter(Boolean))].sort();
  const materials = [...new Set(products.map(p => p.crdfd_chatlieu).filter(Boolean))].sort();

  return {
    brands,
    specifications,
    materials,
  };
}
