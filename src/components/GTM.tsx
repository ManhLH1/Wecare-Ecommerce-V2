'use client';

import Script from 'next/script';
import { GTM_ID, GA4_ID } from '@/lib/gtm';

interface GTMProps {
  gtmId?: string;
  ga4Id?: string;
}

export default function GTM({ gtmId = GTM_ID, ga4Id = GA4_ID }: GTMProps) {
  return (
    <>
      {/* Khởi tạo dataLayer trước khi load GTM */}
      <Script id="gtm-dataLayer" strategy="beforeInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
        `}
      </Script>

      {/* Google Tag Manager */}
      <Script id="google-tag-manager" strategy="afterInteractive">
        {`
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${gtmId}');
        `}
      </Script>

      {/* Google Analytics 4 - Load external script */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
        strategy="afterInteractive"
        onLoad={() => {
          // Initialize GA4 after script loads
          if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('js', new Date());
            window.gtag('config', ga4Id, {
              page_title: document.title,
              page_location: window.location.href,
              send_page_view: true
            });
          }
        }}
      />
      
      {/* Fallback GA4 initialization */}
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${ga4Id}', {
            page_title: document.title,
            page_location: window.location.href,
            send_page_view: true
          });
        `}
      </Script>
    </>
  );
}

// Component cho noscript fallback
export function GTMNoscript({ gtmId = GTM_ID }: { gtmId?: string }) {
  return (
    <noscript>
      <iframe 
        src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
        height="0" 
        width="0" 
        style={{display: 'none', visibility: 'hidden'}}
      />
    </noscript>
  );
}
