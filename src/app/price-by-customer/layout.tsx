import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Price by Customer - Wecare",
  description: "Quản lý giá theo khách hàng",
};

export default function PriceByCustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 