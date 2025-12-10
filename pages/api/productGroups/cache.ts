import { ProductGroupBase } from "@/model/interface/ProductGroupTypes";

interface CacheData {
  [key: string]: {
    data: ProductGroupBase[];
    timestamp: number;
  };
}

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const cache: CacheData = {};

export const getFromCache = (key: string): ProductGroupBase[] | null => {
  const cached = cache[key];
  if (!cached) return null;
  
  const now = Date.now();
  if (now - cached.timestamp > CACHE_DURATION) {
    delete cache[key];
    return null;
  }
  
  return cached.data;
};

export const setToCache = (key: string, data: ProductGroupBase[]): void => {
  cache[key] = {
    data,
    timestamp: Date.now()
  };
};

export const generateCacheKey = (level: number, parentId: string): string => {
  return `level${level}_${parentId}`;
}; 