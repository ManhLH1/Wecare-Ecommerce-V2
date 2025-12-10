import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Wecare E-commerce - Siêu thị công nghiệp',
  description: 'Siêu thị công nghiệp',
  openGraph: {
    title: 'Sản phẩm - Wecare E-commerce - Siêu thị công nghiệp',
    description: 'Siêu thị công nghiệp',
    type: 'website',
  },
  icons: {
    icon: '/logo.svg',
  },
};

export default function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
