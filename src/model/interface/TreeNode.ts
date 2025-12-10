import { ProductGroup } from './ProductGroup';

export interface TreeNode extends ProductGroup {
  children: TreeNode[];
  productCount: number;
} 