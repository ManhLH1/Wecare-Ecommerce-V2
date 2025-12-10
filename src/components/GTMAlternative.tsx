'use client';

import Script from 'next/script';
import { GTM_ID, GA4_ID } from '@/lib/gtm';
import { useEffect } from 'react';

interface GTMAlternativeProps {
  gtmId?: string;
  ga4Id?: string;
}

export default function GTMAlternative({ gtmId = GTM_ID, ga4Id = GA4_ID }: GTMAlternativeProps) {
  useEffect(() => {
    // Initialize dataLayer immediately
    if (typeof window !== 'undefined') {
      window.dataLayer = window.dataLayer || [];
    }
  }, []);

  return (
    <>
      {/* Google Tag Manager - Inline script approach */}
      <Script id="gtm-inline" strategy="afterInteractive">
        {`
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${gtmId}');
        `}
      </Script>

      {/* Google Analytics 4 - Inline approach */}
      <Script id="ga4-inline" strategy="afterInteractive">
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

      {/* Load GA4 script dynamically */}
      <Script id="ga4-script-loader" strategy="afterInteractive">
        {`
          (function() {
            var script = document.createElement('script');
            script.async = true;
            script.src = 'https://www.googletagmanager.com/gtag/js?id=${ga4Id}';
            document.head.appendChild(script);
          })();
        `}
      </Script>
    </>
  );
}

// Component cho noscript fallback
export function GTMAlternativeNoscript({ gtmId = GTM_ID }: { gtmId?: string }) {
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
