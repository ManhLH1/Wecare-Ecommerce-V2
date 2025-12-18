import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import Head from "next/head";
import ToastManager from '@/components/ToastManager';
import dynamic from 'next/dynamic';
import Loading from "./loading";
import Script from "next/script";
import Cart from "@/app/product-list/_components/cart/cart";
import CartGlobalManager from "@/components/CartGlobalManager";
import type { CartItem } from "@/model/interface/ProductCartData";
import FloatingZalo from "@/components/FloatingZalo";
import GTMAlternative, { GTMAlternativeNoscript } from "@/components/GTMAlternative";


const CartProviderWrapper = dynamic(
  () => import('@/components/CartManager').then(mod => mod.CartProvider),
  {
    ssr: false,
    loading: () => <Loading />
  }
);

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ["latin", "vietnamese"],
  display: 'swap',
  variable: '--font-roboto',
});

export const metadata: Metadata = {
  title: "Wecare E-commerce - Siêu thị công nghiệp",
  description: "Wecare E-commerce - Địa chỉ tin cậy cho các sản phẩm chất lượng cao với giá cả cạnh tranh. Khám phá ngay các sản phẩm mới và ưu đãi hấp dẫn.",
  keywords: "Wecare, e-commerce, sản phẩm chất lượng, mua sắm online, ưu đãi",
  openGraph: {
    title: "Wecare E-commerce - Siêu thị công nghiệp",
    description: "Siêu thị công nghiệp",
    type: "website",
    locale: "vi_VN",
  },
  authors: [{ name: "Wecare", url: "https://wecare.com.vn/" }],
  icons: {
    icon: [
      { url: '/logo.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico' }
    ],
    shortcut: '/logo.svg',
    apple: '/logo.svg',
  },
};

// Xoá toàn bộ logic useCart, useState, CartGlobalManager khỏi layout.tsx
// Thay vào đó, chỉ import và render <CartGlobalManager>{children}</CartGlobalManager>

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={roboto.variable}>
      <head>
        <link rel="icon" type="image/svg+xml" href="/logo.svg" />
        <link rel="alternate icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/logo.svg" />
        <meta name="google-site-verification" content="LAHTG-uNsNx8gjrMqdTTeDrAclGeFVK5-acMNbBzaBg" />

        {/* Google Tag Manager & Analytics */}
        <GTMAlternative />
        <Script id="json-circular-fix" strategy="beforeInteractive">
          {`
            (function() {
              const originalStringify = JSON.stringify;
              JSON.stringify = function(obj, replacer, space) {
                const getCircularReplacer = () => {
                  const seen = new WeakSet();
                  return (key, value) => {
                    if (typeof value === 'object' && value !== null) {
                      if (seen.has(value)) {
                        return '[Circular]';
                      }
                      seen.add(value);
                    }
                    return value;
                  };
                };
                
                try {
                  return originalStringify(obj, replacer || getCircularReplacer(), space);
                } catch (err) {
                  console.warn('JSON stringify error:', err.message);
                  return '"[Circular or Error]"';
                }
              };
            })();
          `}
        </Script>
      </head>
      <body className={`${roboto.className} text-gray-700`}>
        {/* Google Tag Manager (noscript) */}
        <GTMAlternativeNoscript />
        <CartProviderWrapper>
          <CartGlobalManager>
            {children}
          </CartGlobalManager>
          <FloatingZalo />
          <ToastManager />
        </CartProviderWrapper>
      </body>
    </html>
  );
}

