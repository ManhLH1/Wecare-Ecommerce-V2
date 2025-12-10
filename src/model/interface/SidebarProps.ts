export interface ProductGroup {
  crdfd_productname: string;
  cr1bb_urlimage: string;
  cr1bb_giamin: string;
  cr1bb_giamax: string;
  children?: ProductGroup[];
  productCount: number;
  cr1bb_soh6thang?: number;
}

export interface SidebarProps {}

export interface SidebarState {
  productGroups: ProductGroup[];
  error: string | null;
  activeGroup: string | null;
  selectedItem: string | null;
  isLoading: boolean;
}

export interface CachedData {
  data: ProductGroup[];
  timestamp: number;
}

export interface SearchKeys {
  [key: string]: string;
}

export interface StorageConfig {
  STORAGE_KEY: string;
  CACHE_DURATION: number;
}

export interface IconMapping {
  [key: string]: JSX.Element;
} 