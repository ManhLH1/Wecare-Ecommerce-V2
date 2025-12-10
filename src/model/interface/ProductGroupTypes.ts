export interface ProductGroupBase {
  crdfd_productgroupid: string;
  crdfd_productname: string;
  cr1bb_so_san_pham_co_gia: number;
  _crdfd_nhomsanphamcha_value?: string;
  children?: ProductGroupBase[];
}

export interface ProductGroupWithChildren extends ProductGroupBase {
  children?: ProductGroupWithChildren[];
}

export interface GroupedProductGroup {
  [key: string]: ProductGroupWithChildren[];
}

export interface SidebarState {
  level2Groups: ProductGroupBase[];
  activeGroups: Record<string, ProductGroupBase[]>;
  selectedGroup: string | null;
  isLoading: boolean;
  error: string | null;
} 