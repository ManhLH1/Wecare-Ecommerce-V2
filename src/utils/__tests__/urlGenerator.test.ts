import { textToSlug, generateProductUrl, parseProductUrl, getIndustryCategoryFromProduct } from '../urlGenerator';

describe('URL Generator', () => {
  describe('textToSlug', () => {
    it('should convert Vietnamese text to URL-friendly slug', () => {
      expect(textToSlug('Dây điện mềm bọc nhựa 2x1 đỏ')).toBe('day-dien-mem-boc-nhua-2x1-do');
      expect(textToSlug('Ngành Điện')).toBe('nganh-dien');
      expect(textToSlug('Sản phẩm đặc biệt!')).toBe('san-pham-dac-biet');
    });

    it('should handle empty or null input', () => {
      expect(textToSlug('')).toBe('');
      expect(textToSlug(null as any)).toBe('');
      expect(textToSlug(undefined as any)).toBe('');
    });
  });

  describe('getIndustryCategoryFromProduct', () => {
    it('should get industry category from product fields', () => {
      const product = {
        cr1bb_nhomsanphamcha: 'Ngành Điện',
        crdfd_nhomsanphamchatext: 'Điện tử',
        crdfd_nhomsanphamtext: 'Thiết bị điện'
      };
      
      expect(getIndustryCategoryFromProduct(product)).toBe('nganh-dien');
    });

    it('should fallback to nhomsanphamchatext', () => {
      const product = {
        crdfd_nhomsanphamchatext: 'Điện tử',
        crdfd_nhomsanphamtext: 'Thiết bị điện'
      };
      
      expect(getIndustryCategoryFromProduct(product)).toBe('dien-tu');
    });

    it('should fallback to nhomsanphamtext', () => {
      const product = {
        crdfd_nhomsanphamtext: 'Thiết bị điện'
      };
      
      expect(getIndustryCategoryFromProduct(product)).toBe('thiet-bi-dien');
    });

    it('should return empty string when no fields available', () => {
      const product = {};
      expect(getIndustryCategoryFromProduct(product)).toBe('');
    });
  });

  describe('generateProductUrl', () => {
    const mockProduct = {
      crdfd_masanpham: 'SP-013313',
      crdfd_tensanphamtext: 'Dây điện mềm bọc nhựa',
      crdfd_quycach: '2x1 đỏ',
      cr1bb_nhomsanphamcha: 'Ngành Điện',
      crdfd_nhomsanphamchatext: 'Điện tử',
      crdfd_nhomsanphamtext: 'Thiết bị điện'
    };

    it('should generate correct URL format with industry category (no specifications)', () => {
      const url = generateProductUrl(mockProduct);
      expect(url).toBe('/nganh-dien-day-dien-mem-boc-nhua');
    });

    it('should ignore specifications in URL', () => {
      const productWithSpecs = { ...mockProduct, crdfd_quycach: '2x1 đỏ' };
      const url = generateProductUrl(productWithSpecs);
      expect(url).toBe('/nganh-dien-day-dien-mem-boc-nhua');
    });

    it('should use hierarchy when direct fields not available', () => {
      const productWithoutDirectFields = {
        crdfd_masanpham: 'SP-013313',
        crdfd_tensanphamtext: 'Xích tải Daiichi',
        crdfd_quycach: '1001R',
        crdfd_nhomsanphamtext: 'Thiết bị cơ khí'
      };
      
      const mockHierarchy = [
        {
          crdfd_productname: 'Thiết bị cơ khí',
          _crdfd_nhomsanphamcha_value: null,
          children: []
        }
      ];
      
      const url = generateProductUrl(productWithoutDirectFields, mockHierarchy);
      expect(url).toBe('/thiet-bi-co-khi-xich-tai-daiichi');
    });

    it('should use fallback category when no hierarchy data available', () => {
      const productWithoutHierarchy = {
        crdfd_masanpham: 'SP-013313',
        crdfd_tensanphamtext: 'Vít bắn tôn gỗ',
        crdfd_quycach: '12x50'
      };
      
      const url = generateProductUrl(productWithoutHierarchy);
      expect(url).toBe('/vit-ban-ton-go');
    });

    it('should use generic category for single word product names', () => {
      const singleWordProduct = {
        crdfd_masanpham: 'SP-013313',
        crdfd_tensanphamtext: 'Vít',
        crdfd_quycach: '12x50'
      };
      
      const url = generateProductUrl(singleWordProduct);
      expect(url).toBe('/dung-cu-vit');
    });

    it('should handle product with "banle" category correctly', () => {
      const banleProduct = {
        crdfd_masanpham: 'SP-013313',
        crdfd_tensanphamtext: 'Bát KP304 Công vua Inox 201',
        cr1bb_nhomsanphamcha: 'Bàn lẻ'
      };
      
      const url = generateProductUrl(banleProduct);
      expect(url).toBe('/ban-le-bat-kp304-cong-vua-inox-201');
    });

    it('should test textToSlug function with Vietnamese text', () => {
      const { textToSlug } = require('../urlGenerator');
      
      expect(textToSlug('Bàn lẻ')).toBe('ban-le');
      expect(textToSlug('Bát KP304 Công vua Inox 201')).toBe('bat-kp304-cong-vua-inox-201');
      expect(textToSlug('Ngành Điện')).toBe('nganh-dien');
    });
  });

  describe('parseProductUrl', () => {
    it('should parse URL correctly (no specifications)', () => {
      const result = parseProductUrl('/nganh-dien-day-dien-mem-boc-nhua');
      expect(result).toEqual({
        industryCategory: 'nganh-dien',
        productName: 'day-dien-mem-boc-nhua',
        specifications: ''
      });
    });

    it('should handle URL with multiple product name parts', () => {
      const result = parseProductUrl('/vit-ban-ton-go-ron-den');
      expect(result).toEqual({
        industryCategory: 'vit-ban-ton-go-ron-den',
        productName: '',
        specifications: ''
      });
    });
  });
});
