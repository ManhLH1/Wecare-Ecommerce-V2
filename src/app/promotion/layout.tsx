import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Wecare E-commerce - Siêu thị công nghiệp',
  description: 'Siêu thị công nghiệp',
  openGraph: {
    title: 'Wecare E-commerce - Siêu thị công nghiệp',
    description: 'Siêu thị công nghiệp',
    type: 'website',
  },
};

export default function PromotionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 