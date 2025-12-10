export interface BreadcrumbProps {
  customerId: string | null;
  breadcrumb: string[];
  excludeValues?: string[];
  onCrumbClick: (value: string) => void;
} 