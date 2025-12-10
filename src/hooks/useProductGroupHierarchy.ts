import { useState, useEffect } from 'react';
import axios from 'axios';
import { fetchWithCache } from '@/utils/cache';

interface ProductGroup {
  crdfd_productgroupid: string;
  crdfd_productname: string;
  _crdfd_nhomsanphamcha_value: string | null;
  crdfd_nhomsanphamchatext: string | null;
  children?: ProductGroup[];
}

interface HierarchyData {
  hierarchy: ProductGroup[];
  groupsByLevel: { [key: number]: ProductGroup[] };
  flatHierarchy: ProductGroup[];
}

export function useProductGroupHierarchy() {
  const [hierarchy, setHierarchy] = useState<ProductGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHierarchy = async () => {
      try {
        setLoading(true);
        const data = await fetchWithCache<any>(
          'cache:getProductGroupHierarchy',
          1000 * 60 * 60, // 1 hour
          async () => {
            const res = await axios.get('/api/getProductGroupHierarchy');
            return res.data;
          }
        );
        if (data?.hierarchy) {
          setHierarchy(data.hierarchy);
        } else {
          setError('No hierarchy data found');
        }
      } catch (err) {
        console.error('Error fetching product group hierarchy:', err);
        setError('Failed to fetch hierarchy');
      } finally {
        setLoading(false);
      }
    };

    fetchHierarchy();
  }, []);

  return { hierarchy, loading, error };
}
