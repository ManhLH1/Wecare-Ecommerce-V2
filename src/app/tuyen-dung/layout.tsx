import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Wecare Group - Tuyển dụng",
};

export default function RecruitmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 