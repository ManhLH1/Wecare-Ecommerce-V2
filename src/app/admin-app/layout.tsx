import type { Metadata } from "next";
import './admin-app.css';

export const metadata: Metadata = {
  title: "Admin App - Quản lý đơn hàng",
  description: "Hệ thống quản lý đơn hàng bán hàng",
};

export default function AdminAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-app-container">
      {children}
    </div>
  );
}

